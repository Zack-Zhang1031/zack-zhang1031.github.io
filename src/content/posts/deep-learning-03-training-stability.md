---
title: "深度学习课程 03：训练不动、过拟合与梯度异常怎么排查"
date: 2026-08-19T09:00:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "建立深度学习训练故障的排查顺序，理解数据泄漏、过拟合、初始化、归一化、学习率、梯度裁剪、早停与可复现训练。"
tags: ["深度学习", "模型调优", "过拟合", "梯度", "PyTorch"]
categories: ["AI课程", "深度学习"]
---

训练脚本能运行，只能说明语法大致没问题。loss 不降、验证集变差、结果每次飘得离谱，才是深度学习项目真正花时间的地方。

很多人一遇到这些现象就换模型、加层数、上更大的 GPU。通常太早了。排错应该从数据和最小实验开始，最后才轮到复杂结构。

## 1. 先建立一条排查顺序

建议按下面的顺序查：

```text
数据与标签 → 单个 batch → 小样本过拟合 → loss/输出层 → 梯度
→ 学习率 → 正则化 → 模型容量 → 数据规模与结构
```

这个顺序故意把“换大模型”放在后面。标签对不上、类别编号错位、训练集和验证集处理不一致时，更深的模型只会更快地学错。

## 2. 第一关：数据有没有说谎

训练前至少打印这些信息：

```python
features, labels = next(iter(train_loader))

print("features:", features.shape, features.dtype)
print("labels:", labels.shape, labels.dtype)
print("range:", features.min().item(), features.max().item())
print("classes:", labels.unique(sorted=True))
```

图像任务还要把增强后的样本画出来。文本任务则把 token id 还原成文字检查。肉眼看十几条样本，往往比盯半小时日志有效。

尤其留意数据泄漏。常见形式包括：

- 同一用户、同一视频或同一原始图片的切片同时进入训练和验证；
- 在全量数据上先计算均值、词表或特征选择，再划分数据；
- 文件名、时间戳、背景水印等泄露标签；
- 数据增强在划分之前生成，增强副本被分到不同集合。

验证集很好看，不等于模型学会了任务。它也可能只是认出了重复样本。

## 3. 小样本过拟合测试

取 16 或 32 个样本，关闭随机增强和大部分正则化，让模型反复训练同一小批数据。一个有足够容量、实现正确的分类模型，应该能把训练损失压得很低。

```python
small_x, small_y = next(iter(train_loader))
small_x = small_x[:32].to(device)
small_y = small_y[:32].to(device)

model = MyModel().to(device)
optimizer = torch.optim.Adam(model.parameters(), lr=1e-3)
criterion = torch.nn.CrossEntropyLoss()

for step in range(300):
    model.train()
    optimizer.zero_grad(set_to_none=True)
    logits = model(small_x)
    loss = criterion(logits, small_y)
    loss.backward()
    optimizer.step()

    if step % 50 == 0:
        accuracy = (logits.argmax(1) == small_y).float().mean().item()
        print(step, loss.item(), accuracy)
```

如果连这一步都做不到，先别谈泛化。检查输出维度、标签、损失函数、激活函数和参数是否真的参与优化。

## 4. 看曲线，不要只看最后一个数字

典型现象可以这样判断：

| 训练曲线 | 验证曲线 | 更可能的问题 |
|---|---|---|
| loss 都不降 | loss 都不降 | 学习率、实现、标签或容量不足 |
| 快速变好 | 先好后差 | 过拟合 |
| 剧烈震荡 | 同样震荡 | 学习率过大、batch 太小、异常样本 |
| 正常下降 | 长期不变 | 训练/验证分布不一致 |
| 突然变成 NaN | 无意义 | 数值溢出、非法输入、梯度爆炸 |

准确率也会遮住问题。类别不平衡时，模型全猜多数类仍可能得到看似不错的 accuracy。至少同时看每类召回率、Macro F1 和混淆矩阵。

## 5. 学习率先于大部分超参数

学习率通常是最先调的超参数。

```python
optimizer = torch.optim.AdamW(
    model.parameters(),
    lr=3e-4,
    weight_decay=1e-2,
)

scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
    optimizer,
    T_max=20,
)
```

几个信号：

- loss 一开始就爆炸：先把学习率降一个数量级；
- loss 稳定但几乎不动：确认梯度正常后，再尝试提高学习率；
- 前几轮改善快，后面反复震荡：考虑衰减策略；
- 微调预训练模型：骨干网络通常使用更小学习率，新的分类头可以更大。

不要同时改学习率、batch size、优化器和网络结构。否则即使变好了，也不知道是谁起作用。

## 6. 梯度该怎么观察

```python
def grad_report(model: torch.nn.Module) -> dict[str, float]:
    report = {}
    for name, parameter in model.named_parameters():
        if parameter.grad is not None:
            report[name] = parameter.grad.detach().norm().item()
    return report
```

如果某层一直没有梯度，可能是前向路径根本没经过它，或者中途错误地 `detach()` 了。梯度范数长期接近 0，考虑激活饱和或深层传播衰减；突然极大，则要检查异常 batch 和数值稳定性。

