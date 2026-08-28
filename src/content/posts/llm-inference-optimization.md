---
title: "LLM 推理优化：KV Cache、投机采样与量化——让大模型跑得快又省"
date: 2026-08-30T09:20:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "自回归推理为什么慢、KV Cache 的显存账、投机采样的加速原理、GPTQ/AWQ 权重量化、连续批处理，LLM 推理优化的完整地图。"
tags: ["LLM推理", "KV Cache", "投机采样", "量化", "vLLM"]
categories: ["AI课程", "大模型应用"]
math: false
---

部署第一个 7B 模型时我满怀期待地发了个请求，然后盯着屏幕看了 8 秒——第一个字才蹦出来。LLM 推理优化就是回答三个问题：**首 token 为什么这么慢、生成为什么这么慢、显存为什么总不够**。这三个问题的答案构成了一张完整的优化地图。

**前置阅读**：建议先读 [LLM 架构专题](/posts/llm-architecture-moe-longcontext/)、[模型压缩与部署](/posts/model-compression-deployment/)、[vLLM 调优实录](/posts/vllm-qwen-performance-tuning/)。

## 先理解：推理为什么天然慢

自回归生成的本质：**每生成一个 token 都要完整跑一遍模型**。生成 500 字 = 500 次完整前向。而且每次前向都受限于「访存」而非「计算」——batch=1 时 GPU 的算力闲置，时间全花在把 14GB 权重从显存搬进计算单元。**LLM 推理是 memory-bound，不是 compute-bound**——这句话是所有优化的总纲。

两个阶段的瓶颈还不一样：

- **Prefill**（处理 prompt）：并行计算全部输入 token，compute-bound，首 token 延迟（TTFT）由它决定。
- **Decode**（逐 token 生成）：memory-bound，吞吐量由它决定。

## KV Cache：用显存换时间

每生成一个 token，注意力要 attend 到**所有**历史 token 的 K、V 向量——不缓存的话每步都要重算全部历史的 K/V，O(n²) 变 O(n³)。KV Cache 把历史 K/V 存起来，每步只算新 token 的：

```
显存占用 = 2(K和V) × 层数 × 头数 × 头维 × 序列长 × batch × 字节数
```

7B 模型（32 层、32 头、128 维、FP16）：每 token 约 0.5MB。一个 32K 上下文的请求就要 16GB KV Cache——**长上下文时代，KV Cache 比权重还占显存**。优化方向：

- **MQA/GQA**：让多个 Q 头共享一组 K/V（GQA-8 即 8 个头共享），KV Cache 直接除 8——Qwen2/LLaMA3 全系标配，这就是为什么新模型长上下文可行。
- **KV Cache 量化**：K/V 存 INT8/FP8，再省一半（精度损失可控）。
- **PagedAttention**（vLLM 的核心）：像操作系统管理内存页一样管理 KV Cache，按需分配块，消除显存碎片——吞吐提升 2~4 倍的功臣，[vLLM 调优实录](/posts/vllm-qwen-performance-tuning/)有实测。

## 投机采样：小模型打草稿，大模型批改

Decode 慢的根源是「每 token 一次完整前向」。投机采样的思路：**用一个便宜的小模型（draft）一口气猜 5 个 token，大模型一次前向并行验证这 5 个——接受的就跳过，拒绝的从那里重猜**。

```
小模型猜：「的 天气 很 好 呀」
大模型并行验证：前 3 个接受，第 4 个拒绝 → 本轮净赚 3 个 token，用了 1+1 次前向
```

数学上保证了输出分布与大模型逐个生成**完全一致**（拒绝采样修正）——加速不掉质量。实测加速 1.5~2.5 倍，小模型和大模型越「合拍」接受率越高。Medusa（给大模型加多个预测头代替小模型）、EAGLE（特征层外推）是同思路的变体，vLLM/TensorRT-LLM 都已内置。

## 权重量化：GPTQ 与 AWQ

[模型压缩篇](/posts/model-compression-deployment/)讲了 INT8，LLM 时代卷到了 **4bit**——14GB 的 7B 变 4GB，单卡 4090 就能跑 70B（4bit 后 ~40GB）。两种主流：

- **GPTQ**：逐层用二阶信息（Hessian 近似）找最优量化点，量化误差逐层补偿。老牌稳定。
- **AWQ**：洞察是「只有 1% 的权重对输出影响大（salient），保护它们就行」——按激活幅度选重要权重保持高精度。实测略优于 GPTQ，llamafactory/vLLM 默认推荐。

```python
# 推理侧加载 AWQ 量化模型，一行的事
from vllm import LLM
llm = LLM(model="Qwen/Qwen2.5-7B-Instruct-AWQ", quantization="awq_marlin")
```

注意区分：**W4A16**（权重 4bit、激活 16bit）省显存提速 decode，主流选择；**W8A8**（权重激活都 8bit）能吃到 INT8 Tensor Core，prefill 也提速，但精度风险更高。FP8（H100 起）是新的甜点——几乎无精度损失。

## 连续批处理：吞吐的终极武器

静态批处理的问题：batch 里最长的请求决定了所有人的等待，短请求干等。**连续批处理（continuous batching）**：迭代级别的调度——某个请求生成完了立刻拔出、新请求立刻插入，GPU 永远满载。配合 PagedAttention，这就是 vLLM 相对原生 HF 吞吐高一个数量级的核心。

