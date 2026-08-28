---
title: "从 Word2Vec 到 BERT：预训练语言模型十年演进——NLP 的范式转移"
date: 2026-08-30T20:00:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "预训练语言模型演进史：Word2Vec 词向量原理与训练、静态向量的局限、BERT 的 MLM 双向上下文、GPT 自回归路线，以及这场范式转移如何塑造了今天的大模型。"
tags: ["Word2Vec", "BERT", "预训练", "NLP", "词向量"]
categories: ["AI课程", "自然语言处理"]
math: true
---

2013 年 Word2Vec 发布时，整个 NLP 圈都在传一个例子：「国王 - 男人 + 女人 ≈ 女王」。十年后的今天，我们已经习惯了和 ChatGPT 对话。这中间不是平滑的进步，而是三次范式转移：**从符号到向量、从静态向量到上下文表示、从微调到提示**。不理解这条演进线，就没法理解为什么今天的大模型长这个样子。这篇文章把每个阶段的核心思想和代码都过一遍。

**前置阅读**：建议先读 [Transformer 详解](/posts/deep-learning-07-transformer-attention/)、[Tokenizer 与 BPE](/posts/tokenizer-bpe/)。

## 起点：one-hot 的死局

最朴素的文本表示是 one-hot：词表 10 万个词，每个词就是一个 10 万维、只有一位为 1 的向量。它有两个致命伤：

1. **维度灾难**：向量维度和词表一样大，稀疏到没法算。
2. **语义为零**：「猫」和「狗」的向量距离，跟「猫」和「量子力学」的距离完全一样——所有词两两正交，语义信息是零。

解决思路来自语言学的分布假设：**一个词的含义由它周围的词决定**（"You shall know a word by the company it keeps"）。「猫」和「狗」都出现在「可爱」「喂养」「宠物」旁边，它们的表示就应该接近。

## Word2Vec：用预测任务白嫖语义

Word2Vec（Mikolov et al., 2013）的天才之处：**不直接学词向量，而是构造一个预测任务，词向量只是任务的副产品**。

- **CBOW**：用周围词预测中心词。「我 [?] 苹果」→ 预测「吃」。
- **Skip-gram**：反过来，用中心词预测周围词。实际效果更好，尤其是低频词。

目标函数是让真实上下文词的概率最大：

$$L = \sum_{t} \sum_{-c \le j \le c, j \ne 0} \log P(w_{t+j} | w_t)$$

$P(w_{t+j}|w_t) = \text{softmax}(u_{t+j}^T v_t)$。直接算 softmax 要对整个词表归一化，太贵，所以用**负采样**：每次只让一个真实上下文词（正例）和随机抽的几个噪声词（负例）做二分类，把 10 万分类问题变成逻辑回归。

用 gensim 训练只要几行：

```python
from gensim.models import Word2Vec

sentences = [["我", "喜欢", "机器", "学习"], ["深度", "学习", "很", "有趣"], ...]
model = Word2Vec(sentences, vector_size=100, window=5, min_count=5,
                 sg=1, negative=10, epochs=20)  # sg=1 用 Skip-gram

print(model.wv.most_similar("学习", topn=5))
# 词运算：国王 - 男人 + 女人 ≈ ?
print(model.wv.most_similar(positive=["国王", "女人"], negative=["男人"]))
```

我在中文维基上训过一版 300 维的词向量，最直观的验证方式是可视化：随机取 2000 个高频词，t-SNE 降到二维，「颜色」「动物」「国家」「动词时态」各自聚成肉眼可见的簇——**语义真的被编码进了几何空间**。

## 静态词向量的天花板

Word2Vec 很成功，但有个结构性缺陷：**每个词只有一个固定向量**。「苹果发布新手机」和「我吃了一个苹果」里的「苹果」表示完全一样；「方便」在「这里很方便」和「方便面」里也分不出来。一词多义无解。

ELMo（2018）给了第一个答案：用双向 LSTM 跑完整句子，**词的表示取决于它所在的整句话**——同一个「苹果」，在两个句子里向量不同。这是「上下文表示」时代的开端。

## BERT：双向上下文 + 大规模预训练

ELMo 的 LSTM 换成 Transformer，再把数据量和模型规模放大几个量级，就是 BERT（2018）。它的预训练任务设计极其巧妙：

**Masked Language Model（MLM）**：随机遮住输入 15% 的 token，让模型根据**左右两边**的上下文猜被遮住的词。「我 [MASK] 了一个苹果」→ 模型要同时看前文「我」和后文「了一个苹果」才能填出「吃」。双向上下文理解，这是 BERT 在理解类任务上横扫的原因。

**Next Sentence Prediction（NSP）**：判断两句话是否原文相邻，学习任务级关系（后来的研究证明这个任务作用有限，RoBERTa 直接把它删了）。

用起来只要几行 Hugging Face 代码：

