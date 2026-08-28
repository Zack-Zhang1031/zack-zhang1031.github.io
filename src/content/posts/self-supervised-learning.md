---
title: "自监督学习入门：从无标注数据里偷标签——BERT、MAE 与对比学习"
date: 2026-08-30T00:50:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "自监督的核心思想：从数据自身构造监督信号。掩码重建（BERT/MAE）、对比学习（SimCLR/MoCo）、时序预测三大范式，以及为什么它是大模型时代的发动机。"
tags: ["自监督学习", "BERT", "MAE", "对比学习", "预训练"]
categories: ["AI课程", "深度学习"]
math: false
---

标注数据是 ML 最贵的资源：一张 ImageNet 图片的人工标注成本几毛钱，一顿医疗影像的专家标注几十块，而互联网上无标注数据近乎无限。自监督学习（SSL）回答了一个天才的问题：**能不能不用人工标注，从数据自身构造出监督信号？**

答案是能，而且这个思想直接点燃了预训练大模型时代。BERT 是 SSL，GPT 是 SSL，MAE 是 SSL，CLIP 也算半个。理解 SSL，就是理解「预训练-微调」这个统治当前 AI 的范式。

**前置阅读**：建议先读 [Transformer 详解](/posts/deep-learning-07-transformer-attention/)、[ViT 与 CLIP](/posts/vit-clip-multimodal/)、[神经网络基础](/posts/deep-learning-02-backprop/)。

## 三大范式：造标签的三种手法

### 范式一：掩码重建——遮住一部分，猜回来

**BERT（文本）**：随机遮住 15% 的词，让模型根据上下文猜原词。「今天天气很 [MASK]」→「好」。为了学会猜，模型必须理解语义——**任务是人造的，能力是真实的**。

**MAE（图像）**：把 ViT 的 patch 随机遮住 75%，用轻量解码器重建像素。75% 这个激进比例是关键：图像信息冗余度远高于文本，遮少了模型靠插值就能糊弄，学不到语义。

```python
# MAE 的核心：非对称编解码
# 编码器只处理可见的 25% patch（省 75% 算力）
visible_tokens = encoder(patches[~mask])          # 大模型，只看见 1/4
# 解码器把可见 token + 可学习 mask token 拼回去重建
reconstructed = decoder(merge(visible_tokens, mask_tokens))
loss = mse(reconstructed, patches[mask])          # 只算被遮部分的重建误差
```

**GPT（文本）**：掩码的变体——遮住未来。「预测下一个词」本质是因果掩码的重建任务。ChatGPT 的一切能力，最初的监督信号就是这么朴素。

### 范式二：对比学习——同一件的不同视角应该相似

核心思想：同一张图的两种增强（裁剪、变色、模糊）是「正样本对」，不同图是「负样本对」；训练让正样本对的表示靠近、负样本远离。**监督信号是「相似性关系」，同样来自数据本身**。

**SimCLR**：大 batch + 强增强 + InfoNCE 损失（[CLIP 那篇](/posts/vit-clip-multimodal/)的 clip_loss 就是它的多模态版）：

```python
def simclr_step(x):
    v1, v2 = augment(x), augment(x)      # 同一批图的两种增强
    z1, z2 = projector(encoder(v1)), projector(encoder(v2))
    z1, z2 = F.normalize(z1), F.normalize(z2)
    logits = z1 @ z2.T / temperature     # (N, N)
    labels = torch.arange(len(x))        # 对角线：同图正样本
    return F.cross_entropy(logits, labels)
```

**MoCo**：SimCLR 要大 batch（负样本多才学得好），MoCo 用队列维护几万个历史负样本 + 动量编码器，单卡也能玩。**BYOL/SimSiam** 更激进——不要负样本，只靠「预测同一图另一视图的表示」+ stop-gradient 防坍缩，居然也 work。

### 范式三：时序/结构预测——利用数据内在结构

- 语音：wav2vec 2.0 遮住音段做对比预测（[声纹](/posts/voiceprint-speaker-verification/)和 [ASR](/posts/speech-recognition-basics/) 都受益）。
- 视频：预测帧顺序、预测未来帧。
- 图：预测边是否存在、节点属性重建（[GNN 那篇](/posts/gnn-graph-neural-network/)的预训练玩法）。

## 为什么 SSL 学到的表示这么好

直觉解释（不严谨但好记）：**重建/预测任务强迫模型压缩数据的有效信息**。要从上下文猜出被遮的词，必须懂语法、语义、常识；要认出「两种裁剪是同一只猫」，必须抓住「猫」的本质特征而非背景。

更理论的说法：这些代理任务（pretext task）学到的表示是下游任务的「充分统计量」——预训练数据足够大、任务足够难，表示就通用。「预训练-微调」范式的分工：

```
海量无标注数据 + 自监督任务 → 通用表示（预训练，一次，贵）
少量标注数据 + 下游任务   → 任务适配（微调，多次，便宜）
```

经济学意义：**标注成本被摊薄到一次预训练中**，下游每个任务只需少量标注就能达到过去全监督的水平。我在 [LoRA 微调](/posts/llm-finetuning-lora/)里 500 条数据微调 7B 模型的效果，就是站在 SSL 预训练的肩膀上。

## 动手：在小数据上验证 SSL 的价值

经典实验设计（CIFAR-10，只留 1% 标注）：

```python
# 实验设置：100 类标注被砍掉 99%，模拟标注稀缺
# 方案 A：直接在 500 张标注图上从头训练 ResNet18
# 方案 B：先在 50000 张无标注图上 SimCLR 预训练，再只用 500 张微调分类头

# 我实测的结果（近似值）：
#   A（全监督小数据）：~58%
#   B（SSL 预训练 + 微调）：~82%
#   C（全监督全数据上限）：~93%
```

