---
title: "特征工程实战：编码、分箱、交叉与泄漏防范——模型上限的另一半"
date: 2026-08-30T04:20:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "类别编码的五种武器、数值分箱策略、特征交叉与多项式、时间特征提取、特征泄漏的识别与防范，附 sklearn Pipeline 防泄漏标准写法。"
tags: ["特征工程", "特征编码", "数据预处理", "sklearn", "特征泄漏"]
categories: ["AI课程", "机器学习"]
math: false
---

吴恩达那句话被引用烂了但依然正确：「应用机器学习基本是特征工程。」深度学习吃掉了很多手工特征（图像、文本、语音），但在**表格数据**这个工业界最大的战场上——风控、推荐、定价、销量预测——特征工程依然是模型性能的第一变量。我见过同一个 XGBoost，换一套特征从 AUC 0.78 涨到 0.86，模型一行没改。

这篇按实战流程组织：拿到原始表 → 逐列处理 → 组装管道 → 防泄漏检查。

**前置阅读**：建议先读 [Pandas 数据分析](/posts/pandas-data-analysis-visualization/)、[机器学习基础](/posts/ml-basics-scikit-learn/)、[模型评估指标](/posts/model-evaluation-metrics-imbalance/)。

## 类别特征：五种编码怎么选

**① One-Hot：低基数（<10 类）的默认项**

```python
pd.get_dummies(df, columns=["color", "size"], drop_first=True)
```

类别多了列爆炸（城市几百个就是几百列），树模型被稀疏特征拖慢。「基数」是选择编码的第一判断维度。

**② 序号编码：有天然顺序时用**

教育程度（高中<本科<硕士）、会员等级——顺序本身携带信息，映射成 1/2/3 直接保留。**无序类别别用**，模型会误以为「北京(1) < 上海(2)」有大小关系。

**③ 目标编码（Target/Mean Encoding）：高基数的核武器**

用「该类别对应的目标均值」替换类别值：城市 → 该城市历史转化率。

```python
# 平滑版目标编码（小样本类别往全局均值收缩）
global_mean = y_train.mean()
counts = X_train.groupby("city")[target].count()
means = y_train.groupby(X_train["city"]).mean()
smooth = (counts * means + 20 * global_mean) / (counts + 20)  # 20 是平滑强度
X_train["city_te"] = X_train["city"].map(smooth)
```

两个生死坑：**必须在训练集内部用 KFold 计算**（用全部数据算 = 轻微泄漏）；**测试集遇到训练没见过的类别**要填全局均值兜底。CatBoost 的 ordered target statistics 就是这个思想的工业级实现。

**④ 频次编码**：类别 → 该类出现次数。不含目标信息所以无泄漏风险，适合用户 ID 这种「老用户 vs 新用户」频次本身就是信号的场景。

**⑤ Embedding 编码**：高基数 + 深度模型时的选择，神经网络自己学类别的稠密表示——[推荐系统](/posts/recommender-system-basics/)里 user/item embedding 就是这东西。

## 数值特征：分箱、变换与缩放

**分箱（离散化）**把连续值切成区间，三个收益：引入非线性（年龄对流失的影响是 U 型，分箱后每箱独立学）、抗异常值（收入 999 万的离群点落进「>50 万」箱就无害了）、业务可解释（「30-35 岁人群」比系数好讲）。

```python
# 等频分箱 vs 等宽分箱 vs 业务分箱
df["age_q"] = pd.qcut(df["age"], q=5, labels=False)           # 等频：每箱人数相同
df["age_w"] = pd.cut(df["age"], bins=5, labels=False)         # 等宽：易受极值影响
df["age_b"] = pd.cut(df["age"], bins=[0,25,35,50,120])        # 业务边界，最推荐
```

经验：**树模型（XGBoost/LGBM）不需要分箱也不需要缩放**——它们对单调变换不敏感，分裂点自己找。分箱主要服务线性模型和业务解释。**线性模型/神经网络/SVM/KNN 必须缩放**（StandardScaler 或 MinMax），否则大尺度特征统治梯度。

**偏态变换**：收入、金额、时长通常右偏长尾，`log1p` 变换拉近正态——线性模型收益明显：

