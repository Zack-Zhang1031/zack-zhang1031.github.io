---
title: "经典机器学习 03：引用数预测——回归任务与树模型实战"
date: 2026-08-28T20:20:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "AI 科研内容课程系列三第 3 课：预测论文发表后一年的引用量——长尾目标变换、线性回归 vs 随机森林 vs 梯度提升，以及回归任务的评估口径。"
tags: ["回归", "随机森林", "梯度提升", "特征重要性"]
categories: ["AI课程", "机器学习"]
math: true
---

分类之后攻回归：预测一篇刚发表的论文一年后的引用量。这是平台"潜力论文发现"功能的核心。这个任务把回归建模的典型难点全占了：**目标长尾、特征类型混杂、可解释性要求高**。正好一站式练完。

> 前置阅读：[线性回归](/posts/ml-linear-regression/)（回归评估与正则化）、[决策树](/posts/ml-decision-tree/)（树模型原理）、[第 1 课特征工程](/posts/research-ml-01-feature-engineering/)（特征与泄漏审查）。

## 目标变量：先变换再建模

EDA 课已经发现引用数是极端长尾分布——直接预测原始引用数，模型会被极少数高引论文绑架，损失全花在"别错过爆款"上，普通论文的预测反而全崩。标准处理是 log1p 变换：

```python
import numpy as np

df["y"] = np.log1p(df["citations_1y"])     # 训练目标
# 预测完记得变回来：
# citations_pred = np.expm1(model.predict(X))
```

变换后目标接近正态，模型的误差分配才均匀。评估时两个口径都要看：变换后空间的 RMSE（模型优化的目标），和变回原始空间的 MAE（业务可理解的"平均差几次引用"）。**注意 RMSE 不能在原始空间比**——对数空间优化的模型，原始空间 RMSE 天然吃亏，跨模型比较要在同一口径下进行。

## 三个模型排排坐

这个任务正好对比本系列学过的三类模型：

```python
from sklearn.linear_model import Ridge
from sklearn.ensemble import RandomForestRegressor, HistGradientBoostingRegressor
from sklearn.model_selection import cross_val_score

candidates = {
    "ridge": Ridge(alpha=1.0),                          # 线性基线
    "rf": RandomForestRegressor(n_estimators=200, max_depth=12,
                                min_samples_leaf=5, n_jobs=-1, random_state=42),
    "hgb": HistGradientBoostingRegressor(max_iter=300, learning_rate=0.08,
                                         early_stopping=True, random_state=42),
}

for name, model in candidates.items():
    score = cross_val_score(model, X_train, y_train,
                            cv=5, scoring="neg_root_mean_squared_error").mean()
    print(f"{name}: RMSE(log空间) = {-score:.4f}")
```

典型结论（也是这类"结构化特征 + 长尾目标"任务的普遍规律）：

**Ridge 是地板**。快、系数可解释，但拟合不了非线性——"作者数的影响力边际递减""venue 和领域的交互"这类模式它抓不到。

**随机森林是稳健的中坚**。不用调太多参数就能拿到不错的分数，天然给出特征重要性，对离群特征值不敏感。

**梯度提升（HGB）通常最强**。逐棵拟合残差的机制让它对复杂交互的捕捉最好，`early_stopping=True` 自动防过拟合。代价是训练更慢、超参更敏感。XGBoost/LightGBM 是同族的更强实现，需要额外安装但接口一致。

## 特征重要性：模型教我们做产品

树模型的特征重要性直接回答业务问题"什么样的论文更可能高引"：

```python
import pandas as pd

hgb.fit(X_train, y_train)
imp = pd.Series(hgb.feature_importances_, index=FEATURE_NAMES)
print(imp.sort_values(ascending=False).head(10))
```

这类任务里重要性靠前的一般是：venue 声誉、作者历史产出、领域热度、标题特征。重要性结果有两个正经用途：**砍掉零重要性特征**简化模型（特征越少，[特征层](/posts/research-ml-01-feature-engineering/)维护成本越低）；以及**反哺产品设计**——比如"作者历史产出"权重高，说明平台值得做一个作者画像页。

记住[决策树课](/posts/ml-decision-tree/)的警告：重要性偏爱高基数特征、相关特征互相稀释。它是参考信号，不是因果结论。

