---
title: "图神经网络入门：从图数据到 GCN——当关系本身就是信息"
date: 2026-08-29T16:50:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "GNN 的核心思想：消息传递与邻居聚合，GCN/GAT 的区别，用 PyG 实现节点分类实战，以及推荐、知识图谱、分子预测的应用版图。"
tags: ["GNN", "图神经网络", "GCN", "PyG"]
categories: ["AI课程", "深度学习"]
math: false
---

CNN 处理网格（图像）、RNN/Transformer 处理序列（文本），但现实数据常常是**图**：社交网络的人与人、论文的引用网（我们的科研平台就有）、知识图谱的实体关系、分子的原子键。图没有固定的邻居数量和顺序，卷积和注意力都用不上——图神经网络（GNN）就是为这种数据生的。

> 前置阅读：[深度学习课程 04：CNN](/posts/deep-learning-04-cnn-image-classification/)（卷积的"邻居聚合"直觉是 GNN 的源头）、[Milvus + Neo4j 实战](/posts/milvus-neo4j-rag/)（图数据库的应用侧）。

## 核心思想：消息传递

GNN 的一切变体共享同一个骨架——**消息传递（message passing）**：每个节点收集邻居的信息（消息），和自己的特征聚合，得到新表示。迭代 K 层，信息就传播了 K 跳：

$$h_v^{(k+1)} = \text{UPDATE}\Big(h_v^{(k)},\ \text{AGGREGATE}\big(\{h_u^{(k)} : u \in \mathcal{N}(v)\}\big)\Big)$$

CNN 卷积其实是它的特例：图像每个像素和周围 3×3 邻居做加权聚合。GNN 把这个操作推广到任意拓扑——邻居数量不定、没有顺序，所以聚合函数必须是**置换不变**的（求和、均值、max 都行，加权拼接不行）。

## GCN 与 GAT：两种聚合方式

**GCN（图卷积网络）**：聚合是"邻居表示按度数归一化后求平均"。简单、快、效果好，是 GNN 的"Hello World"。缺陷是所有邻居同等对待（只按度数加权）。

**GAT（图注意力网络）**：用注意力机制学习每个邻居的权重——重要的邻居多分注意力。表达力更强，代价是计算更贵。思想就是把 [Transformer 的注意力](/posts/deep-learning-07-transformer-attention/)搬到图上。

后续还有 GraphSAGE（采样邻居 + 多种聚合器，大图可扩展）、GIN（理论上更强的区分能力）等变体，入门掌握 GCN/GAT 就够举一反三。

## 实战：PyG 节点分类

PyTorch Geometric（PyG）是 GNN 的标准库。用经典的 Cora 论文引用网络做节点分类（论文是节点、引用是边、预测论文领域）：

```python
# pip install torch_geometric
import torch
import torch.nn.functional as F
from torch_geometric.datasets import Planetoid
from torch_geometric.nn import GCNConv

dataset = Planetoid(root="data", name="Cora")
data = dataset[0]     # x: 节点特征, edge_index: 边, y: 标签, train_mask 等

class GCN(torch.nn.Module):
    def __init__(self):
        super().__init__()
        self.conv1 = GCNConv(dataset.num_features, 16)
        self.conv2 = GCNConv(16, dataset.num_classes)

    def forward(self, x, edge_index):
        x = F.relu(self.conv1(x, edge_index))
        x = F.dropout(x, training=self.training)
        return self.conv2(x, edge_index)

model = GCN()
opt = torch.optim.Adam(model.parameters(), lr=0.01, weight_decay=5e-4)

for epoch in range(200):
    model.train()
    opt.zero_grad()
    out = model(data.x, data.edge_index)
    loss = F.cross_entropy(out[data.train_mask], data.y[data.train_mask])
    loss.backward()
    opt.step()
```

注意 GCN 层的前向输入除了特征还有 `edge_index`——**图的拓扑结构和特征同等重要**，这是 GNN 代码和普通深度学习代码最直观的区别。

## 应用版图

- **节点级**：论文领域分类、社交账号风控（欺诈节点检测）、分子性质预测（原子是节点）。
- **边级**：链接预测（"这两个人会认识吗"）——推荐系统的社交推荐、知识图谱补全。
- **图级**：整图分类（这个分子有毒吗、这个程序含恶意模式吗）。

我们的科研平台场景：引用网络上做"这篇论文会火吗"（节点回归）和"该引用谁"（链接预测），是 GNN 的天然用武之地。

## 工程现实：GNN 的坑要提前知道

- **过平滑（over-smoothing）**：层数多了所有节点表示趋同——GNN 通常 2-3 层就够，不像 CNN 能堆几十层。
- **大图训练难**：全图进内存不现实，GraphSAGE 的邻居采样、ClusterGCN 的子图切分是扩展手段。
- **异构图**：边有不同类型（引用/合作/同机构）时要用 R-GCN/HGT 等异构模型。

## 踩坑排查

| 症状 | 原因 | 处理 |
|---|---|---|
| 加深层数分数反降 | 过平滑 | 减到 2-3 层；加残差 |
| 大图 OOM | 全图训练 | 邻居采样（NeighborLoader） |
| 孤立节点表现差 | 无邻居可聚合 | 加自环（GCNConv 默认带） |
| 边类型信息丢失 | 同构模型处理异构图 | R-GCN/HGT |
| 效果不如 MLP 基线 | 图结构信息弱 | 先验证拓扑是否有用（消融） |
| 评估泄漏 | 图数据切分不当 | 归纳式/直推式设定分清 |

## 练习

1. 在 Cora 上跑通 GCN，并与只用节点特征的 MLP 对比（验证图结构的价值）。
2. 把 GCN 换成 GAT，对比分数和训练耗时。
3. 消融实验：把层数从 1 加到 6，画出分数变化曲线，观察过平滑。
4. 实现一个链接预测任务：随机删 10% 边做测试集，用节点表示点积打分。

## 面试常问

**Q：GNN 和 CNN 的关系？**
CNN 是规则网格上的消息传递（固定 3×3 邻居、固定权重位置）；GNN 把它推广到任意图拓扑，聚合函数必须置换不变。可以理解为"CNN 是 GNN 在欧氏网格上的特例"。

**Q：什么是过平滑，怎么缓解？**
消息传递 K 层后节点表示融合了 K 跳邻居，层数一多所有节点表示趋于相同，失去区分度。缓解：限制层数（2-3）、残差连接、JK 连接（拼接各层输出）、PairNorm。

**Q：GCN 和 GAT 的区别？**
聚合权重：GCN 按节点度数固定归一化；GAT 用注意力机制按节点内容学习权重。GAT 表达力强但贵，GCN 简单快。两者是"固定规则 vs 学习权重"的权衡。

**Q：GNN 训练怎么防数据泄漏？**
图数据的节点有边相连，切分不当会让测试节点的信息经训练节点泄漏。直推式（transductive）设定下图整体可见但标签隔离；归纳式（inductive）要求训练/测试子图完全分离。报告时必须说明设定。

---

相关阅读：[知识图谱构建](/posts/knowledge-graph-construction/)、[推荐系统](/posts/recommender-system-basics/)（图方法是现代推荐的一支）。