```python
df["income_log"] = np.log1p(df["income"])
```

**缺失值不是垃圾**：缺失本身可能是信号（用户没填收入 ≈ 收入敏感）。标准做法：单独加一列 `income_missing` 标记，原列填中位数。树模型（XGBoost/LightGBM）原生支持缺失，可以不填。

## 时间特征：最被低估的金矿

一个 `created_at` 能拆出一打特征：

```python
dt = pd.to_datetime(df["created_at"])
df["hour"] = dt.dt.hour                  # 深夜行为 vs 工作时间
df["dow"] = dt.dt.dayofweek              # 周末效应
df["is_weekend"] = (dt.dt.dayofweek >= 5).astype(int)
df["month"] = dt.dt.month                # 季节/促销周期
df["days_since"] = (ref_date - dt).dt.days  # 距今天数——时近性
```

两个进阶：**周期编码**——hour=23 和 hour=0 在数值上差 23，实际只差 1 小时，用 sin/cos 编码让「环形」变「相邻」：

```python
df["hour_sin"] = np.sin(2 * np.pi * df["hour"] / 24)
df["hour_cos"] = np.cos(2 * np.pi * df["hour"] / 24)
```

**统计窗口特征**：用户近 7 天/30 天的行为计数——这是把「历史」压进单行样本的通用手段，时序问题表格化的核心技巧。

## 特征交叉：1+1 > 2 的地方

单个特征不够，组合才有业务含义：

```python
# 显式交叉（线性模型必备，树模型大部分能自己学到）
df["income_per_dependent"] = df["income"] / (df["dependents"] + 1)  # 人均收入
df["city_x_channel"] = df["city"] + "_" + df["channel"]              # 类别组合再编码
```

业务驱动的交叉（人均收入、点击率=点击/曝光）远比暴力多项式（`PolynomialFeatures`）有价值——后者组合爆炸且大多无意义。**好的交叉特征来自业务理解，不是排列组合**。

## 特征泄漏：特征工程的第一死因

泄漏 = 特征里混进了「预测时刻不可能知道」的信息。模型离线 AUC 0.95+，上线就崩。经典案例：

- 预测「是否会违约」，特征里有「催收次数」——催收发生在违约之后
- 预测「是否流失」，特征里有「本月登录天数」——流失用户本月当然不登录
- 用整个数据集算目标编码/Scaler/分箱边界——训练集偷看了测试集

**防泄漏的三道闸**：

1. **时间闸**：每个特征问「这个值在预测时刻能拿到吗？」特征生成时间必须 < 预测时间。
2. **管道闸**：所有依赖数据统计的处理（Scaler、目标编码、分箱边界）放进 sklearn Pipeline，`fit` 只在训练折上发生：

```python
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, OneHotEncoder

preprocess = ColumnTransformer([
    ("num", Pipeline([("imp", SimpleImputer(strategy="median")),
                      ("sc", StandardScaler())]), numeric_cols),
    ("cat", Pipeline([("imp", SimpleImputer(strategy="constant", fill_value="UNK")),
                      ("oh", OneHotEncoder(handle_unknown="ignore"))]), cat_cols),
])
pipe = Pipeline([("prep", preprocess), ("clf", XGBClassifier())])
# cross_val_score(pipe, X, y) —— 每折内独立 fit 预处理，无泄漏
```

3. **嗅觉闸**：离线指标好得离谱（AUC>0.95 的业务问题），先怀疑泄漏再庆祝。用 [SHAP](/posts/model-interpretability-shap/) 看重要性——某个特征一枝独秀到可疑，八成是泄漏。

## 特征选择：减法同样重要

特征不是越多越好：冗余特征稀释信号、拖慢训练、增加过拟合风险。三板斧按序用：

1. **过滤式**：方差阈值（删常数列）、相关性（删互相 ρ>0.95 的冗余对之一）、互信息（[信息论篇](/posts/information-theory-basics/)讲过）删与目标无关的。
2. **嵌入式**：用 XGBoost 的 feature_importance 或 L1 正则的系数，删掉尾部 20%，迭代两轮。
3. **包裹式**：递归特征消除（RFE）效果最细但最慢，小特征集才用。

