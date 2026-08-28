---
title: "科研数据获取与分析 05：DuckDB + Parquet 数据集版本管理（里程碑 M1）"
date: 2026-08-28T18:20:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "AI 科研内容课程系列二第 5 课（收官/里程碑 M1）：用 Parquet 分区 + DuckDB 构建可查询、可版本化的科研数据集，发布平台的第一个正式数据集版本。"
tags: ["DuckDB", "Parquet", "数据版本", "里程碑"]
categories: ["AI课程", "数据管理"]
math: false
---

系列二收官课。前四课完成了采集（[API](/posts/research-data-01-open-metadata-apis/)、[爬虫](/posts/research-data-02-scrapy-playwright/)）、[清洗](/posts/research-data-03-cleaning-pandas/)、[EDA](/posts/research-data-04-eda-plotly/)，这一课把成果固化成平台的第一个里程碑：**M1——一个分区存储、SQL 可查、有版本管理的科研元数据数据集**。

> 前置阅读：系列二前四课、[大数据管理](/posts/big-data-management/)（Parquet/DuckDB 原理那一篇讲过，本课是落地到案例平台）。

## 数据集的目录设计：分区即索引

M1 的物理形态不是一个大文件，而是一组按 `field / year` 分区的 Parquet 目录：

```
data/cleaned/papers/
├── field=cs.CL/
│   ├── year=2023/part-0.parquet
│   ├── year=2024/part-0.parquet
│   └── year=2025/part-0.parquet
├── field=cs.CV/
│   └── ...
└── _meta.json          # 数据集元信息：版本、行数、生成时间、源快照
```

为什么按这两个维度分区：下游最高频的查询模式就是"某领域某年份范围"。分区裁剪让 DuckDB 只扫描相关文件——查 `cs.CL` 2024 年的数据时，其他目录的文件连打开都不会打开。

写出分区数据集：

```python
import pandas as pd

df = pd.read_parquet("data/cleaned/papers_2026-08-28.parquet")

df.to_parquet(
    "data/cleaned/papers/",
    partition_cols=["field", "year"],
    compression="snappy",
    index=False,
)
```

一个细节：分区列基数不能高。`field` 有 20 来个值、`year` 有几十年，组合几百个分区很舒服；如果按作者分区（百万级基数），会产生百万个小文件，查询时打开文件的开销反而拖垮性能——这就是[大数据管理](/posts/big-data-management/)说的"小文件问题"。

## DuckDB 查询层：SQL 直达分区数据集

数据集发布后，所有下游（分析、建模、服务）都通过 DuckDB 查询，而不是各自读 Parquet：

```python
import duckdb

PAPERS = "data/cleaned/papers/**/*.parquet"

def query(sql: str) -> pd.DataFrame:
    return duckdb.sql(sql).df()

# 下游的标准用法
top_cited = query(f"""
    SELECT title, year, citations
    FROM '{PAPERS}'
    WHERE field = 'cs.CL' AND year BETWEEN 2023 AND 2025
    ORDER BY citations DESC
    LIMIT 100
""")
```

包一层 `query()` 的意义：数据集路径只有一个出处，将来数据集迁移（换目录、上对象存储）只改这一处，下游代码零改动。

Hive 风格分区还有个隐藏福利：DuckDB 能直接从路径解析出 `field` 和 `year` 两列（`hive_partitioning=true` 是默认行为），WHERE 条件命中分区列时自动做分区裁剪。用 `EXPLAIN` 可以验证裁剪是否生效——没生效的常见原因是把分区列包在函数里（`WHERE year + 0 = 2024`）。

## 版本管理：数据集也要发版

数据每天都在更新，但下游实验需要钉死版本（[Jupyter 一课](/posts/ai-research-eng-03-jupyter-reproducible/)的三支柱之一）。轻量方案：`_meta.json` + 版本目录软链：

```json
{
  "version": "m1.0",
  "created_at": "2026-08-28",
  "row_count": 487352,
  "source_snapshots": ["papers_2026-08-28.jsonl", "conf_list_2026-08-25.jsonl"],
  "quality_gate": {"dup_rate": 0.0, "title_missing": 0.0002},
  "git_commit": "a1b2c3d"
}
```

```
data/releases/
├── m1.0 -> ../cleaned/papers_2026-08-28/    # 软链指向具体快照
├── m1.1 -> ../cleaned/papers_2026-09-15/
└── latest -> m1.1
```

下游引用 `data/releases/m1.0/` 这样的稳定路径。实验报告里写"基于数据集 m1.0"，三个月后这个数字仍然可复现。这套"快照目录 + 版本软链 + 元信息文件"的方案没有引入任何新工具，但覆盖了数据集版本管理的核心诉求：可回溯、可复现、可对比。

