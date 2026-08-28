---
title: "混合精度与显存优化：让大模型塞进小显卡——FP16、BF16 与梯度检查点"
date: 2026-08-30T23:00:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "显存优化实战：显存四笔账的构成、FP16/BF16 混合精度原理、autocast 与 GradScaler 用法、梯度检查点与梯度累积，附 7B 模型微调的显存实测对照表。"
tags: ["混合精度", "显存优化", "FP16", "梯度检查点", "深度学习"]
categories: ["AI课程", "深度学习"]
math: true
---

「CUDA out of memory」是深度学习从业者见过次数最多的报错，没有之一。我在一张 24GB 的 3090 上微调 7B 模型时和它搏斗了整整一周，最后把显存从「需要 80GB」压到「21GB 跑通」——靠的不是换卡，而是一套每个深度学习工程师都该掌握的显存账本。这篇文章先算清楚显存花在哪，再逐个讲优化手段：混合精度、梯度检查点、梯度累积。

**前置阅读**：建议先读 [深度学习训练循环](/posts/deep-learning-01-training-loop/)、[分布式训练基础](/posts/distributed-training-basics/)。

## 显存四笔账

训练时显存被四样东西瓜分，以 7B 模型为例（FP32 即每个参数 4 字节）：

| 构成 | 内容 | 7B 模型 FP32 估算 |
| --- | --- | --- |
| 参数 | 模型权重 | 7B × 4B = 28GB |
| 梯度 | 每个参数一份 | 28GB |
| 优化器状态 | Adam 的 m、v 两个动量 | 56GB |
| 激活值 | 前向中间结果，留给反向传播 | 随 batch 和序列长度，10~40GB |

总计 120GB+——这就是为什么「7B 模型明明只有 14GB 文件（FP16），24GB 显卡却训不动」。**模型文件大小 × 6~8，才是训练的真实显存需求。** 推理只需要参数一份（甚至量化后更少），所以推理容易训练难。

## 混合精度：FP16 与 BF16

FP32 用 32 位存一个浮点数；FP16 砍半到 16 位，显存直接减半、矩阵乘法还能走 Tensor Core 加速 2~3 倍。但 FP16 动态范围窄（最大值 65504，最小正数约 6e-5），梯度这种小数值容易**下溢变 0**。

**BF16（bfloat16）**是 Google 的方案：和 FP32 一样的指数位（动态范围不变），只砍尾数精度。范围不丢，训练稳得多，代价是小数精度略粗——对深度学习来说完全可以接受。**Ampere 架构（3090/A100）之后的显卡优先用 BF16，不支持 BF16 的老卡才用 FP16+梯度缩放。**

PyTorch 用起来只需包住训练步：

```python
import torch

scaler = torch.cuda.amp.GradScaler()   # 仅 FP16 需要，BF16 不用

for x, y in dataloader:
    optimizer.zero_grad()
    with torch.autocast(device_type="cuda", dtype=torch.bfloat16):
        logits = model(x)
        loss = criterion(logits, y)

    # BF16：直接反传即可
    loss.backward()
    optimizer.step()

    # FP16 则需要 scaler 三件套：
    # scaler.scale(loss).backward()     # 损失放大 2^16 倍防梯度下溢
    # scaler.step(optimizer)            # 先检查 inf/nan 再更新
    # scaler.update()                   # 动态调整缩放因子
```

autocast 的聪明之处在于**不是所有算子都降精度**：矩阵乘、卷积走 FP16/BF16（快且数值安全），LayerNorm、softmax、损失计算保持 FP32（数值敏感）。master 权重始终以 FP32 保存，精度损失被控制在每一步的临时计算里。

## 梯度检查点：用时间换空间

激活值随网络深度和 batch 线性增长，常常占掉一半显存。梯度检查点（Gradient Checkpointing）的思路：**只保存少数关键节点的激活，反向传播时从最近的检查点重新前向计算中间激活**。

显存从 O(n) 降到 O(√n) 级别，代价是多算一次前向——训练时间增加约 20%~30%，激活显存却能省 60%~80%。Transformers 库里一行开启：

```python
model.gradient_checkpointing_enable()
# 或原生 PyTorch
from torch.utils.checkpoint import checkpoint
x = checkpoint(self.block, x)   # block 的中间激活不保存，反向时重算
```

## 梯度累积：小显存模拟大 batch

大 batch 训练稳定但显存放不下？把小 batch 的梯度累加 N 步再更新一次，等效于 batch × N：

