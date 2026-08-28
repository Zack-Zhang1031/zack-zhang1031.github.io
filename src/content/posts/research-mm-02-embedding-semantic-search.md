---
title: "多模态科研内容理解 02：文本 Embedding 与语义检索"
date: 2026-08-28T23:00:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "AI 科研内容课程系列四第 2 课：用 Embedding 模型把论文摘要变成语义向量，实现「按意思搜论文」——向量生成、归一化、最近邻检索与检索质量评测。"
tags: ["Embedding", "语义检索", "向量搜索", "sentence-transformers"]
categories: ["AI课程", "多模态理解"]
math: true
---

TF-IDF 时代的检索有个硬伤：搜"language model"找不到通篇只写"LLM"的论文——关键词匹配只看字面，不懂意思。这一课用语义向量（Embedding）解决它，给平台装上"按意思检索"的能力。这也是系列五 RAG 服务的直接前奏。

> 前置阅读：[NLP 综合篇](/posts/nlp-comprehensive-guide/)（词向量到上下文向量的演进）、[Milvus + Neo4j RAG 实战](/posts/milvus-neo4j-rag/)（向量库选型的完整对比）。

## Embedding 的直觉：语义变成几何

Embedding 模型把一段文本映射成一个向量（比如 1024 维），训练目标决定了它的几何性质：**语义相近的文本，向量在空间里的夹角小**。于是"语义检索"变成了一道几何题——查询文本也变成向量，找夹角最小的文档向量。

$$ \text{sim}(q, d) = \frac{q \cdot d}{\|q\| \|d\|} $$

余弦相似度取值 [-1, 1]，实际语义检索场景大多落在 0.3-0.9 区间。L2 归一化之后，余弦相似度退化为点积，计算更便宜。

## 生成向量：sentence-transformers 上手

科研文本是英文为主的学术语言，选型上 bge / e5 / gte 系列的多语言或英文模型都合适，本课用 bge-large-en 举例：

```python
from sentence_transformers import SentenceTransformer
import numpy as np

model = SentenceTransformer("BAAI/bge-large-en-v1.5")

def embed(texts: list[str], batch_size: int = 64) -> np.ndarray:
    emb = model.encode(texts, batch_size=batch_size,
                       normalize_embeddings=True,    # 直接归一化
                       show_progress_bar=True)
    return emb.astype(np.float32)

# 平台的检索单元：标题 + 摘要拼接
docs = df["title"] + ". " + df["abstract"].fillna("")
embeddings = embed(docs.tolist())
np.save("data/features/embeddings_bge.npy", embeddings)
```

工程注意点：

**批量生成 + GPU。** 逐条 encode 慢一个数量级；有 GPU 时十万条约几十分钟，CPU 上按小时计。

**向量落盘带元信息。** `.npy` 矩阵的行序必须和 paper_id 列表严格对齐——存矩阵的同时存一份 `ids.npy`，错位了检索结果就是张冠李戴，而且这种 bug 不报错。

**检索文本是什么很重要。** 标题+摘要拼接是信息量和长度的平衡点；全文太长（超模型上下文，噪音还多），纯标题信息不足。系列四第 5 课会对比不同检索单元的实验。

## 检索：先暴力，再索引

十万级向量（1024 维 float32 ≈ 400MB），暴力点积完全够用且结果精确：

```python
def search(query: str, topk: int = 10):
    q = embed([query])                          # (1, 1024)
    scores = embeddings @ q.T                   # 归一化后点积=余弦
    top = np.argsort(-scores.ravel())[:topk]
    return [(paper_ids[i], float(scores[i])) for i in top]

search("efficient fine-tuning of large language models")
```

`embeddings @ q.T` 一行做完十万次相似度——NumPy 的矩阵乘法在这里就是最强的检索引擎。规模到百万级以上再换 Faiss/Milvus 的近似索引（选型见 [Milvus 实战](/posts/milvus-neo4j-rag/)），**在小规模上提前引入索引是过度设计**。

## 评测：检索质量不能凭感觉

"看着挺相关"不是评估。造一个小评测集：20 个查询，每个人工标 3-5 篇相关论文，算两个指标：

