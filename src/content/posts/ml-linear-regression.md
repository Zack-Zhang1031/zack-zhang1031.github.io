---
title: "线性回归：最朴素的模型，最多的坑"
date: 2026-08-28T08:30:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "机器学习入门小系列第 2 篇：从最小二乘的直觉讲起，用 Scikit-learn 实现线性回归，吃透 R²、系数解读、多重共线性、正则化和多项式特征。"
tags: ["机器学习", "线性回归", "正则化", "Scikit-learn"]
categories: ["AI课程", "机器学习"]
math: true
---

线性回归是几乎所有机器学习课程的第一课，也是最被低估的一课。很多人觉得"不就是拟合一条直线吗"，但我面试别人和自己被面试的经历都说明：**线性回归是唯一一个你能跟面试官从假设、求解、诊断聊到正则化、聊满 20 分钟的入门级模型**。它简单到没有借口说"不懂"，又深到能暴露你到底懂不懂。

> 前置阅读：[机器学习基础与 Scikit-learn](/posts/ml-basics-scikit-learn/)（流程框架）。本篇是机器学习小系列第 2 篇。

## 模型的直觉：找一条"总误差最小"的线

给定特征 $x$，线性回归假设标签 $y$ 是特征的线性组合加噪声：

$$y = w_1 x_1 + w_2 x_2 + \cdots + w_d x_d + b + \varepsilon$$

训练的目标：找一组 $w$ 和 $b$，让预测值和真实值的**平方误差之和**最小：

$$\min_{w, b} \sum_{i=1}^{n} \left( y_i - \hat{y}_i \right)^2$$

为什么用平方误差而不是绝对值误差？两个原因：平方项处处可导，有解析解（最小二乘可以直接解出闭式解）；平方对大误差惩罚更重，模型会更努力地避免离谱的预测——代价是对离群值敏感，这是后面要处理的坑。

## 上手：10 行代码跑起来

```python
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score

# 造一份带噪声的房价数据：面积、房龄、楼层 → 价格
rng = np.random.default_rng(42)
n = 500
X = np.column_stack([
    rng.uniform(50, 150, n),     # 面积
    rng.uniform(0, 30, n),       # 房龄
    rng.integers(1, 33, n),      # 楼层
])
y = 3.5 * X[:, 0] - 1.2 * X[:, 1] + 0.3 * X[:, 2] + rng.normal(0, 10, n)

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

model = LinearRegression()
model.fit(X_train, y_train)

y_pred = model.predict(X_test)
print(f"系数: {model.coef_}, 截距: {model.intercept_:.2f}")
print(f"RMSE: {mean_squared_error(y_test, y_pred) ** 0.5:.2f}")
print(f"R²: {r2_score(y_test, y_pred):.3f}")
```

拟合出来的系数会接近我们埋的真值 `[3.5, -1.2, 0.3]`——面积每多 1 平米价格 +3.5，房龄每多 1 年价格 -1.2。这正是线性回归的最大卖点：**系数可以直接解读**，每个特征对结果的贡献方向和幅度一目了然。需要向业务方解释"为什么"的场景，线性回归至今是首选。

## R² 到底在说什么

$R^2$（决定系数）的定义：

$$R^2 = 1 - \frac{\sum (y_i - \hat{y}_i)^2}{\sum (y_i - \bar{y})^2}$$

翻译成人话：**你的模型比"无脑预测均值"好多少**。R²=1 是完美预测；R²=0 说明模型和直接猜均值一样烂；R²<0 说明模型比猜均值还差（在测试集上出现负值，是模型严重失效的信号）。

RMSE 和 R² 要配合看：RMSE 告诉你误差绝对值是多少（"平均差 8 万"），R² 告诉你这个水平算好算坏（"解释了 85% 的方差"）。只说 RMSE 不说 R²，业务方无法判断 8 万误差是大是小。

## 坑一：多重共线性——系数还能信吗

两个特征高度相关时（比如"面积"和"房间数"），模型会把权重在它们之间随机分配：这次训练面积系数 +5、房间数 +1，下次变成 +1 和 +5，**预测能力不受影响，但系数解读彻底失效**。

检测方法：

```python
from statsmodels.stats.outliers_influence import variance_inflation_factor
import pandas as pd

X_df = pd.DataFrame(X_train, columns=["面积", "房龄", "楼层"])
vif = pd.DataFrame({
    "feature": X_df.columns,
    "VIF": [variance_inflation_factor(X_df.values, i) for i in range(X_df.shape[1])],
})
print(vif)
```

VIF（方差膨胀因子）超过 10 就该警惕。处理思路：删掉冗余特征、把相关特征合成一个（比如 PCA），或者用下面要讲的岭回归——L2 正则会把相关特征的权重"均摊"得更稳定。

## 坑二：过拟合与正则化

特征多、数据少的时候，线性回归也会过拟合。两副解药：

```python
from sklearn.linear_model import Ridge, Lasso

# 岭回归（L2）：惩罚系数平方和，把系数压小但一般不压到 0
ridge = Ridge(alpha=1.0)
ridge.fit(X_train, y_train)

# Lasso（L1）：惩罚系数绝对值之和，会把不重要特征的系数压成恰好 0
lasso = Lasso(alpha=0.1)
lasso.fit(X_train, y_train)
```

**岭回归 vs Lasso 的记忆法**：Ridge 让系数"均匀变小"，Lasso 让系数"有的变零"。所以 Lasso 自带特征选择效果——系数为 0 的特征等于被开除了。特征特别多、怀疑大部分没用时，先用 Lasso 筛一遍是常见套路。