## 评估：分桶看误差，别看总分

回归任务的总 RMSE 会掩盖一个致命问题：**模型对高引论文的预测可能全军覆没，但低引论文预测得好，总分照样好看**。按真实引用量分桶看：

```python
test["pred"] = np.expm1(hgb.predict(X_test))
test["bucket"] = pd.cut(test["citations_1y"],
                        bins=[-1, 5, 20, 100, np.inf],
                        labels=["低引", "中引", "高引", "爆款"])

print(test.groupby("bucket", observed=True)
          .apply(lambda g: pd.Series({
              "MAE": (g["pred"] - g["citations_1y"]).abs().mean(),
              "预测中位数": g["pred"].median(),
              "真实中位数": g["citations_1y"].median(),
          })))
```

这类任务的诚实结论通常是：中低引区间预测可用，爆款区间模型只能给出"高于平均"的方向性判断。这决定了产品形态——平台可以做"潜力论文推荐"（方向正确即可），不能做"引用数精确预报"。**评估结论要翻译成产品能力边界**，这是建模工程师和算法调参员的区别。

## 误差分析：失败样本的共性

抽预测误差最大的 50 条人工看。典型发现模式：被严重低估的爆款里常有"发布即热点"的工作（比如某个爆款模型发布当周的解读论文）——这类论文的信号（社交媒体热度、GitHub 星数）不在我们的特征里。**误差分析的产出是下一代特征清单**，它告诉你特征的边界在哪，而不只是模型不够好。

## 踩坑排查

| 症状 | 原因 | 处理 |
|---|---|---|
| 原始空间误差巨大 | 忘了 expm1 变回 | 预测后统一变回再评估 |
| 高引样本全被低估 | 目标长尾 + 平方损失 | log1p 变换；评估分桶看 |
| RF 训练内存爆 | 喂了 TF-IDF 高维稀疏特征 | 树模型只用元数据特征 |
| HGB 分数忽高忽低 | 没固定随机性/早停不稳定 | 固定 random_state，验证集切分固定 |
| 特征重要性全在 ID 类列 | 泄漏/高基数污染 | 删 ID 类特征重训 |
| 线上预测比离线差 | 特征口径不一致 | 特征从 features 层统一取 |

## 作品集证据

本课产出：三模型同口径对比报告、特征重要性分析、分桶误差评估。"我用分桶评估发现了模型在爆款论文上的失效边界，并据此定义了产品能力范围"——这是把模型评估做穿的故事。

## 练习

1. 实现 log1p 变换的完整管道，对比 Ridge 在原始/变换目标上的分桶 MAE。
2. 跑通三模型 5 折对比，验证"树模型只用元数据特征"的约束是否成立（试试喂 TF-IDF 会发生什么）。
3. 画预测值 vs 真实值散点图（log 刻度），观察系统性低估区间。
4. 做一次误差分析，写出 Top 50 失败样本的三条共性及对应的特征改进方案。

## 面试常问

**Q：为什么对目标做 log 变换？**
长尾目标下平方损失被大值样本主导，模型牺牲多数样本的精度去迁就少数爆款。log1p 把分布拉对称，误差分配均匀；预测后 expm1 变回。评估要在同一空间跨模型对比。

**Q：随机森林和梯度提升的区别？**
随机森林并行地种多棵深树取平均，靠方差缩减；梯度提升串行地让每棵新树拟合当前残差，靠偏差缩减。前者稳、抗过拟合、好调；后者上限高、对超参敏感、需要早停防过拟合。

**Q：回归任务只看 RMSE 有什么问题？**
RMSE 对离群值敏感且掩盖结构：低引区间预测完美、爆款全错的模型 RMSE 可能还过得去。分桶评估 + 预测/真实分布对比才能暴露失效区间；业务上还要换算成可理解的 MAE。

**Q：特征重要性怎么用才不误用？**
用于特征筛选（砍零重要性）和产品洞察（发现强信号字段）；不用于因果结论（相关稀释、高基数偏爱）；重要特征变更后要重验模型分数确认无损。

---

下一课：[经典机器学习 04：无监督主题发现——聚类与降维可视化](/posts/research-ml-04-topic-clustering/)。
