---
title: "经典机器学习 04：无监督主题发现——聚类与降维可视化"
date: 2026-08-28T21:00:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "AI 科研内容课程系列三第 4 课：在没有标签的维度上发现结构——K-Means 主题聚类、TruncatedSVD 降维、UMAP 可视化和主题的词云式解读。"
tags: ["聚类", "K-Means", "降维", "UMAP", "主题发现"]
categories: ["AI课程", "机器学习"]
math: false
---

前三课都有明确标签可学。这一课换个视角：领域标签（cs.CL 等）是粗粒度的官方分类，但一个领域内部还有大量细粒度主题——cs.CL 里有 LLM、机器翻译、信息抽取、对话系统……这些细分主题没有现成标签，让算法自己从文本里发现。这就是平台的"主题地图"功能。

> 前置阅读：[K-Means 聚类](/posts/ml-kmeans-clustering/)（算法原理、K 值选择、轮廓系数本篇直接复用）、[第 2 课：领域分类](/posts/research-ml-02-field-classification/)（特征管道）。

## 任务定义：领域内的主题结构

输入：cs.CL 领域论文的 TF-IDF 向量。输出：若干主题簇 + 每个簇的主题词解读 + 二维可视化地图。无监督任务的定义要额外写清楚"怎么算好"——没有标签就没有准确率，评估靠**轮廓系数（数学质量）+ 人工解读（语义质量）**两条腿，缺一不可。

## 先降维：两万维不能直接聚类

TF-IDF 特征两万维且稀疏，直接 K-Means 有两个问题：高维空间里欧氏距离失效（维度灾难——所有点对之间的距离趋于相等），计算也慢。先降维：

```python
from sklearn.decomposition import TruncatedSVD

# 稀疏矩阵上的 PCA：降到 100 维稠密空间
svd = TruncatedSVD(n_components=100, random_state=42)
X_dense = svd.fit_transform(X_tfidf)
print(f"保留方差比: {svd.explained_variance_ratio_.sum():.3f}")
```

`TruncatedSVD` 是稀疏矩阵专用的降维（不做中心化，保持稀疏结构），文本领域的这个用法就是经典的 LSA（潜在语义分析）。100 维通常能保留 40-60% 方差——听起来不高，但对聚类而言已经足够：我们需要的不是重建原文，而是保留"哪些文档相似"的结构。

降维后务必标准化（各维度方差不同），然后才是熟悉的 K-Means：

```python
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans

X_scaled = StandardScaler().fit_transform(X_dense)
km = KMeans(n_clusters=12, n_init=10, random_state=42)
labels = km.fit_predict(X_scaled)
```

## K 值与质量：两条腿走路

数学腿：扫 K 从 5 到 30，画轮廓系数曲线（方法见 [K-Means 课](/posts/ml-kmeans-clustering/)）。语义腿——主题簇必须能解读，用每个簇的**高权重词**命名：

```python
import numpy as np

def top_terms_per_cluster(km_model, svd_model, vectorizer, topn=8):
    # 簇中心 × SVD 逆变换回词空间，取权重最高的词
    terms = np.array(vectorizer.get_feature_names_out())
    centers_in_word_space = km_model.cluster_centers_ @ svd_model.components_
    for i, center in enumerate(centers_in_word_space):
        top = terms[np.argsort(center)[-topn:][::-1]]
        print(f"主题 {i}: {', '.join(top)}")
```

输出可能长这样（示例）："主题 3: language model, pretraining, transformer, llm..."——能起名的簇才是好簇。K=12 时簇都能起出清晰的名字，K=20 时出现两个簇都叫"深度学习相关"无法区分，那就退回 K=12。**语义可解释性是 K 值选择的一票否决项**。

## UMAP 地图：把十万篇论文摊在一张图上

SVD 的 100 维人眼还是看不了。再降到 2 维做可视化——这一步用 UMAP 而不是继续 SVD：

```python
import umap
import plotly.express as px

reducer = umap.UMAP(n_neighbors=15, min_dist=0.1, random_state=42)
xy = reducer.fit_transform(X_scaled)

viz = pd.DataFrame({"x": xy[:, 0], "y": xy[:, 1],
                    "topic": labels, "title": titles})
fig = px.scatter(viz.sample(20000), x="x", y="y", color="topic",
                 hover_data=["title"], title="cs.CL 主题地图")
fig.write_html("runs/m2/topic_map.html")
```

