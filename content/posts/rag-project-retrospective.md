---
title: "RAG 项目复盘：从 Milvus + Neo4j 到一套可用的知识问答系统"
date: 2026-04-20T00:00:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "把前一篇 RAG 概念笔记扩展为完整的项目复盘：架构选型、Embedding 模型对比、召回优化、Reranker 接入，以及上线后遇到的工程问题。"
tags: ["AI", "RAG", "Milvus", "Neo4j", "项目复盘", "大模型应用"]
categories: ["AI", "项目复盘"]
---

之前写过一篇 [Milvus + Neo4j 构建 RAG 知识图谱实战](/posts/milvus-neo4j-rag/) 的概念梳理，这篇是它的"实战续集"——记录我真正动手搭一套 RAG 知识问答系统的全过程。从架构选型、Embedding 模型对比，到召回率优化和 Reranker 接入，再到上线后遇到的工程问题，尽量把"概念笔记"里没法讲的细节补上。

---

## 一、项目背景与目标

这次的需求很具体：给一个内部团队搭建知识库问答系统，数据来源包括技术文档（Markdown / Confluence 导出）、FAQ（Excel）、产品手册（PDF），合计约 5000+ 篇文档，总量约 120 万字。用户提问主要围绕"某个功能怎么用"、"某报错怎么处理"、"某接口的入参是什么"这类检索型问题。

评估指标在项目启动前就定好，避免后面靠"感觉好用"自欺欺人：

- **召回率（Recall@5）**：用 100 条人工标注的查询，统计正确答案出现在前 5 个召回结果里的比例
- **答案准确率**：人工标注 200 条问答对，按"完全正确 / 部分正确 / 错误 / 拒答"四档评分
- **端到端延迟**：从用户提交查询到首字返回的 P95 延迟，目标 ≤ 3 秒

最终实测数据：Recall@5 = 0.87，答案准确率（完全正确+部分正确）= 0.79，P95 延迟 2.8 秒。

---

## 二、架构设计

整体数据流：

```
文档 → 切片 → Embedding → Milvus（向量检索）
                  ↓
            Neo4j（实体关系）
                  ↓
              融合召回
                  ↓
             Reranker 重排
                  ↓
          LLM 生成答案（流式）
```

**为什么选 GraphRAG 而非纯向量 RAG？** 这个项目里文档之间有明确的引用关系和层次结构——比如"API 文档 → 错误码定义 → 处理方案"是三层关联，纯向量检索经常只召回某一层，而图检索可以顺着引用关系把上下文都带出来。但我也承认这个选择有代价（后面会讲），如果重来会更谨慎。

具体分工：

- **Milvus**：负责语义相似度检索，top 20 候选
- **Neo4j**：负责实体关系扩展，从命中的实体节点出发，沿着 `REFERENCES`、`INSTANCE_OF` 等关系走 ≤2 跳，把关联文档拉出来
- **融合层**：去重后送入 Reranker 重排，取 top 5 喂给 LLM

---

## 三、Embedding 模型选型与对比

这是项目里最纠结的一步。候选模型对比：

| 模型 | 维度 | 中文效果 | 速度 | 部署方式 | 单价 |
|------|------|----------|------|----------|------|
| OpenAI text-embedding-3-small | 1536 | 好 | 快 | API 依赖 | $0.02 / 1M token |
| BGE-large-zh-v1.5 | 1024 | 优秀 | 中 | 可本地 | 免费 |
| SentenceTransformers paraphrase-multilingual | 768 | 中等 | 快 | 可本地 | 免费 |
| ERNIE-Embedding-v1 | 768 | 优秀 | 中 | API 依赖 | ¥0.0004 / 千 token |

我用 50 条中文测试 query + 500 候选文档做评估，BGE-large-zh-v1.5 在 Recall@5 上比 OpenAI 高 3 个百分点（中文场景下），而且可本地部署、无 API 成本、无数据外流。最终选了它。

不过 BGE 也有坑：维度 1024 比 OpenAI 的 1536 小，理论上信息容量小一些；CPU 推理速度慢，单条 query 约 80ms，必须上 GPU 才能扛住高并发。我们部署了一台 4090 服务器专门跑 Embedding 和 Reranker。

---

## 四、文档切分策略

切分策略直接决定召回质量上限。我对比了几种方案：

### 固定长度 vs 语义切分

