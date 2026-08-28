---
title: "NoSQL 选型实战：MongoDB、Redis、Elasticsearch——AI 项目怎么选"
date: 2026-08-29T19:20:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "关系型之外的世界：文档、KV、搜索、向量四类 NoSQL 的适用场景，Redis 缓存模式与穿透雪崩，ES 倒排索引，以及 AI 项目的真实选型决策。"
tags: ["NoSQL", "MongoDB", "Redis", "Elasticsearch", "向量数据库"]
categories: ["AI课程", "数据工程"]
math: false
---

做 RAG 项目那年，我们团队为「知识库元数据存哪」吵了一下午：MongoDB 派、PostgreSQL 派、Redis 派各执一词。最后发现**争论本身错了——NoSQL 不是和 MySQL 二选一，而是各自解决不同形状的问题**。选型错误才是问题：把 Redis 当主库丢过数据的人、把 ES 当业务库写到崩溃的人，我都亲眼见过。

这篇按「数据形状 → 引擎 → AI 场景」组织，讲清四类主流 NoSQL 的边界，加上我在项目里的真实选型记录。

**前置阅读**：建议先读 [SQL 与数据库实战](/posts/sql-database-practice/)，关系型的边界清楚了，才知道为什么需要 NoSQL。RAG 场景可以搭配 [Milvus + Neo4j 实战](/posts/milvus-neo4j-rag/)。

## 总览：按数据形状选引擎

| 类型 | 代表 | 数据形状 | AI 项目里的典型用途 |
|------|------|----------|---------------------|
| 文档型 | MongoDB | 半结构化 JSON，schema 多变 | 爬虫原始数据、实验配置、内容库 |
| KV 型 | Redis | 键值 + 丰富结构，内存级速度 | 缓存、会话、限流、特征在线读取 |
| 搜索型 | Elasticsearch | 倒排索引，全文检索 | 日志检索、RAG 关键词召回 |
| 向量型 | Milvus/Qdrant | 高维向量 + 相似度索引 | 语义检索、RAG 向量召回 |
| 图型 | Neo4j | 节点-边关系 | 知识图谱、多跳推理 |

选型第一原则：**先问查询模式，再选引擎**。数据怎么写次要，怎么查决定一切。

## MongoDB：schema 不稳定时的救星

### 什么时候该用它

关系型要求先定表结构，加字段要 DDL。但有些数据天生「每张单据长得不一样」：爬虫抓回来的网页（字段随站点变）、AI 生成内容（不同任务输出结构不同）、埋点事件（属性随版本膨胀）。这类数据塞进 MySQL 要么巨宽表要么 EAV 反模式，MongoDB 的 BSON 文档天然契合。

```python
from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017")
coll = client.aidb.crawl_raw

# 插入：字段随意，无需预定义
coll.insert_one({
    "url": "https://example.com/article/1",
    "title": "AI 简史",
    "images": ["a.jpg", "b.jpg"],      # 数组直接存
    "meta": {"author": "张三", "score": 0.95},  # 嵌套文档
    "crawled_at": datetime.now(),
})

# 查询：点号下钻进嵌套字段
docs = coll.find({"meta.score": {"$gte": 0.9}},
                 {"title": 1, "url": 1}).limit(10)
```

### 我踩过的坑

1. **无 schema 不等于无设计**。早期我把所有爬取结果一锅烩进一个集合，三个月后想统计「所有有价格的页面」发现价格字段有五种写法（price、Price、prices、cost、amount）。教训：**入口层做 schema 归一化，Mongo 存归一后的结构**。
2. **大数组文档的性能悬崖**。把「一篇文章的所有评论」嵌进主文档，热门文章单文档长到 3MB，更新和读取全部拖慢。MongoDB 单文档 16MB 上限是最后一道防线，不是设计目标。**增长无界的关联数据要拆集合**，别嵌。
3. **更新局部字段用 `$set`**，裸 `update` 传整个文档会覆盖——我因此被抹掉过别人并写入的字段。

### MongoDB vs MySQL 的判断口诀

- 数据结构稳定 + 需要事务 + 强关联查询 → MySQL
- 结构多变 + 写多读少 + 水平扩展压力大 → MongoDB
- 两者都要 → 混合架构，各管一摊（这是大多数项目的真相）

## Redis：不止缓存，但缓存是第一要务

### 五种数据结构对应的真实用途

| 结构 | 命令示例 | AI 项目用途 |
|------|----------|-------------|
| String | `SET/GET` | 缓存模型推理结果、分布式锁（SET NX PX） |
| Hash | `HSET/HGET` | 存用户画像字段、特征组 |
| List | `LPUSH/BRPOP` | 简单任务队列（推理任务排队） |
| Set | `SADD/SINTER` | 去重、标签集合、共同关注 |
| ZSet | `ZADD/ZRANGE` | 排行榜、延迟队列（score 存时间戳） |
| Bitmap | `SETBIT/BITCOUNT` | 用户签到、布隆过滤器底座 |