## 数据字典：让别人敢用你的数据集

数据集发布的最后一块是文档。`data/releases/m1.0` 旁边放一份数据字典，逐字段说明：

| 字段 | 类型 | 含义 | 备注 |
|---|---|---|---|
| paper_id | string | 统一主键 | doi 优先，其次 arxiv/标题哈希 |
| title | string | 原始标题 | 展示用 |
| title_norm | string | 规范化标题 | 匹配用，勿展示 |
| year | int | 发表年份 | 1950–2026，缺失为 null |
| field | string | 领域分区键 | arXiv 主分类 |
| citations | int | 引用数 | 多来源取最大 |
| authors | list[string] | 作者列表 | "名 姓"格式 |
| venue | string | 发表场所 | 预印本为 null |
| source | string | 来源痕迹 | 如 "crossref\|openalex" |
| fetched_at | datetime | 采集时间 | 溯源用 |

数据字典解决的实际问题：下游使用者（包括三个月后的你）不用翻清洗代码就能理解每个字段的语义和坑（比如"venue 对预印本必然为空"这种非显然事实）。

## M1 验收清单

里程碑要有明确的验收标准，M1 的五条：

1. 分区数据集物理存在，`_meta.json` 完整。
2. `EXPLAIN` 验证分区裁剪生效。
3. [第 3 课](/posts/research-data-03-cleaning-pandas/)的质量门全部断言通过。
4. 数据字典覆盖全部字段。
5. `git tag m1-dataset` 标记代码版本，与 `_meta.json` 里的 commit 一致。

## 踩坑排查

| 症状 | 原因 | 处理 |
|---|---|---|
| 分区写出几千个小文件 | 分区列基数太高 | 只按低基数列分区；定期合并小文件 |
| 查询没走分区裁剪 | WHERE 把分区列包进函数 | 条件里分区列保持裸列 |
| DuckDB 读不到分区列 | 目录不是 key=value 形态 | 目录命名必须是 `field=cs.CL` |
| 下游说"数据变了" | 直接引用了会滚动的 latest | 实验必须钉版本号路径 |
| _meta.json 和实际行数不符 | 手工维护 | 生成脚本自动统计，禁止手改 |
| 快照占用磁盘暴涨 | 全量复制每个版本 | 软链 + 定期归档旧快照到冷存储 |

## 作品集证据

M1 是整个平台第一个可以"拿出来给人看"的东西：分区目录、SQL 查询示例、版本元信息、数据字典、质量门报告。面试时演示 `EXPLAIN` 的分区裁剪效果和数据字典，比说"我做过数据工程"具体得多。

## 练习

1. 把 cleaned 数据写成 field/year 分区数据集，用 `EXPLAIN` 对比命中与不命中分区裁剪的查询计划。
2. 实现 `release.py`：输入快照目录和版本号，自动统计行数、跑质量门、写 `_meta.json`、建软链。
3. 发布 m1.0 后做一次数据更新发布 m1.1，写一个 diff 报告（行数变化、新增领域、质量指标变化）。
4. 为数据集写完整数据字典，并请一个不了解项目的同学按字典写查询——验证文档是否够用。

## 面试常问

**Q：Parquet 分区的原理和注意事项？**
把数据按列值拆进 `key=value` 目录，查询时引擎按 WHERE 条件裁剪不相关目录。注意分区列要低基数（高基数产生小文件灾难）、条件里分区列不能被函数包裹、分区目录命名必须规范。

**Q：数据集版本管理为什么不用 Git？**
Git 不适合大二进制；数据集版本管理的核心诉求是可回溯（知道实验用哪版）、可复现（还能取到那版）、可对比（版本间 diff）。快照目录 + 版本软链 + 元信息文件的轻量方案足够覆盖；规模再大才考虑 DVC、lakeFS 这类专用工具。

**Q：DuckDB 在这里扮演什么角色？**
统一查询入口：下游不直接碰文件，都走 `query()`；利用列式 + 分区裁剪让分析查询只扫必要数据；结果直接出 DataFrame 衔接 Pandas/建模。它是数据集的"官方读取姿势"。

**Q：数据字典的价值？**
把字段语义和坑（非显然事实如"预印本 venue 必空"）从代码里搬到文档里，降低使用门槛、防止误用；也是数据契约的一部分，字段变更必须同步字典。

---

**里程碑 M1 达成。** 下一课进入建模世界：[经典机器学习 01：从元数据到特征工程](/posts/research-ml-01-feature-engineering/)。
