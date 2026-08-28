---
title: "科研数据获取与分析 03：元数据清洗与对齐——把脏数据变成可信数据集"
date: 2026-08-28T17:00:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "AI 科研内容课程系列二第 3 课：多来源科研元数据的清洗实战——缺失值策略、作者与机构名规范化、日期对齐、重复论文合并，产出可信的 cleaned 层。"
tags: ["数据清洗", "Pandas", "实体对齐", "数据质量"]
categories: ["AI课程", "数据分析"]
math: false
---

前两课把数据采进了 `data/raw/`，这一课做整个平台最脏也最关键的活：把 arXiv、OpenAlex、Crossref、会议网页四个来源的记录洗成一张可信的 cleaned 表。清洗的质量直接决定后面所有分析和建模的天花板——**垃圾进，垃圾出，模型再好也没用**。

> 前置阅读：[Pandas 数据分析与可视化](/posts/pandas-data-analysis-visualization/)（本篇的所有操作都是那篇的进阶应用）、[系列二第 1-2 课](/posts/research-data-02-scrapy-playwright/)（数据来源）。

## 先盘家底：数据质量审计

清洗之前先量化"有多脏"。对 raw 层跑一次审计，每个字段看三个数：缺失率、异常值、来源间不一致率：

```python
import pandas as pd

raw = pd.read_json("data/raw/papers_2026-08-28.jsonl", lines=True)

audit = pd.DataFrame({
    "missing_rate": raw.isna().mean(),
    "unique_count": raw.nunique(),
    "dtype": raw.dtypes,
})
print(audit.sort_values("missing_rate", ascending=False))

# 按来源看质量差异
print(raw.groupby("source")[["year", "authors", "venue"]]
          .apply(lambda g: g.isna().mean()))
```

典型的审计结论（也是我做这类项目时的真实体感）：`venue` 在 arXiv 来源里 60% 缺失（预印本本来就没发表venue）；`year` 在网页来源里有 2% 是文本"in press"；作者名字段四个来源四种格式。**审计报告决定了清洗工作的优先级**——先修影响下游建模的字段，缺失率 90% 的字段直接放弃。

## 字段级清洗：每个字段一条规则

### 标题：规范化用于去重，原样用于展示

```python
import re
import unicodedata

def normalize_title(t: str) -> str:
    t = unicodedata.normalize("NFKD", t)      # 统一 Unicode（全角→半角等）
    t = t.lower().strip()
    t = re.sub(r"[^a-z0-9一-鿿 ]", " ", t)     # 标点变空格
    return re.sub(r"\s+", " ", t).strip()

df["title_norm"] = df["title"].map(normalize_title)
```

注意保留两列：`title`（原始，展示用）和 `title_norm`（规范化，匹配用）。规范化是有损操作，原始值必须留底。

### 年份： coercion + 合理性边界

```python
df["year"] = pd.to_numeric(df["year"], errors="coerce")
# 科研论文的合理范围；范围外的当缺失处理，而不是乱猜
df.loc[~df["year"].between(1950, 2026), "year"] = pd.NA
```

### 作者：从四种格式到一种

arXiv 给 `["Ashish Vaswani", ...]` 列表，Crossref 给 `{"given": "Ashish", "family": "Vaswani"}` 对象列表，网页给分号连接的字符串。统一成"名 姓"字符串列表：

```python
def normalize_authors(value, source):
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return []
    if source == "crossref":
        return [f"{a.get('given', '')} {a.get('family', '')}".strip()
                for a in value]
    if source == "conf_page":
        return [n.strip() for n in str(value).split(";") if n.strip()]
    return list(value)   # arxiv / openalex 已是列表

df["authors"] = [normalize_authors(v, s) for v, s in zip(df["authors"], df["source"])]
```

机构名同理，但要更狠一点：`MIT`、`Massachusetts Institute of Technology`、`M.I.T.` 是同一所——建一个**别名映射表**手工维护 Top 100 机构，剩下的保留原样。别试图全自动归一，机构名的变体数量超出想象，小映射表 + 人工维护是性价比最高的方案。

## 重复合并：四条记录的实体对齐

同一篇论文可能以"arXiv 预印本 + OpenAlex 记录 + Crossref 正式版 + 会议名单"四种身份出现。合并策略分两档：

**强匹配（自动合）**：DOI 相同，或 arXiv ID 相同。零误判，直接合。

**弱匹配（规则合）**：`title_norm` 完全相同 + 第一作者姓氏相同 + 年份差 ≤ 1。三个条件同时满足才合——只凭标题合并会把同名综述论文（"A Survey on X"满地都是）错误合并。

