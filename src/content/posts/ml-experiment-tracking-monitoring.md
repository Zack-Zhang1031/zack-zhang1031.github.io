---
title: "MLOps 入门：实验跟踪、模型注册与线上监控——让模型持续靠谱"
date: 2026-08-29T22:20:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "MLflow 实验跟踪实战、模型版本与注册表、数据漂移与概念漂移监控、重训练触发策略，搭建从实验到生产的完整 MLOps 闭环。"
tags: ["MLOps", "MLflow", "模型监控", "实验管理", "模型部署"]
categories: ["AI课程", "工程实践"]
math: false
---

「这个 95% 准确率的模型是用哪份数据、什么参数、哪版代码训出来的？」——如果这个问题让你冒冷汗，你需要 MLOps。我经历过那个阶段：实验记在 Excel 里、模型文件叫 `model_final_v3_真的最终版.pkl`、线上模型悄悄变烂一个月后业务方来投诉才发现。

MLOps 不是某个工具，是回答四个问题的纪律：**实验可复现吗？模型版本可追溯吗？上线过程可控吗？线上退化能被发现吗？** 这篇用 MLflow（最主流的开源栈）把四个问题挨个解决。

**前置阅读**：建议先读 [机器学习基础与 Scikit-learn](/posts/ml-basics-scikit-learn/)、[模型压缩与部署](/posts/model-compression-deployment/)、[Linux + Python 环境基础](/posts/linux-python-environment-basics/)。

## 实验跟踪：别再相信你的记性

训练几十轮实验后，「学习率 3e-4 那轮的 F1 是多少」这种问题靠脑子必然翻车。MLflow Tracking 的核心是三个 API：

```python
import mlflow
import mlflow.sklearn
from sklearn.ensemble import GradientBoostingClassifier

mlflow.set_experiment("fraud-detection")

with mlflow.start_run(run_name="gbdt-lr0.05-depth6"):
    # 1. 记参数（输入）
    mlflow.log_params({"lr": 0.05, "max_depth": 6, "n_estimators": 300,
                       "data_version": "v2026-08", "features": "f1_f42"})
    # 2. 训练...
    model = GradientBoostingClassifier(learning_rate=0.05, max_depth=6,
                                       n_estimators=300).fit(X_train, y_train)
    # 3. 记指标（输出）
    mlflow.log_metrics({"auc": 0.9412, "pr_auc": 0.38, "f1": 0.61})
    # 4. 记产物（模型文件、图表、数据快照指针）
    mlflow.sklearn.log_model(model, name="model",
                             input_example=X_train[:5])
    mlflow.log_figure(fig_pr_curve, "pr_curve.png")
```

`mlflow ui` 起个 Web 界面，所有实验的参数-指标并排对比、排序、筛选。两个进阶用法：

- **autolog**：`mlflow.sklearn.autolog()` 一行开启，sklearn/PyTorch/XGBoost 的参数指标自动记录，老脚本零改造接入。
- **tags 规范**：给 run 打 `{"owner": "zack", "purpose": "baseline", "dataset": "v2026-08"}` 标签，三个月后检索「zack 在 v2026-08 数据上的所有实验」才不痛苦。

**数据版本是实验可复现的另一半**。参数和代码能进 Git，数据不能。轻量做法：`data_version` 参数记录数据快照的标识（S3 路径+日期、DVC 的 commit hash）；认真做法上 DVC 或 lakeFS 做数据版本化。没有数据版本的「可复现」是自欺欺人——同样的代码在新数据上就是另一个结果。

## 模型注册表：从「一堆 pkl 文件」到版本治理

实验跑赢了，怎么进生产？直接拷贝 pkl 文件到服务器，是「一次性交付」；模型注册表（Model Registry）是「持续交付」：

```python
# 训练完成后注册
result = mlflow.register_model(
    model_uri=f"runs:/{run.info.run_id}/model",
    name="fraud_detector")

# 版本流转：每个版本带生命周期阶段
from mlflow import MlflowClient
client = MlflowClient()
client.transition_model_version_stage(
    name="fraud_detector", version=result.version, stage="Staging")
# 验证通过后进 Production，旧版本自动 Archived
```

注册表的价值在治理：v7 在 Staging、v6 在 Production、v1~v5 已归档，一目了然；回滚就是把 v6 重新拉回 Production，十秒完成。生产服务加载方式：