```python
import redis, json, hashlib

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def cached_inference(text: str, model_fn, ttl=3600):
    """LLM 推理结果缓存——同一个 prompt 不再烧第二次 token"""
    key = "infer:" + hashlib.md5(text.encode()).hexdigest()
    if (hit := r.get(key)) is not None:
        return json.loads(hit)
    result = model_fn(text)
    r.setex(key, ttl, json.dumps(result, ensure_ascii=False))
    return result
```

这个模式在我的 [RAG 项目复盘](/posts/rag-project-retrospective/)里是真实的省钱大户——FAQ 场景 40% 的 query 命中缓存，API 成本直接砍四成。

### 缓存三大经典问题（面试+实战双重高频）

1. **缓存穿透**：查一个数据库里根本没有的 key，缓存也永远是 miss，请求全打到库上。解法：空值也缓存（短 TTL）+ 布隆过滤器前置拦截。
2. **缓存击穿**：热点 key 过期瞬间，一万个请求同时回源。解法：互斥锁（`SET NX` 只放一个请求去回源，其他等待/返回旧值）。
3. **缓存雪崩**：大量 key 同一时刻集体过期（比如都是凌晨 0 点加载、TTL 一律 24h）。解法：TTL 加随机抖动（24h ± 1h），核心数据不过期+后台异步刷新。

### 血泪提醒：Redis 不是数据库

- 内存有限，写满触发淘汰策略（`maxmemory-policy`），默认 noeviction 直接拒写。当缓存用设 `allkeys-lru`。
- 持久化 RDB 是快照、AOF 是日志，都可能丢最近几秒数据。**绝不能让「Redis 丢了 = 业务数据丢了」**——我前同事把用户验证码发券状态只存 Redis，一次重启裸奔，赔了优惠券预算。
- 大 key（一个 value 几 MB）会阻塞单线程的 Redis，`KEYS *` 生产环境禁用，用 `SCAN`。

## Elasticsearch：倒排索引的世界

### 为什么 MySQL LIKE 不行

`WHERE content LIKE '%深度学习%'` 前缀模糊全表扫，百万级就跪。ES 的倒排索引反过来建：先分词「深度学习 → 深度|学习」，再记录每个词出现在哪些文档。查询变成词典查找 + 文档列表求交，亿级文档毫秒响应。

```python
from elasticsearch import Elasticsearch

es = Elasticsearch("http://localhost:9200")

# 写入
es.index(index="articles", id=1, document={
    "title": "深度学习入门",
    "content": "本文介绍神经网络的基础概念……",
    "tags": ["AI", "tutorial"],
})

# 搜索：multi_match 多字段 + 中文分词
resp = es.search(index="articles", query={
    "multi_match": {
        "query": "神经网络 入门",
        "fields": ["title^3", "content"],   # title 权重 ×3
    }
}, highlight={"fields": {"content": {}}})
```

**中文必须装 IK 分词器**（`elasticsearch-analysis-ik`），默认 standard 分词器把中文按单字切，搜「深度学习」会命中任何含「度」的文档。ik_max_word（细粒度，索引用）和 ik_smart（粗粒度，查询用）的分工也要知道。

### ES 在 AI 项目里的真实位置：混合检索

RAG 时代 ES 焕发第二春：向量检索（语义相似）和 BM25（关键词精确）**各有盲区**。品牌词、型号、人名、罕见术语，向量检索经常翻车而 BM25 一击即中；同义改写、跨语言、口语化表达则反过来。所以现代 RAG 标配 **hybrid search = BM25 + 向量 + RRF 融合**。我在 [Milvus + Neo4j 那篇](/posts/milvus-neo4j-rag/)的架构里，ES 就是负责关键词这一路。

ES 7.x+ 也支持 dense_vector 字段和 kNN 查询，小规模（百万级以内）可以一个 ES 兼任两路，省一套 Milvus 的运维。规模上去后专业向量库（[Qdrant/Milvus](/posts/milvus-neo4j-rag/)）的索引类型（HNSW 调参、IVF_PQ 压缩）和过滤性能更专业。

### ES 的坑

- **别当主业务库**：ES 写入是近实时（默认 1s refresh 后才可查），没有事务，丢数据案例比比皆是。它从属于「搜索副本」角色，主数据在 MySQL/Mongo，通过 CDC（canal/debezium）同步。
- **深分页毒药**：`from+size` 超过 10000 直接拒绝，深翻页用 `search_after` 游标。
- **堆内存别超 32GB**（JVM 指针压缩边界），一半留给 Lucene 的文件系统缓存——ES 快很大程度靠 OS page cache。

## 向量与图：AI 时代新增的两员

向量数据库（Milvus、Qdrant、pgvector）选型我单独在 [Milvus + Neo4j 实战](/posts/milvus-neo4j-rag/)里写过，这里只补一个决策点：**数据量百万级以下 + 已有 PostgreSQL → pgvector 是最省事的方案**，不用新增组件；千万级以上或要复杂标量过滤 → 专用向量库。