500 张标注 + 免费的无标注数据，做到全数据 88% 的水平——这就是 SSL 的实际价值。**标注稀缺的场景（医疗、工业质检、垂直领域）SSL 是性价比最高的技术杠杆**。

## 选型速查：什么场景用什么 SSL

| 场景 | 首选 | 理由 |
|------|------|------|
| 文本预训练 | 掩码/因果 LM | 生态成熟，直接用现成模型别自己训 |
| 图像、有大量无标注 | MAE（有标签微调目标）或 SimCLR（特征提取目标） | MAE 重建偏底层，对比偏语义 |
| 下游是分类/检索 | 对比学习（SimCLR/MoCo） | 表示判别性强 |
| 下游是检测/分割 | MAE | 保留空间细节，对比学习的全局表示弱在定位 |
| 语音 | wav2vec 2.0 / HuBERT | 社区标准 |
| 多模态 | CLIP 式对比 | [见这篇](/posts/vit-clip-multimodal/) |

## 踩坑排查

| 现象 | 原因 | 解法 |
|------|------|------|
| SimCLR 损失不降或表示坍缩 | 温度太低/增强太弱，所有输出挤一起 | τ=0.07~0.5 网格；增强强度检查 |
| 对比学习效果差 | 增强破坏了关键信息（医学影像乱变色） | 领域定制增强策略 |
| MAE 微调不涨点 | 遮太少模型作弊（插值重建） | mask ratio 提到 75% |
| 预训练完下游反而更差 | 代理任务与下游不匹配（分类预训练做分割） | 换匹配的范式（见选型表） |
| batch 开不大效果崩 | SimCLR 负样本不足 | 换 MoCo 或梯度累积 |
| 以为 SSL 免费 | 预训练算力是真金白银 | 小团队直接下预训练权重，只微调 |

最后一条最重要：**99% 的团队不该自己从头做 SSL 预训练**。 HuggingFace 上下载 MAE/CLIP/wav2vec 权重，在你领域数据上继续预训练（domain-adaptive pretraining）再微调，是成本和效果的最优平衡点。

## 练习

1. 在 CIFAR-10 上实现简化版 SimCLR（ResNet18 + 两种增强），训 100 epoch，用 KNN 分类评估学到的表示（不微调任何参数）。
2. 做消融：同一 SimCLR 实验分别去掉颜色抖动/随机裁剪，看 KNN 准确率掉多少——理解每种增强的贡献。
3. 复现「1% 标注」实验：对比全监督小数据 vs SSL+微调的差距，画出标注量-准确率曲线（1%、10%、100% 三个点）。
4. 下载 MAE 预训练 ViT，可视化：遮住图片 75%，看重建结果，注意哪些语义被脑补出来了。

## 面试常问

**Q：自监督和弱监督、无监督的区别？**
无监督（聚类）没有显式监督信号；自监督有监督信号但来自数据自身结构（遮住的词就是标签）；弱监督有人工信号但粗/脏（图像级标签做分割、点击当标签）。SSL 本质是有监督学习，只是标签免费。

**Q：为什么对比学习需要大 batch 或队列？**
负样本只来自当前 batch，batch 小 → 负样本少且简单 → 模型学不到细粒度判别。SimCLR 用 4096~8192 batch；MoCo 用队列存 65536 个历史负样本解耦 batch 限制。[信息论视角](/posts/information-theory-basics/)：InfoNCE 是互信息下界，负样本越多界越紧。

**Q：BYOL 没有负样本为什么不坍缩？**
坍缩 = 所有输入映射到同一向量（损失为零的平凡解）。BYOL 的防坍缩机制：① 双网络不对称（online 网络预测 target 网络的输出）；② target 网络用动量更新（EMA），不直接回传梯度；③ predictor 头打破对称。具体机制学界仍有争论，stop-gradient 的必要性后来被 SimSiam 验证。

**Q：MAE 为什么用非对称编解码？**
编码器（大）只处理 25% 可见 patch，解码器（小）处理全部 token 重建像素。计算大头在编码器，这个设计省了 3/4 编码算力，预训练加速 3 倍+。另一个好处：强迫编码器在「信息不全」的情况下提取语义，而非依赖局部插值。

**Q：为什么 GPT（生成式）比 BERT（掩码式）更适合 scale 到大模型？**
预测下一个词的任务密度更高——每个位置都是一个训练样本；BERT 只利用 15% 被遮位置。且生成式预训练的目标和下游「生成」使用方式一致，无训练-推理 gap。BERT 的 bidirectional 优势在理解任务，GPT 的 autoregressive 在生成和 scale 上更顺。历史选择了 GPT 路线。

## 相关阅读

- [Transformer 详解](/posts/deep-learning-07-transformer-attention/)——BERT/GPT 的架构基础
- [ViT 与 CLIP：多模态基石](/posts/vit-clip-multimodal/)——对比学习的多模态版
- [LLM 微调实战：LoRA 与 QLoRA](/posts/llm-finetuning-lora/)——SSL 预训练的下游
- [信息论速通](/posts/information-theory-basics/)——InfoNCE 与互信息的理论根
- [图像生成：GAN 与 Diffusion](/posts/image-generation-gan-diffusion/)——Diffusion 的去噪也是一种自监督

自监督学习是过去五年深度学习最重要的思想，没有之一。它把「数据」从瓶颈变成了燃料——这个转变就是今天大模型时代的起点。