```python
model = mlflow.pyfunc.load_model("models:/fraud_detector/Production")
```

服务代码永远加载 `Production` 别名——**发版 = 注册表里挪指针，服务不用重启不用改代码**。这个解耦是模型持续交付的基石。

## 上线只是开始：监控三件事

模型和代码的本质区别：代码上线后行为不变，模型上线后**世界在变**——输入分布漂移、用户行为演化、欺诈模式对抗。监控体系三层：

**① 系统层**：延迟 P99、QPS、错误率、资源占用。和应用监控完全一样，Prometheus + Grafana 搞定，不再展开。

**② 数据层（输入监控）**：特征分布漂移。核心指标 PSI（Population Stability Index）：

```python
import numpy as np

def psi(expected: np.ndarray, actual: np.ndarray, bins=10) -> float:
    """PSI > 0.25 显著漂移，0.1~0.25 关注，< 0.1 正常"""
    breakpoints = np.percentile(expected, np.linspace(0, 100, bins + 1))
    exp_pct = np.histogram(expected, breakpoints)[0] / len(expected)
    act_pct = np.histogram(actual, breakpoints)[0] / len(actual)
    eps = 1e-6
    return np.sum((act_pct - exp_pct) * np.log((act_pct + eps) / (exp_pct + eps)))

# 每天对线上特征 vs 训练集特征计算
score = psi(X_train["amount"].values, df_online["amount"].values)
```

PSI 的原理：把训练集的分布分箱，看线上数据落进各箱的比例变化。对类别特征用卡方检验，对 embedding 特征用 MMD 或余弦距离监控。**监控特征比监控预测更早发现问题**——预测分布漂移是结果，特征漂移是原因。

**③ 效果层（输出监控）**：预测分布监控（今天预测为欺诈的比例突然翻倍，要么攻击来了要么模型抽风）+ 真实标签回流后的效果对账（AUC、精确率按周追踪）。

标签回流有个时间差问题：欺诈标签要人工审核数周才回来，所以效果层监控总是滞后的——这就是为什么数据层监控是早期预警系统。

## 漂移的两种类型与应对

- **数据漂移（covariate shift）**：P(X) 变了，P(Y|X) 没变。例：大促期间交易金额分布上移。模型本身还准，但输入跑到了训练数据的低密区，置信度下降。应对：通常补充新数据重训即可。
- **概念漂移（concept drift）**：P(Y|X) 本身变了。例：欺诈团伙发明了新手法，同样的特征现在对应不同结论。这是真正的模型失效，**必须重训**，而且要快。

区分手段：漂移发生后，用「旧模型在新数据上的表现」和「新数据上快速重训的小模型表现」对比——后者明显好说明概念漂移。

## 重训练策略：定时、触发、还是在线

| 策略 | 适用 | 代价 |
|------|------|------|
| 定期重训（周/月 cron） | 数据演化平缓（风控、质检） | 实现简单，漂移窗口期受损 |
| 触发式重训（漂移超阈值→拉起流水线） | 漂移有明确信号 | 监控误报会导致空跑 |
| 在线学习（逐样本更新） | 广告 CTR 等秒级演化 | 工程复杂、鲁棒性风险大 |

我的默认建议：**定期重训 + 漂移触发的人工审批**组合。全自动触发重训再自动上线听起来美，但一次脏数据引发的自动重训 + 自动上线就是生产事故。保留人在环路（human-in-the-loop）的审批节点，MLOps 的成熟度不体现在自动化程度，而体现在**每次上线都有据可查、可回滚**。

## 一条最小可用的 MLOps 流水线

把整篇串起来，中小团队够用三年的配置：

```
训练脚本(Git) ──► MLflow Tracking（参数/指标/模型文件）
                       │
                       ▼
              Model Registry（Staging → Production）
                       │
                       ▼
        推理服务加载 models:/name/Production
                       │
              ┌────────┴────────┐
              ▼                 ▼
        预测日志 → Kafka    特征快照
              │                 │
              ▼                 ▼
        预测分布监控        PSI 漂移监控（每日批）
              │                 │
              └────────┬────────┘
                       ▼
              告警 → 人工审批 → 触发重训流水线
```

