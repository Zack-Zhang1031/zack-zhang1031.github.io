---
title: "MindTrip RAG 架构演进（二）：从语义检索到约束感知"
date: 2025-08-12T00:00:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "MindTrip RAG 系列第二篇，分析 TopK 调参的坑、从 Semantic Search 到 Constraint-aware Retrieval 的演进，以及 Context Builder 的设计。"
tags: ["RAG", "AI", "检索优化", "约束过滤", "Context Builder"]
categories: ["AI应用", "系统架构"]
---

[上一篇](/posts/mindtrip-rag-data-and-retrieval/)聊了数据层和 Chunk 策略。

系统跑起来以后，真正的坑才刚开始。

这一篇重点讲检索链路的演进。

---

## 五、第一个大坑：TopK 并不是越大越好

最开始我的想法非常自然：

> TopK 越大，给模型的信息越多，应该越准确。

于是从：

```text
TopK = 4
```

调整到：

```text
TopK = 6
```

甚至尝试召回更多候选。

结果答案并没有稳定变好。

有时候反而更差。

原因其实很简单。

假设用户问：

> 万宁三天怎么玩？

召回结果可能是：

```text
1. 石梅湾
2. 日月湾
3. 加井岛
4. 大洲岛
5. 南燕湾
6. 神州半岛
```

这些都相关。

问题是：

**它们太相关了。**

模型看到六个"值得去的景点"，很容易产生一种朴素逻辑：

> 都很好，那就都塞进去。

于是三天行程被生成成一天跑四五个地方。

这让我第一次清楚意识到：

> **RAG 的召回相关性和最终任务质量不是一回事。**

旅游规划不是搜索引擎。

---

## 六、从 Semantic Search 变成 Constraint-aware Retrieval

后来我把检索链路逐渐改成：

```text
用户问题
   ↓
Query Parsing
   ↓
城市过滤
   ↓
Metadata Filter
   ↓
BGE-M3 Semantic Retrieval
   ↓
时间 / 空间约束
   ↓
候选景点
   ↓
Context Builder
   ↓
LLM
```

比如用户指定：

```text
city = 万宁
```

那第一件事就不是让 BGE-M3 在整个数据库里面找。

而是：

```text
先缩小城市范围。
```

否则一个"海景不错、适合情侣"的查询，完全可能召回：

- 三亚；
- 厦门；
- 青岛；
- 北海；

的内容。

语义完全正确。

业务完全错误。

这也是我后来越来越认同的一句话：

> **能用数据库过滤解决的问题，不要全部交给 Embedding。**

---

## 七、RAG 最大的敌人有时候不是幻觉，而是"语义正确"

比如：

> 想找适合老人、不要走太多路的景点。

Embedding 很可能召回：

> "风景绝美，非常适合徒步爱好者……"

因为：

- 景点；
- 风景；
- 游玩；
- 户外；

这些语义高度相关。

但业务上却完全相反。

所以旅游 RAG 需要把很多信息结构化：

```text
city
category
duration
suitable_for
activity_level
latitude
longitude
```

之后：

**向量检索负责"像不像"。**

**结构化过滤负责"能不能"。**

这两个概念差别非常大。

---

## 八、Context Builder 比我预想的更重要

一开始我把所有召回结果：

```python
"\n\n".join(documents)
```

直接塞给模型。

后来发现非常粗暴。

于是增加 Context Builder。

它负责：

1. 去掉重复景点；
2. 保留实体名称；
3. 控制 Token Budget；
4. 保留来源 URL；
5. 尽量留下游玩时长和空间信息；
6. 对候选资料进行结构化。

例如最终上下文更接近：

```text
[1]
景点：石梅湾
城市：万宁
类型：海湾
建议时长：3-4小时
特点：沙滩、摄影、情侣
来源：...

[2]
景点：日月湾
城市：万宁
类型：海湾、冲浪
建议时长：半天
特点：冲浪
来源：...
```

而不是几千字杂乱网页文本。

结果模型的规划稳定性明显比"原文拼接"更好。

---

下一篇聊模型选型和流式部署：[MindTrip RAG 架构演进（三）：模型选型与 SSE 流式部署](/posts/mindtrip-rag-model-and-streaming/)
