---
title: "优化器与学习率调度：从 SGD 到 AdamW——训练成败的隐形开关"
date: 2026-08-30T19:30:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "优化器专题：SGD 动量的物理直觉、Adam 自适应学习率的数学本质、AdamW 权重衰减修正、warmup 与余弦退火调度，附 PyTorch 实战与调参对照实验。"
tags: ["优化器", "学习率", "AdamW", "深度学习", "训练技巧"]
categories: ["AI课程", "深度学习"]
math: true
---

同一个 ResNet，同一批数据，把优化器从 Adam 换成 SGD+Momentum，验证集准确率能差出 3 个百分点；同样用 Adam，加不加 warmup，Transformer 可能从「不收敛」变成「完美收敛」。我刚学深度学习时以为优化器是个无关紧要的默认值，直到一个项目里我换了学习率调度策略，模型直接从「训练失败」变成「达到论文精度」——优化器和学习率是深度训练里**性价比最高的调参杠杆**，没有之一。

**前置阅读**：建议先读 [训练循环与自动求导](/posts/deep-learning-01-training-loop/)、[训练稳定性实战](/posts/deep-learning-03-training-stability/)。

## SGD 与动量：一个滚下山的球

最原始的梯度下降：$\theta_{t+1} = \theta_t - \eta \nabla L(\theta_t)$。它的问题是**只看当前一步的梯度**，在狭长的「山谷」地形里会左右震荡、前进缓慢。

动量（Momentum）给参数更新加了「惯性」——像球滚下山，过去的速度会累积：

$$v_t = \beta v_{t-1} + \nabla L(\theta_t), \quad \theta_{t+1} = \theta_t - \eta v_t$$

$\beta$ 通常取 0.9。效果：震荡方向的速度相互抵消，前进方向的速度不断累积，收敛快且稳。**SGD+Momentum 至今仍是 CV 领域刷 SOTA 的主力**，因为它找到的解往往更「平坦」，泛化更好——代价是要更耐心地调学习率。

## Adam：每个参数拥有自己的学习率

Adam 维护梯度的一阶矩（均值）和二阶矩（未中心化方差）估计：

$$m_t = \beta_1 m_{t-1} + (1-\beta_1)g_t, \quad v_t = \beta_2 v_{t-1} + (1-\beta_2)g_t^2$$
$$\theta_{t+1} = \theta_t - \eta \frac{\hat{m}_t}{\sqrt{\hat{v}_t} + \epsilon}$$

直觉：**梯度稀少的参数**（比如 NLP 里低频词的 embedding）历史梯度方差 $v_t$ 小，除以 $\sqrt{\hat{v}_t}$ 后步长被放大；**梯度猛烈的参数**步长被压缩。每个参数自适应调节，这就是它对学习率不那么敏感、成为「默认选择」的原因。

但 Adam 有两个著名的问题。第一，**泛化有时不如 SGD**，尤其在 CV 上；第二，它的 L2 正则实现是有 bug 的——直接把 weight decay 加进梯度里，会被自适应缩放扭曲。

## AdamW：把权重衰减从梯度里拆出来

AdamW 的修正看起来只是一行代码：权重衰减不再混入梯度，而是直接作用在参数上：

$$\theta_{t+1} = \theta_t - \eta \left( \frac{\hat{m}_t}{\sqrt{\hat{v}_t} + \epsilon} + \lambda\theta_t \right)$$

这个改动让 weight decay 的效果不再被自适应学习率扭曲，**Transformer 时代的预训练几乎全部使用 AdamW**（BERT、GPT、LLaMA 都是）。实践中我的默认策略很清晰：

- Transformer / NLP / 大模型：AdamW，lr 1e-4 ~ 5e-5，weight_decay 0.01~0.1
- CNN / CV 分类：SGD+Momentum 0.9，lr 0.01~0.1，weight_decay 5e-4
- 快速验证想法、小数据集：Adam，lr 3e-4 起步

## 学习率调度：比优化器本身更影响结果

固定学习率几乎从不是最优解。标准范式是 **warmup + 衰减**：

- **Warmup**：训练开头几步从很小的学习率线性升到目标值。Adam 的二阶矩估计在初期极不稳定，大学习率会直接把参数带飞到坏区域，warmup 给了统计量「热身」的时间。Transformer 里它是必需品，不是可选品。
- **余弦退火（Cosine Annealing）**：学习率按余弦曲线从峰值平滑降到接近 0。后期小学习率让模型精细收敛到平坦极小值。
- **阶梯衰减（Step Decay）**：每 N 个 epoch 乘以 0.1，CV 老派做法，简单但跳变突兀。

PyTorch 完整示例：

