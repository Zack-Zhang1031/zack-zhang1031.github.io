---
title: "LLM 架构专题：RoPE 位置编码、长上下文扩展与 MoE 稀疏化"
date: 2026-08-30T08:20:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "从正弦编码到 RoPE 的演进直觉、YaRN 等长上下文扩展技术、MoE 混合专家的路由机制，一次讲透现代 LLM 的三个架构支柱。"
tags: ["RoPE", "MoE", "长上下文", "LLM架构", "Transformer"]
categories: ["AI课程", "深度学习"]
math: false
---

读 LLM 架构论文，绕不开三个词：RoPE、长上下文、MoE。它们分别回答现代大模型的三个问题：**位置信息怎么编码、上下文怎么变长、参数怎么变多而不变贵**。Qwen、DeepSeek、Mixtral 的架构报告拆开看，创新点基本都在这三个战场上。

这篇把三个主题串起来讲——它们表面独立，实则都在解决「scale」的不同侧面。

**前置阅读**：建议先读 [Transformer 详解](/posts/deep-learning-07-transformer-attention/)、[ViT 与 CLIP](/posts/vit-clip-multimodal/)。

## 一、位置编码：注意力本身是「瞎」的

自注意力有个先天缺陷：**它是集合运算，不包含顺序信息**——「狗咬人」和「人咬狗」的注意力矩阵完全一样。必须显式注入位置。

**正弦绝对编码**（原始 Transformer）：给每个位置算一个固定的正弦向量加到 embedding 上。问题：模型学的是「绝对位置编号」，文本超过训练长度后位置没见过，直接崩。

**RoPE（旋转位置编码）**——现在的绝对主流（LLaMA/Qwen/DeepSeek 全系）的思路转变：**不编码「我在哪」，编码「我们俩离多远」**。把 Q、K 向量的每两维看成一个复数，按位置做旋转；点积时旋转角度差自然变成相对距离的信息。直觉：与其告诉每个人「你是 3 号」，不如在计算时体现「他比你早来两个位置」。

```python
import torch

def apply_rope(x: torch.Tensor, pos: torch.Tensor, base=10000):
    # x: (B, L, heads, dim)，dim 必须偶数
    d = x.shape[-1]
    inv_freq = 1.0 / (base ** (torch.arange(0, d, 2).float() / d))
    # freqs: (L, d/2) —— 位置 × 频率
    freqs = torch.outer(pos.float(), inv_freq)
    cos, sin = freqs.cos(), freqs.sin()
    x1, x2 = x[..., 0::2], x[..., 1::2]   # 偶数位/奇数位配对
    rot = torch.stack([-x2, x1], dim=-1).flatten(-2)  # 旋转 90° 的配对
    return x * cos.repeat_interleave(2, -1)[None, :, None, :] + \
           rot * sin.repeat_interleave(2, -1)[None, :, None, :]
```

RoPE 的实际优点：相对位置天然融入、无需学习参数、衰减特性让模型自然更关注近处（符合语言直觉）。**代价：位置被「旋转频率」编码，最大频率限定了外推能力**——训练时最长 4K，推理直接喂 32K，高频分量的位置表示就乱了，这就是长上下文问题的根源。

## 二、长上下文：让 4K 训练的模型读 128K

上下文长度 = 模型能「同时考虑」的 token 数，它决定能不能喂整本书、整库代码。注意力 O(n²) 的计算成本是一难，**RoPE 的位置外推失败**是更本质的一难。主流解法沿着「调整旋转频率」展开：

| 方法 | 思路 | 代价 |
|------|------|------|
| 位置插值（PI） | 把长位置线性压缩进训练范围（32K 的位置除以 8 当 4K 用） | 高频信息被压缩，短距离分辨力略降 |
| NTK 缩放 | 高频少缩、低频多缩（保留近处分辨率） | 免微调可用，但有上限 |
| YaRN | NTK + 温度修正 + 分频段处理 | 当前主流，Qwen/LLaMA 系采用 |
| 长文本微调 | 直接在长文本上继续训练 | 效果最好，成本最高 |

工程现实：**「宣称 128K」不等于「128K 都好用」**。中间位置的注意力衰减是真实存在的——「lost in the middle」实验表明模型对长文档开头和结尾的内容利用最好，中间最差。RAG 场景把关键文档放开头或结尾、别埋中间，就是这个结论的直接应用。

另一个方向是改架构本身：滑动窗口注意力（每层只看近处 4K，信息层层传递）、Mamba 等线性复杂度状态空间模型。但 2026 年的现实是**全注意力 + RoPE 扩展仍是绝对主流**，替代品还没证明能在大规模上全面胜出。

## 三、MoE：参数翻倍、计算不变的魔法

稠密模型每个 token 激活全部参数——7B 模型每个 token 都过 70 亿参数。MoE（Mixture of Experts）的思路：**把 FFN 层换成 N 个「专家」小 FFN，每个 token 由一个路由器挑 top-k 个专家来算**。

```python
# MoE 前向的骨架（每个 token 独立路由）
router_logits = router(x)                    # (n_tokens, n_experts)
topk_experts, topk_weights = router_logits.topk(k=2, dim=-1)
topk_weights = softmax(topk_weights)
output = sum(w_i * expert_i(x) for i, w_i in zip(topk_experts, topk_weights))
```

Mixtral 8x7B：8 个专家、每 token 选 2 个——总参数 47B，但每 token 只激活约 13B。**用 13B 的推理成本买 47B 的知识容量**，这就是 DeepSeek-V3（671B 总参、37B 激活）和 Qwen-MoE 系列的核心算术。

代价在暗处：

