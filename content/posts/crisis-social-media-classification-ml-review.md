---
title: "危机社交媒体分类：一次机器学习实验的完整复盘"
date: 2026-03-22T00:00:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "复盘 crisis-social-media-classification 项目的机器学习实验：数据探索、特征工程、模型对比、调参过程与最终方案选择。"
tags: ["机器学习", "NLP", "文本分类", "项目复盘", "AI"]
categories: ["AI", "项目复盘"]
---

这个项目要解决的问题是：在突发事件中，从社交媒体的海量信息里快速识别出与危机相关的帖子。这篇复盘记录了我从数据探索到模型上线的完整实验过程——哪些特征有用、哪个模型效果最好、调参踩了哪些坑，以及最终方案是怎么选出来的。

---

## 一、项目背景与问题定义

地震、洪水、恐怖袭击这类突发事件发生后，Twitter/微博等社交平台会在几分钟内涌入海量帖子，其中混杂着求助信息、伤亡报告、捐款号召、谣言转发和无关日常内容。应急响应部门需要从中快速筛出与危机相关的信息，用于灾情评估和资源调度。靠人工审核显然跟不上节奏，于是就有了用机器学习做自动分类的需求。

这个项目（crisis-social-media-classification）对应的就是这个场景。我用了两个公开数据集做实验：

- **CrisisLexT26**：26 次重大危机事件的标注推文集合，约 5 万条
- **HumAID**： humanitarian response 场景的精标注数据，类别更细

合并去重后大约 4.7 万条样本，语言以英文为主。

任务分两层：

1. **二分类**：危机相关 vs 无关
2. **多分类**（仅对危机相关样本）：设施损坏 / 人员伤亡 / 捐赠求助 / 信息传播 / 其他

评估指标我选了 **Macro F1** 而非 Accuracy。原因是类别极度不平衡——信息传播类占 60% 以上，如果模型全猜"信息传播"也能拿到 60% 的 Accuracy，但这对应急响应毫无价值。Macro F1 对每个类别一视同仁地计算 F1 再取平均，能逼模型在小类（捐赠求助）上也下功夫，更贴合实际需求。

---

## 二、数据探索与清洗

跑了一下类别分布，结果很扎眼：

| 类别 | 样本数 | 占比 |
|------|--------|------|
| 信息传播 | 18,920 | 40.2% |
| 设施损坏 | 9,840 | 20.9% |
| 人员伤亡 | 7,210 | 15.3% |
| 其他相关 | 6,830 | 14.5% |
| 无关 | 3,210 | 6.8% |
| 捐赠求助 | 1,290 | 2.7% |

捐赠求助类只有 2.7%，是典型的长尾。这意味着模型很容易在小类上"摆烂"。

文本清洗策略：

- **去除**：URL、@提及、`RT` 转发标记、控制字符
- **保留**：话题标签（`#` 后面的词往往包含语义，如 `#Earthquake`）、表情符号
- **标准化**：表情符号映射为情感词（如 😢 → `sad`）、连续标点压缩、小写化
- **不做**：不去停用词——像 `not`、`no` 这类否定词对危机语义判断很重要

针对小类数据不足，我试了三种数据增强：

1. **同义词替换（WordNet）**：随机替换非停用词，每条增强 2 条
2. **回译（英→中→英）**：用 Google Translate API，对捐赠求助类回译一次，类内样本翻倍
3. **EDA（Easy Data Augmentation）**：随机插入/删除/交换/同义词替换组合

实测回译效果最好，捐赠求助类的召回率提升了约 6 个百分点；EDA 反而引入了较多噪声，对短文本不太友好。

---

## 三、特征工程

模型没动之前，特征工程是性价比最高的方向。我对比了三类特征：

### 1. TF-IDF

```python
from sklearn.feature_extraction.text import TfidfVectorizer

tfidf = TfidfVectorizer(
    ngram_range=(1, 2),
    max_features=10000,
    sublinear_tf=True,
    min_df=3,
    max_df=0.9,
)
```

`ngram_range=(1, 2)` 抓 "flood victim" 这类组合语义；`sublinear_tf=True` 对高频词做对数压缩，避免 "the" 这种词挤占权重。

### 2. 统计特征

文本长度、感叹号数量、大写字母比例、话题标签数量、疑问句标记数。单独用效果一般，但和 TF-IDF 拼一起能给模型一些"信号强度"提示。

### 3. 词嵌入均值池化

用 GloVe 50 维预训练向量，对每条文本的所有词取均值。对短文本有一定效果，但长文本会被稀释。

### 4. 特征选择

把上述特征拼起来维度很高，我用卡方检验选了 top 5000 特征。这一步对小类召回有约 1-2% 的提升——因为卡方会自动剔除那些只在信息传播类高频、对其他类别无区分度的词。

---

## 四、模型对比实验

实验设置：5-fold `StratifiedKFold`（分层抽样，保证每折类别分布一致），统一用相同特征管道。

| 模型 | Macro F1 | 训练时间 | 推理延迟 | 备注 |
|------|----------|----------|----------|------|
| Logistic Regression | 0.72 | 快 | 低 | 基线，正则强 |
| Linear SVM | 0.73 | 快 | 低 | 与 LR 接近 |
| Random Forest | 0.68 | 中 | 中 | 高维稀疏特征表现差 |
| XGBoost | 0.75 | 中 | 中 | 调参后最佳传统模型 |
| BERT-base | 0.82 | 慢（GPU） | 高 | 直接微调 |

几个观察：