- **固定长度（512 token）**：实现简单，但会从句子中间切断，破坏语义
- **语义切分（按段落/标题）**：保留语义完整性，但 chunk 长度差异大，影响检索稳定性

最终采用了**混合策略**：优先按 Markdown 标题切分，单 chunk 超过 512 token 再按段落二次切分；少于 50 token 的小 chunk 与相邻 chunk 合并。

### Chunk size 实验

| Chunk size | Recall@5 | 备注 |
|------------|----------|------|
| 256 | 0.78 | 短上下文，LLM 缺信息 |
| 512 | 0.87 | 最佳平衡点 |
| 1024 | 0.83 | 单 chunk 信息过多，检索精度下降 |

`overlap` 设为 chunk_size 的 20%（即 100 token），避免边界信息丢失。

### 特殊处理

- **表格**：作为整体不切分，转成 Markdown 表格语法喂给 LLM
- **代码块**：作为整体保留，前后加自然语言说明
- **PDF 中的图片**：调用 OCR 提取文字，作为附加 chunk

---

## 五、召回优化

### HyDe 重写

HyDe（Hypothetical Document Embeddings）的思路是：让 LLM 先根据 query 生成一个"假想答案"，再用这个假想答案的 Embedding 去检索。对复杂查询效果明显——比如"某个功能在哪个版本引入的"，直接检索 query 召回的往往是 changelog 之外的文档，而 HyDe 生成的假想答案更接近 changelog 的语言风格。

实测 Recall@5 提升 4 个百分点，但增加 1-2 秒延迟（LLM 生成时间）。最终做成可选开关，默认对长度 > 15 字的复杂 query 开启。

### 多路召回融合

```python
def hybrid_retrieve(query: str, top_k: int = 20):
    # 1. 向量召回
    vec_hits = milvus.search(query_embedding(query), top_k=top_k)
    # 2. BM25 召回
    bm25_hits = bm25.search(query, top_k=top_k)
    # 3. 图谱扩展
    graph_hits = neo4j.expand_entities(extract_entities(query), hops=2)
    # 4. 去重融合（按文档 ID）
    all_hits = dedup_by_doc_id(vec_hits + bm25_hits + graph_hits)
    return all_hits
```

向量检索抓语义相似，BM25 抓关键词精确匹配（对错误码、版本号这种很关键），图检索抓关联上下文。三者互补，融合后 Recall@5 从 0.81 提升到 0.89。

### Reranker 接入

召回的 40 条候选直接喂给 LLM 会有两个问题：上下文太长导致幻觉、关键信息被淹没。我用 `bge-reranker-large` 对 40 条候选重排，取 top 5。

```python
from FlagEmbedding import FlagReranker

reranker = FlagReranker("BAAI/bge-reranker-large", use_fp16=True)

def rerank(query: str, candidates: list[str], top_k: int = 5):
    pairs = [[query, c] for c in candidates]
    scores = reranker.compute_score(pairs, normalize=True)
    ranked = sorted(zip(candidates, scores), key=lambda x: -x[1])
    return ranked[:top_k]
```

重排 40 条约 200ms，可接受。最终 Recall@5 在重排后稳定在 0.87（略低于召回阶段是因为 Reranker 偶尔会把正确答案排到第 6 名之外，但答案准确率反而提升了——因为 top 5 的精度更高）。

---

## 六、工程化与上线

### API 设计

```python
from fastapi import FastAPI
from fastapi.responses import StreamingResponse

app = FastAPI()

@app.post("/api/chat")
async def chat(req: ChatRequest):
    async def stream():
        # 1. 检索
        candidates = await hybrid_retrieve(req.query)
        top_k = rerank(req.query, candidates)
        # 2. 构造 prompt
        context = "\n\n".join([c.text for c in top_k])
        prompt = f"仅基于以下内容回答用户问题。如果内容中没有答案，请直接说'未找到相关信息'。\n\n内容：\n{context}\n\n问题：{req.query}"
        # 3. 流式生成
        async for token in llm.stream_complete(prompt):
            yield f"data: {token}\n\n"
    return StreamingResponse(stream(), media_type="text/event-stream")
```

用 SSE（Server-Sent Events）做流式输出，首字延迟从 2.5 秒降到 0.7 秒，体感差异巨大。

### 延迟优化