`alpha` 控制惩罚力度：0 就是普通线性回归，越大约束越狠。用 `GridSearchCV` 在对数刻度上搜 `[0.01, 0.1, 1, 10, 100]`，方法见上一篇。

## 坑三：世界不是线性的

真实关系经常不是直线：房价和面积可能是对数关系，学习时间和成绩是边际递减。两个应对：

**特征变换**：对特征或标签取 log、开方，把非线性关系"掰直"：

```python
X["log_area"] = np.log(X["面积"])
y_log = np.log(y)   # 标签取对数，预测完记得 exp 回来
```

**多项式特征**：给模型加上特征的平方项、交互项：

```python
from sklearn.preprocessing import PolynomialFeatures
from sklearn.pipeline import Pipeline

pipe = Pipeline([
    ("poly", PolynomialFeatures(degree=2, include_bias=False)),
    ("scaler", StandardScaler()),
    ("model", Ridge(alpha=1.0)),     # 多项式特征多，务必配正则
])
pipe.fit(X_train, y_train)
```

注意两件事：多项式展开后特征数量爆炸（degree=2 时 3 个特征变 9 个），必须配正则；展开后各特征尺度差异巨大，标准化不可省。这也是为什么 Pipeline 里我把 scaler 放在 poly 后面。

## 坑四：离群值绑架模型

平方误差的代价前面说了：一个 100 倍偏离的点，对损失的影响是普通点的一万倍。一套汤里的老鼠屎。处理顺序：

1. **先画图**：`plt.scatter(X[:, 0], y)` 一眼看到离谱的点。
2. **查原因**：是数据录入错误（面积 9999 平米）就删；是真实存在的极端样本（豪宅）就要考虑分开建模或变换。
3. **用稳健回归**：`sklearn.linear_model.RANSACRegressor` 或 `HuberRegressor`，对离群值不敏感。

## 模型诊断：残差是最好的老师

训练完别急着收工，画残差图（预测值 vs 残差）：

```python
import matplotlib.pyplot as plt

residuals = y_test - y_pred
plt.scatter(y_pred, residuals, alpha=0.5)
plt.axhline(0, color="red", linestyle="--")
plt.xlabel("预测值"); plt.ylabel("残差")
```

健康的残差图应该像一团没有结构的云，随机散布在 0 附近。如果出现规律，模型就在"报警"：

- **喇叭形**（预测值越大残差越大）：误差方差非常数，对标签取 log 试试。
- **U 形/曲线形**：关系是非线性的，加多项式特征。
- **几个点特别远**：离群值，回到坑四。

## 踩坑排查清单

| 症状 | 原因 | 处理 |
|---|---|---|
| 系数符号和业务直觉相反 | 多重共线性 | 查 VIF，删/合并相关特征或用岭回归 |
| 训练 R² 高、测试 R² 崩 | 过拟合或泄漏 | 加正则；检查是否有特征泄漏 |
| 测试集 R² 为负 | 模型比猜均值还差 | 检查数据质量、特征有效性、是否欠拟合 |
| Lasso 把系数全压成 0 | alpha 太大 | 对数刻度搜更小的 alpha |
| 多项式后训练极慢/报错 | 特征爆炸 + 尺度失衡 | 降 degree、加 StandardScaler |
| 预测房价出现负值 | 线性模型外推 | 对标签取 log（保证 exp 回来非负） |

## 练习

1. 在加州房价数据集（`fetch_california_housing`）上训练线性回归，报告 RMSE 和 R²，并画出残差图诊断。
2. 计算该数据集的 VIF，找出共线性最强的特征对，删掉其一后对比 R² 变化。
3. 对比 LinearRegression、Ridge、Lasso 在相同数据上的 5 折交叉验证分数，并用 GridSearchCV 找出两个正则模型的最优 alpha。
4. 用 `PolynomialFeatures(degree=2)` + Ridge 重做一次，对比 R² 提升幅度和训练耗时。

## 面试常问

**Q：线性回归的基本假设有哪些？**
四条：线性关系（特征与标签线性相关）、误差独立同分布且近似正态、误差方差恒定（同方差性）、特征间无强共线性。假设被破坏时模型仍可能"能用"，但系数解读和统计推断会失效——残差图就是用来检查这些假设的。

**Q：L1 和 L2 正则的区别，为什么 L1 能产生稀疏解？**
L1 惩罚系数绝对值之和，其约束区域是菱形，顶点在坐标轴上，最优解容易落在顶点（某些系数恰好为 0）；L2 约束区域是圆形，没有顶点，系数趋于均匀缩小但不归零。所以 Lasso 可做特征选择，Ridge 适合处理共线性。

**Q：R² 高就代表模型好吗？**
不一定。训练集 R² 高可能是过拟合；R² 对离群值敏感；加入任何特征（哪怕纯噪声）训练集 R² 都只会升不会降，所以要配合调整 R² 或交叉验证分数看。

**Q：什么场景下你会放弃线性回归？**
特征与标签明显非线性且变换无法掰直；特征数量远超样本量且需要强非线性交互；对预测精度要求极高且不需要解释性。这些场景换树模型（随机森林、梯度提升）或神经网络。

**Q：为什么线性回归对特征尺度敏感？**
模型本身对尺度不敏感（系数会自适应），但**正则化**对尺度敏感——惩罚项按系数绝对值算，尺度大的特征系数天然小、受的惩罚轻，等于被偏袒。所以用 Ridge/Lasso 之前必须标准化。

---

线性回归吃透了，下一篇换口味，看一个完全不需要"线性假设"的模型：[决策树：会提问的模型，可解释性的天花板](/posts/ml-decision-tree/)。