- **Recall@10**：相关论文有多少出现在前 10 结果里。
- **MRR（平均倒数排名）**：第一个相关结果排第几的倒数的平均——排第 1 得 1 分，排第 10 得 0.1 分。

```python
def recall_at_k(results, relevant, k=10):
    return len(set(results[:k]) & set(relevant)) / len(relevant)
```

评测集是后续所有改进的裁判：换模型（bge → e5）、换检索单元（摘要 → 全文章节）、加混合检索，每一步都要在这 20 个查询上出分。完整的混合检索对比实验见本站的 [MindTrip RAG 评测篇](/posts/mindtrip-rag-eval-hybrid-retrieval/)——那里的结论是向量+BM25 混合通常优于单一检索，平台后续也会走到那一步。

## 和 TF-IDF 基线对比：语义到底赢在哪

在同一个评测集上跑 TF-IDF 检索作对照，典型差异模式：

- 查询与文档**用词不同但语义相同**（"LLM" vs "large language model"）：Embedding 完胜。
- 查询含**精确专有名词/编号**（"BERT-base 的 hidden size"）：TF-IDF 反而可能更准——Embedding 对字面精确匹配不敏感。

这个对比是混合检索的动机，也是"没有银弹"的最好教案：**两种检索的失败模式正好互补**。

## 踩坑排查

| 症状 | 原因 | 处理 |
|---|---|---|
| 检索结果张冠李戴 | 向量矩阵和 id 列表错位 | 矩阵 + ids 成对存取，加载后校验长度 |
| 相似度分数全挤在 0.5+ | 没归一化/模型输出特性 | normalize_embeddings=True；分数看相对序 |
| 精确术语搜不到 | Embedding 弱于字面匹配 | 混合检索（向量 + BM25） |
| 长摘要截断 | 超模型 max_seq_length | 明确截断策略（标题必保 + 摘要截断） |
| 批量 encode 显存爆 | batch_size 太大 | 降 batch；CPU 模式加 num_workers |
| 换模型后分数口径变了 | 不同模型分数分布不同 | 阈值按模型重标定，别沿用 |

## 作品集证据

本课产出：可运行的语义检索函数 + 带指标的评测集 + Embedding vs TF-IDF 的失败模式对比分析。这套东西是 RAG 岗位面试的标准考题素材。

## 练习

1. 用两个不同的 Embedding 模型生成向量，在同一评测集上对比 Recall@10。
2. 实现 TF-IDF 检索基线，找出 Embedding 输而 TF-IDF 赢的 3 个查询，归纳模式。
3. 把向量存成 Parquet 列（list<float>）而不是 .npy，对比加载速度和灵活性。
4. 实现最简单的混合检索：向量分数与 BM25 分数各自归一后加权，扫权重看 Recall 变化。

## 面试常问

**Q：Embedding 检索和关键词检索的本质区别？**
关键词匹配基于词项重合（字面），Embedding 基于语义空间的距离（意思）。前者的失败模式是词汇鸿沟，后者的失败模式是精确信息丢失。生产系统的答案是混合检索加权重排。

**Q：为什么归一化后点积等于余弦相似度？**
余弦定义是两向量点积除以模长乘积；模长都为 1 时分母为 1，点积即余弦。归一化让相似度计算从 O(d) 的除法变成纯矩阵乘法，批量检索时性能差异显著。

**Q：向量检索的评估指标？**
Recall@K（前 K 结果覆盖多少相关项，面向"找全"）、MRR/NDCG（相关项排得多靠前，面向"排好"）。检索作为 RAG 上游时主要看 Recall——漏掉的相关文档，下游生成环节救不回来。

**Q：什么规模需要专门向量索引？**
经验线：十万级暴力精确检索毫秒级完成，完全够用；百万级开始考虑 Faiss 的 IVF/HNSW 近似索引；千万级以上或需要服务化、过滤混合查询时上 Milvus 等向量数据库。近似索引用微小的召回损失换数量级的速度。

---

下一课：[多模态科研内容理解 03：深度学习文本模型——当 Embedding 遇上微调](/posts/research-mm-03-deep-text-models/)。