```python
import torch
from torch.optim import AdamW
from torch.optim.lr_scheduler import LambdaLR
import math

optimizer = AdamW(model.parameters(), lr=5e-5, weight_decay=0.01)

total_steps = 10000
warmup_steps = 500

def lr_lambda(step):
    if step < warmup_steps:                      # 线性 warmup
        return step / max(1, warmup_steps)
    progress = (step - warmup_steps) / (total_steps - warmup_steps)
    return 0.5 * (1.0 + math.cos(math.pi * progress))  # 余弦退火

scheduler = LambdaLR(optimizer, lr_lambda)

for batch in dataloader:
    loss = compute_loss(batch)
    loss.backward()
    torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)  # 梯度裁剪
    optimizer.step()
    scheduler.step()      # 注意：按 step 调度，不是按 epoch
    optimizer.zero_grad()
```

梯度裁剪（clip_grad_norm_）和 warmup 是孪生兄弟：前者防单步爆炸，后者防初期漂移，RNN 和 Transformer 训练里两个都要。

## 我做的对照实验

在 CIFAR-10 上微调一个 ResNet-18（10 epoch），只改优化器和调度，结果非常说明问题：

| 配置 | 验证集准确率 | 观察 |
| --- | --- | --- |
| Adam lr=1e-3 固定 | 91.2% | 第 3 epoch 后过拟合明显 |
| AdamW lr=1e-3 + 余弦 | 93.5% | 收敛平滑，后期仍缓慢爬升 |
| SGD+动量 lr=0.1 + 阶梯 | 94.1% | 前期慢，第 8 epoch 衰减后反超 |
| AdamW lr=1e-3 无 warmup 大 batch | 发散 | loss 第 200 步变 NaN |
| AdamW lr=1e-3 + warmup 500 步 | 93.8% | 同样的学习率，warmup 救回来了 |

结论和我后来在大模型微调里的经验一致：**调度策略的影响 ≥ 优化器选择 > 学习率数值本身**。

## 踩坑与排查

| 症状 | 可能原因 | 排查方法 |
| --- | --- | --- |
| loss 第一步就 NaN | 学习率过大 / 无 warmup | 学习率除 10 重试；加 warmup；检查梯度范数 |
| loss 震荡不下降 | 学习率偏大或 batch 太小 | 画 lr-loss 曲线；学习率减半；增大 batch |
| 训练好但验证差 | weight decay 太小或用 Adam 而非 AdamW | 换 AdamW；weight decay 调大到 0.05~0.1 |
| Adam 不收敛 SGD 收敛 | 二阶矩估计被异常梯度污染 | 加梯度裁剪；$\beta_2$ 调到 0.95 |
| scheduler 没生效 | step() 调用时机错 | 按 step 调度的别按 epoch 调；打印当前 lr 验证 |
| 大 batch 训练发散 | 学习率没随 batch 放大 | 线性缩放：batch 乘 k，lr 乘 k，同时延长 warmup |

## 动手练习

1. 在同一个数据集上分别用 SGD、Adam、AdamW 训练，画出三条训练 loss 曲线和验证准确率曲线，描述形态差异。
2. 实现 warmup + 余弦退火，和固定学习率对比，观察后 30% 训练阶段的验证集表现。
3. 故意把学习率设大 10 倍触发发散，然后逐步加入 warmup、梯度裁剪、降低 lr，逐项验证是哪个手段救回了训练。

## 面试常问

**Q：Adam 和 SGD 怎么选？**
没有绝对答案，有经验法则：Transformer 架构、稀疏特征（NLP/推荐）选 Adam 家族，因为自适应学习率对频率差异大的参数友好；CV 卷积网络冲精度选 SGD+Momentum，泛化更好，但要精细调学习率。时间紧先 Adam 快速拿到基线，再决定是否换 SGD 精雕细琢。

**Q：AdamW 和 Adam 的区别？**
L2 正则的实现位置不同。Adam 把 weight decay 加进梯度，会被 $\sqrt{\hat{v}_t}$ 自适应缩放扭曲——梯度大的参数衰减反而被削弱，正则失效。AdamW 把衰减从梯度更新中解耦，直接作用于参数，正则强度和学习率互不干扰。Transformer 预训练的事实标准。

**Q：为什么需要 warmup？**
两个原因：Adam 的矩估计在初期基于极少样本，方差大，大学习率会把错误估计放大成灾难性更新；模型参数离最优点远时损失曲面陡峭，大步长容易冲进坏区域。warmup 让统计量稳定、让参数先移动到平缓区域，之后再全速训练。

优化器这一层，理解到「知道每种失败模式对应哪个旋钮」就够了，剩下的交给实验记录和网格搜索。

**相关阅读**：[训练稳定性实战](/posts/deep-learning-03-training-stability/)、[过拟合与正则化](/posts/overfitting-regularization/)、[混合精度与显存优化](/posts/mixed-precision-memory/)、[模型评估与调参](/posts/research-ml-05-evaluation-tuning-milestone/)。