```python
accum_steps = 8   # 等效 batch = 单步 batch × 8

for i, (x, y) in enumerate(dataloader):
    with torch.autocast("cuda", dtype=torch.bfloat16):
        loss = criterion(model(x), y) / accum_steps   # 注意要除！
    loss.backward()

    if (i + 1) % accum_steps == 0:
        optimizer.step()
        optimizer.zero_grad()
```

两个细节：loss 要除以累积步数（否则等效学习率被放大 N 倍）；BatchNorm 的统计量按小 batch 算，大 batch 场景下会有偏差（这也是大模型都用 LayerNorm 的原因之一）。

## 组合实战：24GB 微调 7B

我的 3090 微调方案，每一刀的位置：

| 手段 | 显存效果 | 代价 |
| --- | --- | --- |
| BF16 混合精度 | 参数+梯度+优化器全减半：112GB→56GB | 几乎无 |
| 冻结大部分层（LoRA） | 优化器状态和梯度只算 0.5% 参数：再省 ~50GB | 微调上限略降 |
| 梯度检查点 | 激活省 70%：20GB→6GB | 训练慢 25% |
| 梯度累积 ×8 | 单步 batch 从 32 降到 4 | 无（等效大 batch） |

最终 21GB 跑通。关键洞察：**LoRA 不只是省参数——它把「优化器状态」这个最大头直接消掉了**，因为 Adam 的 m、v 只为可训练参数分配。这就是为什么 LoRA 是单卡微调大模型的前提，而不只是技巧。

## 踩坑与排查

| 症状 | 可能原因 | 排查方法 |
| --- | --- | --- |
| FP16 训练 loss 变 NaN | 梯度下溢/上溢 | 换 BF16；或检查 GradScaler 三件套是否齐全 |
| autocast 后反而更慢 | 模型里大量逐元素小算子 | profile 定位；小算子融合或保持 FP32 |
| 梯度累积后 loss 异常大 | 忘了除 accum_steps | 检查 loss 缩放 |
| 开了检查点还是 OOM | 输入序列太长，单层激活就爆 | 减序列长度/减 batch；检查 attention 是否 O(n²) 实现 |
| 验证时 OOM 训练时正常 | 忘了 no_grad | 验证循环加 `torch.no_grad()` 或 `inference_mode` |
| 优化器 step 时 OOM | master 权重 + 动量瞬时叠加 | 用 8-bit Adam（bitsandbytes）或 Adafactor |

## 动手练习

1. 用 `torch.cuda.max_memory_allocated()` 测量同一模型 FP32 和 BF16 训练的峰值显存，验证是否减半。
2. 开启梯度检查点前后对比：显存省了多少？每个 epoch 慢了多少？
3. 写一个训练脚本支持梯度累积，验证 accum=8、batch=4 与 accum=1、batch=32 的 loss 曲线是否一致。

## 面试常问

**Q：FP16 和 BF16 的区别？训练选哪个？**
FP16 是 1 符号位 + 5 指数位 + 10 尾数位，精度高但动态范围窄，梯度易下溢，需要损失缩放；BF16 是 1+8+7，指数位和 FP32 相同，动态范围大训练稳定，但尾数精度低。硬件支持 BF16（Ampere 及以后）就选 BF16 免 scaler；老卡（V100 及以前）用 FP16 + GradScaler。

**Q：为什么 LoRA 能大幅降低微调显存？**
大头不在参数本身而在优化器状态：Adam 为每个可训练参数维护 m、v 两个动量（FP32 下 8 字节/参数），加上梯度 4 字节。LoRA 冻结原模型 99.5% 的参数，只训练注入的低秩矩阵，优化器状态和梯度按可训练参数量分配，7B 模型的优化器显存从 56GB 降到几百 MB。

**Q：梯度检查点的原理和代价？**
前向时不保存全部激活，只保留检查点处的；反向传播需要中间激活时，从最近检查点重新前向算一遍。激活显存从 O(层数) 降到 O(√层数)，代价是约一次额外前向的计算量（训练时间 +20%~30%）。经典的以时间换空间。

显存优化的思维模型只有一句话：**先算账，再动刀——知道每一 GB 花在哪，优化就是按账单逐项砍价。**

**相关阅读**：[分布式训练基础](/posts/distributed-training-basics/)、[LLM 推理优化](/posts/llm-inference-optimization/)、[模型压缩与部署](/posts/model-compression-deployment/)、[LoRA 微调实战](/posts/llm-finetuning-lora/)。
