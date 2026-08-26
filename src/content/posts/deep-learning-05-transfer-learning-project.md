---
title: "深度学习课程 05：图像分类综合项目——从基线到迁移学习"
date: 2026-08-21T09:00:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "以可替换数据集的图像分类项目为例，完成目录设计、基线、ResNet18 迁移学习、分阶段解冻、类别指标、错误样本分析和推理接口。"
tags: ["深度学习", "图像分类", "迁移学习", "ResNet", "PyTorch"]
categories: ["AI课程", "项目实战"]
---

项目课不从“再写一个模型”开始，而从交付约束开始：数据可能不多，类别可能不平衡，训练环境可能只有 CPU，最后还要能对一张新图片给出可解释的预测。

这里把任务设成通用的多类别图像分类。教学时可用 ants/bees、花卉或其他公开小数据集；替换成个人数据时，只要保持目录契约，训练代码无需重写。

文中的具体表格属于**参考运行记录**，用于展示怎样分析结果，不代表作者在某台设备上的个人实测。

## 1. 项目目标与验收条件

项目需要交付：

- 可重复的数据划分；
- 从零训练的小 CNN 基线；
- 使用预训练 ResNet18 的迁移学习方案；
- 按类别统计的 precision、recall、F1 与混淆矩阵；
- 错误样本清单；
- 能加载最佳权重并预测单张图片的接口；
- CPU 可运行的缩小配置。

不把“验证集 accuracy 高”当唯一验收。模型若总把少数类错掉，平均准确率再好也不够。

## 2. 数据目录就是第一份接口

采用 `ImageFolder` 约定：

```text
data/
├── train/
│   ├── class-a/
│   └── class-b/
├── val/
│   ├── class-a/
│   └── class-b/
└── test/
    ├── class-a/
    └── class-b/
```

替换数据时，先按业务实体划分再复制文件。例如同一视频截出的帧、同一商品的多角度图、同一患者的多张影像必须放在同一集合。按图片随机切分很容易泄漏。

把类别映射保存下来：

```python
import json
from pathlib import Path
from torchvision import datasets, transforms

train_transform = transforms.Compose([
    transforms.RandomResizedCrop(224, scale=(0.75, 1.0)),
    transforms.RandomHorizontalFlip(),
    transforms.ColorJitter(brightness=0.15, contrast=0.15),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225],
    ),
])

eval_transform = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225],
    ),
])

train_set = datasets.ImageFolder("data/train", transform=train_transform)
val_set = datasets.ImageFolder("data/val", transform=eval_transform)
test_set = datasets.ImageFolder("data/test", transform=eval_transform)

Path("artifacts").mkdir(exist_ok=True)
Path("artifacts/class-to-index.json").write_text(
    json.dumps(train_set.class_to_idx, ensure_ascii=False, indent=2),
    encoding="utf-8",
)
```

这里采用预训练模型常用的输入尺寸与归一化。若权重对象提供了官方 transforms，也可以直接复用，减少预处理漂移。

## 3. 先做一个真正的基线

基线不是“故意做差的模型”，而是便宜、可解释、能暴露数据问题的方案。可以复用上一课的 SmallCNN，把输入尺寸改为自适应池化。

基线阶段只回答三个问题：

1. 数据与标签能否被模型学到；
2. 训练集和验证集是否出现明显分叉；
3. 哪些类别最容易混淆。

如果基线连几十个样本都无法过拟合，迁移学习也不该开始。预训练模型可能暂时掩盖标签或预处理错误，等换数据时才爆出来。

## 4. 构建迁移学习模型

当前 torchvision 使用权重枚举，而不是旧式 `pretrained=True`：

```python
import torch
from torch import nn
from torchvision.models import ResNet18_Weights, resnet18

def build_model(num_classes: int, freeze_backbone: bool = True) -> nn.Module:
    weights = ResNet18_Weights.DEFAULT
    model = resnet18(weights=weights)

    if freeze_backbone:
        for parameter in model.parameters():
            parameter.requires_grad = False

    in_features = model.fc.in_features
    model.fc = nn.Sequential(
        nn.Dropout(p=0.2),
        nn.Linear(in_features, num_classes),
    )
    return model
```

替换 `model.fc` 之后，新分类头默认需要梯度，不会被前面的冻结循环影响。优化器只接收可训练参数：

