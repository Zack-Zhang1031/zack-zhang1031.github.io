---
title: "RAG 进阶：Chunking 策略、Rerank 与检索评估——从能用到好用"
date: 2026-08-30T09:50:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "分块策略的取舍、混合检索与重排序、检索质量的量化评估体系、查询改写与 HyDE、RAG 全链路调优的优先级清单。"
tags: ["RAG", "检索增强", "rerank", "chunking", "向量检索"]
categories: ["AI课程", "大模型应用"]
math: false
---

[RAG 项目复盘](/posts/rag-project-retrospective/)讲了从零搭起一个能跑的 RAG，这篇讲的是下一个阶段：上线后发现「能答但不准」——召回的文档似是而非、答案漏掉关键信息、用户换个问法就搜不到。**RAG 的效果 80% 卡在检索质量**，这篇就是检索侧的系统调优手册。

**前置阅读**：建议先读 [Milvus + Neo4j 搭建 RAG](/posts/milvus-neo4j-rag/)、[RAG 项目复盘](/posts/rag-project-retrospective/)、[Embedding 与向量数据库](/posts/embedding-vector-database/)。

## Chunking：被严重低估的第一变量

检索单元是 chunk 而不是文档——**切得不好，神仙 embedding 也救不回**。三种策略对比：

| 策略 | 做法 | 适用 |
|------|------|------|
| 定长切分 | 每 500 字符一刀，重叠 50 | 快速起步，但会切断语义 |
| 结构切分 | 按标题/段落/Markdown 层级 | 文档结构规整（手册、Wiki） |
| 语义切分 | embedding 相似度检测主题边界 | 长文无明显结构 |

实战经验：

1. **块大小没有圣杯，有范围**：200~800 字符是甜点区。太小（一句话）丢失上下文，「它于 2023 年发布」里的「它」是谁都不知道；太大（3000 字）噪声稀释检索精度。
2. **重叠（overlap）必须有**：10~20% 重叠防止答案恰好被切在边界上。
3. **元数据增强**：每个 chunk 前面拼上「文档标题 > 章节路径」（「《员工手册》> 考勤制度 > 请假流程：」）——上下文丢失问题立减，检索和生成两头受益。
4. **父子检索（进阶）**：小块负责「被搜到」（精度），命中后取它的父块喂给 LLM（上下文）。小块检索 + 大块生成，两头都要。

## 混合检索：向量和关键词各管一段

纯向量检索的盲区：**专有名词、型号、缩写、代码**——「HX-3000 的报错码 E42」这种查询，向量可能召回一堆「外形相似的报错文档」却漏掉唯一对的那篇。BM25 对这种精确匹配一击即中。

```
查询 ──┬── 向量检索 top-50 ──┐
       └── BM25 检索 top-50 ──┴── RRF 融合 ──→ top-20 ──→ rerank ──→ top-5
```

RRF（倒数排名融合）是最省心的融合法：`score = Σ 1/(k + rank_i)`，k 常取 60——不需要归一化两路分数，直接用排名。Elasticsearch/OpenSearch 和现代向量库（Milvus 2.4+、Qdrant）都内置混合检索，[NoSQL 篇](/posts/nosql-selection/)聊过 ES 的位置。

## Rerank：检索侧性价比最高的一步

向量检索是双塔：查询和文档各自编码后比相似度——快但浅。Rerank 是交叉编码器：**查询和候选文档拼在一起过模型，深度交互后打相关性分**——慢但准。两级的分工：双塔召回 top-50（快），rerank 精排 top-5（准）。

```python
from sentence_transformers import CrossEncoder

reranker = CrossEncoder("BAAI/bge-reranker-v2-m3")
pairs = [(query, doc) for doc in candidates]
scores = reranker.predict(pairs)
top5 = [doc for _, doc in sorted(zip(scores, candidates), reverse=True)[:5]]
```

我的实测：召回 top-50 + bge-reranker 精排，比纯向量 top-5 的命中率提升 15~25 个百分点——**这是 RAG 调优里投入产出比最高的一步，没有之一**。代价：每查询多 50 次前向（可用小尺寸 reranker 或批处理摊平）。

## 查询侧魔法：改写、扩展与 HyDE

用户的原始查询经常不适合直接检索（太短、口语、缺上下文）。查询侧三个技巧：

1. **查询改写**：多轮对话里「那它的价格呢」要先改写成「HX-3000 的价格是多少」——用 LLM 结合对话历史改写，成本极低效果巨大。
2. **多查询扩展**：一个查询让 LLM 生成 3 个等价问法，分别检索后合并去重——召回率提升的廉价手段。
3. **HyDE**：让 LLM 先「假装回答」生成一段假设性答案，用答案的 embedding 去检索（答案和答案更像，查询和答案有「体裁差」）。零资源场景（无微调 embedding）提升明显。

## 检索评估：没有度量就没有优化

拍脑袋调 RAG 是耍流氓。建一个 50~100 题的评估集（问题 + 标准答案 + 应命中的文档 ID），盯三个指标：

| 指标 | 含义 | 用法 |
|------|------|------|
| Recall@K | 该命中的文档进 top-K 的比例 | 检索层的核心指标 |
| MRR | 第一个命中排第几的倒数 | 排序质量 |
| Answer Faithfulness | 答案是否忠于检索内容 | 生成层（LLM-as-Judge） |

