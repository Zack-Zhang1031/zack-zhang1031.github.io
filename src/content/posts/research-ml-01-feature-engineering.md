---
title: "经典机器学习 01：从科研元数据到特征工程"
date: 2026-08-28T19:00:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "AI 科研内容课程系列三第 1 课：在 M1 数据集上为领域分类和引用预测构造特征——文本 TF-IDF、类别编码、时间特征与泄漏防控。"
tags: ["特征工程", "Scikit-learn", "TF-IDF", "机器学习"]
categories: ["AI课程", "机器学习"]
math: false
---

系列三开始建模，目标里程碑是 **M2：论文领域分类器**。但建模的第一课不是模型，是特征。机器学习的实战经验就一句话：**特征工程决定上限，模型只是逼近这个上限**。这一课在 M1 数据集上把"元数据 → 模型输入"的完整链路做出来。

> 前置阅读：[机器学习基础与 Scikit-learn](/posts/ml-basics-scikit-learn/)（Pipeline、数据泄漏的概念本篇直接用）、[系列二 M1](/posts/research-data-05-duckdb-parquet/)（数据来源）。

## 任务定义：先想清楚预测什么

平台上定义两个建模任务，本系列后续课分别攻关：

- **任务 A：领域分类**。输入论文标题 + 摘要 + 元数据，预测领域标签（cs.CL / cs.CV / …）。这是平台"自动归档"功能的核心。
- **任务 B：引用数预测**。预测论文发表后一年内的引用量。这是"影响力预判"功能的原型。

任务定义里最关键是**预测时点**：任务 B 在"论文刚发表"时做预测，那么特征就只能用发表时可得的信息（标题、摘要、作者历史、venue），发表后的数据（早期引用增长）一概不许用——这是时间泄漏的红线，后面构造每个特征都要过这道筛。

## 文本特征：TF-IDF 是永不缺席的基线

标题和摘要是信息量最大的字段。第一条基线永远是 TF-IDF：

```python
from sklearn.feature_extraction.text import TfidfVectorizer

tfidf = TfidfVectorizer(
    max_features=20000,
    ngram_range=(1, 2),        # 单词 + 二元词组，"neural network" 不被拆开
    min_df=5,                  # 出现不足 5 次的词丢掉，压噪降维
    max_df=0.8,                # 80% 文档都出现的词没有区分度
    sublinear_tf=True,         # 词频取 1+log(tf)，压长文档的频数优势
)
X_text = tfidf.fit_transform(df["title"] + " " + df["abstract"].fillna(""))
```

每个参数都有明确意图：`ngram_range=(1,2)` 对科研文本尤其重要——"machine learning" 拆开成两个词后语义全丢。`min_df/max_df` 两头剪，把 20 万维的词表压到 2 万，训练速度提升一个量级而精度几乎无损。

 Embedding 语义向量是更强的文本特征，但那是[系列四第 2 课](/posts/research-mm-02-embedding-semantic-search/)的事——经典机器学习系列先用 TF-IDF 把基线立住，后续对比才有参照系。

## 元数据特征：构造比收集重要

数值与类别特征逐一说构造理由：

```python
import numpy as np
import pandas as pd

def build_meta_features(df: pd.DataFrame) -> pd.DataFrame:
    feat = pd.DataFrame(index=df.index)

    # 作者规模与资历
    feat["author_count"] = df["authors"].str.len()
    # 标题特征：长度、是否含问号/冒号（综述和方法论标题有规律）
    feat["title_len"] = df["title"].str.len()
    feat["title_has_colon"] = df["title"].str.contains(":").astype(int)
    # 摘要长度：长摘要通常对应实证类工作
    feat["abstract_len"] = df["abstract"].fillna("").str.len()
    # 时间特征
    feat["year"] = df["year"]
    feat["month"] = pd.to_datetime(df["published"]).dt.month   # 截稿季效应
    return feat
```

每个特征背后都应该有一个"为什么可能有预测力"的假设：标题带冒号的多是"A: B 方法"式的方法论文；12 月发表的论文可能赶上 NeurIPS 截稿周期。**特征工程不是穷举，是假设驱动**——没有假设的特征加进来只是噪声维度。

机构、venue 这类高基数类别特征用目标编码或频率编码，独热编码会炸出几万维稀疏列。频率编码（取该类别出现次数）简单且常常够用，注意要在训练集上计算映射表，否则又是泄漏。

## 泄漏审查：逐特征过筛

把构造好的特征清单对着预测时点逐一审：

