---
title: "MindTrip RAG 架构演进（四）：Prompt 工程与最终架构总结"
date: 2025-08-20T00:00:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "MindTrip RAG 系列最终篇，总结 Prompt 工程经验、多轮修改的 Agent 设计、最终架构全貌，以及从 MindTrip 项目中学到的核心教训。"
tags: ["RAG", "Prompt工程", "Agent", "多轮交互", "架构总结"]
categories: ["AI应用", "系统架构"]
---

[上一篇](/posts/mindtrip-rag-model-and-streaming/)聊了模型选型和 SSE 流式部署。

这是系列的最后一篇，聊 Prompt 工程、多轮交互，以及 MindTrip 最终形成的完整架构。

---

## 十二、Prompt 也经历了"越写越长 → 再砍短"的过程

最开始系统 Prompt 很长。

里面写：

- 你是一名专业旅行规划师；
- 必须考虑交通；
- 必须考虑预算；
- 必须合理安排时间；
- 不允许幻觉；
- 不允许编造；
- 必须引用资料；
- ……

一两千 Token 很快就没了。

后来我开始把约束拆成：

### 系统层

定义模型角色和输出规则。

### 检索层

提供真正可信的信息。

### 程序层

完成：

- 城市过滤；
- 数据校验；
- Token Budget；
- Schema Parsing。

### Prompt 层

只保留 LLM 真正需要理解的部分。

这是另一个非常明显的工程经验：

> **不要试图用 Prompt 修复所有架构问题。**

Prompt 可以补充系统。

Prompt 不能代替系统。

---

## 十三、多轮修改，比第一次生成更难

MindTrip 后来支持：

> 把第二天的加井岛换掉。

或者：

> 改成四天。

这时候不能简单把整个历史聊天全部丢给模型。

因为模型很容易：

> 顺便把第一天也改了。

后来更合理的思路是先识别操作类型：

```text
ReplacePlace
ChangeDays
ChangeBudget
ChangePreference
Regenerate
```

例如：

```json
{
  "action": "ReplacePlace",
  "day": 2,
  "target": "加井岛"
}
```

系统只重新计算受影响部分。

这让我发现：

> 一个成熟 Agent 系统的核心，不是无限聊天，而是把自然语言逐渐转成确定性操作。

---

## 十四、MindTrip 最后形成的架构

最终核心链路可以概括为：

```text
                 ┌─────────────┐
                 │   UniApp    │
                 └──────┬──────┘
                        │
                       SSE
                        │
                 ┌──────▼──────┐
                 │   FastAPI   │
                 └──────┬──────┘
                        │
             ┌──────────▼──────────┐
             │ Query / Constraint  │
             │      Parsing        │
             └──────────┬──────────┘
                        │
                 ┌──────▼──────┐
                 │ Metadata    │
                 │ Filtering   │
                 └──────┬──────┘
                        │
                 ┌──────▼──────┐
                 │   BGE-M3    │
                 └──────┬──────┘
                        │
                 ┌──────▼──────┐
                 │    FAISS    │
                 │ IndexFlatIP │
                 └──────┬──────┘
                        │
              ┌─────────▼─────────┐
              │ Time / Spatial   │
              │ Constraints      │
              └─────────┬─────────┘
                        │
              ┌─────────▼─────────┐
              │ Context Builder  │
              └─────────┬─────────┘
                        │
              ┌─────────▼─────────┐
              │ Qwen2.5-3B SFT   │
              │      vLLM        │
              └─────────┬─────────┘
                        │
                      SSE
                        │
                     用户
```

---

## 十五、最后：我从 MindTrip 学到的几件事

做完这套系统后，我对 RAG 最大的认识变化是：

### 1. RAG 不是"向量数据库 + LLM"

真正完整的系统还有：

- 数据清洗；
- Chunking；
- Metadata；
- Filtering；
- Retrieval；
- Context Building；
- Generation；
- Validation；
- Session；
- Streaming；
- Evaluation。

---

### 2. 相似，不代表正确

Embedding 找的是：

> "语义上像什么？"

业务系统真正关心的是：

> "这个结果能不能用？"

---

### 3. TopK 不是越高越好

更多 Context 有时候意味着：

> 更多噪声。

---

### 4. 大模型不应该承担整个软件系统

能用：

```python
if city != target_city:
    continue
```

解决的问题，就不要写 300 Token Prompt 让模型自己猜。

---

### 5. 做 RAG 最有意思的阶段，是 Demo 跑起来之后

第一次看到：

```text
Question → Retrieval → LLM → Answer
```

的时候很兴奋。

但真正的工程工作其实从这里才开始。

因为 Demo 只证明：

> **它能回答。**

而生产系统需要证明：

> **它为什么这样回答，而且大多数时候都能稳定地这样回答。**

这两个问题之间，大概就是我做 MindTrip 最大的一段成长。

---

> 系列回顾：
> - [第一篇：数据层与实体级 Chunk 设计](/posts/mindtrip-rag-data-and-retrieval/)
> - [第二篇：从语义检索到约束感知](/posts/mindtrip-rag-constraint-retrieval/)
> - [第三篇：模型选型与 SSE 流式部署](/posts/mindtrip-rag-model-and-streaming/)
> - 第四篇：Prompt 工程与最终架构总结
> - [第五篇：评测框架与混合检索对比实验](/posts/mindtrip-rag-eval-hybrid-retrieval/)
