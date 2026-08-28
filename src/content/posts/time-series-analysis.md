---
title: "时间序列分析：从 ARIMA 到 Prophet 与深度学习——给数据加上时间轴"
date: 2026-08-29T12:40:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "时间序列的三大成分、平稳性与差分、ARIMA 参数逻辑、Prophet 的快速实战、LSTM 路线，以及时序任务最容易犯的时间泄漏错误。"
tags: ["时间序列", "ARIMA", "Prophet", "预测"]
categories: ["AI课程", "数据分析"]
math: false
---

时间序列是有顺序的数据：股价、流量、销量、服务器监控。它和普通回归的本质区别在**顺序不能打乱**——今天的数据和昨天相关，随机切分训练/测试集就是作弊（时间泄漏，[机器学习基础](/posts/ml-basics-scikit-learn/)讲过这个坑）。这篇从经典统计方法讲到深度学习路线。

> 前置阅读：[Pandas 数据分析](/posts/pandas-data-analysis-visualization/)（时间索引操作）、[线性回归](/posts/ml-linear-regression/)（回归评估语言）。

## 先分解：趋势、季节、残差

拿到序列的第一件事是分解——把时间序列拆成三个可解释的成分：

```python
from statsmodels.tsa.seasonal import seasonal_decompose
import pandas as pd

ts = pd.read_csv("sales.csv", parse_dates=["date"], index_col="date")["y"]
result = seasonal_decompose(ts, model="additive", period=7)   # 周周期

result.plot()   # 趋势（长期方向）+ 季节（周期波动）+ 残差（剩下的噪声）
```

分解的价值直接指导建模：有明显周/年周期就要让模型知道周期；趋势不平稳就要差分。另外用滑动窗口统计（`ts.rolling(7).mean()`）做平滑，是观察趋势最便宜的工具。

## 平稳性与 ARIMA：统计派的基本功

AR（自回归）用过去 p 个值预测当前；MA（移动平均）用过去 q 个预测误差；I 是差分（d 阶，把不平稳变平稳）。ARIMA(p,d,q) 三参数的逻辑：

- **d**：序列均值随时间漂移（不平稳）就取 1，通常 1 够，2 罕见。
- **p/q**：看 ACF/PACF 图定（PACF 截尾处定 p，ACF 截尾处定 q）——现在更常用网格搜索 + AIC 自动选。

```python
from statsmodels.tsa.arima.model import ARIMA

# 时间序列切分：按时间先后切，绝不随机打乱
train, test = ts[:-30], ts[-30:]

model = ARIMA(train, order=(2, 1, 2)).fit()
forecast = model.forecast(steps=30)

from sklearn.metrics import mean_absolute_error
print(f"MAE: {mean_absolute_error(test, forecast):.2f}")
```

**平稳性检验**用 ADF 检验（`adfuller`），p 值 > 0.05 说明不平稳、需要差分。ARIMA 适合单变量、规律稳定的序列；多变量、复杂周期它力不从心。

## Prophet：业务预测的速食面

Facebook 开源的 Prophet 把"趋势 + 多周期 + 节假日"打包成几行代码，对业务时间序列（销量、DAU）效果出奇地好，几乎不用调参：

```python
from prophet import Prophet

df = pd.DataFrame({"ds": ts.index, "y": ts.values})   # Prophet 固定列名
m = Prophet(yearly_seasonality=True, weekly_seasonality=True)
m.add_country_holidays(country_name="CN")              # 节假日效应
m.fit(df.iloc[:-30])

future = m.make_future_dataframe(periods=30)
pred = m.predict(future)
m.plot(pred)   # 自带趋势/周期分解图
```

Prophet 的定位：**业务分析师的第一选择，算法工程师的基线**。它给出的趋势分解图本身就有汇报价值。缺点是不可定制性弱，特殊模式（促销脉冲、外部变量复杂交互）吃力。

## 机器学习与深度学习路线

把时序转成监督学习（滑窗构造特征：滞后值、滚动统计、时间特征），然后 [LightGBM](/posts/ensemble-learning-rf-xgboost/) 直接上——实践中这是打榜和业务的常见强者，能随便加外部特征（天气、促销标记）。

深度路线（LSTM/Transformer）在多序列联合建模（几千个商品一起学）时有优势，单序列场景常常打不过 LightGBM——别为了用深度学习而用。构造时序特征的示例：

```python
def make_features(ts, lags=[1, 2, 3, 7, 14]):
    df = pd.DataFrame({"y": ts})
    for l in lags:
        df[f"lag_{l}"] = ts.shift(l)
    df["roll_mean_7"] = ts.shift(1).rolling(7).mean()  # shift(1) 防泄漏！
    df["dow"] = ts.index.dayofweek
    return df.dropna()
```

注意 `shift(1)`：滚动统计只能用 t-1 及之前的数据，直接用当天值就是泄漏——时序特征的泄漏比任何其他任务都容易犯。

## 踩坑排查

| 症状 | 原因 | 处理 |
|---|---|---|
| 测试集分数高得反常 | 随机切分导致时间泄漏 | 按时间切分，滚动验证 |
| 特征里有当天信息 | 滚动统计没 shift | shift(1) 再 rolling |
| ARIMA 预测一条直线 | 差分过度/参数不当 | ADF 检验定 d；网格搜 p/q |
| 节假日附近全预测错 | 模型不知道节假日 | Prophet 加假日 / 加假日特征 |
| 长 horizon 预测发散 | 递归预测误差累积 | 直接多步模型或接受短 horizon |
| 深度学习打不过基线 | 单序列数据量不足 | 换 LightGBM/Prophet |

## 练习

1. 对一份销量序列做分解，判断周期成分并说明建模启示。
2. 用 ADF 检验判断平稳性，实现 ARIMA 并用滚动验证评估。
3. 用 Prophet 预测并解读它的趋势/周期分解图。
4. 构造滑窗特征训练 LightGBM，与 ARIMA/Prophet 在同一切分下对比。

## 面试常问

**Q：时序任务为什么不能随机切分数据？**
随机切分让训练集包含测试时点之后的信息（未来泄漏），评估虚高且无任何意义。正确做法：按时间切分（前段训练后段测试），更严格用滚动起点验证（rolling origin）。

**Q：ARIMA 的 p、d、q 怎么定？**
d 由平稳性检验（ADF）定，通常 0 或 1；p 看 PACF 截尾点，q 看 ACF 截尾点；现代实践直接 auto_arima 网格搜索按 AIC/BIC 选，人工看图作为 sanity check。

**Q：Prophet 和 ARIMA 怎么选？**
单变量、强统计规律、需要区间理论严谨——ARIMA；业务序列、多周期、有节假日效应、要快——Prophet；要加大量外部特征、多序列——机器学习路线。

**Q：递归多步预测的误差累积怎么缓解？**
递归（用预测值当输入继续预测）会让误差滚雪球。方案：直接训练每个 horizon 的模型、Seq2Seq 多步输出、或限制预测步长。评估时按 horizon 分层报告误差。

---

相关阅读：[集成学习](/posts/ensemble-learning-rf-xgboost/)（时序转监督的主力模型）、[数据可视化](/posts/pandas-data-analysis-visualization/)。
