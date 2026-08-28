---
title: "当 Pandas 装不下：Dask 与 Polars 实战——大数据处理的两条现代路线"
date: 2026-08-30T21:30:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "超越 Pandas：Dask 并行化现有代码、Polars 惰性执行与列式内核，10GB CSV 基准对比实测，以及 Pandas/Dask/Polars/DuckDB 的选型决策框架。"
tags: ["Dask", "Polars", "Pandas", "大数据", "数据处理"]
categories: ["AI课程", "数据分析"]
math: false
---

每个数据分析师都会遇到那个时刻：`pd.read_csv` 读一个 8GB 的文件，进度条走到一半，`MemoryError`。Pandas 的天花板是结构性的——**单线程执行 + 全部数据进内存 + 每步操作都产生中间副本**。我统计过自己的崩溃记录：Pandas 的「舒适区」大概是内存的 1/5，16GB 内存的机器，3GB 以上的 CSV 就开始玄学。这篇文章讲两条突围路线：Dask（把 Pandas 并行化）和 Polars（用 Rust 重写一遍），外加一个选型框架。

**前置阅读**：建议先读 [Pandas 数据分析与可视化](/posts/pandas-data-analysis-visualization/)、[NumPy 与 Python 性能优化](/posts/numpy-python-performance/)。

## 先想清楚：Pandas 慢在哪

Pandas 的三个结构性瓶颈，对应三种解法：

1. **单机内存限制** → 解法：分块处理，或上分布式（Dask）。
2. **单线程执行** → 解法：多线程并行（Dask、Polars 都行）。
3. **即刻执行（eager）无优化** → 解法：惰性执行 + 查询优化器（Polars、DuckDB）。

第三条最容易被忽视。Pandas 里 `df[df.a > 0].groupby('b').c.mean()` 会先对整个 `a` 列过滤生成完整副本再聚合；而带优化器的引擎会把过滤条件下推、只读需要的列、自动并行——同样的逻辑，性能差一个数量级。

## 路线一：Dask——最小改动的并行化

Dask 的思路是「Pandas API，集群引擎」：把大数据切成很多块（partition），每块就是一个 Pandas DataFrame，操作被翻译成任务图，多核/多机并行执行。

```python
import dask.dataframe as dd

# API 几乎和 Pandas 一样，但所有操作都是惰性的
df = dd.read_csv("huge_logs/*.csv")          # 读一万个文件也只是一张逻辑表
result = (df[df.status == 200]
          .groupby("url")
          .cost_ms
          .mean())

# 到这一步什么都没算！只有调用 compute 才真正执行
print(result.compute())
```

Dask 的关键概念：

- **惰性任务图**：链式操作先构图，compute 时整体优化执行。
- **分区（partition）**：并行单位。分区太小调度开销爆炸，太大单核跑满内存，经验值每块 100MB~1GB。
- **shuffle 是性能杀手**：groupby、join、set_index 会跨分区搬数据，成本极高，能避免就避免。

Dask 的最大优势是**生态兼容**：现有 Pandas 代码改动量小，还能横向扩到多机集群；Dask-ML 甚至能并行训练 sklearn 模型。

## 路线二：Polars——为性能重写的 DataFrame

Polars 是另一个哲学：不兼容 Pandas API，用 Rust 从零写一个现代查询引擎——**列式内存格式（Arrow）、多线程向量化执行、惰性优化器**，单机性能经常把分布式 Spark 按在地上摩擦。

```python
import polars as pl

result = (
    pl.scan_csv("huge_logs/*.csv")        # scan 开头 = 惰性模式
    .filter(pl.col("status") == 200)
    .group_by("url")
    .agg(pl.col("cost_ms").mean())
    .collect()                            # 惰性图的执行入口
)
```

惰性模式下 Polars 的优化器会自动做：

- **谓词下推**：filter 条件推到扫描阶段，不满足的行根本不读。
- **投影下推**：只读用到的列，100 列的表用 3 列就只读 3 列（配合 Parquet 列存效果爆炸）。
- **并行执行**：所有核自动打满，不用写一行并发代码。

语法上有两个概念要适应：`pl.col("x")` 引用列；表达式链式组合。一开始别扭，用惯之后会发现它比 Pandas 的方括号魔法**可预测得多**。

## 我做的基准对比

同一台机器（8 核 16GB），10GB 访问日志 CSV（约 8000 万行），任务：过滤 status=200 → 按 url 分组 → 求 cost_ms 均值：

