---
title: "集成学习专题：随机森林、AdaBoost 与 XGBoost/LightGBM——三个臭皮匠的数学"
date: 2026-08-29T10:00:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "集成学习的两大思想 Bagging 与 Boosting：随机森林的方差缩减、AdaBoost/GBDT 的偏差缩减、XGBoost 与 LightGBM 的工程进化，以及调参实战。"
tags: ["集成学习", "随机森林", "XGBoost", "LightGBM"]
categories: ["AI课程", "机器学习"]
math: false
---

单棵决策树不稳定、容易过拟合（[决策树篇](/posts/ml-decision-tree/)的教训），集成学习的回答简单粗暴：**训练一堆树，让它们投票**。工业界的表格数据竞赛和风控、推荐等场景里，XGBoost/LightGBM 长期是霸榜存在——"表格数据不决，先上 LightGBM"是流传甚广的经验。

> 前置阅读：[决策树](/posts/ml-decision-tree/)、[机器学习基础](/posts/ml-basics-scikit-learn/)（交叉验证与评估）。

## 两大思想：Bagging 减方差，Boosting 减偏差

**Bagging（并行）**：对数据有放回抽样，独立训练 N 棵树，投票/平均。直觉是"三个臭皮匠顶个诸葛亮"——单棵树各自犯不同的错，多数投票把错误抵消掉。数学本质：独立同方差的模型平均后，方差降为 1/N。

**Boosting（串行）**：每棵新树专门学习前面所有树还没学好的部分（残差/难样本），逐步纠偏。直觉是"知错就改"——模型能力随迭代持续增强，但也可能改过头（过拟合），需要早停和学习率约束。

一个减方差（治过拟合）、一个减偏差（治欠拟合），这是理解一切集成变体的总纲。

## 随机森林：Bagging + 随机特征

随机森林在 Bagging 之上加了一层随机性：每棵树分裂时只看随机抽的一部分特征。这样树与树之间更不相似（去相关），平均的方差缩减效果更好：

```python
from sklearn.ensemble import RandomForestClassifier

rf = RandomForestClassifier(
    n_estimators=300,        # 树的数量：多了不再涨分，只变慢
    max_depth=None,          # 单树通常不剪枝（集成负责防过拟合）
    max_features="sqrt",     # 每次分裂随机看 √d 个特征
    min_samples_leaf=2,
    n_jobs=-1,
    oob_score=True,          # 袋外样本评估：免费的验证集
    random_state=42,
)
rf.fit(X_train, y_train)
print(rf.oob_score_)         # 袋外分数≈交叉验证分数
```

随机森林的性格：**皮实、几乎不用调参、自带特征重要性和袋外评估**。它是任何表格任务都值得先跑一遍的基线。

## AdaBoost 与 GBDT：Boosting 的两种形态

**AdaBoost**：给分错的样本加大权重，下一棵树重点学这些"硬骨头"，最后按各树表现加权投票。思想优雅但对噪声和离群值敏感——错误样本被越放越大，脏数据会带偏整个序列。

**GBDT（梯度提升树）**：更一般的框架——每棵新树拟合损失函数对当前模型的**负梯度**（平方损失下就是残差），加一个小的学习率收缩每步贡献。XGBoost、LightGBM、CatBoost 都是它的工程强化版。

## XGBoost vs LightGBM：工程巅峰的对决

| 维度 | XGBoost | LightGBM |
|---|---|---|
| 分裂策略 | 预排序/近似直方图 | 直方图 + GOSS（保留大梯度样本） |
| 树生长 | 按层（level-wise） | 按叶子（leaf-wise，更深更准但易过拟合） |
| 速度 | 快 | 更快（大数据上数倍差距） |
| 内存 | 中 | 低（特征捆绑 EFB） |
| 类别特征 | 需编码 | 原生支持 |

实践结论：**默认先试 LightGBM**，速度和内存优势明显；数据量小或对稳定性极敏感时 XGBoost 仍是稳妥选择。

```python
# pip install lightgbm
import lightgbm as lgb

model = lgb.LGBMClassifier(
    n_estimators=1000,
    learning_rate=0.05,
    num_leaves=63,             # leaf-wise 的核心复杂度旋钮，2^max_depth 以内
    min_child_samples=20,      # 防过拟合主力
    subsample=0.8, subsample_freq=1,
    colsample_bytree=0.8,
    class_weight="balanced",
    random_state=42,
)
model.fit(X_train, y_train,
          eval_set=[(X_val, y_val)],
          callbacks=[lgb.early_stopping(50)])   # 早停自动定迭代数
```

调参顺序（我验证过的高效路径）：先定 `learning_rate=0.05~0.1` 配 `early_stopping` → 调 `num_leaves` 和 `min_child_samples`（控制过拟合）→ 最后加采样类参数（subsample/colsample）。`n_estimators` 交给早停决定，不手调。

## 什么时候用，什么时候不用

**用**：表格/结构化数据（这是 GBDT 的主场）、特征工程做得动的场景、需要特征重要性解释、中小数据量。

**不用**：图像/文本/语音等非结构化数据（深度学习主场）、高维稀疏文本（TF-IDF 上万维，线性模型更合适）、需要概率校准输出且不想后处理时。

## 踩坑排查

| 症状 | 原因 | 处理 |
|---|---|---|
| 训练分 100% 验证大跌 | leaf-wise 过深 | 降 num_leaves、提 min_child_samples |
| 早停一直不触发 | 学习率太小/评估集不对 | lr 提到 0.05；确认 eval_set 是留出集 |
| 特征重要性被 ID 列主导 | 高基数泄漏 | 删 ID 类特征重训 |
| LightGBM 比 sklearn 慢 | 数据小，启动开销占比大 | 小数据差距无意义 |
| 类别特征报错 | 字符串没转 category | astype("category") |
| 概率输出不准 | Boosting 分数未校准 | CalibratedClassifierCV/等温回归 |

## 练习

1. 在同一表格数据集上对比单树、随机森林、LightGBM 的 5 折分数与训练耗时。
2. 消融随机森林的 `max_features`，观察树间相关性与总分的关系。
3. 按本文顺序调 LightGBM 参数，记录每一步的验证分变化。
4. 故意加入高基数 ID 列，观察特征重要性的污染并修复。

## 面试常问

**Q：Bagging 为什么能减方差？**
N 个方差为 σ² 的独立模型平均后方差为 σ²/N。随机森林再加特征随机性降低树间相关性 ρ，平均方差 = ρσ² + (1-ρ)σ²/N——ρ 越小收益越大，这就是随机特征的价值。

**Q：XGBoost 相对 GBDT 改进了什么？**
二阶泰勒展开利用损失的二阶导信息、正则项（叶子数 + 叶权重）直接进目标函数、列抽样防过拟合、稀疏感知分裂与工程级并行。是"算法 + 系统"的双重优化。

**Q：leaf-wise 和 level-wise 的区别？**
level-wise 同层所有叶子一起分裂，树平衡但浪费；leaf-wise 每次分裂增益最大的叶子，同样叶子数下精度更高，但容易长出过深的树——所以 LightGBM 用 num_leaves + min_child_samples 约束。

**Q：集成模型为什么不适合高维稀疏文本？**
树的分裂按单特征阈值切，面对上万维稀疏特征，有效分裂位置稀疏且计算昂贵；线性模型在稀疏高维上天然高效且表达力足够。特征形态决定模型候选集。

---

相关阅读：[决策树](/posts/ml-decision-tree/)（集成的基石）、[引用数预测实战](/posts/research-ml-03-citation-regression/)（HGB 的应用现场）。
