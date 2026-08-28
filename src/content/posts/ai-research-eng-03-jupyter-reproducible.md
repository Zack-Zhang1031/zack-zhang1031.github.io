---
title: "AI 科研工程基础 03：Jupyter 与可复现实验工作流"
date: 2026-08-28T14:20:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "AI 科研内容课程系列一第 3 课：Jupyter 的正确打开方式——探索在 notebook、定型进模块，用 papermill 参数化运行，建立可复现实验的完整工作流。"
tags: ["Jupyter", "可复现性", "实验工作流", "papermill"]
categories: ["AI课程", "科研工程"]
math: false
---

Jupyter 是科研探索的第一工具，也是可复现性事故的第一现场。最常见的灾难场景：一个 notebook 从上到下跑一遍能出结果，换个顺序跑就报错——因为某个单元格依赖了上面另一个单元格的副作用，而这个依赖关系在代码里根本看不出来。这一课讲怎么既享受 notebook 的交互性，又不掉进它的陷阱。

> 前置阅读：[第 1 课：开发环境](/posts/ai-research-eng-01-dev-environment/)（venv 与 kernel 注册）、[第 2 课：Git 工作流](/posts/ai-research-eng-02-git-version-control/)（notebook 的提交纪律）。

## 核心原则：notebook 是草稿纸，模块是交付物

我的工作流严格分两阶段：

**探索阶段在 notebook。** 快速试数据长什么样、特征分布如何、模型基线多少分。这时混乱是可接受的——交互式探索的价值就是快。

**定型阶段搬进 `src/` 模块。** 一旦探索出了有效路径，立刻把代码重构成 `.py` 模块：函数化、参数化、可测试。notebook 里只留一个"演示入口"——调用模块函数、展示结果。

```python
# notebooks/01_explore_fields.ipynb 里的最终形态：
from research_hub.analysis import field_distribution, plot_yearly_trend

df = load_cleaned_papers("data/cleaned/papers.parquet")
dist = field_distribution(df)
fig = plot_yearly_trend(df)
fig.show()
```

判断标准：**notebook 从头（Restart & Run All）能不能一遍跑通？** 能，才有资格提交。这条标准能过滤掉 90% 的状态污染问题。

## 单元格纪律：顺序、粒度、副作用

让 notebook 保持可复现的三个习惯：

**导入全部集中在第一个单元格。** 散落各处的 `import` 让依赖关系不可见，Restart & Run All 时经常报 NameError。

**一个单元格只做一件事，并打印关键中间形状。** 每个数据处理单元格末尾加一行 `print(df.shape)`，跑完一眼能确认每步的行数变化符合预期——这是发现"过滤条件写错了导致数据全没了"这类静默错误的最快方式。

**禁止"回跳式"执行。** 定义函数在 C5、修改变量在 C8、又在 C5 重跑——这种操作产生的状态无法被从头复现。需要改前面的逻辑就改完从头跑，不要只跑局部。

## 参数化：用 papermill 把 notebook 变成可执行的实验

探索定型后，notebook 经常需要"换个参数再跑一遍"（换日期范围、换领域子集）。papermill 让 notebook 可以带参数批量执行：

```python
# 在 notebook 里标记一个 parameters 单元格（# 标记为 parameters tag）
START_YEAR = 2019     # 默认值
END_YEAR = 2025
FIELDS = ["cs.CL", "cs.CV"]
```

```bash
# 命令行注入参数执行，输出新 notebook 副本
papermill 01_explore_fields.ipynb out/exp_2024.ipynb \
  -p START_YEAR 2024 -p END_YEAR 2025

# 批量扫参：每个参数组合产出一个带结果的 notebook
for y in 2019 2021 2023; do
  papermill 01_explore_fields.ipynb out/scan_$y.ipynb -p START_YEAR $y
done
```

输出 notebook 同时包含代码、参数和全部结果图表——**它本身就是一份自包含的实验报告**，直接进 `runs/` 目录归档。配合上一课的 exp/ 分支提交习惯，每个实验都有"参数 + 代码 + 结果"的完整证据链。

## 数据与随机性：可复现的三大支柱