```python
from transformers import BertTokenizer, BertModel
import torch

tokenizer = BertTokenizer.from_pretrained("bert-base-chinese")
model = BertModel.from_pretrained("bert-base-chinese")

inputs = tokenizer("自然语言处理真有趣", return_tensors="pt")
with torch.no_grad():
    outputs = model(**inputs)

token_vecs = outputs.last_hidden_state   # (1, seq_len, 768) 每个 token 的上下文向量
cls_vec = token_vecs[:, 0]               # [CLS] 位置，常用作整句表示
```

BERT 确立的范式叫 **pretrain → finetune**：大模型在海量无标注文本上预训练，下游任务（分类、NER、问答）加个小头微调几千步就能用。NLP 从此告别了每个任务从零训练的时代。

## GPT：另一条路线的胜利

BERT 大火的同时，OpenAI 走了另一条路：**自回归语言模型**——只看左边的词，预测下一个词。GPT（2018）当时被 BERT 的光环压着，但这个「预测下一个词」的任务有个被低估的优点：**它和文本生成是同一个任务**。

BERT 的双向性让它擅长理解，却不擅长生成（MLM 训练和自回归生成是断裂的）；GPT 的单向性让它天然会「接着往下写」。GPT-2 展示了零样本能力，GPT-3 展示了上下文学习，再到 ChatGPT——后面的故事我们都知道了。今天的 LLM 几乎全是 GPT 路线的后裔，但 BERT 的思想（双向编码）仍在 Embedding 模型、理解类任务里活着，两条路线各自找到了生态位。

## 十年演进一页纸

| 阶段 | 代表 | 表示方式 | 核心任务 | 局限 |
| --- | --- | --- | --- | --- |
| 静态词向量 | Word2Vec/GloVe | 一词一向量 | 上下文预测 | 无法处理多义词 |
| 上下文表示 | ELMo | 句子级动态向量 | 双向 LM | LSTM 容量有限 |
| 双向预训练 | BERT | 深层双向表示 | MLM | 不擅生成 |
| 自回归预训练 | GPT 系列 | 单向生成式表示 | 下一词预测 | 长程依赖靠规模硬解 |

范式转移的本质是：**语义知识的载体，从「词表」变成了「模型参数」；获取方式，从「人工设计特征」变成了「自监督预测」**。

## 踩坑与排查

| 症状 | 可能原因 | 排查方法 |
| --- | --- | --- |
| 自训词向量相似词全是高频词 | 数据量太小/未做亚采样 | 加语料；调 sample 参数；min_count 提高 |
| BERT 微调不收敛 | 学习率太大 | 2e-5~5e-5 是安全区；加 warmup |
| [CLS] 向量做相似度效果差 | BERT 原生句向量未做对比训练 | 换 Sentence-BERT 或 BGE 类模型 |
| 中文 BERT 效果怪 | tokenizer 按字切分预期不符 | 检查分词结果；考虑词级模型或更新版本 |
| 微调后灾难性遗忘 | 学习率大/层全解冻 | 小学习率；分层学习率；冻结底层 |

## 动手练习

1. 用 gensim 在你的领域语料上训练 Word2Vec，找出 5 个「语义最近邻符合直觉」和 2 个「明显错误」的例子，分析错误原因。
2. 用 bert-base-chinese 提取「苹果手机」和「吃的苹果」两句话中「苹果」的向量，计算余弦相似度，验证上下文表示确实一词多义。
3. 分别在 BERT 的 [CLS] 向量和所有 token 平均池化向量上做句子相似度，比较哪种更好。

## 面试常问

**Q：Word2Vec 的 Skip-gram 和 CBOW 区别？负采样解决什么问题？**
CBOW 用上下文预测中心词，训练快，对高频词好；Skip-gram 用中心词预测上下文，慢但对低频词表示更好。负采样解决 softmax 分母要对全词表求和的计算量问题：把「从 10 万词中选出正确词」变成「区分正确词和几个随机噪声词」的多个二分类，计算量从 O(V) 降到 O(k)。

**Q：BERT 为什么用 MLM 而不是普通语言模型？MLM 有什么问题？**
普通（自回归）语言模型只能看左侧上下文，BERT 想要双向理解，所以用遮罩预测让模型同时利用左右信息。MLM 的问题：预训练和下游不一致——下游任务里没有 [MASK] 标记（用 80/10/10 策略缓解）；被遮 token 间相互独立假设，无法建模它们之间的依赖；且训练信号稀疏，15% 的 token 才有梯度。

**Q：BERT 和 GPT 的本质区别？**
训练目标不同：BERT 是双向遮罩重建（编码器），为「理解」优化；GPT 是自回归下一词预测（解码器），为「生成」优化。这个区别决定了它们的后裔生态：理解、检索、Embedding 走 BERT 系；对话、生成、Agent 走 GPT 系。

理解了这条演进线，你就理解了今天每个 NLP 技术选型背后的「为什么」。

**相关阅读**：[NLP 综合指南](/posts/nlp-comprehensive-guide/)、[Tokenizer 与 BPE](/posts/tokenizer-bpe/)、[Embedding 与向量数据库](/posts/embedding-vector-database/)、[LLM 架构演进](/posts/llm-architecture-moe-longcontext/)。
