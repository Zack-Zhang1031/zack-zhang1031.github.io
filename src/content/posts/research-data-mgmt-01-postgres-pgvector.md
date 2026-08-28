---
title: "数据管理与 AI 自动化 01：PostgreSQL + pgvector 科研知识库"
date: 2026-08-29T02:20:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "AI 科研内容课程系列五第 1 课：把平台数据从文件层搬进 PostgreSQL——表设计、pgvector 向量检索、混合查询与索引调优，支撑起服务层的数据底座。"
tags: ["PostgreSQL", "pgvector", "数据库设计", "向量检索"]
categories: ["AI课程", "数据管理"]
math: false
---

到系列四为止，平台数据都住在文件里（Parquet + npy）。文件层对"分析"很友好，但接下来的需求变了：FastAPI 服务要高并发点查、检索要"结构化条件 + 向量相似"混合过滤、多进程读写要一致性。这一课把数据搬进 PostgreSQL + pgvector，建成平台的数据底座。

> 前置阅读：[大数据管理](/posts/big-data-management/)（pgvector 的基本语法那一篇讲过，本课做完整落地）、[M3 流水线](/posts/research-mm-06-understanding-pipeline-milestone/)（入库是它的 S5 阶段）。

## 表设计：从概念模型到物理模型

[系列一第 1 课](/posts/ai-research-eng-01-dev-environment/)定义的概念模型，落地成核心几张表：

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE papers (
    paper_id    TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    abstract    TEXT,
    year        INT,
    field       TEXT,
    venue       TEXT,
    citations   INT DEFAULT 0,
    source      TEXT,
    embedding   vector(1024),              -- bge-large 的维度
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE authors (
    author_id   BIGSERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    institution TEXT
);

CREATE TABLE paper_authors (
    paper_id    TEXT REFERENCES papers(paper_id),
    author_id   BIGINT REFERENCES authors(author_id),
    author_order INT,
    PRIMARY KEY (paper_id, author_id)
);

CREATE TABLE figures (
    figure_id   TEXT PRIMARY KEY,
    paper_id    TEXT REFERENCES papers(paper_id),
    fig_type    TEXT,
    caption     TEXT,
    image_path  TEXT
);
```

设计决策说明：

- **多对多关系用关联表**：论文-作者是典型的多对多，`paper_authors` 带 `author_order`（作者顺序在科研里有明确含义）。
- **embedding 直接放主表**：论文和向量一对一，不必拆表；一百万行以内这种宽表查询最简单。
- **保留 source 和 created_at**：来源痕迹与时间戳，延续[清洗课](/posts/research-data-03-cleaning-pandas/)的溯源纪律。

## 索引：结构化与向量各一套

```sql
-- 结构化查询的高频过滤列
CREATE INDEX idx_papers_field_year ON papers(field, year);
CREATE INDEX idx_papers_citations ON papers(citations DESC);

-- 向量索引：HNSW 是当前的主流选择
CREATE INDEX idx_papers_embedding ON papers
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
```

复合索引 `(field, year)` 的列顺序有讲究：等值过滤的列在前，范围列在后——这正好匹配"某领域 + 年份范围"的主查询模式。HNSW 的两个参数：`m` 控制图的连接度（越大越准越占内存），`ef_construction` 控制建索引时的搜索深度。

## 混合查询：平台的招牌查询形态

"2023 年后 cs.CL 领域里和这篇语义最像的 10 篇"——结构化过滤 + 向量排序一条 SQL：

```sql
SELECT paper_id, title,
       1 - (embedding <=> %(vec)s::vector) AS similarity
FROM papers
WHERE field = 'cs.CL' AND year >= 2023
ORDER BY embedding <=> %(vec)s::vector
LIMIT 10;
```

一个必须知道的坑：**pgvector 的 HNSW 索引在带 WHERE 过滤时，可能先近似检索再过滤**，导致过滤后不足 LIMIT 条（近似索引遍历的候选集里没有足够多满足条件的行）。缓解手段：查询时调大 `hnsw.ef_search`（运行时参数，控制搜索广度）；或者过滤条件选择性很低时干脆走顺序扫描。这是"近似索引 + 过滤"组合的经典行为，上线前必须用真实过滤条件测召回。

## 从文件层到数据库的迁移

迁移脚本把 M1 数据集和 M3 的向量灌进去：

```python
import psycopg

def migrate(papers_df, embeddings, ids):
    with psycopg.connect(DB_URL) as conn, conn.cursor() as cur:
        # 批量写入用 COPY，逐行 INSERT 慢几个量级
        with cur.copy("COPY papers (paper_id, title, ...) FROM STDIN") as copy:
            for row in papers_df.itertuples():
                copy.write_row(row)
        # 向量列单独批量 UPDATE（COPY 对 vector 类型支持麻烦，分批 upsert 更稳）
        for i in range(0, len(ids), 1000):
            batch = [(embeddings[j].tolist(), ids[j])
                     for j in range(i, min(i + 1000, len(ids)))]
            cur.executemany(
                "UPDATE papers SET embedding = %s WHERE paper_id = %s", batch)
```

迁移后跑一次对账：行数、关键字段缺失率、向量维度抽查——与文件层的 `_meta.json` 数字必须一致。数据迁移没有对账等于没迁移。

## 踩坑排查

| 症状 | 原因 | 处理 |
|---|---|---|
| 建 HNSW 索引极慢 | ef_construction 太大/数据量大 | 参数调低先跑通；大表分批 |
| 过滤后 LIMIT 不足 | 近似索引候选集不够 | 调大 hnsw.ef_search |
| 向量检索结果随过滤条件乱跳 | 近似召回 + 过滤交互 | 评估召回，必要时精确模式 |
| COPY 报错类型不匹配 | vector 列走 COPY 麻烦 | 标量列 COPY + 向量分批 UPDATE |
| 批量写入锁表超时 | 单次事务太大 | 分批提交 |
| 查询没用上索引 | 索引列被函数包裹/统计信息旧 | EXPLAIN 检查；ANALYZE 表 |

## 作品集证据

本课产出：完整的库表设计文档、混合查询实现、HNSW 参数调优记录、文件层到数据库的对账迁移脚本。"我设计过结构化 + 向量混合的数据底座"对应的是 AI 应用工程师的核心要求。

## 练习

1. 建库建表并完成迁移，写对账脚本验证行数与关键字段一致性。
2. 用 EXPLAIN ANALYZE 对比有无复合索引的查询计划。
3. 复现"过滤 + 近似检索导致 LIMIT 不足"现象，记录 ef_search 调大前后的结果数变化。
4. 设计 figures 表的一个新查询场景（如"含架构图的 cs.CV 论文"）并实现。

## 面试常问

**Q：pgvector 和专用向量库怎么选？**
百万级以内、需要结构化过滤混合查询、已有 PostgreSQL 运维能力——pgvector；千万级以上、纯向量高 QPS、需要分布式——Milvus 等专用库。pgvector 的最大优势是混合查询原生 SQL 化，少一套系统。

**Q：HNSW 索引的两个参数？**
m：图中每节点的连接数，影响精度和内存；ef_construction：建索引时的候选搜索深度，影响索引质量和构建时间。查询时的 ef_search 控制搜索广度，是召回率与延迟的运行时旋钮。

**Q：为什么近似索引 + 过滤会召回不足？**
HNSW 遍历的是图的局部邻域，候选集有限；WHERE 过滤在检索之后应用，候选集里满足条件的行可能不够 LIMIT。解决：调大 ef_search 扩候选、过滤列选择性低时走精确扫描、或应用层多取再过滤。

**Q：数据库设计的反规范化权衡？**
embedding 放主表、source 冗余存文本，都是为查询性能牺牲范式纯度。规范化的关联表管关系（作者），反规范化的宽表管检索（论文+向量），按查询模式分而治之。

---

下一课：[数据管理与 AI 自动化 02：FastAPI 科研数据服务](/posts/research-data-mgmt-02-fastapi-service/)。