## 踩坑排查

| 现象 | 原因 | 解法 |
|------|------|------|
| 训练指标高、线上崩 | 特征泄漏 | 时间闸自查 + Pipeline 化 |
| One-hot 后训练慢几倍 | 高基数类别爆炸 | 换目标编码/频次编码 |
| 线性模型效果差树模型好 | 没缩放/没分箱/没交叉 | 线性模型吃特征工程，先补课 |
| 测试集出现未知类别报错 | OneHotEncoder 没见过该类 | handle_unknown="ignore" + 填 UNK |
| 目标编码后训练准测试差 | 编码用了全量数据 | KFold 内计算 + 平滑 |
| 分箱后某箱只有几条 | 等宽分箱遇长尾 | 改等频或业务分箱 |

## 练习

1. 在 Titanic 数据上完成完整特征工程：Age 分箱、Sex 编码、Fare log 变换、FamilySize=SibSp+Parch+1、Deck 缺失标记，对比原始特征 vs 工程后特征的交叉验证分数。
2. 实现 KFold 版目标编码，故意用全量数据算一版做对照，观察两版在测试集上的差距——亲手制造并见证泄漏。
3. 对 hour 特征分别用「原始数值」和「sin/cos 编码」训练同一模型，对比验证集表现，解释差异。
4. 用 SHAP 审查一份特征：找出重要性异常高的特征，判断它是真信号还是泄漏。

## 面试常问

**Q：树模型真的不需要特征缩放吗？为什么？**
树的分裂基于单特征的排序切分，对任何单调变换不变——乘以 100、取 log 后找到的分裂点等效。但注意：缩放无害，只是不必要；而分箱对树有时反而有害（粒度损失）。线性模型/神经网络/SVM/KNN 依赖距离或梯度，尺度直接扭曲目标函数，必须缩放。

**Q：目标编码为什么容易泄漏，怎么防？**
类别值用目标均值替换，而均值里包含当前样本自己的标签——特征里掺了答案。防法：KFold 内计算（用其他折的均值编码本折）、留出法、加噪、平滑收缩。CatBoost 的 ordered boosting 按时间序模拟「只用过去数据」，是工程最优解之一。

**Q：怎么处理训练/测试分布不一致的类别特征？**
三层防御：① OneHotEncoder 设 handle_unknown="ignore" 全零兜底；② 目标编码映射时用 defaultdict 填全局均值；③ 上线前对「测试集类别覆盖率」做检查，新类别占比高的特征要做版本化重训计划。

**Q：特征重要性看哪些方法，各有什么偏？**
分裂次数（偏向高基数连续特征）、增益（比次数诚实）、置换重要性（在验证集上，最贴近「真实贡献」）、SHAP（有方向、可加总，[详见](/posts/model-interpretability-shap/)）。多重共线时所有方法都会在相关特征间分摊重要性——先聚类删冗余再看重要性。

**Q：特征工程和深度学习的 end-to-end 矛盾吗？**
不矛盾，分工不同。非结构化数据（图/文/音）：网络学特征，人工工程确实退场。表格数据：深度模型（TabNet、MLP）在多数工业基准上仍打不过「好特征 + GBDT」，特征工程继续是主战场。前沿方向是用 LLM 自动生成候选特征再人工筛（feature engineering as search）。

## 相关阅读

- [Pandas 数据分析与可视化](/posts/pandas-data-analysis-visualization/)——特征加工的工具箱
- [模型评估指标与类别不平衡](/posts/model-evaluation-metrics-imbalance/)——特征好不好，指标说了算
- [集成学习：随机森林与 XGBoost](/posts/ensemble-learning-rf-xgboost/)——表格数据的最佳拍档
- [模型可解释性：SHAP](/posts/model-interpretability-shap/)——理解特征贡献的工具
- [时间序列分析实战](/posts/time-series-analysis/)——时间特征的进阶玩法

特征工程是 ML 里「手艺」含量最高的部分——没有公式保证成功，但有纪律保证不翻车。把 Pipeline 和泄漏检查变成肌肉记忆，你就超过了大多数只会调参的人。
