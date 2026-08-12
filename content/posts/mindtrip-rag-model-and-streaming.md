---
title: "MindTrip RAG 架构演进（三）：模型选型与 SSE 流式部署"
date: 2025-08-18T00:00:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "MindTrip RAG 系列第三篇，讨论为什么选择 Qwen2.5-3B 而非更大模型，FastAPI + SSE 流式输出改造，以及上下文长度对 RAG 的影响。"
tags: ["RAG", "Qwen2.5", "SSE", "FastAPI", "模型部署"]
categories: ["AI应用", "系统架构"]
---

[上一篇](/posts/mindtrip-rag-constraint-retrieval/)聊了检索优化和 Context Builder。

这篇聊模型选型和部署——一个看似只是"加载模型"的环节，实际上影响了整个系统的体验。

---

## 九、模型：为什么最后用了 Qwen2.5-3B

MindTrip 最终使用的是：

```text
Qwen2.5-3B-Instruct
```

然后针对旅行任务做 LoRA 微调。

我的训练参数大致是：

```text
LoRA rank = 16
alpha = 32
dropout = 0.05

batch size = 2
gradient accumulation = 4

learning rate = 2e-4
epochs = 3
```

训练完成后进行模型合并：

```text
ZhiluAI-3B-SFT-merged
```

再交给 vLLM 部署。

这里我的想法发生过一个明显变化。

最早我天然觉得：

> 72B 肯定比 3B 好。

确实，纯模型能力一定更强。

但真正做应用后发现：

如果系统已经有：

- RAG；
- Metadata Filter；
- Prompt Constraint；
- 输出 Schema；
- 后处理；

那么模型不一定需要负责所有事情。

很多确定性的任务可以放在模型外面。

于是：

> **让小模型专心做它擅长的生成和规划，而不是让大模型承担整个软件系统。**

这是 MindTrip 后期一个非常重要的设计方向。

---

## 十、FastAPI + SSE：一次看似简单的流式输出改造

后端使用 FastAPI。

主要接口包括：

```text
/chat/stream
/chat/rag_chat
/chat/get_subject
/chat/get_chatcontent_at_subjectid
/chat/delete_subject
```

聊天记录保存在 MySQL：

```text
subject
chat_content
```

前端使用 UniApp。

最开始我做的是普通 HTTP：

```text
用户发送请求
↓
RAG
↓
LLM 生成
↓
全部生成完成
↓
返回
```

体验很差。

因为哪怕整个请求只需要几秒钟，用户看到的也是：

```text
……
……
……
```

然后突然出现一大段文字。

于是改成 SSE：

```text
FastAPI
   ↓
vLLM stream=true
   ↓
token
   ↓
token
   ↓
token
   ↓
UniApp
```

这时候我第一次真正感受到：

> **AI 产品的"性能"不完全等于总耗时。**

TTFT——第一个 Token 出来的时间——对体验的影响极其大。

一个 8 秒全部返回的系统，可能比一个 10 秒生成完成、但 700ms 就开始输出的系统显得慢得多。

---

## 十一、一个很隐蔽的坑：RAG 不是模型越长越好

部署模型的时候，我曾经很自然地想把：

```text
max_model_len
```

尽量设大。

4096、8192，甚至更高。

理论上：

> 上下文越长，能放进去的资料越多。

但现实是：

上下文不是免费的。

更大的 Context 会带来：

- 更大的 KV Cache；
- 更高显存占用；
- 更长 Prefill；
- 更差并发；
- 更高 TTFT。

最后我的思路变成：

> **不是扩大上下文去容忍烂检索，而是让检索更精准。**

这一点对 RAG 非常重要。

---

最后一篇聊 Prompt 工程和最终架构：[MindTrip RAG 架构演进（四）：Prompt 工程与最终架构总结](/posts/mindtrip-rag-prompt-and-architecture/)
