---
title: "大数据管理：从单机 DuckDB 到分布式思维"
date: 2026-08-28T11:30:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "数据量涨上去之后怎么办：Parquet 列式存储、DuckDB 单机分析、PostgreSQL + pgvector 结构化与向量混合管理，以及什么时候才真的需要 Spark。"
tags: ["大数据", "DuckDB", "Parquet", "PostgreSQL", "pgvector"]
categories: ["AI课程", "数据管理"]
math: false
---

"大数据"这个词被用滥了。我见过 500MB 的 CSV 被称为"大数据项目"，也见过真正的 TB 级日志平台。这篇的核心观点可能反直觉：**绝大多数 AI 项目的数据规模，一台内存够大的单机就能搞定**，关键是选对工具——列式存储 + 向量化执行引擎。Spark 这类分布式框架是最后手段，不是起点。

这篇按数据规模从小到大，讲我实际用的三层工具栈。

> 前置阅读：[Pandas 数据分析与可视化](/posts/pandas-data-analysis-visualization/)（Pandas 的内存瓶颈是本文的起点）。

## 第一层：存储格式换 Parquet，Pandas 立刻续命

Pandas 卡，一半是 CSV 的锅。CSV 是文本格式：读的时候要逐行解析、类型全靠猜、还不能只读部分列。Parquet 是二进制列式存储，三个优势直接命中痛点：

- **只读需要的列**：列式存储按列组织，查 3 列就只读 3 列的数据，IO 量可能只有全量的 10%。
- **自带类型和压缩**：schema 存在文件里，不用猜；Snappy 压缩下体积通常是 CSV 的 1/5 到 1/10。
- **读取快一个量级**：二进制反序列化 vs 文本解析，没可比性。

```python
import pandas as pd

# 一次性转换：CSV → Parquet（需要 pip install pyarrow）
df = pd.read_csv("papers.csv")
df.to_parquet("papers.parquet", compression="snappy", index=False)

# 之后读取：快、能挑列
df = pd.read_parquet("papers.parquet", columns=["year", "field", "citations"])
```

我的项目纪律：**原始数据落地后第一时间转 Parquet，之后所有分析只碰 Parquet**。分区文件（按日期/类别拆成 `data/year=2024/part-0.parquet` 这种目录结构）还能让查询只扫描相关分区的文件，大数据集的常规操作。

## 第二层：DuckDB——单机上的分析数据库

数据过了千万行，或者要做多表关联、复杂聚合，Pandas 开始吃力，但还远不到上集群的程度。这个区间的主角是 DuckDB：**进程内的 OLAP 数据库**，可以理解成"分析版的 SQLite"——零部署，pip 装上就用，SQL 直接查 Parquet 文件：

```python
import duckdb

# 直接查 Parquet，不用导入
result = duckdb.sql("""
    SELECT field, year, COUNT(*) AS paper_count, AVG(citations) AS avg_cite
    FROM 'data/papers/**/*.parquet'      -- 支持 glob 扫分区目录
    WHERE year >= 2020
    GROUP BY field, year
    ORDER BY year, paper_count DESC
""").df()        # 结果直接转 Pandas DataFrame
```

DuckDB 的几个杀手锏：

- **查询大于内存的数据**：它会把中间结果溢出到磁盘，不像 Pandas 必须全量进内存。我实测过 32GB 内存机器上聚合 80GB 的 Parquet 数据集，能跑完。
- **向量化执行 + 多核并行**：默认用满所有 CPU 核，同样 SQL 比 Pandas 快 5-50 倍是常态。
- **和 Pandas 无缝衔接**：`.df()` 出结果，也能直接查内存里的 DataFrame（`duckdb.sql("SELECT * FROM df")`）。

一个实用的工作模式：**DuckDB 干重活（过滤、关联、聚合出小结果），Pandas 接过来做精细分析和画图**。各干各擅长的。

## 第三层：PostgreSQL + pgvector——AI 项目的结构化底座

当数据要**被多人多服务读写**（而不只是分析），就该上真正的数据库。AI 项目的典型需求是"结构化元数据 + 向量检索"混合，PostgreSQL + pgvector 扩展一个库全包了：

```sql
CREATE EXTENSION vector;

CREATE TABLE papers (
    id          BIGSERIAL PRIMARY KEY,
    title       TEXT NOT NULL,
    year        INT,
    field       TEXT,
    citations   INT DEFAULT 0,
    embedding   vector(768)          -- 论文摘要的向量
);

-- 向量索引：近似最近邻搜索
CREATE INDEX ON papers USING hnsw (embedding vector_cosine_ops);
```

混合查询是 pgvector 的杀手锏——"找 2023 年以后、CV 领域、和这个研究方向语义最接近的 10 篇论文"，一条 SQL 搞定：

```sql
SELECT title, 1 - (embedding <=> $1::vector) AS similarity
FROM papers
WHERE year >= 2023 AND field = 'CV'
ORDER BY embedding <=> $1::vector
LIMIT 10;
```

纯结构化条件（WHERE）先过滤、向量相似度再排序，这种"过滤 + 检索"的组合正是 RAG 系统的标准查询。向量库规模过了千万级再考虑专门的向量数据库（Milvus 等），选型对比见 [Milvus + Neo4j 构建 RAG 知识图谱实战](/posts/milvus-neo4j-rag/)。

