---
title: "Pandas 数据分析与可视化：从读表到出图的一条龙实战"
date: 2026-08-27T14:00:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "用一份论文数据集把 Pandas 的核心动作串一遍：读写、筛选、groupby、merge、透视表、缺失值处理，再用 Plotly 出图，附我踩过的典型坑。"
tags: ["Pandas", "数据分析", "可视化", "Plotly"]
categories: ["数据分析", "Pandas"]
math: false
---

NumPy 处理的是"整齐的数字矩阵"，但现实世界的数据是脏的：有缺失、有文本、有日期、有分类。Pandas 就是为这种"脏而杂"的表格数据准备的。我做数据分析时的体感是：**80% 的时间在清洗和整形，20% 的时间才在分析和画图**，而这 80% 几乎全是 Pandas 的活。

这篇用一条完整链路把 Pandas 的核心动作串起来：读数据 → 看清楚 → 洗干净 → 算明白 → 画出来。

> 前置阅读：[模块化编程与 NumPy 基础](/posts/modular-numpy-notes/)。Pandas 建立在 NumPy 之上，理解 ndarray 和广播机制会让本文很多地方豁然开朗。

## 先建一个像样的数据集

空讲 API 没有意义，我们构造一份"论文元数据"——一千条记录，包含标题、年份、机构、引用数和领域，故意埋进一些脏数据：

```python
import numpy as np
import pandas as pd

rng = np.random.default_rng(42)
n = 1000

df = pd.DataFrame({
    "title": [f"paper_{i:04d}" for i in range(n)],
    "year": rng.integers(2018, 2026, size=n).astype(object),   # object 类型，后面故意埋坑
    "institution": rng.choice(["清华", "北大", "MIT", "Stanford", "CMU", None], size=n),
    "citations": rng.integers(0, 500, size=n).astype(float),
    "field": rng.choice(["CV", "NLP", "RL", "ML Theory", "Systems"], size=n),
})

# 埋点脏数据：5% 缺失引用数，混入几个非法年份
df.loc[rng.choice(n, 50, replace=False), "citations"] = np.nan
df.loc[rng.choice(n, 10, replace=False), "year"] = "unknown"

df.to_csv("papers.csv", index=False)   # 存下来，模拟真实读写流程
```

真实项目里数据来自 CSV、Excel、数据库或 API，这里我们自己造一份带坑的，后面的每个坑都对应我真实踩过的场景。

## 第一步永远是"看清楚"

新手最常见的错误是上来就 `df.groupby(...)`。我的固定开场三件套：

```python
df = pd.read_csv("papers.csv")

df.head()          # 前 5 行长什么样
df.info()          # 每列什么类型、多少非空
df.describe()      # 数值列的统计分布
```

`df.info()` 是体检报告。刚才埋的雷这里就暴露了：`year` 列是 object 而不是 int——因为 CSV 里混了 `"unknown"`，Pandas 只能把整列按字符串读。`citations` 有 50 个 NaN 也会在这里现形。

## 清洗：把脏数据洗成能算的

```python
# 非法年份转成 NaN，再把整列转数值
df["year"] = pd.to_numeric(df["year"], errors="coerce")

# 缺失值分情况处理：
# institution 是分类列，填 "未知"；citations 缺失用中位数填（比均值抗离群值）
df["institution"] = df["institution"].fillna("未知")
df["citations"] = df["citations"].fillna(df["citations"].median())

# 丢掉 year 仍然是 NaN 的行（非法年份，救不回来）
df = df.dropna(subset=["year"])
df["year"] = df["year"].astype(int)
```

`errors="coerce"` 是我用得最多的参数之一：转换失败的值变成 NaN，而不是直接抛异常中断流程。先转再丢，比写正则预清洗 CSV 省事得多。

## 筛选与切片：三种姿势分清

```python
# 布尔筛选：最常用
recent = df[df["year"] >= 2023]
hot = df[(df["citations"] > 100) & (df["field"] == "CV")]   # 多条件要加括号

# loc：按标签选行选列
cv_cites = df.loc[df["field"] == "CV", ["title", "citations"]]

# iloc：按位置
first_10_rows_2_cols = df.iloc[:10, :2]
```

括号问题值得单独说：`&` 的优先级比 `>=` 高，`df[df.year >= 2023 & df.citations > 10]` 会先算 `2023 & df.citations`，报一个莫名其妙的错。每个条件加括号，是肌肉记忆级别的纪律。

## groupby：分组聚合是分析的灵魂

"每个领域每年的平均引用数是多少"——这类问题全是 groupby：

```python
# 基础分组
df.groupby("field")["citations"].mean().sort_values(ascending=False)

# 多列聚合：不同列用不同算法
df.groupby("field").agg(
    paper_count=("title", "count"),
    avg_citations=("citations", "mean"),
    max_citations=("citations", "max"),
)

# 双维度分组：领域 × 年份
pivot = df.groupby(["field", "year"])["citations"].mean().unstack()
```

`unstack()` 把二级索引转成列，得到的宽表既适合人看，也直接能喂给画图库。这是我最常用的"分析 → 出图"衔接动作。

merge 是另一把主力武器，相当于 SQL 的 JOIN：

```python
field_names = pd.DataFrame({
    "field": ["CV", "NLP", "RL", "ML Theory", "Systems"],
    "field_cn": ["计算机视觉", "自然语言处理", "强化学习", "机器学习理论", "系统"],
})

df = df.merge(field_names, on="field", how="left")
```

