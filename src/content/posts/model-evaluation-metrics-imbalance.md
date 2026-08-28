---
title: "模型评估指标与类别不平衡：AUC、PR、KS 怎么选，阈值怎么调"
date: 2026-08-30T03:50:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "混淆矩阵的正确打开方式、ROC 与 PR 曲线的分工、类别不平衡下的指标陷阱、SMOTE 与代价敏感学习、阈值调优的业务对齐方法。"
tags: ["模型评估", "AUC", "类别不平衡", "SMOTE", "阈值调优"]
categories: ["AI课程", "机器学习"]
math: false
---

「模型准确率 99.5%」——在欺诈检测项目里，这句话等于什么都没说：欺诈率只有 0.5%，全部预测「正常」就有 99.5% 准确率。**类别不平衡是工业界 ML 的常态而不是例外**（欺诈、故障、流失、违约全是少数派），它同时扭曲两件事：你选的指标和你训的模型。

这篇把「评估」和「不平衡」放在一起讲，因为它们本质是一个问题的两面：指标告诉你模型行不行，处理手法让模型真的行。

**前置阅读**：建议先读 [机器学习基础与 Scikit-learn](/posts/ml-basics-scikit-learn/)、[A/B 测试与统计推断](/posts/ab-testing-statistics/)。

## 混淆矩阵：一切指标的源头

二分类的四种结局：

```
                预测正      预测负
实际正     │    TP    │    FN（漏报）
实际负     │    FP（误报）│    TN
```

从这四个数推导出所有指标，每个指标回答一个不同的业务问题：

| 指标 | 公式 | 回答的问题 |
|------|------|-----------|
| Precision（精确率） | TP/(TP+FP) | 我说「是」的里面，多少真的是？ |
| Recall（召回率） | TP/(TP+FN) | 真的是的里面，我抓到了多少？ |
| F1 | 2PR/(P+R) | P 和 R 的调和平均（偏向小的那个） |
| Accuracy | (TP+TN)/全部 | 整体对多少（不平衡时失真！） |

**精确率和召回率是跷跷板**：阈值调高→精确率升召回率降。风控收紧→误报少但漏掉真欺诈。选哪边？看业务代价：漏一个欺诈亏一万、误杀一个好用户亏一百，就该保召回。

## AUC 与 PR 曲线：不平衡下的分水岭

**ROC-AUC**：横轴假正率（FPR）、纵轴召回率，扫所有阈值画出的曲线下面积。几何意义漂亮：随机取一对正负样本，模型把正的排在负的前面的概率。

但 AUC 在不平衡下有「乐观偏差」：负样本一百万个，误报一万个 FPR 才 1%——曲线看起来很美，但那一万个误报可能已经把客服团队淹没了。

**PR-AUC**：横轴召回、纵轴精确率。它不看 TN（海量正常样本），只聚焦正类的表现，**不平衡场景下比 ROC-AUC 诚实得多**。

```python
from sklearn.metrics import (roc_auc_score, average_precision_score,
                             precision_recall_curve, classification_report)

# 极度不平衡数据上的对比实验
roc = roc_auc_score(y_test, y_score)          # 可能 0.95，看起来很好
pr = average_precision_score(y_test, y_score) # 可能只有 0.35，才是真相
```

我的纪律：**正类占比 <10% 时，主指标用 PR-AUC，ROC-AUC 只当参考**。金融风控还会用 KS（累计分布最大差距），本质是「模型区分度最强的点」，银行报表里常见。

## 阈值调优：0.5 几乎总是错的

模型输出概率，业务需要决策——中间隔着阈值。默认 0.5 只在「两类代价相同且分布平衡」时合理，现实中几乎从不成立。三种选法：

```python
import numpy as np
from sklearn.metrics import f1_score

prec, rec, thresholds = precision_recall_curve(y_test, y_score)

# 方法 1：最大化 F1
f1s = 2 * prec * rec / (prec + rec + 1e-9)
best_t = thresholds[np.argmax(f1s)]

# 方法 2：业务约束法——「召回必须 ≥85%，在此约束下精确率最高」
valid = rec[:-1] >= 0.85
best_t = thresholds[valid][np.argmax(prec[:-1][valid])]

# 方法 3：成本矩阵法——直接最小化期望损失
cost_fn, cost_fp = 10000, 100   # 漏报一万，误报一百
def expected_cost(t):
    pred = y_score >= t
    fn = ((pred == 0) & (y_test == 1)).sum()
    fp = ((pred == 1) & (y_test == 0)).sum()
    return fn * cost_fn + fp * cost_fp
best_t = min(thresholds, key=expected_cost)
```

**方法 3 是我最推荐的**：它强迫业务方把「代价」说成一个数，扯皮会变成对齐。阈值应该进配置文件而不是写死在代码里——业务策略调整时改配置就行。

## 类别不平衡的四种处理：从数据到算法

### ① 重采样：改数据分布

```python
from imblearn.over_sampling import SMOTE
from imblearn.under_sampling import RandomUnderSampler

# SMOTE：在少数类样本之间插值造新样本
X_res, y_res = SMOTE(sampling_strategy=0.3, random_state=42).fit_resample(X_train, y_train)
```

SMOTE 的坑：插值可能造出不真实的样本（特征空间里少数类不连续时）；**只对训练集重采样，验证/测试集保持原始分布**——在重采样后的数据上评估等于自欺。欠采样简单但丢信息，适合负样本多到冗余的场景（千万级负类采到十万）。

### ② 类别权重：改损失函数

```python
from sklearn.linear_model import LogisticRegression
import xgboost as xgb

# 让模型「更怕漏掉正类」
lr = LogisticRegression(class_weight='balanced')  # 权重 = 反比于频率
xgb_model = xgb.XGBClassifier(scale_pos_weight=neg_count / pos_count)
```

