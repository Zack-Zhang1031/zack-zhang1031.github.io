---
title: "知识图谱构建实战：从文本抽取到图数据库——RAG 的结构化升级"
date: 2026-08-29T23:50:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "实体关系抽取、知识融合与消歧、Neo4j 建模与 Cypher 查询、LLM 辅助建图、GraphRAG 查询实战，把散乱文本变成可推理的知识网络。"
tags: ["知识图谱", "Neo4j", "信息抽取", "GraphRAG", "Cypher"]
categories: ["AI课程", "知识工程"]
math: false
---

做 [RAG 项目](/posts/rag-project-retrospective/) 时撞上一类向量检索死活答不好的问题：「A 公司的供应商的竞争对手有哪些？」——这是**多跳关系查询**，向量检索按语义相似找文本块，找得到每一段事实，但推理链断在「关系」上。知识图谱就是为此而生：把「实体-关系-实体」显式存成图，多跳查询变成图上的一次遍历。

这篇走完构建全流程：信息抽取 → 知识融合 → 图数据库存储 → 查询与 GraphRAG。LLM 时代的建图成本比传统 NLP 时代降了一个数量级，这是现在值得重做知识图谱的原因。

**前置阅读**：建议先读 [NER 序列标注](/posts/sequence-labeling-ner/)、[Milvus + Neo4j 实战](/posts/milvus-neo4j-rag/)（存储侧）、[NoSQL 选型](/posts/nosql-selection/)。

## 知识图谱是什么：一个五分钟的模型

知识图谱 = 三元组的集合：**(头实体, 关系, 尾实体)**。

```
(苹果公司, 创始人, 乔布斯)
(苹果公司, 总部, 库比蒂诺)
(乔布斯, 创立了, 皮克斯)
```

就这一样东西，但威力在**连接**：查「苹果创始人的其他公司」，SQL 里要 JOIN 三次，图里是 `(:Person {name:"乔布斯"})<-[:创始人]-()-[:创立了]->(other)` 一跳写完。图数据库（Neo4j）为这种多跳遍历做了专门优化。

两种图谱形态先分清：**通用图谱**（百科式，如 Wikidata，宽而浅）和**领域图谱**（医疗、金融、供应链，窄而深）。企业项目 99% 是后者——领域图谱的价值密度高，构建成本可控。

## 第一步：信息抽取——从文本到三元组

### 传统路线（了解思想）

NER 抽实体 → 关系抽取（RE）判关系 → 事件抽取抽「谁何时对谁做了什么」。每个环节一个模型，级联误差是痛点（NER 错了 RE 全错）。详细可看 [NER 那篇](/posts/sequence-labeling-ner/)。

### LLM 路线（现在的主流）

直接让 LLM 输出结构化三元组：

```python
import json
from openai import OpenAI

EXTRACT_PROMPT = """从文本中抽取实体和关系，输出 JSON：
{"entities": [{"name": "...", "type": "公司|人物|产品|地点"}],
 "relations": [{"head": "...", "relation": "...", "tail": "..."}]}
要求：实体名用原文表述；关系用简短动词短语；只抽取文本明确陈述的事实。

文本：{text}"""

def extract_triples(text: str) -> dict:
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": EXTRACT_PROMPT.format(text=text)}],
        response_format={"type": "json_object"})
    return json.loads(resp.choices[0].message.content)
```

这套「LLM 即抽取器」的方案把传统三个模型压成一次调用。微软 GraphRAG 和 LlamaIndex 的 KnowledgeGraphIndex 都是这个思路。成本账：一篇万字文档约 0.02 美元，一个 10 万文档的库建图成本几百美元——五年前这要花标注团队几个月。

**质量护栏**：LLM 抽取会幻觉（文本没说的关系它敢编），必须加「只抽取明确陈述」的约束 + 抽样人工核验 + 置信度低的丢弃。我在项目里抽检 100 条，幻觉率约 3%，主要出现在「常识补全」（文本说「乔布斯和苹果」，它补「乔布斯是 CEO」）。

## 第二步：知识融合——图谱最脏最累的活

抽出来的三元组是脏的：「苹果公司」「Apple」「苹果」「Apple Inc.」是同一个实体；「创立了」「是……的创始人」是同一个关系。**不融合，图谱就是一盘散沙**。

### 实体对齐（Entity Linking）

