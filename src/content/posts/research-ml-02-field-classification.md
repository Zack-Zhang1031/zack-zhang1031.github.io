---
title: "经典机器学习 02：领域分类——从逻辑回归基线到 SVM"
date: 2026-08-28T19:40:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "AI 科研内容课程系列三第 2 课：用上一课的特征训练论文领域分类器——逻辑回归基线、线性 SVM、类别不均衡处理和阈值调整，立住 M2 的第一个版本。"
tags: ["文本分类", "逻辑回归", "SVM", "类别不均衡"]
categories: ["AI课程", "机器学习"]
math: false
---

特征就绪，这一课正式开练平台的核心模型：**给论文自动打领域标签**。任务输入是标题 + 摘要 + 元数据，输出是 cs.CL / cs.CV / cs.LG 这类领域标签——典型的多分类文本问题。这一课的目标不是刷出最高分，而是**立住一个可靠、可解释、可对比的基线**。

> 前置阅读：[第 1 课：特征工程](/posts/research-ml-01-feature-engineering/)、[机器学习基础与 Scikit-learn](/posts/ml-basics-scikit-learn/)（评估指标与交叉验证）。

## 先看标签分布：不均衡是默认设定

M1 数据集里各领域论文数差异巨大——cs.CV 和 cs.LG 的体量可能是 cs.IR 的好几倍。建模前先看清楚：

```python
import duckdb

dist = duckdb.sql("""
    SELECT field, COUNT(*) AS n,
           ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) AS pct
    FROM 'data/releases/m1.0/**/*.parquet'
    GROUP BY field ORDER BY n DESC
""").df()
print(dist)
```

类别不均衡直接决定两件事：评估指标不能只看准确率（全猜大类分数就很好看），要用宏平均 F1；训练时考虑 `class_weight="balanced"`，让模型为小类错误付出更大代价。

## 基线一：TF-IDF + 逻辑回归

文本分类领域有一个经验法则：**TF-IDF + 逻辑回归是你必须打过的第一道基线**，它便宜、快、出乎意料地强：

```python
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

train, test = train_test_split(df, test_size=0.2,
                               random_state=42, stratify=df["field"])

pipe = Pipeline([
    ("tfidf", TfidfVectorizer(max_features=20000, ngram_range=(1, 2),
                              min_df=5, sublinear_tf=True)),
    ("clf", LogisticRegression(max_iter=1000, C=10,
                               class_weight="balanced", n_jobs=-1)),
])

pipe.fit(train["text_all"], train["field"])
pred = pipe.predict(test["text_all"])
print(classification_report(test["field"], pred, digits=3))
```

在这类 20 类的 arXiv 领域分类任务上，这个基线通常能到 0.75–0.85 的宏 F1 量级。先看报告里的**每一类**的分数而不是总均分：大类（样本多）分数高、小类分数低是常态，宏平均 F1 把每类等权，能暴露小类的真实水平。

## 基线二：线性 SVM，文本分类的经典强者

线性 SVM（`LinearSVC`）在高维稀疏文本上常常比逻辑回归略胜一筹：

```python
from sklearn.svm import LinearSVC

pipe_svm = Pipeline([
    ("tfidf", tfidf),
    ("clf", LinearSVC(C=1.0, class_weight="balanced")),
])
pipe_svm.fit(train["text_all"], train["field"])
```

两者的差异在损失函数：逻辑回归优化对数损失（输出概率，所有样本都参与梯度），SVM 优化合页损失（只关心分类边界附近的支持向量）。高维稀疏文本上合页损失的"不管远离边界的样本"特性往往带来轻微优势。**两者都要跑，谁好用谁**——这是基线阶段的基本态度。

SVM 的短板是不直接输出概率。需要概率（比如"置信度低于 0.6 的预测交给人工"）时用 `CalibratedClassifierCV` 包一层做概率校准。

## 混淆矩阵：错误比分数更有信息量

总分只告诉你"多准"，混淆矩阵告诉你"错在哪"：

```python
from sklearn.metrics import confusion_matrix
import plotly.express as px

cm = confusion_matrix(test["field"], pred, labels=FIELDS)
fig = px.imshow(cm, x=FIELDS, y=FIELDS, text_auto=True,
                title="领域分类混淆矩阵")
fig.write_html("runs/m2/confusion_matrix.html")
```