```python
def recall_at_k(retrieved_ids: list, golden_ids: list, k=5):
    hits = sum(1 for g in golden_ids if g in retrieved_ids[:k])
    return hits / len(golden_ids)
```

**分层归因是调试的核心方法**：答错了先查检索——该召回的文档在 top-50 里吗？不在 → 检索问题（chunking/embedding/混合检索）；在但没进 top-5 → rerank 问题；进了 top-5 但答错 → 生成问题（prompt/上下文组织）。逐层排查比「整体感觉不准」高效十倍。

## 调优优先级清单（按 ROI 排序）

1. **建评估集**——没有它后面都是盲人摸象
2. **Rerank**——一步提升 15~25 个点
3. **Chunk 加元数据（标题路径）**——半天工作量，两头受益
4. **混合检索（向量+BM25）**——精确匹配场景的救命稻草
5. **查询改写（多轮场景必做）**
6. **父子检索 / 语义分块**——文档结构复杂时
7. **微调 embedding**——垂直领域术语密集时（[Embedding 篇](/posts/embedding-vector-database/)）
8. **GraphRAG / 多跳**——关系型问题占比高时（[知识图谱篇](/posts/knowledge-graph-construction/)）

## 踩坑排查

| 现象 | 原因 | 解法 |
|------|------|------|
| 召回的 chunk 语义对但缺主语 | 块太小上下文丢失 | 块前拼标题路径；或父子检索 |
| 专有名词搜不到 | 向量检索盲区 | 混合检索加 BM25 路 |
| 多轮对话检索跑偏 | 指代未消解 | 查询改写先行 |
| rerank 后反而更差 | reranker 与领域不匹配 | 换多语言版/领域版 reranker；或微调 |
| 长文档答案只讲了前半 | lost in the middle | 关键 chunk 放 prompt 首尾；减 top-K |
| 评估集上分数高线上差 | 评估集泄露/分布偏差 | 定期从真实 query log 补评估集 |

## 练习

1. 对同一批文档分别用 200/500/1000 字符切块，在 30 题评估集上测 Recall@5，画出块大小曲线。
2. 实现「向量 + BM25 + RRF」混合检索（BM25 可用 rank_bm25 库），对比纯向量的召回差异，特别构造 5 个含型号/代码的查询。
3. 接入 bge-reranker，在评估集上分别报告「召回 top-50 的 Recall」和「rerank 后 top-5 的 Recall」，量化 rerank 的增益。
4. 实现查询改写：给一个三轮对话，让 LLM 把最后一问改写成独立查询，对比改写前后的检索命中率。

## 面试常问

**Q：chunk 大小怎么定？**
没有理论最优，由评估集决定。原则：块要「语义自足」（能独立读懂）且「主题单一」（一个块讲一件事）。200~800 字符是常见甜点；结构化文档按结构切优先于按长度切。评估方法：扫几个尺寸测 Recall@K，选拐点。

**Q：双塔召回和交叉编码器 rerank 的分工？**
双塔把查询和文档独立编码成向量，检索是向量近邻——可离线建索引、在线毫秒级，但查询-文档无交互，匹配是「浅」的；交叉编码器把两者拼接过 Transformer，token 级交互后打分——准但每对都要前向，只能用于小候选集。所以「双塔召回 + 交叉精排」是标准两级架构，和 [推荐系统](/posts/recommender-system-basics/)的召回-排序漏斗同构。

**Q：HyDE 为什么有效？**
查询和文档的「体裁差」：用户查询短且口语，文档长且书面——embedding 空间里同类内容但不同体裁有距离。HyDE 让 LLM 生成假设答案（体裁接近文档），用它去检索，把「问→文」匹配变成「文→文」匹配。代价：一次额外 LLM 调用；幻觉答案可能带偏（所以常结合原查询双路检索）。

**Q：RAG 的评估指标体系？**
检索层：Recall@K、MRR、nDCG；生成层：faithfulness（忠于上下文，防幻觉）、answer relevance（答了该答的）、context utilization。框架：RAGAS（自动三件套）、TruLens。工业实践：分层指标 + LLM-as-Judge + 人工抽检校准 judge。单一指标优化会顾此失彼（召回率拉满但塞爆上下文）。

**Q：什么时候该微调 embedding 而不是调检索策略？**
信号：评估集上 Recall@50 明显低（候选阶段就丢了），且 badcase 集中在「领域术语理解」（如医疗同义词、行业黑话）。微调（对比学习，几百~几千对正样本）能把领域语义注入 embedding。如果 Recall@50 高而 top-5 差，问题在精排不在召回——别微调，上 rerank。

## 相关阅读

- [Milvus + Neo4j 搭建 RAG 知识库](/posts/milvus-neo4j-rag/)——基础设施搭建
- [RAG 项目复盘](/posts/rag-project-retrospective/)——从零到一的完整过程
- [Embedding 模型与向量数据库](/posts/embedding-vector-database/)——检索的两个核心组件
- [知识图谱构建实战](/posts/knowledge-graph-construction/)——多跳问题的另一条腿
- [Prompt Engineering 实战](/posts/prompt-engineering-practice/)——生成侧的配套优化

RAG 是个「系统」，不是「模型」——它的效果曲线由最弱的那一环决定。建评估、分层归因、按 ROI 动刀，这套方法论比任何单点技巧都值钱。