| 特征 | 发表时可得？ | 结论 |
|---|---|---|
| 标题/摘要文本 | ✅ | 可用 |
| 作者数、作者历史发文量 | ✅（历史是发表前的） | 可用 |
| venue | ✅（投稿即定） | 可用 |
| citations | ❌（发表后累积） | 任务 B 禁用 |
| field 标签 | ✅ | 任务 B 可用；任务 A 它就是标签 |

这套审查清单写进代码注释里，是[机器学习基础](/posts/ml-basics-scikit-learn/)讲的"特征泄漏"在真实项目中的标准防法。

## 组装：ColumnTransformer 一体化

文本和元数据特征用 ColumnTransformer 合体，并进 Pipeline——保证"变换在训练集上学、在所有数据上用"：

```python
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression

preprocess = ColumnTransformer([
    ("text", tfidf, "text_all"),                 # 合并后的文本列
    ("meta", StandardScaler(), META_COLS),       # 数值元数据
])

pipe = Pipeline([
    ("prep", preprocess),
    ("clf", LogisticRegression(max_iter=1000, n_jobs=-1)),
])
```

稀疏矩阵和稠密矩阵混排时 ColumnTransformer 会自动处理（输出保持稀疏），但模型要选支持稀疏输入的——逻辑回归、线性 SVM 可以，随机森林不行（它需要稠密矩阵，20 万列会直接爆内存）。**特征形态决定模型候选集**，这是特征工程和模型选择的接口。

## 特征落盘：进 features 层

构造好的特征矩阵连同特征清单（哪些列、什么变换、什么版本的数据）落盘到 `data/features/`：

```python
# 特征清单和数据集版本绑定保存
feature_spec = {
    "dataset_version": "m1.0",
    "text": {"type": "tfidf", "max_features": 20000, "ngram": [1, 2]},
    "meta": META_COLS,
    "leakage_review": "2026-08-28 passed",
}
```

训练脚本只从 features 层读特征，不直接碰 cleaned 层——特征构造逻辑改了，重跑特征脚本出新版本，训练代码不动。这条边界让"换特征做实验"变成低成本操作，呼应[系列一](/posts/ai-research-eng-02-git-version-control/)的 exp 分支工作流。

## 踩坑排查

| 症状 | 原因 | 处理 |
|---|---|---|
| TF-IDF 后内存爆炸 | 没设 min_df/max_features | 词表剪枝；用稀疏矩阵 |
| 训练集 99% 测试 60% | 特征含发表后信息 | 重过泄漏审查清单 |
| 树模型训练极慢 | 喂了高维稀疏特征 | 树模型只用元数据特征，文本留给线性模型 |
| 新数据预测报错 | 线上缺某列/类别没见过 | 特征 Schema 校验 + handle_unknown |
| 频率编码后分数虚高 | 编码表在全量数据上算的 | 编码映射只在训练集上学 |
| 特征脚本每次结果不同 | 依赖了不稳定的行序 | 构造前按 paper_id 排序固定顺序 |

## 作品集证据

本课产出：假设驱动的特征清单 + 逐特征泄漏审查记录 + 落盘的 features 层。面试时"我怎么防数据泄漏"的最佳答案不是背定义，是展示这张审查表。

## 练习

1. 在 M1 数据集上实现本文的文本 + 元数据特征管道，输出特征矩阵形状和稀疏度。
2. 为任务 B 写泄漏审查表，列出所有候选特征的判定与理由。
3. 对比 ngram (1,1) 与 (1,2) 在领域分类基线上的分数差和训练耗时差。
4. 给特征脚本加 Schema 校验：输入缺列时立刻报错并指出缺哪列。

## 面试常问

**Q：TF-IDF 的 min_df / max_df 怎么定？**
min_df 剪低频噪声（拼写错误、罕见术语），常用 3–10；max_df 剪近似停用词的高频词，常用 0.7–0.9。判断依据是词表大小与下游分数：剪得太狠伤召回，太松拖慢训练且引入噪声。扫参对比是可靠的确定方式。

**Q：高基数类别特征怎么处理？**
独热会维度爆炸。选项：频率编码（简单但粗）、目标编码（强但易泄漏，必须在折内计算）、Embedding（深度路线）。经典机器学习场景下目标编码 + 折内计算是性价比最高的方案。

**Q：特征工程怎么防止过拟合？**
泄漏审查（时间/标签维度）、编码统计量只在训练集上学、特征数与样本量保持合理比例、用交叉验证而不是单次划分评估特征变更的收益。

**Q：为什么特征层和训练脚本要分离？**
特征构造是迭代最频繁的环节。分离后特征变更只重跑特征脚本，训练代码稳定；特征版本与数据集版本绑定，实验可复现、可归因。

---

下一课：[经典机器学习 02：领域分类——从逻辑回归基线到 SVM](/posts/research-ml-02-field-classification/)。