科研文本分类的混淆模式有非常典型的规律：cs.CL 和 cs.LG 互相混淆（NLP 论文大量用机器学习通用方法）、cs.CV 和 cs.MM 相邻。**错混的类对提示两种改进方向**：语义上确实难分的，考虑合并类目或分层分类（先分大类再分小类）；数据问题（某类样本太少）则去补数据。

抽 30 条预测错误的样本人工看一遍——错误分析这一步不能省，混淆矩阵指方向，人眼看样本才知道原因。

## 阈值与置信度：让模型知道"什么时候不确定"

平台的实际使用场景里，低置信度的预测应该降级为"待人工确认"而不是硬给标签：

```python
proba = pipe.predict_proba(test["text_all"])
confidence = proba.max(axis=1)

# 置信度分布决定阈值设多少
import numpy as np
print(np.percentile(confidence, [10, 25, 50]))
```

设阈值（比如 0.5）后统计：阈值以上的预测准确率多少、覆盖率多少。**准确率-覆盖率的权衡曲线**是给"自动打标"功能定服务水平协议的依据——比如"自动处理 80% 的论文，其中 97% 正确"。

## 模型登记：基线也要有版本

基线模型按[研究方法](/posts/research-methods-ai/)的纪律登记：数据集版本（m1.0）、特征配置、超参、宏 F1、各类 F1、混淆矩阵文件路径，全部写进实验记录。系列四的 Embedding/深度模型登场时，对比的对象就是今天登记的这份基线。**没有登记的基线等于没有基线**——"比原来好"必须能回答"比哪个原来好"。

## 踩坑排查

| 症状 | 原因 | 处理 |
|---|---|---|
| 小类 F1 接近 0 | 类别不均衡 | class_weight balanced；评估看宏 F1 |
| LinearSVC 不收敛警告 | 特征尺度/迭代次数 | TF-IDF 输出已归一，max_iter 加大 |
| predict_proba 报错 | SVM 无概率输出 | CalibratedClassifierCV 包装 |
| 相邻领域大量互混 | 类目语义重叠 | 错误分析后考虑分层分类 |
| 训练集 95% 测试 75% | 过拟合 | 降 C / 减特征 / 增 min_df |
| 新论文预测全是热门类 | 类别先验主导 | 检查 class_weight 是否生效 |

## 作品集证据

本课产出：两个登记在册的基线模型、混淆矩阵分析、"准确率-覆盖率"权衡曲线。平台从此有了自动归档能力的雏形，M2 里程碑完成度 50%。

## 练习

1. 训练逻辑回归与 LinearSVC 两个基线，对比宏 F1 与每类 F1，写出差异分析。
2. 画混淆矩阵热力图，找出 Top 3 错混类对并抽样 30 条人工归因。
3. 实现置信度阈值机制，画出准确率-覆盖率曲线，为"自动打标"功能定一个服务水平。
4. 用 `CalibratedClassifierCV` 给 SVM 加概率输出，对比校准前后的阈值可用性。

## 面试常问

**Q：文本分类为什么先试逻辑回归？**
TF-IDF 特征高维稀疏，线性模型在这种空间表现好；逻辑回归训练快、输出概率、系数可解释（哪个词把文档推向哪类），是性能、速度、可解释性三者的最优平衡点。

**Q：类别不均衡的完整应对策略？**
评估层用宏/加权 F1 代替准确率；训练层用 class_weight 或过采样（SMOTE 慎用，文本高维上效果一般）；决策层按类设阈值；数据层补小类样本是根治。

**Q：怎么处理语义重叠的类目？**
先错误分析确认是数据问题还是定义问题。定义重叠的类目：合并、分层（粗类→细类两级模型）、或多标签化（允许一篇论文同时属于 cs.CL 和 cs.LG）。

**Q：基线模型的作用是什么？**
为后续所有改进提供参照系：没有登记的基线，"提升"无法量化；基线还暴露任务的真实难度（基线就 90% 的任务不需要复杂模型）；基线的错误模式指引改进方向。

---

下一课：[经典机器学习 03：引用数预测——回归任务实战](/posts/research-ml-03-citation-regression/)。