调度侧还有 **chunked prefill**（长 prompt 切块，和 decode 交替执行，防止一个 32K prompt 的 prefill 卡住所有人的 decode）——首 token 延迟和吞吐的再平衡。

## 优化清单：按收益排序

| 手段 | 收益 | 成本 |
|------|------|------|
| 换 vLLM/SGLang（PagedAttention + 连续批处理） | 吞吐 ×2~4 | 零（换框架） |
| GQA 模型 + KV Cache FP8 | 显存 ÷2~8 | 零（选模型/开关） |
| AWQ 4bit 量化 | 显存 ÷4，decode 提速 | 精度 ~-1% |
| 投机采样 | 延迟 ×1.5~2.5 | 需要配套小模型 |
| TensorRT-LLM 编译 | 再 +20~50% | 工程复杂度高 |
| 多卡 TP（张量并行） | 装下更大模型 | 通信开销 |

我的默认配方：**vLLM + AWQ + GQA 模型 + 连续批处理**，这套零魔改的组合能覆盖 95% 的在线服务需求。更激进的（投机采样、FP8、自研调度）在 QPS 压力大时再上。

## 踩坑排查

| 现象 | 原因 | 解法 |
|------|------|------|
| 首 token 特别慢（>5s） | 长 prompt prefill + 无 chunked prefill | 开 chunked prefill；prompt 瘦身；上下文缓存 |
| 并发一高全员变慢 | 无连续批处理 | 换 vLLM/SGLang |
| 显存爆了但模型不大 | KV Cache 随上下文膨胀 | GQA 模型、KV FP8、限制 max_model_len |
| 量化后输出质量明显降 | 校准集不典型/该层敏感 | AWQ 换校准集；或 W4A16 改 W8A8 |
| 投机采样没加速 | draft 模型太弱接受率低 | 换同系小模型（Qwen 配 Qwen）；调 draft 长度 |
| 长输出截断 | max_tokens 限制 | 检查配置，别和上下文窗口混 |

## 练习

1. 用 vLLM 加载同一模型，分别测 1/4/16 并发下的吞吐和延迟，画出扩展曲线——感受连续批处理的效果。
2. 对比 FP16 与 AWQ 模型在 10 条固定问题上的输出差异和显存占用，给质量打个主观分。
3. 估算：32 层、GQA-8（32 Q 头 4 KV 头）、128 头维、FP16，8K 上下文的 KV Cache 是多大？换成 KV FP8 呢？
4. 开/关投机采样各跑一次 500 token 生成，记录 wall time 和接受率日志。

## 面试常问

**Q：KV Cache 为什么用空间换时间是划算的？**
decode 每步 attention 需要全部历史 K/V；重算代价是 O(n²) 且每步重复。缓存后每步 O(n) 读取——显存换掉了重复计算。在 memory-bound 的 decode 阶段，读缓存的访存量远小于重算权重+QK^T 的量，净赚。

**Q：GQA 和 MQA 的区别与影响？**
MHA：每个 Q 头有自己的 K/V 头；MQA：全部 Q 头共享一组 K/V（KV Cache 除头数）；GQA：分组共享（折中）。影响：KV Cache 和访存大降（decode 提速）、质量损失 GQA 很小 MQA 略大。新模型默认 GQA，是质量与效率的甜点。

**Q：投机采样为什么「不掉质量」？**
拒绝采样保证：对 draft 猜的每个 token，以 min(1, p_target/p_draft) 概率接受，拒绝时从修正分布重采样——数学上输出分布与 target 模型自回归采样完全相同。所以它是「无损加速」，代价只是 draft 的前向开销和实现复杂度。

**Q：vLLM 的 PagedAttention 解决了什么？**
KV Cache 连续显存分配的两个浪费：① 预分配最大长度，实际用不满；② 不同长度请求的碎片。PagedAttention 把 KV Cache 切成固定大小的 block，像页表一样按需分配——显存利用率从 ~40% 提到 ~90%，等效吞吐翻倍。操作系统的虚拟内存思想搬到 LLM 推理。

**Q：什么时候该上 TensorRT-LLM 而不是 vLLM？**
vLLM 胜在迭代快、功能全（LoRA、投机采样、多模态跟进快）、易用；TRT-LLM 胜在极限性能（kernel 级融合、FP8、in-flight batching 的 NVIDIA 原生优化）。经验：QPS 成本敏感的大规模部署值得 TRT-LLM 的工程投入；快速迭代和中小规模 vLLM 足够。SGLang 在 RadixAttention（前缀共享）场景是第三选项。

## 相关阅读

- [vLLM 部署 Qwen 性能调优实录](/posts/vllm-qwen-performance-tuning/)——本文技巧的完整实战
- [LLM 架构专题：RoPE、长上下文与 MoE](/posts/llm-architecture-moe-longcontext/)——GQA 与长上下文的架构背景
- [模型压缩与部署](/posts/model-compression-deployment/)——量化的通用原理
- [LLM 微调：LoRA 与 QLoRA](/posts/llm-finetuning-lora/)——量化在训练侧的应用
- [分布式训练入门](/posts/distributed-training-basics/)——多卡推理的并行基础

推理优化的学习曲线有个特点：**每个技术都回答一个具体的瓶颈**。先 profile 你的瓶颈在哪（TTFT 还是 decode、显存还是算力），再对症选武器——无的放矢的全家桶式优化只会收获一堆维护成本。