序列模型中常用梯度裁剪：

```python
loss.backward()
torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
optimizer.step()
```

裁剪是保险丝，不是修复一切的胶带。如果每一步都触发强裁剪，模型结构、输入尺度或学习率仍可能有根本问题。

## 7. 初始化、归一化和残差连接

框架内置层通常已有合理初始化，但理解它们的目标很有用：让不同层的激活和梯度尺度不要随深度快速放大或缩小。

ReLU 网络常见 Kaiming 初始化；Sigmoid/Tanh 网络常见 Xavier 初始化。自定义参数时可以明确设置：

```python
for module in model.modules():
    if isinstance(module, torch.nn.Linear):
        torch.nn.init.kaiming_uniform_(module.weight, nonlinearity="relu")
        if module.bias is not None:
            torch.nn.init.zeros_(module.bias)
```

BatchNorm 使用 batch 统计量，图像网络里很常见；LayerNorm 对单个样本的特征维度归一化，更适合 Transformer 等序列结构。残差连接让某层学习“在输入上改多少”，也给梯度提供了更直接的传播路径。

## 8. 过拟合时先做什么

过拟合不是“训练太好”，而是模型对训练数据的细节记得太牢，遇到新数据就失灵。处理优先级大致如下：

1. 检查划分方式和分布差异；
2. 增加或清洗数据；
3. 使用符合业务规律的数据增强；
4. 减少模型容量或训练轮数；
5. 加入 weight decay、Dropout 等正则化；
6. 使用早停保存最佳验证权重。

```python
class EarlyStopping:
    def __init__(self, patience: int = 5, min_delta: float = 0.0) -> None:
        self.patience = patience
        self.min_delta = min_delta
        self.best = float("inf")
        self.bad_epochs = 0

    def update(self, value: float) -> bool:
        if value < self.best - self.min_delta:
            self.best = value
            self.bad_epochs = 0
        else:
            self.bad_epochs += 1
        return self.bad_epochs >= self.patience
```

早停监控什么要与任务一致。类别极不平衡时，只盯 `val_loss` 或 accuracy 可能错过小类表现恶化，应补充任务真正关心的指标。

## 9. 可复现不是只设一个 seed

```python
import os
import random
import numpy as np
import torch

def seed_everything(seed: int = 42) -> None:
    os.environ["PYTHONHASHSEED"] = str(seed)
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)

    torch.backends.cudnn.benchmark = False
    torch.backends.cudnn.deterministic = True
```

确定性设置可能牺牲速度，而且不同硬件、驱动和依赖版本之间仍不保证逐位相同。更实际的做法是记录：代码版本、数据版本、划分文件、依赖版本、随机种子、配置和最佳 checkpoint。

训练结果有少量波动很正常。若一个结论只在某个随机种子下成立，它本身就不稳。

## 10. Windows、Colab 与 CPU 的差异

- Windows 的 `DataLoader` 多进程问题较多，先从 `num_workers=0` 开始；
- Colab 会话会中断，checkpoint 应保存到持久位置；
- CPU 路径要缩小 batch、图像尺寸或数据子集，而不是把 epoch 无限拉长；
- CUDA 可用不代表所有张量都自动上 GPU，仍要统一 `.to(device)`；
- 混合精度能降低显存，但出现 NaN 时应先退回全精度定位。

## 11. 一张实用排错清单

训练前：

- 随机抽样可视化；
- 确认标签映射和类别数；
- 检查训练/验证划分单位；
- 记录输入 shape、dtype、范围；
- 保存一份固定验证样本。

训练中：

- 同时记录训练和验证 loss；
- 检查每类指标，而非只有 accuracy；
- 定期记录学习率和梯度范数；
- 保存最佳权重与配置；
- 遇到异常先保留出错 batch。

## 12. 练习与面试题

1. 为上一节的小模型加入训练曲线记录，并画出 train/val loss。
2. 人为打乱一部分标签，观察小样本过拟合测试的变化。
3. 将学习率分别放大和缩小，描述曲线差异，不追求精确数值。
4. 写一个函数检查所有参数是否拿到了梯度。

**Dropout 在训练和推理时有什么区别？**

训练时随机屏蔽部分单元并按规则缩放输出；推理时使用完整网络。因此必须正确切换 `train()` 和 `eval()`。

**weight decay 与 Dropout 有什么不同？**

weight decay 约束参数规模，Dropout 在训练时随机改变子网络。两者都可能改善泛化，但作用位置和机制不同。

**发现验证集明显高于训练集，一定有问题吗？**

不一定。训练阶段有随机增强和 Dropout，验证阶段没有，验证指标可能短暂更高。但若差距异常，应检查数据泄漏和预处理不一致。

## 下一篇

训练骨架和排错顺序已经齐了。下一篇进入第一种真正处理图像结构的模型：[CNN 从卷积到图像分类](/posts/deep-learning-04-cnn-image-classification/)。已有 OpenCV 文章讲的是图像处理；CNN 关注的是如何从数据中学出特征，两者不要混为一谈。
