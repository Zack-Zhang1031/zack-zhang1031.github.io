---
layout: page  # 或 page
title: "Milvus"
date: 2025-07-16
description: "Milvus"
tags: ["Python", "基础"]
---
**Milvus** 是一个开源的**向量数据库（Vector Database）**，专门为大规模、高性能的相似度搜索和分析而设计，常用于 AI、机器学习、自然语言处理等场景，比如图片检索、文本语义检索、推荐系统、语音识别等。

---

## Milvus 简介

* **全称**：Milvus
* **类型**：开源向量数据库（Vector Database）
* **主要用途**：管理、存储和检索海量高维向量数据
* **特点**：

  * 支持亿级别向量的高效检索
  * 支持向量和结构化数据的混合检索
  * 提供丰富的 API（Python、Java、Go、RESTful 等）
  * 支持多种索引算法（如 IVF、HNSW、ANNOY、Faiss 等）
  * 支持分布式、可扩展性强
  * 常用于 LLM（大语言模型）RAG、Embedding 搜索等 AI 场景

---

## Milvus 常见应用场景

* 向量化检索（图片、文本、音频、视频、用户画像等）
* AI 搜索引擎
* 实时推荐系统
* 知识问答（RAG）
* 语义搜索
* 近似最近邻搜索（ANN，Approximate Nearest Neighbor）

---

## 工作原理（简要）

1. **向量化**：把图片、文本等原始数据转成高维向量（如用 embedding）
2. **存储**：向量及其元数据被存储在 Milvus 中
3. **检索**：新数据也被向量化，然后用 Milvus 进行“相似度检索”（如找最接近的 K 个向量）

---

## 技术栈

* 核心用 C++ 编写，高性能
* 支持多种后端索引库：Faiss、Annoy、HNSW、NMSLIB 等
* 部署支持本地单机、Docker、K8s、云平台

---

## 生态

* 官方管理工具：Attu（Web UI）、Milvus CLI
* 可与 Pymilvus (Python SDK)、LangChain、LlamaIndex、OpenAI API 等配合使用
* 常见 Embedding 模型有 OpenAI、SentenceTransformers、Cohere、百度 ERNIE 等

---

## 示例代码（Python）

```python
from pymilvus import connections, Collection

# 连接 Milvus 服务
connections.connect("default", host="localhost", port="19530")

# 创建或连接集合
collection = Collection("my_collection")

# 向量检索（假设插入和 schema 已配置）
search_params = {"metric_type": "L2", "params": {"nprobe": 10}}
query_vectors = [[0.1, 0.2, 0.3, ...]]  # 假设为 128 维
results = collection.search(query_vectors, "embedding", search_params, limit=5)
for result in results[0]:
    print(f"ID: {result.id}, Distance: {result.distance}")
```

---

## 官方网站

[https://milvus.io/](https://milvus.io/)

---


# 1. Neo4j

**Neo4j** 是全球最流行的**图数据库**，专门用来存储和查询节点及节点间的关系（如社交网络、知识图谱、推荐系统）。

* **特点**：

  * 使用**图结构**（点和边），适合表达实体之间的复杂关联。
  * 查询语言为 Cypher，非常直观地描述图查询。
  * 支持 ACID 事务，企业级可用性。
* **典型应用**：社交网络分析、推荐引擎、知识图谱、供应链管理、欺诈检测等。
* **生态**：有丰富的可视化工具、APOC 拓展库，支持与 Python、Java、REST API 集成。

---

# 2. Milvus

**Milvus** 是开源的**向量数据库**，专为存储和高效检索大规模高维向量（embedding）设计。

* **特点**：

  * 能存储和管理亿级向量，并支持近似最近邻搜索（ANN）。
  * 常与 AI 应用（如文本、图片、音频的 embedding 检索）结合。
  * 支持分布式部署、高可扩展性、丰富的索引算法。
* **典型应用**：向量检索、语义搜索、RAG（检索增强生成）、多模态检索、推荐系统。
* **生态**：有 Pymilvus（Python SDK），兼容 LangChain、LlamaIndex 等大模型生态工具。

---

# 3. RAG / GraphRAG / HyDe 重写 / Reranker

## RAG (Retrieval-Augmented Generation)

* **全称**：Retrieval-Augmented Generation（检索增强生成）
* **原理**：结合“检索”与“生成式大模型”（如 GPT）两步：

  1. 先用向量数据库（如 Milvus）检索与用户问题相关的文档片段。
  2. 然后将检索结果和用户问题一起输入到生成模型，获得更有知识依据的答案。
* **优势**：模型可以“记住”更多知识，不受参数量限制，便于更新知识库。
* **应用**：智能问答、知识库问答、企业知识助手、RAG Copilot。

---

## GraphRAG

* **全称**：Graph-based Retrieval-Augmented Generation
* **原理**：将**知识图谱**（如 Neo4j）和生成模型结合。检索阶段不只用向量，而是利用图数据库按关系链路检索相关实体、属性和上下文，然后输入给生成模型。
* **优势**：

  * 能捕捉实体间复杂关系。
  * 检索的内容结构化、可控、溯源性强。
* **应用**：金融、医疗、复杂知识领域的问答和推理。

---

## HyDe 重写（Hypothetical Document Embeddings）

* **全称**：Hypothetical Document Embeddings
* **原理**：

  1. 给定查询时，先让大模型生成一段“假设性文档”，描述可能的答案内容。
  2. 对这段内容进行 embedding，作为新的检索向量去搜库，更精准找到相关资料。
* **用途**：提升检索准确性，解决用户问题表达和文档内容不一致时的检索难题（如“意图偏移”）。
* **常与**：RAG 结合用，提升检索-生成质量。

---

## Reranker（重排序器）

* **定义**：对初步检索到的多个候选结果，使用强模型（如 Cross-Encoder、BERT）再做一次相关性打分排序，提升最终答案质量。
* **流程**：

  1. 初筛：用向量数据库或 BM25/FAISS/Annoy 等快速检索得到 N 个候选文档。
  2. 重排序（rerank）：用大模型细致比较查询与每个文档的相关性，输出最终排序。
* **作用**：显著提升召回的相关性和答案可信度。常用在 RAG、QA 检索、推荐等场景。

---

# 总结

| 技术           | 类型     | 作用与特点                         | 典型应用       |
| ------------ | ------ | ----------------------------- | ---------- |
| **Neo4j**    | 图数据库   | 管理复杂实体关系，结构化、高效查询             | 知识图谱、关系网络  |
| **Milvus**   | 向量数据库  | 管理大规模高维向量，高效相似度检索             | 语义检索、推荐    |
| **RAG**      | 检索增强生成 | 检索相关文档 + 生成模型回答，知识灵活扩展        | QA、Copilot |
| **GraphRAG** | 图谱增强生成 | 用图数据库检索复杂关系，结构化结果 + 生成模型回答    | 高级QA、推理    |
| **HyDe**     | 检索策略   | 先生成“假设答案”，再 embedding 检索，提升匹配 | 难问题检索      |
| **Reranker** | 重排序模块  | 对初步检索结果深度打分，输出更相关排序           | QA、推荐系统    |

---