改动最小、效果稳定，**是我处理不平衡的第一选择**。本质：把少数类错分的惩罚放大 N 倍，和成本矩阵思想一脉相承。

### ③ 阈值调整：不改模型改决策

最简单也常被忽略：什么都不改，就把阈值从 0.5 降到 0.1，召回立刻上升。配合上节的成本矩阵法，很多「不平衡问题」其实不需要动训练。

### ④ 换算法思路：异常检测

正类极少（<0.1%）且模式多变时，二分类框架本身就不合适——改用异常检测：只学「正常长什么样」，偏离正常即报警。孤立森林、One-Class SVM、AutoEncoder 重构误差，详见 [异常检测实战](/posts/anomaly-detection-practice/)。

## 组合实战：欺诈检测的完整配方

我在风控项目里的标准组合拳，按序执行：

1. **baseline**：类别权重 + XGBoost，PR-AUC 作为北星指标
2. **采样实验**：SMOTE 到 0.3 比例对比 baseline（有时涨有时跌，看数据）
3. **阈值**：按审核人力定——每天能审 500 单，就取风险分 top 500，或成本矩阵法
4. **分群评估**：按渠道/地区/用户分层各看一遍 PR——整体达标但某分群崩坏是常见暗坑
5. **校准**：如果要输出「概率」给下游（如定价），用 Platt scaling / isotonic 校准——类别权重训练出的概率是偏的，排序没问题但数值不可信

最后一条展开说：经过重采样或类别权重的模型，输出概率不再反映真实概率（人为改变了先验）。**排序够用，要概率值必须校准**。sklearn 的 `CalibratedClassifierCV` 一行搞定。

## 踩坑排查

| 现象 | 原因 | 解法 |
|------|------|------|
| 准确率 99% 但业务说没用 | 不平衡下 accuracy 失真 | 换 PR-AUC/召回率做主指标 |
| SMOTE 后验证集 F1 暴涨上线翻车 | 验证集也被重采样了 | 只对训练集采样 |
| 阈值 0.5 时几乎没有预测正类 | 不平衡 + 默认阈值 | 按成本/约束调阈值，别改模型 |
| 类别权重后概率全部偏大 | 先验被改，概率失真 | 排序没问题；要概率就校准 |
| 整体指标好、某渠道全错 | 分群差异被平均掩盖 | 分群评估纳入发布门禁 |
| 正类太少（几十个）怎么训都差 | 数据量本质不足 | 上异常检测思路；或先解决数据收集 |

## 练习

1. 用 sklearn 的 `make_classification(weights=[0.99, 0.01])` 造不平衡数据，训练逻辑回归，分别画出 ROC 和 PR 曲线，直观感受两个指标的「诚实度」差异。
2. 在同一模型上扫描阈值，画出「召回-精确率-阈值」双轴图，分别用 F1 最大法和「召回≥0.85」约束法选阈值，对比业务含义。
3. 对比实验：同一数据分别用「不处理 / 类别权重 / SMOTE」训练 XGBoost，在原始分布测试集上比较 PR-AUC——验证哪个最适合你的数据。
4. 实现成本矩阵选阈值：自定 FN/FP 代价比（10:1、100:1 两组），观察最优阈值怎么移动。

## 面试常问

**Q：为什么不平衡数据上 accuracy 没意义？**
多数类主导了分子。99:1 的数据全猜负类也有 99% accuracy，但正类召回为 0——模型没有任何价值。评估要聚焦「少数类抓得怎么样」，即精确率/召回率/F1/PR-AUC。

**Q：ROC-AUC 和 PR-AUC 什么时候结论会打架？**
不平衡时 ROC 乐观：FPR 的分母是海量负样本，大量误报也压不低 FPR。PR 曲线的分母是「预测为正」，直接暴露误报压力。经验：正类占比 <1% 时两者结论可能完全不同，信 PR-AUC。

**Q：SMOTE 的原理和风险？**
对少数类样本找 k 近邻，在样本与邻居的连线上随机插值生成新样本。风险：① 少数类内部有多个簇时，跨簇插值造出不存在区域的假样本；② 边界样本插值加重类别重叠；③ 高维稀疏特征下「最近邻」本身不可靠。改进版：Borderline-SMOTE（只在边界造）、ADASYN（难样本多造）。

**Q：类别权重和重采样等价吗？**
思想上等价（都改变正负类的有效比例），实现上不同：权重在损失函数层，数据不变；采样在数据层。权重不增加训练成本、不引入假样本，通常是首选；采样（尤其 SMOTE）在特征空间允许合理插值时可能带来额外的泛化收益。工程上先权重，不够再采样。

**Q：模型概率需要校准的场景？**
下游把概率当「钱」用的时候：定价、额度、期望损失计算、多模型分数融合。树模型和 boosting 的概率天然不校准（擅长排序不擅长数值）；SVM 输出根本不是概率。校准方法：Platt scaling（sigmoid 拟合，小样本）和 isotonic regression（非参数，需更多数据）。

## 相关阅读

- [机器学习基础与 Scikit-learn](/posts/ml-basics-scikit-learn/)——评估流程的基本功
- [异常检测实战](/posts/anomaly-detection-practice/)——正类太少时的另一条路
- [A/B 测试与统计推断](/posts/ab-testing-statistics/)——离线指标之后的线上验证
- [集成学习：随机森林与 XGBoost](/posts/ensemble-learning-rf-xgboost/)——scale_pos_weight 的主场
- [MLOps：实验跟踪与监控](/posts/ml-experiment-tracking-monitoring/)——指标进生产后的持续监控

评估指标不是学术选择题，是**业务价值观的数学化**。下次有人报「准确率 99%」，你的第一反应应该是：混淆矩阵给我看看。