```python
model = build_model(num_classes=len(train_set.classes)).to(device)
trainable = [p for p in model.parameters() if p.requires_grad]

optimizer = torch.optim.AdamW(
    trainable,
    lr=1e-3,
    weight_decay=1e-2,
)
```

先冻结骨干训练分类头，适合数据少或计算资源有限的情况。若新数据与预训练图像差异较大，只训练头部可能不够，再进入分阶段解冻。

## 5. 分阶段解冻，不要一把梭哈

一种稳妥流程：

```text
阶段 A：冻结骨干，只训练分类头
阶段 B：解冻 layer4，降低学习率微调
阶段 C：确有需要时再解冻更多层
```

```python
for parameter in model.layer4.parameters():
    parameter.requires_grad = True

optimizer = torch.optim.AdamW([
    {"params": model.layer4.parameters(), "lr": 1e-5},
    {"params": model.fc.parameters(), "lr": 1e-4},
], weight_decay=1e-2)
```

骨干层学习的是已有视觉特征，通常用更小学习率；新分类头从随机参数开始，需要更积极的更新。解冻后要重新创建优化器，否则新开放的参数可能不在原优化器的参数组里。

## 6. 保存训练状态与最佳模型

```python
from dataclasses import asdict, dataclass

@dataclass
class TrainConfig:
    image_size: int = 224
    batch_size: int = 32
    epochs: int = 15
    head_lr: float = 1e-3
    seed: int = 42

config = TrainConfig()

def save_checkpoint(path, model, optimizer, epoch, val_loss, classes):
    torch.save({
        "model_state": model.state_dict(),
        "optimizer_state": optimizer.state_dict(),
        "epoch": epoch,
        "val_loss": val_loss,
        "classes": classes,
        "config": asdict(config),
    }, path)
```

保存类别顺序非常关键。训练时索引 0 代表 `class-a`，推理时如果按另一顺序解释，模型计算正确也会返回错误名称。

Colab 会话可能中断，checkpoint 要及时复制到持久目录。Windows 路径则统一使用 `pathlib.Path`，避免字符串反斜杠问题。

## 7. 评估不能只打印 accuracy

```python
import numpy as np
from sklearn.metrics import classification_report, confusion_matrix

@torch.inference_mode()
def collect_predictions(model, loader, device):
    model.eval()
    y_true, y_pred, probabilities = [], [], []

    for images, labels in loader:
        logits = model(images.to(device))
        probs = logits.softmax(dim=1).cpu()
        preds = probs.argmax(dim=1)

        y_true.extend(labels.numpy().tolist())
        y_pred.extend(preds.numpy().tolist())
        probabilities.extend(probs.numpy().tolist())

    return np.array(y_true), np.array(y_pred), np.array(probabilities)

y_true, y_pred, y_prob = collect_predictions(model, test_loader, device)
print(classification_report(
    y_true,
    y_pred,
    target_names=test_set.classes,
    digits=3,
    zero_division=0,
))
print(confusion_matrix(y_true, y_pred))
```

类别多且分布不均衡时，Macro F1 能让每类拥有相同权重。Weighted F1 会按样本量加权，更接近总体表现，但可能掩盖少数类。两者一起看。

## 8. 参考运行记录：应该怎样读结果

以下为教学用参考记录，数字用于演示比较方法：

| 方案 | 验证集 Macro F1 | 现象 |
|---|---:|---|
| SmallCNN 基线 | 0.71 | 训练集继续改善，验证集较早停滞 |
| 冻结 ResNet18 骨干 | 0.82 | 收敛更快，小数据下更稳定 |
| 解冻 layer4 微调 | 0.85 | 相近类别的召回率改善 |
| 全量解冻且学习率偏大 | 0.76 | 前几轮震荡，原有特征被破坏 |

不要把最后一行读成“全量解冻一定更差”。真正的问题是全量解冻配上不合适的学习率和数据规模。参考记录只说明应当控制变量：每次改变一个训练阶段，比较同一划分上的指标和错误样本。

## 9. 错误样本比总分更有用

保存高置信误判：

```python
def top_mistakes(y_true, y_pred, y_prob, limit=20):
    wrong = np.flatnonzero(y_true != y_pred)
    confidence = y_prob[wrong, y_pred[wrong]]
    order = wrong[np.argsort(-confidence)]
    return order[:limit]
```

