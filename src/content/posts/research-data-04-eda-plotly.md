---
title: "科研数据获取与分析 04：探索性数据分析与 Plotly 可视化"
date: 2026-08-28T17:40:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "AI 科研内容课程系列二第 4 课：对 cleaned 科研数据集做系统 EDA——分布、趋势、关系、异常四类问题，用 Plotly 产出交互式图表，并让每个图回答一个明确问题。"
tags: ["EDA", "Plotly", "数据可视化", "探索性分析"]
categories: ["AI课程", "数据分析"]
math: false
---

数据集洗好了，但"干净"不等于"理解"。这一课做探索性数据分析（EDA）：在建模之前，先用图表把数据的脾气摸清楚——分布长什么样、趋势往哪走、字段之间什么关系、哪里藏着异常。EDA 的价值在于**它会不断推翻你的假设**：你以为引用数均匀分布，画出来发现是长尾；你以为数据完整，画出来发现某年份有个大坑。

> 前置阅读：[第 3 课：清洗与对齐](/posts/research-data-03-cleaning-pandas/)（本课直接用它的产出）、[Pandas 数据分析与可视化](/posts/pandas-data-analysis-visualization/)（基础操作）。

## EDA 的组织方式：四类问题，不是随便画画

我把 EDA 组织成四类问题，每类配固定图表，避免"想到哪画到哪"：

| 问题类型 | 典型问题 | 首选图 |
|---|---|---|
| 分布 | 单个字段长什么样 | 直方图、箱线图 |
| 趋势 | 随时间怎么变 | 折线、面积图 |
| 关系 | 两个字段互相影响吗 | 散点、热力图 |
| 异常 | 哪里不对劲 | 以上任何图 + 排查 |

贯穿原则（也是从 [Pandas 一篇](/posts/pandas-data-analysis-visualization/)延续的纪律）：**每张图必须先写下它要回答的问题，再动手画**。没有问题的图只是装饰。

## 分布：长尾是科研数据的常态

```python
import pandas as pd
import plotly.express as px

df = pd.read_parquet("data/cleaned/papers_2026-08-28.parquet")

# 问题：引用数是什么分布？
fig = px.histogram(df, x="citations", nbins=100,
                   title="论文引用数分布（原始刻度）")
fig.write_html("eda/citations_hist.html")
```

画出来一定是个极右偏的长尾：绝大多数论文引用个位数，极少数几千上万。长尾分布的两个直接推论：

1. **均值没有代表性**，看中位数和分位数：
   ```python
   df["citations"].describe(percentiles=[0.5, 0.9, 0.99])
   ```
2. **画图和建模都要考虑对数变换**：
   ```python
   import numpy as np
   df["log_citations"] = np.log1p(df["citations"])   # log(1+x)，容忍 0
   fig = px.histogram(df, x="log_citations", nbins=60,
                      title="引用数分布（log1p 刻度）")
   ```

对数变换后的分布如果接近正态，系列三的回归建模就顺得多——EDA 的这个发现会直接影响建模决策。

## 趋势：时间维度上的平台故事

```python
# 问题：各领域的论文产出趋势如何？案例平台关注的领域在涨吗？
yearly = (df.groupby(["year", "field"])
            .size().reset_index(name="papers"))

fig = px.line(yearly, x="year", y="papers", color="field",
              markers=True, title="各领域年度论文数")
fig.write_html("eda/yearly_trend.html")
```

趋势图要警惕两个陷阱：

**最近的年份必然"下跌"。** 数据采集有滞后，当前年份的论文还没收全，曲线末端下垂是采集口径问题，不是领域遇冷。处理：趋势分析截止到最后一个完整年份，或在图上标注"当年数据不完整"。

**总量趋势掩盖结构变化。** 各领域都在涨时，看**占比**比看绝对数更有信息量：

```python
yearly["share"] = yearly["papers"] / yearly.groupby("year")["papers"].transform("sum")
px.area(yearly, x="year", y="share", color="field",
        title="各领域占比变化")
```

## 关系：散点图里的因果陷阱

```python
# 问题：发表年份越久引用越多吗？（显然）那同龄论文里引用和什么相关？
recent = df[df["year"] >= 2020]
fig = px.scatter(recent.sample(5000), x="author_count", y="log_citations",
                 color="field", opacity=0.4,
                 trendline="ols", title="作者数 vs 引用数（2020 后，log 刻度）")
```

`sample(5000)` 是必须的：十万个点糊在一起什么都看不出来，抽样后结构反而清晰。`opacity=0.4` 让点的密度可见。