## 什么时候才真的需要 Spark

我对这个问题的回答标准很苛刻。以下信号同时出现时，才考虑分布式：

1. **单机处理时间不可接受**：DuckDB 跑全量分析要数小时，且优化（分区、预聚合、降采样）无效。
2. **数据增量快**：每天新增 TB 级，单机磁盘都存不下。
3. **团队已有 Spark 基础设施**：有现成的集群和会维护的人。

三条都不满足时上 Spark，是给自己找运维麻烦——集群部署、资源调度、小文件问题、版本兼容，每一项都能吃掉一个工程师的全部精力。Spark 的价值在**横向扩展的确定性**：数据再涨 10 倍，加机器就行。但如果你看不到数据涨 10 倍的路径，这个确定性就不值钱。

中间还有一档值得知道：**Polars**（Rust 写的 DataFrame 库，多线程 + 惰性执行）和 **DuckDB  MotherDuck 云服务**，分别把单机 DataFrame 和单机 SQL 的边界又推远了一截。

## 数据治理：比选型更重要的日常

工具之外，让数据"可管理"的是这些朴素习惯：

- **分层组织**：`raw/`（原始落地，只读）→ `cleaned/`（清洗后）→ `features/`（模型特征）。每层之间用脚本转换，脚本进 Git。任何人问"这份数据怎么来的"，都有完整链条。
- **命名带日期和版本**：`papers_2024_v3.parquet`，比 `papers_final_最终版_真的最终.parquet` 强。
- **小文件合并**：爬虫/日志系统每天产出几千个小 Parquet，定期合并成大文件，否则查询时打开文件的开销会超过读数据本身。
- **质量卡点**：每天数据落地后跑一遍校验脚本（行数是否合理、必填字段非空率、日期范围），异常就告警。脏数据流进模型再排查，成本是这里的十倍。

## 踩坑排查清单

| 症状 | 原因 | 处理 |
|---|---|---|
| Pandas 读 CSV 内存爆 | 文本解析 + 全量载入 | 转 Parquet；用 `usecols`；换 DuckDB |
| Parquet 读写报错 | 缺引擎 | `pip install pyarrow`（或 fastparquet） |
| DuckDB 查询越来越慢 | 小文件太多 | 合并小文件，每文件 100MB-1GB 为宜 |
| pgvector 查询慢 | 没建向量索引或索引参数不当 | 建 HNSW 索引；百万级以下也可先试精确搜索 |
| 分区目录查询扫了全量 | 分区列被函数包裹 | `WHERE year = 2024` 能裁剪，`WHERE year+0 = 2024` 不能 |
| PostgreSQL 批量写入慢 | 逐行 INSERT | 用 `COPY` 或批量 INSERT，万倍差距 |

## 练习

1. 把一份 100MB 的 CSV 转成 Parquet，对比文件大小和读取耗时。
2. 用 DuckDB 对一个按 `year=` 分区的 Parquet 目录做查询，用 `EXPLAIN` 观察分区裁剪是否生效。
3. 在 PostgreSQL + pgvector 里建一张带向量的表，插入 1 万条随机向量，对比建 HNSW 索引前后的查询耗时。
4. 设计一份数据质量校验脚本：检查行数波动（与昨日偏差 >20% 告警）、必填字段非空率、日期字段范围，用在 [数据采集](/posts/web-scraping-data-collection/) 一篇的产出上。

## 面试常问

**Q：列式存储为什么适合分析场景？**
分析查询通常只取少数列、扫大量行。列式存储把同列数据连续存放，只读需要的列，IO 大幅减少；同列数据类型一致、重复度高，压缩率和向量化执行效率都更好。行式存储（如 MySQL  InnoDB）适合按主键整行读写的 OLTP 场景。

**Q：DuckDB 和 SQLite 的区别？**
SQLite 是行式 OLTP 嵌入式库，擅长点查和小事务；DuckDB 是列式 OLAP 嵌入式库，擅长扫描聚合分析。两者都是零部署进程内数据库，但面向的负载完全不同。

**Q：什么时候从 PostgreSQL 迁到专门的向量数据库？**
向量规模到千万级以上、QPS 要求高、需要向量专用的索引调优（多副本、分片）时。百万级以内 pgvector 的体验和运维成本都更优，别提前拆分架构。

**Q：Spark 的核心价值是什么？**
不是"快"——单机引擎在很多规模下比 Spark 快。Spark 的价值是横向扩展的确定性（加机器处理更多数据）和容错（任务失败自动重试、数据分区重算），适合数据规模持续增长且有专职平台团队的场景。

**Q：数据湖的分层为什么重要？**
raw/cleaned/features 分层让每条数据有明确的血缘：问题出在哪一层可查、转换逻辑可重放、下游可以信任上游的契约。没有分层的项目，三个月后没人敢说清某份特征是怎么算出来的。

---

数据管好了，下一步是让重复劳动自动化。下一篇：[AI 自动化：用工作流和 Agent 把重复工作交给机器](/posts/ai-automation-workflow/)。