```python
df = df.sort_values("source_priority")   # crossref > openalex > arxiv > conf
merged = df.groupby("merge_key", as_index=False).agg({
    "title": "first",          # 高优先级来源的标题
    "year": "max",             # 正式发表年份优先
    "venue": lambda s: s.dropna().iloc[0] if s.notna().any() else pd.NA,
    "citations": "max",        # 引用数取最大（各来源统计口径不同，取最全的）
    "source": lambda s: "|".join(sorted(set(s))),   # 保留全部来源痕迹
})
```

`source` 合并成 `"crossref|openalex"` 这种形态，**来源痕迹永远不能丢**——数据出问题时它是唯一的排查线索。

## 质量门：清洗结果要过验收

清洗不是跑完脚本就结束，要有一组硬指标验收：

```python
def quality_gate(df):
    checks = {
        "总行数": len(df),
        "paper_id 重复率": df["paper_id"].duplicated().mean(),
        "title 缺失率": df["title"].isna().mean(),
        "year 缺失率": df["year"].isna().mean(),
        "作者为空的占比": (df["authors"].str.len() == 0).mean(),
    }
    assert checks["paper_id 重复率"] == 0, "主键仍有重复"
    assert checks["title 缺失率"] < 0.001
    return checks
```

断言失败的字段打回重洗。这套门在每次数据更新时重跑——清洗规则对新数据失效是常态，门拦住的就是"规则悄悄失效"这件事。

## 落地：写进 cleaned 层

```python
merged.to_parquet("data/cleaned/papers_2026-08-28.parquet",
                  compression="snappy", index=False)
```

带日期的文件名 + Parquet 格式，遵循[大数据管理](/posts/big-data-management/)一篇的分层纪律。raw → cleaned 的转换脚本进 Git，任何人可以重放。

## 踩坑排查

| 症状 | 原因 | 处理 |
|---|---|---|
| 合并后论文数异常少 | 弱匹配条件太严/太松 | 抽样人工检查 50 对，调条件 |
| 标题规范化后中文没了 | 正则只保留 a-z | 字符类里加 `一-鿿` |
| year 大量缺失 | 某来源日期字段路径变了 | 回查 raw 列，契约测试报警 |
| 同一作者被拆成两个人 | 姓名格式未归一（"Vaswani, A." vs "Ashish Vaswani"） | 姓氏+名字首字母做宽松匹配键 |
| cleaned 表行数每天波动大 | 采集层不稳定 | 查上游采集日志，清洗层不背锅 |
| merge 后 citations 倒退 | 取 max 掩盖了来源口径差异 | 保留各来源原值，另算 merged 值 |

## 作品集证据

本课产出：一份数据质量审计报告、一套字段级清洗规则、强/弱两档实体对齐逻辑、可重复执行的质量门。"我设计过四来源异构数据的清洗与实体对齐方案，误判率通过抽样验证"——这句是数据分析岗面试的硬通货。

## 练习

1. 对 raw 数据跑一次完整质量审计，按缺失率排序输出报告。
2. 实现弱匹配合并规则，抽样 50 对人工核对，计算精确率和召回率。
3. 为 Top 20 机构建别名映射表，量化映射前后机构分布的变化。
4. 把质量门加进清洗脚本，故意构造一份带重复 paper_id 的输入验证断言触发。

## 面试常问

**Q：多来源数据合并的优先级怎么定？**
按来源可信度定字段级优先级：Crossref 的出版信息最权威，OpenAlex 的引用关系最全，arXiv 的预印本时间最早，网页数据兜底。合并时保留全部来源痕迹，冲突字段按优先级取信，且优先级规则写进文档。

**Q：清洗规则怎么验证有效性？**
三件套：抽样人工核对（量化误判率）、质量门硬指标（重复率、缺失率断言）、规则单测（边界输入的输出固定）。只靠"跑完看结果差不多"的清洗不可信。

**Q：原始数据为什么要原样保留？**
清洗规则会迭代。留 raw 层意味着规则改进后可以不重新采集就重放清洗；同时 raw 是数据出问题时唯一的对账依据。存储成本远低于重采成本。

**Q：实体对齐的精确率和召回率怎么权衡？**
科研数据场景宁缺毋滥：错误合并（两篇变一篇）比漏合并（一篇变两篇）危害大，前者污染所有下游统计。所以弱匹配设多重条件保精确率，召回率的损失用"来源痕迹保留"来兜底排查。

---

下一课：[科研数据获取与分析 04：探索性数据分析与 Plotly 可视化](/posts/research-data-04-eda-plotly/)。