看到相关性时默诵[研究方法](/posts/research-methods-ai/)一篇的纪律：**相关不等于因果**。作者数和引用正相关，可能是大团队成果影响力大，也可能是高影响力工作吸引更多人署名——EDA 只负责提出假设，验证是后续建模和实验的事。

## 异常：每个异常都是一个故事

EDA 里最值钱的是"这张图不对劲"的时刻。几个我在科研数据里真实遇到的类型：

```python
# 某一年论文数断崖：查出来是某来源 API 当年变更了字段，采集漏了一批
yearly_total = df.groupby("year").size()
print(yearly_total[yearly_total.diff().abs() > yearly_total.std() * 3])

# 引用数为 -1：某来源用 -1 表示"无数据"，清洗时漏处理了
print((df["citations"] < 0).sum())

# 同一标题出现几十次：会议网页采集的分页循环 bug，重复入库
dup = df[df.duplicated("title_norm", keep=False)]
print(dup.groupby("title_norm").size().sort_values(ascending=False).head())
```

每个异常的处理方式都是固定的三步：**定位来源（source 字段在这里派上用场）→ 回 raw 层对账 → 修清洗规则或修采集器，然后重放清洗**。这就是[上一课](/posts/research-data-03-cleaning-pandas/)坚持留 raw 层的原因——没有 raw 层，这些异常全都无法修复。

## 产出物：EDA 报告

EDA 的结论落成交互式 HTML 报告（Plotly 图天然是 HTML），按"四类问题"组织，每张图配一段"这张图告诉我们什么 + 对下一步的影响"。这份报告是系列三建模课的输入：特征怎么构造、目标变量要不要变换、哪些数据段要剔除，全部由 EDA 结论驱动。

报告归档到 `runs/eda_2026-08-28/`，按[第 3 课](/posts/ai-research-eng-03-jupyter-reproducible/)的纪律和数据快照、代码 commit 绑定。

## 踩坑排查

| 症状 | 原因 | 处理 |
|---|---|---|
| 直方图一根柱子顶破天 | 长尾分布没用对数 | log1p 变换后再看 |
| 散点图一团黑 | 点太多 | sample + opacity |
| 最近一年数据断崖 | 采集滞后 | 标注不完整年份或剔除 |
| 趋势图某条线突然中断 | 该领域某年数据缺失 | 查采集日志，别当成领域趋势 |
| plotly 导出 HTML 巨大 | 全量点都嵌进去了 | 抽样/聚合后再画图 |
| groupby 后画图顺序乱 | 没排序 | 显式 sort_values 再画 |

## 作品集证据

本课产出：一份按"四类问题"组织的交互式 EDA 报告，含至少一个由你发现并解决的异常案例。"通过 EDA 发现采集管道在某年份的数据缺失并回溯修复"——这种故事比任何技能清单都能证明你的数据分析能力。

## 练习

1. 对 cleaned 数据集画引用数分布的原始/log 双图，写出对数变换对建模的两个影响。
2. 做各领域占比面积图，指出占比上升最快的领域并给出数据证据。
3. 用分位数对比法找出"同龄论文里引用异常高"的 Top 20，人工看标题总结它们的共性。
4. 复现一个异常排查全流程：发现 → 定位来源 → 回 raw 对账 → 修规则 → 重放。

## 面试常问

**Q：EDA 的标准流程是什么？**
先审计（缺失、类型、范围），再按四类问题展开：分布（单字段）、趋势（时间）、关系（字段间）、异常（离群与断点）。每张图带着问题画，结论要能指导下一步建模决策，否则就是无效图表。

**Q：长尾分布怎么处理？**
看场景：统计描述用中位数/分位数代替均值；可视化用对数刻度；建模时对目标变量 log1p 变换（预测完 expm1 回来）；必要时分段建模（头部/尾部分开）。

**Q：怎么区分"数据问题"和"真实现象"？**
三个证据：来源维度切片（异常是否集中在某个 source）、时间维度对账（异常是否从某个采集批次开始）、raw 层回溯（原始数据就这样还是清洗引入）。三处都指向数据本身，才能当真实现象对待。

**Q：为什么 EDA 报告要归档而不是画完就扔？**
EDA 结论依赖特定数据快照。数据更新后结论可能失效，归档报告（绑定快照与 commit）让"当时的判断依据"可追溯；复查时新报告与旧报告 diff，数据漂移一目了然。

---

下一课：[科研数据获取与分析 05：DuckDB + Parquet 的数据集版本管理（里程碑 M1）](/posts/research-data-05-duckdb-parquet/)。
