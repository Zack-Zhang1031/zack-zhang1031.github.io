---
title: "序列标注与 NER 实战：HMM、CRF 到 BERT——给每个词一个标签"
date: 2026-08-29T16:20:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "序列标注的经典任务 NER：BIO 标注体系、HMM/CRF 的结构化预测思想、BERT+CRF 的现代方案，以及大模型时代 NER 的两条落地路线。"
tags: ["NER", "序列标注", "CRF", "命名实体识别"]
categories: ["AI课程", "自然语言处理"]
math: false
---

分类给整段文本一个标签，序列标注给**每个词/字**一个标签——词性标注、分词、以及最实用的命名实体识别（NER）：从"张三 2020 年入职阿里巴巴北京总部"里抽出人名、时间、机构、地点。NER 是信息抽取的基石：简历解析、合同审查、知识图谱构建（[图谱构建篇](/posts/knowledge-graph-construction/)的上游）都靠它。

> 前置阅读：[NLP 综合篇](/posts/nlp-comprehensive-guide/)（任务谱系）、[深度学习课程 06：RNN/LSTM](/posts/deep-learning-06-rnn-lstm-gru/)（序列建模基础）。

## BIO 标注：把抽取变成逐字分类

NER 把"找出实体"转成"给每个字符打标签"：

```
张  三  入  职  阿  里  巴  巴
B-PER I-PER O  O  B-ORG I-ORG I-ORG I-ORG
```

B 是实体开头，I 是内部，O 是非实体。标签序列必须满足约束：I-PER 不能跟在 B-ORG 后面、实体不能从 I 开始——**非法标签序列**的处理正是各代方法的分水岭。

## HMM 与 CRF：结构化预测的经典思想

**HMM（隐马尔可夫模型）**：把标签当隐状态，字当观测，用转移概率（标签→标签）和发射概率（标签→字）建模，Viterbi 算法解码最优序列。它天然处理标签转移约束，但特征表达能力弱（只看当前字）。

**CRF（条件随机场）**：判别式的升级——直接用丰富特征（当前字、上下文、词典匹配）建模整个标签序列的条件概率，同样 Viterbi 解码。CRF 统治了深度学习前的 NER，工程价值在于**全局归一化保证标签序列合法**——软约束变成硬保证。

这两个模型今天很少直接用了，但"转移矩阵 + 最优路径解码"的思想活在 BERT+CRF 里，面试也常考。

## 现代方案：BERT + CRF

预训练模型负责理解上下文，CRF 层负责保证标签合法：

```python
# 结构示意：BERT 编码每个字 → 输出每个字的标签分数 → CRF 层解码最优序列
# 用 transformers + 自定义 CRF 层，或直接用成熟实现
from transformers import AutoModelForTokenClassification, AutoTokenizer

model_name = "bert-base-chinese"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForTokenClassification.from_pretrained(
    model_name, num_labels=len(label_list))

# 训练用 Trainer，注意两点：
# 1. label_all_tokens=False：wordpiece 拆出的子词只有第一个继承标签
# 2. 评估用 seqeval 按实体级算 P/R/F1，而不是按字
```

评估的坑必须强调：**NER 的指标是实体级的**——"阿里巴巴"四个字全对才算抽对这个实体，按字算准确率会严重高估模型。用 `seqeval` 库算实体级 precision/recall/F1。

## 大模型时代：NER 的两条新路线

**路线一：零样本 prompt 抽取**。不训练，直接让大模型输出 JSON：

```python
prompt = """从下面文本抽取人名、机构、地点，输出 JSON：
文本：张三2020年入职阿里巴巴北京总部
输出：{"人名": [...], "机构": [...], "地点": [...]}"""
```

几十到几百条数据的场景，这条路线的性价比碾压训练模型——配合 JSON Schema 约束输出，准确率已经可用（工程经验见 [MindTrip Prompt 篇](/posts/mindtrip-rag-prompt-and-architecture/)）。

**路线二：小模型微调做高吞吐**。调用量大（每天百万条）时大模型成本高，用抽取样本微调一个小模型（BERT 级）做生产，大模型负责产训练数据和兜底难例——这和 [LoRA 微调](/posts/llm-finetuning-lora/)的思路一脉相承。

**选型口诀**：量小求快用 prompt，量大求省微调小模型，标注充足要极致精度用 BERT+CRF。

## 踩坑排查

| 症状 | 原因 | 处理 |
|---|---|---|
| 实体边界总错 | 按字评估掩盖边界问题 | 用 seqeval 实体级评估定位 |
| I- 开头等非法序列 | 模型无转移约束 | 加 CRF 层或后处理规则 |
| 嵌套实体漏抽（"北京大学医学院"） | BIO 不支持嵌套 | 换 span/指针网络标注方案 |
| 新领域实体全漏 | 训练数据领域不匹配 | 领域数据微调或 prompt 路线 |
| 子词标签错位 | wordpiece 标签未对齐 | label_all_tokens=False + 对齐函数 |
| 大模型输出格式乱 | 无结构约束 | JSON Schema/function calling |

## 练习

1. 用 BERT+CRF 在 MSRA-NER 数据上微调，用 seqeval 报告实体级 F1。
2. 构造嵌套实体样例，分析 BIO 方案的失败模式。
3. 用大模型 prompt 做同样 50 条抽取，对比与微调模型的 F1 和成本。
4. 实现后处理规则：合并被错误拆分的相邻同类型实体。

## 面试常问

**Q：CRF 在 BERT 之后还有必要吗？**
有争议但实践结论是"有提升但变小了"：BERT 的上下文理解已经隐式学了标签依赖，CRF 的转移约束在小数据上帮助明显（非法序列直接消失），大数据上增益有限。中文 NER 里 BERT+CRF 仍是常见搭配。

**Q：NER 为什么按实体级评估？**
用户要的是完整正确的实体，"阿里巴巴"抽成"阿里"在实际使用中是错的。按字评估会把 75% 正确的实体算成 75% 分，掩盖边界错误——实体级 F1 才对应真实可用性。

**Q：嵌套实体怎么处理？**
BIO 序列标注天然不支持。方案：span 分类（枚举所有片段分类）、指针网络（预测每个实体的起止位置）、层叠标注（多层标签）。大模型生成式抽取天然支持嵌套。

**Q：HMM 和 CRF 的区别？**
HMM 是生成式（建模联合概率，特征能力弱）；CRF 是判别式（直接建模标签序列的条件概率，可用任意上下文特征）。两者都用转移结构保证序列合法性、Viterbi 解码。

---

相关阅读：[知识图谱构建](/posts/knowledge-graph-construction/)（NER 的下游）、[NLP 综合篇](/posts/nlp-comprehensive-guide/)。