| 工具 | 耗时 | 峰值内存 | 备注 |
| --- | --- | --- | --- |
| Pandas | 内存不足崩溃 | >16GB | read_csv 阶段阵亡 |
| Pandas 分块 + 手工聚合 | 168s | 3.2GB | 代码复杂，要自己维护分组状态 |
| Dask (8 核本地) | 74s | 6.8GB | API 熟悉，shuffle 有开销 |
| Polars 惰性 | 21s | 4.1GB | 8 核全满，代码最短 |
| DuckDB SQL | 19s | 3.5GB | 同样列式向量化，SQL 党福音 |

结论很稳定：**单机场景 Polars/DuckDB 碾压；代码迁移成本和集群扩展性是 Dask 的地盘**。

## 选型决策框架

| 场景 | 选择 |
| --- | --- |
| 数据 < 1GB，探索分析 | Pandas（生态最全，别折腾） |
| 单机 1~100GB，性能敏感 | Polars（新代码）或 DuckDB（SQL 党） |
| 现有 Pandas 代码库，渐进提速 | Dask 或 Polars 重写热点 |
| 多机集群、>100GB | Dask 集群 / PySpark |
| 和 sklearn 深度集成 | Dask-ML |
| 即席 SQL 查询 Parquet 湖 | DuckDB |

## 两个避不开的搭配建议

**把 CSV 换成 Parquet**：同样的数据，Parquet 体积是 CSV 的 1/5~1/10，读取快 5~10 倍，还保留类型信息（CSV 连日期都要重新解析）。所有现代引擎都为列存优化，CSV 只应该存在于「给人看」的场景。

**分块思维**：即使用 Pandas，养成 chunksize 分块的习惯——先跑通「分块读取 + 流式聚合」的模式，数据再涨 10 倍也不慌：

```python
chunks = []
for chunk in pd.read_csv("big.csv", chunksize=500_000):
    chunks.append(chunk[chunk.status == 200].groupby("url").cost_ms.sum())
result = pd.concat(chunks).groupby(level=0).sum()   # 汇总各块的部分结果
```

## 踩坑与排查

| 症状 | 可能原因 | 排查方法 |
| --- | --- | --- |
| Dask compute() 卡死 | 分区太碎/任务图太大 | `df.npartitions` 检查；repartition 合并 |
| Dask groupby 巨慢 | shuffle 跨分区搬数据 | 先 filter 再 groupby；考虑 set_index 预分区 |
| Polars 结果和 Pandas 不一致 | 空值/类型语义差异 | 检查 null vs NaN；join 后行数是否膨胀 |
| Polars collect() OOM | 惰性链中间物化太大 | 加 streaming 模式；更早过滤 |
| 读 Parquet 比 CSV 还慢 | 行组太小/压缩级别过高 | 检查文件元数据；重写时用 snappy |
| Dask worker 内存爆 | 单分区过大 | repartition 增加分区数；减少列 |

## 动手练习

1. 生成一个 5GB 的模拟 CSV，分别用 Pandas 分块、Dask、Polars 完成同一个 groupby 聚合，记录耗时和内存。
2. 把数据转成 Parquet 后重跑 Polars 惰性查询，用 `.explain()` 查看优化器做了哪些下推。
3. 故意设计一个让 Dask 慢的场景（小分区 + 大 shuffle），观察任务图，理解 shuffle 成本。

## 面试常问

**Q：Pandas 为什么慢？可以从哪些层面优化？**
三个层面：内存层面，即刻执行产生大量中间副本，且对象 dtype 列是指针数组不连续；计算层面，纯 Python 循环路径和单线程执行；引擎层面，没有查询优化，无法下推和重排。优化对应三板斧：换列式内核（Polars/DuckDB）、并行化（Dask）、换存储格式（Parquet）。

**Q：Dask 和 Spark 的区别？**
编程模型相似（惰性任务图+分区执行），差异在生态和定位：Spark 是 JVM 系、企业级成熟、SQL 和流批一体完善，但 Python 层有序列化开销；Dask 是纯 Python 原生，和 NumPy/Pandas/sklearn 零摩擦，上手快，适合 Python 团队的中小集群。数据科学原型用 Dask，生产级大数据平台多选 Spark。

**Q：Polars 为什么快？**
四个原因：Rust 无 GIL，真多线程；Arrow 列式内存布局，向量化 SIMD 友好；惰性优化器做谓词/投影下推；API 设计强制表达式求值，避免逐行 Python 回调。本质是「把数据库内核的技术栈搬到了 DataFrame 上」。

Pandas 不会消失——它依然是探索性分析的最佳交互界面。但「装不下」不再是终点，而是该换引擎的信号。

**相关阅读**：[Pandas 数据分析与可视化](/posts/pandas-data-analysis-visualization/)、[NumPy 与 Python 性能优化](/posts/numpy-python-performance/)、[DuckDB 与 Parquet](/posts/research-data-05-duckdb-parquet/)、[PySpark 与 Airflow 流水线](/posts/pyspark-airflow-pipeline/)。