- **Embedding 缓存**：相同 query 命中 Redis 缓存，节省 80ms
- **异步召回**：向量检索、BM25、图检索三个任务用 `asyncio.gather` 并发执行
- **流式生成**：LLM 不等全部生成完再返回，而是边生成边推

端到端延迟分布：检索 0.5s + 重排 0.2s + 生成 1.8s = 平均 2.5s（P95 2.8s）。

### 监控

- **请求日志**：每次请求记录 query、召回结果、生成答案、耗时
- **召回命中率**：统计 top 5 候选是否包含人工标注的正确文档
- **用户反馈**：每条答案下方有"👍/👎"按钮，负反馈自动入库用于后续优化

---

## 七、踩坑记录

### Milvus 连接池不稳定

Milvus 2.4.0 版本的 Python SDK 有连接泄漏问题，运行几天后会报 `RpcError`。升级到 2.4.4 + 加重连机制解决：

```python
from pymilvus import connections
import time

def safe_connect():
    for attempt in range(3):
        try:
            connections.connect(alias="default", uri=MILVUS_URI)
            return
        except Exception as e:
            if attempt == 2:
                raise
            time.sleep(2 ** attempt)
```

### 召回结果重复

chunk overlap 导致同一篇文档的多个 chunk 都被召回，top 5 里可能有 3 条是同一篇文档的不同片段。**按文档 ID 去重**，每个文档只保留分数最高的 chunk。

### 生成幻觉

LLM 偶尔会编造检索结果中不存在的信息，比如把"v2.3 版本"说成"v2.5 版本"。Prompt 严格限制 + 在 system prompt 里反复强调"仅基于以下内容回答，不得添加任何外部知识"后缓解了 80%。剩下的幻觉靠后处理规则（如版本号正则匹配校验）兜底。

### Neo4j Cypher 查询超时

实体扩展查询偶尔会跑出 30 秒以上的慢查询。原因是某些高频实体（如"用户"）关联节点过多，导致 hop 扩展爆炸。解决：

- 限制跳数 `hop ≤ 2`
- 给关键关系属性建索引
- 单实体关联节点数 > 100 时跳过该实体

---

## 八、复盘与下一步

### 效果评估

- **Recall@5 = 0.87**：达标，剩余 13% 主要是新词/缩写导致的召回失败
- **答案准确率 = 0.79**：核心问题类型表现良好，复杂跨文档推理问题仍较弱
- **用户满意度（内部调研）= 4.1/5**：主要扣分点在延迟和复杂问题的答非所问

### 如果重来的架构调整

**先做纯向量 RAG，再引入图**。GraphRAG 对结构化知识（关系明确的实体网络）效果显著，但维护成本高——图谱构建、实体抽取、关系更新都需要持续投入。如果重来，我会先用纯向量 RAG 跑通一个版本验证效果，再针对具体短板（如跨文档关联问题）逐步引入图检索。一开始就上 GraphRAG 是过度设计，项目周期因此延长了 3 周。

### 后续迭代方向

1. **多模态支持**：当前只处理文本，下一步要支持图片（产品截图、架构图）的检索
2. **个性化上下文**：根据用户角色（开发 / 运维 / 产品）调整召回策略
3. **主动学习**：把"👎"反馈的样本自动加入评测集，定期回归测试

最后附上文档切分的核心代码，作为可复用的参考：

```python
from langchain.text_splitter import MarkdownHeaderTextSplitter, RecursiveCharacterTextSplitter

def split_document(doc: str, chunk_size: int = 512, overlap: int = 100):
    # 1. 按 Markdown 标题切分
    headers = [("#", "Header 1"), ("##", "Header 2"), ("###", "Header 3")]
    md_splitter = MarkdownHeaderTextSplitter(headers_to_split_on=headers)
    md_chunks = md_splitter.split_text(doc)

    # 2. 对超长 chunk 二次切分
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=overlap,
        separators=["\n\n", "\n", "。", "；", " ", ""],
    )
    final_chunks = []
    for chunk in md_chunks:
        if len(chunk.page_content) > chunk_size:
            final_chunks.extend(text_splitter.split_text(chunk.page_content))
        else:
            final_chunks.append(chunk.page_content)

    return final_chunks
```

这套切分策略配合 BGE-large-zh-v1.5 + Milvus，能让中文技术文档的 Recall@5 稳定在 0.85+，是 RAG 项目里"基础设施级"的组合。