组件替换自由度很高：MLflow 换 Weights & Biases（实验对比体验更好）、监控层换 Evidently AI（开源漂移报告库）、流水线编排用 Airflow/Prefect。**骨架不变，零件可换**——别在工具选型上纠结超过一天。

## 踩坑排查

| 现象 | 原因 | 解法 |
|------|------|------|
| 线上效果比离线差很多 | 训练-服务特征不一致（两套计算代码） | 特征逻辑收进同一 Python 包，离在线共用 |
| 模型上线后缓慢退化 | 数据漂移没监控 | 加 PSI 日报，漂移超阈值告警 |
| 复现不出三个月前的结果 | 数据没版本 / 依赖没锁定 | data_version 入参数；requirements 锁版本或 Docker 镜像 |
| 重训后指标反而降了 | 新数据有脏样本/标签延迟 | 重训数据质量校验（行数、空值率、标签分布）作为流水线门禁 |
| 服务升级模型要停机 | 硬编码模型路径 | 走注册表别名 + 服务侧热加载 |
| 实验对比不了 | 各 run 记录口径不一致 | 统一 autolog + 指标计算函数唯一来源 |

## 练习

1. 用 MLflow 跑 5 组超参实验（任意 sklearn 数据集），在 UI 里对比并选出最优，注册进 Registry 并流转到 Production。
2. 写一个 `predict_service.py`：启动时加载 `models:/xxx/Production`，每 5 分钟检查别名是否指向新版本，是则热加载。
3. 构造漂移数据：把测试集的某个特征整体平移 +30%，计算 PSI，验证阈值判断；再对「无漂移抽样」算 PSI 对照。
4. 设计评审题：为 [推荐系统](/posts/recommender-system-basics/)设计完整监控面板，列出 10 个指标并标注每个指标的告警阈值和负责人动作。

## 面试常问

**Q：MLOps 和 DevOps 的核心区别？**
DevOps 的制品是代码，行为确定性；MLOps 的制品是「代码+数据+模型」三元组，且制品行为随外部世界变化而退化。由此多出：数据版本化、实验跟踪、漂移监控、重训练闭环。CI/CD 里的 C 在 ML 里多了一个 Continuous Training。

**Q：模型上线前应该有哪些质量门禁？**
离线门禁：指标超过基线模型、关键分片（分性别/地区/时段）指标无显著退化、公平性检查。工程门禁：推理延迟压测达标、模型文件可复现加载、输入 schema 校验通过、回滚方案就绪。门禁自动跑，审批人工做。

**Q：PSI 的局限？**
单变量视角，抓不住特征间联合分布的变化（两个特征各自没变但相关性变了）；分箱方式敏感。补充：多维漂移用 MMD 或训练一个「区分新旧数据」的分类器（AUC 显著 >0.5 说明分布可分=漂移了）——这个 domain classifier 技巧很妙，值得记住。

**Q：影子模式（shadow mode）是什么，什么时候用？**
新模型和老模型同时在线，但新模型的预测只记录不服务，对比两者输出一段时间再决定是否切换。适合高风险场景（风控、医疗）的模型换代——用零业务风险换取真实分布下的对比数据。与 A/B 的区别：影子不占用真实用户，A/B 用真实用户验证效果。

**Q：特征平台（Feature Store）解决什么问题？**
三个：训练-服务一致性（同一套特征定义离在线复用）、特征复用与发现（团队共享特征库，避免重复造轮子）、point-in-time correctness（按事件时间取特征快照，防穿越）。Feast 是开源代表。团队小于 5 人先用「特征计算统一 Python 包 + 特征表」的轻量方案即可。

## 相关阅读

- [模型压缩与部署实战](/posts/model-compression-deployment/)——推理服务的性能优化侧
- [Kafka 与实时数据管道](/posts/streaming-kafka-basics/)——预测日志与监控数据的管道
- [A/B 测试与统计推断](/posts/ab-testing-statistics/)——模型换代的验证方法
- [Docker 化训练环境](/posts/research-data-mgmt-04-docker-cicd/)——可复现性的容器底座
- [大数据管理](/posts/big-data-management/)——特征数据的存储底座

MLOps 的成熟度阶梯：手动训练手动上线 → 实验有跟踪 → 上线有流程 → 退化有监控 → 重训有闭环。不用一步登天，按阶梯爬，每一级都能少出一次事故。