图数据库（Neo4j）的边界也要清醒：它解决的是「多跳关系查询」（A 的朋友的朋友买过什么），这类查询在关系型里是 N 次自 JOIN 的噩梦。但如果你的查询基本是一跳两跳，SQL 递归 CTE 也能凑合，不必为上 Neo4j 而上。

## 我的选型决策树

真实项目里我按这个顺序问自己：

1. **这是主数据吗？** 是 → MySQL/PostgreSQL 兜底，NoSQL 只做副本和加速层。
2. **查询模式是什么？** 全文检索 → ES；高并发点查/缓存 → Redis；schema 多变的文档 → MongoDB；语义相似 → 向量库；多跳关系 → Neo4j。
3. **规模多大？** 百万级以下优先「一个 PG 全包」（JSONB + pgvector + 全文检索都能打），别急着上分布式全家桶。
4. **团队运维能力？** 每多一个组件，多一份监控、备份、升级、故障演练的负担。小团队组件数 ≤ 3 是我的红线。

## 踩坑排查

| 现象 | 原因 | 解法 |
|------|------|------|
| Mongo 查询突然变慢 | 数据量增长后缺索引 | `explain("executionStats")` 看扫描数，补索引 |
| Redis 内存打满 | 没设 maxmemory 和淘汰策略 | 设上限 + allkeys-lru + 监控 |
| 缓存与库不一致 | 更新顺序错了 | 先更库再删缓存（Cache Aside），别先删缓存 |
| ES 搜中文结果离谱 | 没装 IK 分词器 | 安装 ik，重建索引 |
| ES 写入后立刻搜不到 | refresh_interval 默认 1s | 近实时是设计使然，测试时手动 refresh |
| 向量检索品牌词翻车 | 语义检索不擅长精确匹配 | 混排 BM25，或加元数据过滤 |

## 练习

1. 用 Redis 实现「同一个 prompt 的 LLM 结果缓存」装饰器，加上随机 TTL 抖动防雪崩，统计命中率。
2. MongoDB 里造一万条结构不一的爬虫数据，练习 `$group` 聚合统计每个站点的文档数和平均字段数。
3. 起一个 ES + IK 分词，索引 1000 篇中文文章，对比「standard 分词」和「ik_max_word」搜同一个词的差异。
4. 设计题：给 [RAG 项目](/posts/rag-project-retrospective/)设计完整存储架构——原文、向量、关键词索引、会话缓存各用什么，画出数据流。

## 面试常问

**Q：Redis 为什么快？**
内存操作（纳秒级 vs 磁盘毫秒级）+ 单线程无锁竞争 + IO 多路复用（epoll）+ 高效数据结构（SDS、跳表、压缩列表）。单线程反而是优势：无上下文切换和锁开销，且纯内存操作 CPU 不是瓶颈。6.0 后 IO 线程只负责网络读写，命令执行仍单线程。

**Q：Redis 持久化 RDB 和 AOF 怎么选？**
RDB：定时快照，恢复快、文件小，但可能丢几分钟数据；AOF：追加命令日志，everysec 模式最多丢 1 秒，文件大、恢复慢。生产常混合：AOF 保证安全，RDB 用于快速恢复和备份。纯缓存场景可以全关。

**Q：MongoDB 和 MySQL 的核心区别？**
数据模型（文档 vs 关系表）、schema（动态 vs 固定）、事务（4.0 后支持多文档事务但少用 vs 成熟）、扩展（原生分片 vs 需中间件）、查询（聚合管道 vs JOIN）。一句话：Mongo 为「数据形状多变 + 快速迭代」优化，MySQL 为「结构稳定 + 强一致关联」优化。

**Q：ES 和数据库的本质区别？**
ES 是搜索引擎不是数据库：为「相关性打分 + 全文检索」优化，牺牲事务、强一致、精确更新。倒排索引 vs B+ 树的差异决定了各自场景：数据库擅长「精确定位一行」，ES 擅长「从百万文档里找出最相关的十条」。

**Q：什么时候不该用 Redis？**
① 数据丢了有业务损失；② 单 value 特别大（>10MB）；③ 需要复杂关系查询；④ 数据量远超内存且命中率低（缓存命中率 <30% 时引入 Redis 是负收益）。技术决策永远是 trade-off。

## 相关阅读

- [SQL 与数据库实战](/posts/sql-database-practice/)——关系型的主场，NoSQL 的对照组
- [Milvus + Neo4j 搭建 RAG 知识库](/posts/milvus-neo4j-rag/)——向量库与图库的完整实战
- [RAG 项目复盘](/posts/rag-project-retrospective/)——这些组件在真实项目里怎么协同
- [大数据管理：Hadoop、Spark 与数据仓库](/posts/big-data-management/)——数据规模再上一个量级
- [数据采集与爬虫实战](/posts/web-scraping-data-collection/)——MongoDB 最常见的上游

记住开篇那句话：NoSQL 之争从来不是「谁取代谁」，而是「什么形状的问题用什么工具」。选型做对了，后面的坑少一半。