```python
# 轻量方案：embedding 相似度 + 规则
def normalize_entity(name: str, existing: dict, threshold=0.9):
    if name in existing:                    # 精确命中别名表
        return existing[name]
    # 向量召回候选
    candidates = vector_search(name, top_k=5)
    for cand, score in candidates:
        if score > threshold:
            return cand
    return name  # 确认是新实体
```

融合的三个层次：

1. **别名归一**：「苹果公司」→「Apple Inc.」——规则 + 别名表。
2. **跨文本消歧**：「苹果」是公司还是水果——上下文 embedding 判别，LLM 抽取时带上类型字段（`type: 公司`）能直接消掉大半歧义。
3. **关系归一**：「创立了」「创办了」→ `founded_by`——定义 schema 时用枚举关系类型约束 LLM 输出，比事后归一省事十倍。

**经验：schema 先行**。开工前定义好实体类型（≤10 种）和关系类型（≤20 种）的清单，塞进抽取 prompt。无 schema 的自由抽取事后融合是地狱。

## 第三步：Neo4j 建模与导入

```python
from neo4j import GraphDatabase

driver = GraphDatabase.driver("bolt://localhost:7687",
                              auth=("neo4j", "password"))

def import_triples(triples: dict):
    with driver.session() as session:
        for ent in triples["entities"]:
            session.run(
                "MERGE (n:`%s` {name: $name})" % ent["type"],
                name=ent["name"])
        for rel in triples["relations"]:
            session.run("""
                MATCH (h {name: $head}), (t {name: $tail})
                MERGE (h)-[r:RELATED {type: $rel}]->(t)
                ON CREATE SET r.source = $source
                """, head=rel["head"], tail=rel["tail"],
                rel=rel["relation"], source=doc_id)
```

两个工程要点：**MERGE 不是 CREATE**——重复导入不产生重复节点（幂等，这是图谱导入的生命线）；**关系上存 source 属性**——每条关系记下出处文档，溯源和纠错都靠它。

### Cypher 查询速通

```cypher
-- 一跳：苹果的创始人
MATCH (c:公司 {name: 'Apple Inc.'})-[:RELATED {type: '创始人'}]->(p) RETURN p.name;

-- 多跳：创始人的其他公司（RAG 答不了的那种）
MATCH (c:公司 {name: 'Apple Inc.'})-[:RELATED {type: '创始人'}]->(p)
      <-[:RELATED {type: '创始人'}]-(other)
RETURN other.name;

-- 路径查询：两个实体间 3 跳内的所有路径
MATCH path = shortestPath((a {name: '乔布斯'})-[*..3]-(b {name: '迪士尼'}))
RETURN path;

-- 图算法前置：某节点的邻居统计
MATCH (n {name: 'Apple Inc.'})-[r]-(m)
RETURN type(r) AS 关系, count(*) AS 数量 ORDER BY 数量 DESC;
```

Cypher 的学习曲线主要在「模式匹配」思维：`(:A)-[:R]->(:B)` 就是在图里描形状。写查询 = 画你要找的形状。

## 第四步：GraphRAG——图谱和向量检索的联姻

纯向量 RAG 和纯图谱查询各有盲区，实战架构是**混合检索**：

```
用户问题
 ├── 实体识别 → 图谱多跳查询 → 结构化事实
 └── 向量检索 → 相关文本块 → 非结构化上下文
        ↓ 两路结果一起进 prompt
   LLM 生成最终答案（附来源）
```

关键判断：**什么问题走图谱？** 含明确实体 + 关系型提问（「谁的什么」「A 和 B 什么关系」「列出所有」）；**什么问题走向量？** 语义型、描述型、开放型（「介绍一下」「为什么」「怎么样」）。路由可以规则（实体链接成功且关系匹配 → 图谱），也可以小模型分类。

我在项目里的数据：混合架构把多跳问题的答案正确率从 31%（纯向量）提到 78%。最大的工程教训反而是——**图谱覆盖率决定上限**：问题涉及的实体不在图里，图谱路直接空转，必须有无缝降级走向量的逻辑。

## 维护：图谱是活的东西