`how="left"` 的含义是"以左表为准"——右表没匹配上的字段会是 NaN。用 `validate="m:1"` 参数可以让 Pandas 帮你检查连接键的基数关系，防止一对多关系写反导致行数爆炸，这个参数能拦住一类隐蔽的 bug。

## 可视化：分析不出图，等于没做

Pandas 自带 `.plot()`（基于 Matplotlib）适合快速瞄一眼；正式报告我一般用 Plotly，交互式、能缩放、能悬停看数值：

```python
import plotly.express as px

yearly = df.groupby("year")["citations"].mean().reset_index()

fig = px.line(yearly, x="year", y="citations",
              title="年均引用数趋势", markers=True)
fig.write_html("citations_trend.html")   # 存成交互式网页

# 领域分布直方图
fig2 = px.histogram(df, x="field_cn", color="year", barmode="group")
fig2.write_html("field_dist.html")
```

出图前问自己一个问题：**这张图回答什么问题？** "年均引用趋势"回答"领域热度在涨还是跌"，"领域分布"回答"数据是否均衡"。没有问题的图只是装饰。如果是要做模型训练数据，类别不均衡的结论直接决定你要不要做分层采样。

## 性能：十万行以上要换个思路

Pandas 是单机内存计算，百万行以内很舒服，过了量级就要想办法：

```python
# 大文件分块读，边读边聚合
chunks = []
for chunk in pd.read_csv("big.csv", chunksize=100_000):
    chunks.append(chunk.groupby("field")["citations"].sum())
result = pd.concat(chunks).groupby(level=0).sum()

# 只读需要的列，内存能省一大半
df = pd.read_csv("big.csv", usecols=["year", "field", "citations"])

# 分类列转 category 类型，字符串列内存能降 90%
df["field"] = df["field"].astype("category")
```

更大的数据就该请 DuckDB 或 Polars 出场了，那是[大数据管理](/posts/big-data-management/)一篇的话题。

## 踩坑排查清单

| 症状 | 原因 | 处理 |
|---|---|---|
| `SettingWithCopyWarning` | 在切片副本上赋值 | 用 `.loc[行, 列] = 值`，或先 `.copy()` |
| 读进来数字变字符串 | 列里混了非数值 | `pd.to_numeric(errors="coerce")` |
| groupby 后列名变成索引 | groupby 默认把分组键设为索引 | 链尾加 `.reset_index()` |
| merge 后行数暴增 | 连接键一对多关系搞反 | 加 `validate="1:m"` 让它主动报错 |
| 日期列比较出错 | 日期是字符串不是 datetime | `pd.to_datetime()` 先转 |
| 内存爆掉 | 全列读入 + object 类型太重 | `usecols` + `category` + 分块读 |
| CSV 读回来编码乱码 | 文件是 GBK/GB18030 | `pd.read_csv(..., encoding="gbk")` |

`SettingWithCopyWarning` 值得展开说：它出现的场景是 `df[df.year > 2023]["citations"] = 0`——你以为改了原表，实际改的是临时副本，原表纹丝不动，而且不报错，只是警告。数据分析里"我以为改了其实没改"是最阴的 bug 类型，看到这条警告立刻停下来改成 `.loc` 写法。

## 练习

1. 用本文的数据集，找出每个机构引用数最高的那篇论文（提示：`groupby` + `idxmax`）。
2. 计算"每年 CV 领域论文数占当年总数比例"的时间序列并出图。
3. 故意写出一次 `SettingWithCopyWarning`，再用 `.loc` 修复，对比两种写法的结果差异。
4. 把 citations 列分箱成"低/中/高"三档（`pd.cut`），统计每档论文数，画出堆叠柱状图。

## 面试常问

**Q：loc 和 iloc 的区别？**
loc 按标签（index 的值）选，iloc 按整数位置选。`df.loc[3]` 找索引值为 3 的行，`df.iloc[3]` 找第 4 行。索引被重排过之后两者结果可能完全不同。

**Q：怎么向面试官解释 SettingWithCopyWarning？**
Pandas 的切片可能返回视图也可能返回副本，取决于内存布局，行为不确定。在切片结果上赋值时，Pandas 无法确定你想改视图（会联动原表）还是副本（改完就丢），所以报警告。规范做法：明确用 `.loc` 一次性定位行列再赋值。

**Q：Pandas 和 SQL 怎么选？**
数据已经在数据库里、要做多表关联和过滤，先让 SQL 干重活；需要复杂的逐行变换、时间序列重采样、和 Python 生态（sklearn、画图）衔接，用 Pandas。实际项目通常是 SQL 取出中间结果、Pandas 做精加工。

**Q：NaN、None、pd.NA 有什么区别？**
None 是 Python 原生空值，进数值列会把整列拖成 object；NaN 是浮点缺失值，数值列默认用它；pd.NA 是 Pandas 1.0 后引入的统一缺失值标记，支持可空整数（Int64）和布尔类型。新项目建议用可空类型 + pd.NA。

**Q：数据倾斜（某类占 90%）对分析有什么影响？**
均值类指标会被多数类绑架，掩盖少数类的特征；画图时少数类挤成一条线。处理：分面图（facet）、对数坐标、或按类别归一化后再比较。

---

掌握这一套之后，"给我一份 CSV，告诉我能从里面看出什么"这类任务就有完整套路了。下一篇解决数据从哪来的问题：[数据采集与爬虫：合规、稳定地拿到你想要的数据](/posts/web-scraping-data-collection/)。