- **LR 和 Linear SVM 几乎打平**：在 TF-IDF 稀疏特征上，线性模型就是天花板附近，多花力气调非线性模型收益有限
- **Random Forest 翻车**：高维稀疏 + 类别不平衡对树模型不友好，特征重要性也很分散
- **XGBoost 优于 RF**：树集成模型里 XGBoost 的二阶梯度对不平衡更稳健，且能处理 `scale_pos_weight`
- **BERT 一骑绝尘**：直接微调比所有传统方案高 7 个点以上，但它慢、重、依赖 GPU

---

## 五、调参与优化

### Optuna 调 XGBoost

```python
import optuna
from xgboost import XGBClassifier

def objective(trial):
    params = {
        "max_depth": trial.suggest_int("max_depth", 3, 9),
        "learning_rate": trial.suggest_float("learning_rate", 0.01, 0.3, log=True),
        "n_estimators": trial.suggest_int("n_estimators", 100, 800),
        "subsample": trial.suggest_float("subsample", 0.6, 1.0),
        "colsample_bytree": trial.suggest_float("colsample_bytree", 0.6, 1.0),
        "min_child_weight": trial.suggest_int("min_child_weight", 1, 10),
        "reg_lambda": trial.suggest_float("reg_lambda", 1e-3, 10.0, log=True),
    }
    model = XGBClassifier(
        **params,
        objective="multi:softprob",
        eval_metric="mlogloss",
        early_stopping_rounds=30,
    )
    # 5-fold CV 返回 mean Macro F1
    return cv_score(model)

study = optuna.create_study(direction="maximize")
study.optimize(objective, n_trials=50)
```

最优参数：`max_depth=6`、`learning_rate=0.05`、`n_estimators=420`。`max_depth` 大于 7 全部过拟合，验证集 F1 直接掉到 0.65 以下。

### 过拟合处理

- **XGBoost**：`early_stopping_rounds=30` + L2 正则（`reg_lambda=1.0`）+ subsample 限制
- **BERT**：dropout 0.3、epoch 控制在 3-4、学习率 warmup
- **LR/SVM**：本身就是强正则模型，反而不太需要额外处理

### 集成学习

XGBoost 单模型 F1=0.75，BERT 单模型 F1=0.82。我把两者的概率输出做加权平均：

```python
# 加权融合，BERT 权重更高
final_proba = 0.3 * xgb_proba + 0.7 * bert_proba
```

融合后 Macro F1 提升到 **0.83**，比 BERT 单模型还高 1 个点。原因是 BERT 对个别短文本判断失误，XGBoost 的统计特征能修正一些极端错误。这 1 个点的提升在实际部署中是值得的。

---

## 六、结果分析与误判案例

最终模型的混淆矩阵分析（节选关键类别）：

| 真实 \ 预测 | 信息传播 | 捐赠求助 | 人员伤亡 |
|-------------|----------|----------|----------|
| 信息传播 | 0.94 | 0.01 | 0.03 |
| 捐赠求助 | 0.21 | 0.68 | 0.05 |
| 人员伤亡 | 0.08 | 0.02 | 0.85 |

**捐赠求助类召回率最低（0.68）**，且主要被误判为信息传播类。原因很直接：两类都涉及"传播"动作，区别在于前者是呼吁行动，后者是单纯转发信息。

典型误判：

> "Please donate to help flood victims, every dollar counts #floodrelief"

这条被模型分到了"信息传播"。从语义上看它确实是"传播"一个捐款号召，但标注规范里"呼吁捐款"应该归到捐赠求助。这种边界模糊的样本很难靠模型本身解决，需要在 prompt 或后处理规则里加约束。

---

## 七、复盘与反思

### 做得对的决策

1. **选 Macro F1 而非 Accuracy**：从一开始就逼模型关注小类，避免被"刷高 Accuracy"误导
2. **特征工程优先**：花在 TF-IDF + 统计特征上的时间比调 BERT 还多，但回报率最高
3. **集成而非单一模型**：BERT + XGBoost 的融合把性能推到了一个新台阶

### 如果重来

1. **先做基线再做深度**：第一版应该直接 LR + TF-IDF 跑通端到端流程，再考虑 BERT。我一开始就想上 BERT，结果数据 pipeline 有 bug 拖了一周才暴露
2. **更早引入回译增强**：数据增强是少数能让小类召回稳定提升的手段，应该 Day 1 就做
3. **更严格的标注规范**：边界模糊的样本（如捐款号召 vs 信息传播）应该在标注阶段就明确规则，不然模型再强也只能学到混乱

### 对后续 NLP 项目的启发

- **特征工程仍是性价比最高的方向**：BERT 不是万能的，传统特征 + 强基线模型往往能跑到 80% 的效果，而成本是 BERT 的 1/10
- **BERT 不是万能的，但确实强**：当数据量足够、任务复杂时，BERT 微调的优势无法忽视
- **数据质量 > 模型复杂度**：花一周清洗标注数据，比花一周调 BERT 超参收益高得多

最后附上完整代码示例——TF-IDF + SVM 的简洁 pipeline，作为可复用的基线：

```python
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.svm import LinearSVC
from sklearn.model_selection import StratifiedKFold, cross_val_score

pipeline = Pipeline([
    ("tfidf", TfidfVectorizer(
        ngram_range=(1, 2),
        max_features=10000,
        sublinear_tf=True,
        min_df=3,
        max_df=0.9,
    )),
    ("clf", LinearSVC(C=1.0, class_weight="balanced")),
])

cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
scores = cross_val_score(
    pipeline, X_text, y,
    cv=cv, scoring="f1_macro",
    n_jobs=-1,
)
print(f"Macro F1: {scores.mean():.4f} ± {scores.std():.4f}")
```

这个 pipeline 在我的数据上跑出 Macro F1=0.73，训练时间 30 秒，几乎没什么依赖。任何 NLP 文本分类项目都值得先把它跑通做基线。