- **增量更新**：新文档进来 → 抽取 → MERGE 入图。管道复用建图代码。
- **冲突处理**：新旧事实矛盾（CEO 换人了）——关系上加 `valid_from/valid_to` 时间属性，查询默认取最新。
- **质量监控**：定期统计孤儿节点（无任何关系）、可疑边（高频但来源单一的 relation 类型）、抽样人工审计。
- **删除权**：合规要求「删除某实体的所有信息」——图谱里级联删除比数据库宽表麻烦，提前设计实体 ID 体系。

## 踩坑排查

| 现象 | 原因 | 解法 |
|------|------|------|
| 同一实体重复入库 | 用了 CREATE 或别名未归一 | MERGE + 别名表 + embedding 召回对齐 |
| 图谱查询返回空 | 实体名对不上（库里是「Apple Inc.」查的是「苹果」） | 查询前实体链接归一化 |
| LLM 抽取编造关系 | prompt 约束不足 | 「只抽明确陈述」+ 抽样审计 + 置信度过滤 |
| 多跳查询慢 | 超级节点（一度关系上万的节点）拖垮遍历 | 限制遍历深度 + 超级节点缓存 |
| 图谱越用越脏 | 无 schema 约束自由生长 | 实体/关系类型枚举化，新类型走评审 |
| GraphRAG 效果不稳定 | 路由判断失误 | 双路都执行再融合，别硬路由 |

## 练习

1. 选 20 篇某领域新闻，用 LLM 抽取三元组入 Neo4j，写 3 个两跳以上的 Cypher 查询验证多跳价值。
2. 实现实体对齐：统计你抽出的实体中有多少个变体指向同一实体（如公司名缩写），用 embedding 方案归一并评估准确率。
3. 对比实验：准备 10 个多跳问题，分别用纯向量 RAG 和「图谱+向量」混合回答，人工评分对比。
4. 给图谱关系加时间属性，模拟「CEO 变更」场景，写出「查询某公司现任 CEO」和「查询 2020 年 CEO」两个查询。

## 面试常问

**Q：知识图谱相比向量数据库的本质差异？**
向量库存「语义相似性」，答「哪些文本和这个问题意思近」；图谱存「显式关系」，答「实体间经过几步关联」。前者模糊但覆盖广，后者精确但受构建覆盖限制。关系型查询、聚合统计、可解释推理走图谱；语义召回、开放问答走向量。现代系统混合使用。

**Q：实体对齐的主要方法？**
规则（别名表、ID 映射）、属性相似（embedding 比较名称和描述）、关系相似（两个「乔布斯」的邻居重合度——图的自指特性）、学习型（图神经网络实体对齐）。LLM 时代新招：让 LLM 判断「这两个实体描述是否同一实体」，准确率意外地高。

**Q：图谱的规模瓶颈在哪？**
不在存储（Neo4j 亿级边没问题），在**构建质量和维护成本**：抽取准确率、融合消歧、增量更新的一致性。多数企业图谱项目死于「建得起，养不起」——所以 schema 设计和更新管道比建模技巧重要。

**Q：GraphRAG（微软那个）和你说的混合架构什么关系？**
微软 GraphRAG 是特化方案：LLM 抽取实体关系 + Leiden 社区检测聚类 + 预生成社区摘要，擅长「全局性问题」（「这批文档整体讲了什么主题」）。通用混合架构（图谱多跳 + 向量）擅长「局部精确查询」。两者可以叠加：社区摘要回答宏观问题，多跳遍历回答关系问题。

**Q：什么时候不该建知识图谱？**
① 问题基本是语义检索型，关系查询占比 <10%；② 领域事实变化极快（娱乐新闻），图谱永远在过时；③ 没有维护人力——图谱需要持续运营，一次性项目别碰。向量库 + 好 chunking 已经能解决的需求，不要图谱化。

## 相关阅读

- [Milvus + Neo4j 搭建 RAG 知识库](/posts/milvus-neo4j-rag/)——存储与混合架构的落地版
- [NER 序列标注实战](/posts/sequence-labeling-ner/)——实体抽取的传统路线
- [GNN 图神经网络入门](/posts/gnn-graph-neural-network/)——图谱之上的学习层
- [RAG 项目复盘](/posts/rag-project-retrospective/)——本文需求的原始出处
- [Prompt Engineering 实战](/posts/prompt-engineering-practice/)——LLM 抽取的 prompt 技巧

知识图谱是 AI 领域「慢功夫」的代表：建模一周，融合一月，运营常年。但当向量检索在关系问题前撞墙时，它是手里最硬的那张牌。