逐张检查时，为错误分组：

- 标签疑似错误；
- 主体太小或被遮挡；
- 背景与某类别高度相关；
- 两类别定义本身重叠；
- 图像质量或颜色空间异常；
- 训练集中缺少相似姿态。

如果多数错误来自类别定义重叠，继续调学习率意义不大。先回到需求层面合并类别或补充标注规则。

## 10. 单张图片推理接口

```python
from pathlib import Path
from PIL import Image

@torch.inference_mode()
def predict_image(
    image_path: str | Path,
    model: nn.Module,
    transform,
    classes: list[str],
    device: torch.device,
    top_k: int = 3,
) -> list[tuple[str, float]]:
    model.eval()
    image = Image.open(image_path).convert("RGB")
    batch = transform(image).unsqueeze(0).to(device)
    probabilities = model(batch).softmax(dim=1)[0]
    values, indices = probabilities.topk(min(top_k, len(classes)))

    return [
        (classes[index], float(value))
        for value, index in zip(values.cpu(), indices.cpu())
    ]
```

`convert("RGB")` 避免灰度图或带透明通道图片导致输入通道数变化。推理预处理必须与验证阶段一致，不能继续使用随机裁剪。

Softmax 分数不是严格校准后的真实概率。模型在陌生分布上也可能非常自信。面向真实业务时，应增加置信阈值、未知类别处理和人工复核入口。

## 11. CPU 与低显存降级方案

没有 GPU 时，可以：

- 先冻结全部骨干，只训练分类头；
- 将 batch size 降到 8 或 16；
- 使用数据子集验证管线，再决定是否云端完整训练；
- 减少增强中的高开销操作；
- 使用较小骨干，但保持输入与权重要求一致。

显存不足时先减 batch size。若 BatchNorm 因 batch 太小不稳定，可冻结其统计量，或改用不依赖 batch 统计的结构。不要只为塞进显存就把图像缩到看不清目标。

## 12. 失败方案复盘

### 一开始就全量解冻

训练慢、参数多，少量数据下容易破坏已有特征。更好的做法是先训练分类头，确认数据管线正确，再逐层开放。

### 数据增强堆得太重

随机裁剪把主体切掉，颜色变换改变了类别依据。增强后的训练图必须抽样可视化；增强强度由业务语义决定，不由代码长度决定。

### 只保存模型权重

没有类别映射、预处理和配置，几周后很难还原推理环境。模型文件只是交付的一部分。

### 盯着单一 accuracy 调参

总分提升可能来自多数类，少数类反而更差。混淆矩阵与错误样本必须进入决策过程。

## 13. 如何替换成个人数据

1. 明确类别定义与无法判断时的规则；
2. 按实体划分 train/val/test；
3. 用相同目录契约接入 `ImageFolder`；
4. 在训练集上检查类别分布与图像质量；
5. 重新选择符合任务的增强；
6. 保留固定测试集，调参过程不反复查看；
7. 记录数据版本与删除、纠错历史。

个人项目的亮点不在于换了一个数据文件夹，而在于能解释：为什么这样划分、怎样避免泄漏、哪些错误最贵、模型输出如何进入业务流程。

## 14. 面试表达

可以按“约束—基线—问题—改动—证据—边界”来讲：

> 数据量有限，因此先用小 CNN 验证管线，再冻结预训练 ResNet18 的骨干训练分类头。基线出现相近类别混淆后，只解冻后层并使用分组学习率。评估同时看 Macro F1、每类召回和高置信误判。模型对未知分布仍可能过度自信，所以推理接口保留阈值与人工复核边界。

这比只说“用了迁移学习提高准确率”更能体现工程判断。

## 15. 练习

1. 将 ResNet18 替换为另一种轻量骨干，比较参数量与推理时间。
2. 为 `predict_image` 增加最低置信阈值和 `unknown` 返回值。
3. 保存错误样本路径、真实类别、预测类别和置信度到 CSV。
4. 设计一个按用户或来源分组的数据划分函数，避免实体泄漏。

## 下一篇

图像任务利用空间局部结构，文本和时间序列则多了顺序。下一篇进入序列模型：[RNN、LSTM 与 GRU](/posts/deep-learning-06-rnn-lstm-gru/)。