UMAP 和 SVD 的分工：SVD 保全局方差结构（给聚类用），UMAP 保局部邻域结构（给人眼看）。直接用 UMAP 的 2 维输出聚类是常见错误——2 维投影为了视觉效果扭曲了距离，聚类要在高维空间做，投影只为展示。

`hover_data=["title"]` 让地图可交互：鼠标悬停看论文标题，地图的可信度立刻可以人工抽查——点一堆"机器翻译"论文的簇，悬停一看果然都是翻译论文，地图就立住了。

## 与官方标签对照：发现的结构靠谱吗

把聚类结果和官方领域标签交叉看，是无监督任务最好的外部验证：

```python
ct = pd.crosstab(df["field"], labels, normalize="index")
```

如果 cs.CL 的论文集中落在某几个簇里，说明聚类发现的结构和人类专家的分类体系呼应——簇是可信的。更有趣的是**簇跨领域的部分**：一个"强化学习"主题的簇同时包含 cs.LG 和 cs.RO（机器人）的论文，这正是官方粗分类看不见的跨领域联系，是主题地图的独特价值。

## 主题随时间的演化

簇标签和时间字段交叉，得到"主题兴衰图"：每个主题在各年份的论文占比。LLM 主题在 2023 年后的爆发、某些传统主题的占比萎缩，都在这张图上一目了然。这张图的洞察直接可以写进平台的"研究趋势报告"功能——无监督发现的结构第一次直接产生产品价值。

## 踩坑排查

| 症状 | 原因 | 处理 |
|---|---|---|
| 高维直接聚类结果乱 | 维度灾难 | 先 TruncatedSVD 到百维 |
| 簇中心解读不出主题 | 没逆变换回词空间 | centers @ svd.components_ |
| UMAP 图是一团糊 | n_neighbors 不当 | 小数据调小，大数据 15-50 扫参 |
| 用 UMAP 2D 结果聚类簇很怪 | 投影扭曲了距离 | 聚类在 SVD 空间做，UMAP 只展示 |
| 同样的 K 两次结果不同 | 初始化敏感 | n_init=10 + random_state |
| 某簇只有十几篇 | 离群点自成簇 | 检查离群点；或换 HDBSCAN |

## 作品集证据

本课产出：可交互的主题地图 HTML、簇-主题词对照表、主题兴衰趋势图、与官方标签的交叉验证表。"我用无监督方法发现了官方分类体系之外的跨领域主题结构"——这直接是平台差异化功能的卖点。

## 练习

1. 复现 SVD(100) → K-Means 管道，扫 K∈[5,30] 画轮廓系数曲线，用语义可解读性拍板最终 K。
2. 实现 `top_terms_per_cluster`，给每个簇写一句人话命名。
3. 用 UMAP 画主题地图，抽样悬停验证 3 个簇的语义纯度。
4. 做主题 × 年份占比趋势，找出占比上升最快的主题并给出数据支撑。

## 面试常问

**Q：为什么聚类前要降维？**
高维稀疏空间里欧氏距离失效（维度灾难），且计算昂贵。TruncatedSVD 把文本压到百维稠密空间，保留文档相似性结构，聚类质量和速度都提升。这是文本聚类的标准前置。

**Q：UMAP 和 SVD/PCA 的分工？**
PCA/SVD 保全局方差结构，线性、快、可逆，适合聚类前处理；UMAP 保局部邻域，非线性，视觉分组效果好，适合 2D 展示。投影空间（2D）不应用于聚类，因为投影为视觉效果牺牲了距离保真。

**Q：无监督结果怎么验证？**
内部指标（轮廓系数）、外部对照（与官方标签交叉）、人工语义审查（簇主题词可解读、抽样看内容纯度）。三条腿缺一条，结论都站不稳。

**Q：K-Means 在文本上的局限和替代？**
球形簇假设 + 必须预设 K。替代：HDBSCAN（任意形状、自动簇数、识别噪声）、主题模型（LDA，文档属于多个主题的混合）、Embedding + 聚类（系列四的语义向量路线）。

---

下一课：[经典机器学习 05：模型评估、调优与 M2 里程碑验收](/posts/research-ml-05-evaluation-tuning-milestone/)。