notebook 能跑通 ≠ 别人能复现。复现需要三样东西同时固定：

**1. 数据版本。** 数据源是活的（arXiv 每天都在更新），所以实验必须钉死数据快照：

```python
DATA_PATH = "data/cleaned/papers_2026-08-28.parquet"   # 带日期的快照文件名
```

**2. 代码版本。** notebook 开头打印 Git 提交哈希，让结果和代码版本绑定：

```python
import subprocess
commit = subprocess.check_output(["git", "rev-parse", "--short", "HEAD"]).decode().strip()
print(f"commit: {commit}")
```

**3. 随机种子。** 涉及随机性的地方统一在 parameters 单元格设种子：

```python
SEED = 42
import random, numpy as np
random.seed(SEED); np.random.default_rng(SEED)
```

## 探索转定型的重构清单

当一个 notebook 的探索路径被验证有效，按这个清单搬进模块：

1. 把核心逻辑抽成**纯函数**（输入 DataFrame，返回 DataFrame，不依赖全局状态）。
2. 魔法数字（阈值、窗口大小）变成函数参数，附默认值。
3. 给关键函数写一个最小 pytest（`assert result.shape[0] > 0` 这种冒烟测试也比没有强）。
4. notebook 里只保留"调模块 + 展示"的薄壳。
5. 跑一次 Restart & Run All 确认薄壳仍能出结果。

重构后的代码才能在系列三的建模课、系列五的服务课里被复用——模型训练脚本要调的特征函数，不该从 notebook 里复制粘贴。

## 踩坑排查

| 症状 | 原因 | 处理 |
|---|---|---|
| Restart & Run All 报错 | 单元格间有隐藏状态依赖 | 按本文纪律整理；禁止回跳执行 |
| 同事跑不出一样的图 | 数据快照/种子/库版本不同 | 三支柱：钉数据、钉 commit、钉种子 |
| notebook diff 没法 review | 输出里的 base64 图像 | nbstripout 或提交前清空输出 |
| papermill 参数没生效 | 单元格没打 parameters 标签 | 用 jupyter 的 cell tag 功能标记 |
| 大 DataFrame 让 notebook 极卡 | 全部中间结果驻留内存 | 中间结果写 Parquet，分段加载 |
| kernel 用的不是项目 venv | kernel 注册错位 | `python -m ipykernel install --user` 重注册 |

## 作品集证据

本课的里程碑产出：一个可以 `papermill` 参数化执行的探索 notebook + 一份归档的实验输出 + 从 notebook 重构出的第一个 `src/analysis` 模块。面试时展示"探索 → 参数化 → 模块化"这条演进路径，比展示一个混乱的大 notebook 有力得多。

## 练习

1. 把上一课的探索 notebook 整理到能一次 Restart & Run All 通过，并记录整理前失败的原因。
2. 给 notebook 加 parameters 单元格，用 papermill 按三个不同年份范围生成三份输出 notebook。
3. 在 notebook 开头加入 Git commit 打印和数据快照路径声明，验证换一份数据快照后结果差异可见。
4. 把 notebook 里最核心的一个数据处理逻辑抽成 `src/analysis/` 下的纯函数，并写一个冒烟测试。

## 面试常问

**Q：Jupyter 最大的工程风险是什么，怎么控制？**
隐藏的执行状态：单元格可以任意顺序执行，结果依赖不可见的副作用。控制手段：Restart & Run All 作为提交门槛、导入集中、禁止回跳、探索定型后代码搬进可测试的 .py 模块。

**Q：怎么保证 notebook 实验可复现？**
三支柱同时固定：数据快照（带日期/版本的文件路径）、代码版本（notebook 内打印 Git commit）、随机种子（参数单元格统一设定）。再加 papermill 把"参数 → 结果"的对应关系落成文件。

**Q：notebook 和 .py 模块怎么分工？**
notebook 负责交互式探索和结果展示（人看），.py 模块负责可复用、可测试的逻辑（程序调）。演进方向永远是 notebook → 模块，反过来走是技术债。

---

下一课：[AI 科研工程基础 04：Python 项目工程化——结构、配置与测试](/posts/ai-research-eng-04-python-project-engineering/)。