1. **显存不省**：推理快但总参数要全装下——Mixtral 需要 ~90GB 显存（FP16），省算力不省显存。
2. **负载均衡**：路由器可能「偏心」——少数专家被疯狂选中，多数饿死。训练时加 load balancing loss 惩罚不均匀；推理时专家容量（capacity factor）满了直接丢 token。
3. **微调更难**：路由的不稳定性让 MoE 微调比稠密模型娇气（[LoRA 篇](/posts/llm-finetuning-lora/)里冻结路由器是常用技巧）。
4. **通信开销**：分布式部署时专家分散在不同卡上（专家并行），token 在卡间搬运，网络成为瓶颈。

## 三者合观：scale 的三条战线

回头看，这三个主题是一条主线的三个侧面——**如何在可控成本下扩大模型能力**：

- RoPE/位置编码：让「序列维度」的信息表示不拖后腿；
- 长上下文：扩展序列维度的 scale（4K → 1M）；
- MoE：扩展参数维度的 scale（13B 成本 ↔ 671B 容量）。

读任何新模型架构报告，先找这三个答案：位置编码用的什么、上下文怎么扩展的、稠密还是 MoE——架构的骨架就抓住了，剩下的都是细节调优。

## 踩坑排查

| 现象 | 原因 | 解法 |
|------|------|------|
| 微调后长文本输出乱码 | RoPE base 未随训练长度调整 | 长文本微调要调 rope_theta 或开 YaRN |
| 32K 文档中间内容被忽略 | lost in the middle | 关键信息放首尾；或分段+重排 |
| MoE 模型推理显存爆了 | 只看激活参数量估显存 | 总参数全加载，按总参数量估显存 |
| MoE 微调 loss 不降反升 | 路由器被一起训坏 | 冻结 router，用更小 lr |
| 位置插值后短文本效果变差 | PI 压缩了高频，近距分辨力下降 | NTK/YaRN 替代线性 PI |

## 练习

1. 用文中的 RoPE 代码对一个随机向量应用不同位置的旋转，验证「点积只依赖位置差」——两个位置同时 +10，点积不变。
2. 找一个开源小模型（Qwen2.5-0.5B），对比它对「关键句在开头/中间/结尾」三种布局的 10K 文档问答准确率，亲手复现 lost in the middle。
3. 加载 Mixtral 或 Qwen-MoE 模型，用 `output_router_logits=True` 观察不同 token 的专家选择分布——标点、名词、动词各去哪类专家？
4. 估算题：一个 8 专家 top-2 的 MoE，单专家 7B，问总参数、激活参数、FP16 显存需求各是多少？和同激活量的稠密模型比推理 FLOPs。

## 面试常问

**Q：RoPE 相比绝对位置编码的优势？**
① 相对位置内禀：点积只含位置差，符合「语言关心相对距离」的直觉；② 无需学习参数，不占用训练容量；③ 远程衰减特性自然形成局部性偏好；④ 配合缩放技术（NTK/YaRN）可外推到更长上下文。代价：外推不是免费的，超训练长度仍需干预。

**Q：长上下文的主要技术路线和取舍？**
位置编码扩展（PI/NTK/YaRN，便宜但有损）、长文本续训（效果好但贵）、注意力近似（滑窗/稀疏，省算力但丢全局）、外挂检索（RAG 绕开问题）。实践组合：YaRN 调频 + 少量长文本微调是性价比之选；超长（1M）场景目前靠工程妥协（分段、检索、重排）。

**Q：MoE 为什么省计算不省显存？**
计算按「激活参数」计——每 token 只过 top-k 专家，FLOPs 与激活量成正比；显存按「总参数」计——所有专家权重都要驻留显存以备被路由选中。所以 MoE 的甜蜜点是「推理算力受限但显存充裕」的场景（比如单卡大显存服务）；显存紧张时反而不如稠密小模型。

**Q：MoE 的负载均衡为什么重要？**
路由是学出来的，若不加约束会塌缩：少数专家赢者通吃（被选多→被训多→更强→被选更多），其余专家退化，模型等效容量大跌。辅助损失（load balancing loss）惩罚专家使用率的方差；router z-loss 防 logits 过大；推理侧 capacity factor 限制单专家最大 token 数。DeepSeek-V3 还用了「无辅助损失的偏置调整」策略。

**Q：注意力复杂度 O(n²) 的实际影响多大？**
标准注意力在 128K 上下文时，注意力矩阵 128K×128K = 164 亿元素——光存它就 FP16 32GB。所以推理侧有 KV Cache 优化（[推理优化篇](/posts/llm-inference-optimization/)）、训练侧有 FlashAttention（不实体化 N×N 矩阵，分块在线 softmax，把显存降到 O(n)）——FlashAttention 是「不省 FLOPs 但省显存和访存」的工程奇迹，它让长上下文训练从不可能变成日常。

## 相关阅读

- [Transformer 详解](/posts/deep-learning-07-transformer-attention/)——自注意力的起点
- [LLM 推理优化](/posts/llm-inference-optimization/)——KV Cache 与 FlashAttention 的推理侧
- [LLM 微调：LoRA 与 QLoRA](/posts/llm-finetuning-lora/)——MoE 与长文本微调的实操
- [Tokenizer 与 BPE](/posts/tokenizer-bpe/)——序列长度的另一个维度
- [分布式训练入门](/posts/distributed-training-basics/)——MoE 专家并行的基础设施

架构演进史读多了会发现规律：**每个「革命性」创新都是对某个具体瓶颈的精准手术**。RoPE 手术位置外推，MoE 手术参数成本——先看清瓶颈，再欣赏手术刀。
