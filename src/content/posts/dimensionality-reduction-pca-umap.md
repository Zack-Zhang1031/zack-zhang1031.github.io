---
title: "降维专题：PCA、t-SNE 与 UMAP——把高维数据压回人脑能理解的形状"
date: 2026-08-29T11:20:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "降维的三条路线：PCA 的方差最大化、t-SNE 的邻域保持、UMAP 的速度与结构兼顾，以及各自的使用边界与常见误用。"
tags: ["降维", "PCA", "t-SNE", "UMAP"]
categories: ["AI课程", "机器学习"]
math: true
---

真实数据动辄几百上千维（词向量 768 维、图像特征 2048 维），人脑只能理解两三维。降维把高维数据压缩到低维，同时尽量保住最重要的结构。它有三个用途：**可视化**（压到 2D 给人看）、**去噪去相关**（当特征工程用）、**加速下游算法**（聚类前先降维，见 [K-Means 篇](/posts/ml-kmeans-clustering/)的 LSA 实践）。

> 前置阅读：[K-Means 聚类](/posts/ml-kmeans-clustering/)（降维+聚类的组合）、[主题发现](/posts/research-ml-04-topic-clustering/)（UMAP 的实战现场）。

## PCA：方差最大的方向就是信息最多的方向

PCA（主成分分析）找数据方差最大的正交方向，依次取前 k 个。数学上是协方差矩阵的特征分解，等价于 SVD：

```python
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler

X_std = StandardScaler().fit_transform(X)     # PCA 对尺度敏感，必须标准化
pca = PCA(n_components=0.95)                   # 保留 95% 方差，自动定维度
X_pca = pca.fit_transform(X_std)

print(pca.explained_variance_ratio_[:10])      # 每个主成分解释多少方差
print(f"保留了 {pca.n_components_} 维")
```

两个关键动作：**看累计方差曲线选维度**（拐点之后收益递减）；**看主成分的载荷**（`pca.components_`，每个主成分由哪些原始特征主导）——这让 PCA 结果可解释，比如"第一主成分主要由规模和引用数构成，代表论文影响力"。

PCA 的特性：线性、快、可逆、全局结构保真。代价：只能捕捉线性结构，数据的真实结构是弯曲流形时（比如 S 形曲面）会压坏。

## t-SNE：只为可视化而生

t-SNE 的思路：在高维空间算点对之间的相似度（高斯核），在低维空间也算（t 分布），然后优化低维坐标让两个分布接近（KL 散度最小）。效果：高维里的近邻在低维仍然抱团，可视化聚类结构极其清晰。

```python
from sklearn.manifold import TSNE

X_2d = TSNE(n_components=2, perplexity=30, random_state=42,
            init="pca").fit_transform(X_sample)    # 先抽样！
```

t-SNE 的警告清单（每条都是真实事故）：

- **慢**：十万点级别要等很久，先抽样或先 PCA 到 50 维再 t-SNE。
- **perplexity 敏感**（5-50 扫）：太小图碎成小块，太大结构糊掉。
- **不能用于下游**：簇间距离和簇大小在 t-SNE 图上没有意义（它只保局部邻域），拿它的输出聚类是经典错误。
- **不可复用**：不能 transform 新数据（每次都要重算）。

## UMAP：t-SNE 的效果，PCA 的速度

UMAP 基于流形学习的拓扑思想，实践中几乎全面优于 t-SNE：快一个量级、保留更多全局结构、支持 transform 新数据、还能用于下游（虽然聚类仍建议在更高维做，见[主题地图](/posts/research-ml-04-topic-clustering/)的教训）：

```python
import umap

reducer = umap.UMAP(n_neighbors=15, min_dist=0.1,
                    n_components=2, random_state=42)
X_2d = reducer.fit_transform(X)
# 新数据可以 transform——t-SNE 做不到
X_new_2d = reducer.transform(X_new)
```

核心参数：`n_neighbors`（局部 vs 全局的权衡，小则看细节、大则看全局）、`min_dist`（点允许挤多近，控制视觉上的簇紧致度）。

## 怎么选：一张速查表

| 目的 | 选择 |
|---|---|
| 特征工程（去噪/去相关/加速下游） | PCA（或稀疏数据用 TruncatedSVD） |
| 2D 可视化，追求最清晰的簇结构 | UMAP（t-SNE 作为对照） |
| 需要可解释的成分 | PCA（载荷分析） |
| 增量数据持续投影 | PCA 或 UMAP（t-SNE 排除） |
| 稀疏高维文本 | TruncatedSVD（PCA 的稀疏版） |

## 踩坑排查

| 症状 | 原因 | 处理 |
|---|---|---|
| PCA 第一主成分全是某特征 | 没标准化 | StandardScaler 先行 |
| t-SNE 跑一小时没完 | 没抽样/没先降维 | 抽样 + PCA 到 50 维预处理 |
| UMAP 每次结果不同 | 没设 random_state | 固定种子（且会牺牲并行） |
| 拿 t-SNE 输出聚类结果很怪 | 局部保持扭曲全局距离 | 聚类在 PCA/原空间做 |
| PCA 后信息损失大 | 数据结构是非线性的 | 换 UMAP 或核 PCA |
| 稀疏矩阵 PCA 报错 | PCA 需中心化 | 用 TruncatedSVD |

## 练习

1. 在手写数字数据集（load_digits）上画 PCA 累计方差曲线，确定保留 90% 方差需要的维度。
2. 对比 PCA/UMAP/t-SNE 三种 2D 投影，评估哪种最清晰分离了 10 个数字类。
3. 用 UMAP 的 transform 功能把新样本投影到已有地图，验证一致性。
4. 在 20 维数据上先 PCA 到 5 维再训练分类器，对比全维训练的分数与耗时。

## 面试常问

**Q：PCA 的原理和前提？**
找方差最大的正交方向投影，等价于协方差矩阵特征分解。前提：数据线性结构主导、各特征尺度已标准化、方差大等价于信息多（对噪声大的数据不成立）。

**Q：t-SNE 和 UMAP 的簇间距能解读吗？**
不能。两者都只保局部邻域结构，簇与簇之间的距离和簇的绝对大小没有数学意义。只能解读"谁和谁是一团"，不能解读"两团离多远"。

**Q：降维会丢信息，什么时候值得？**
高维带来的问题超过信息损失时：维度灾难（距离失效）、计算成本、噪声维度稀释信号、可视化需求。保留方差/结构的比例要量化报告，不能闷头压。

**Q：稀疏数据为什么不能直接用 PCA？**
PCA 需要中心化（减均值），稀疏矩阵中心化后变稠密，内存爆炸。TruncatedSVD 不中心化、直接在稀疏矩阵上运算，是文本 TF-IDF 场景的标准替代（即 LSA）。

---

相关阅读：[K-Means 聚类](/posts/ml-kmeans-clustering/)、[主题发现实战](/posts/research-ml-04-topic-clustering/)。
