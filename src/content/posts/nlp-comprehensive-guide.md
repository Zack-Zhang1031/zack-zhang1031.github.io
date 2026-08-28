---
title: "自然语言处理综合篇：从分词到大模型时代的全景地图"
date: 2026-08-28T10:30:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "一篇建立 NLP 完整知识地图：中文分词、词向量、文本分类的传统与深度学习路线、预训练模型、RAG，以及每个阶段该用什么工具的决策建议。"
tags: ["NLP", "自然语言处理", "词向量", "BERT", "文本分类"]
categories: ["AI课程", "自然语言处理"]
math: false
---

自然语言处理（NLP）是让计算机理解和生成人类语言的技术。这个领域过去十年的变化比其他任何 AI 分支都剧烈：2018 年前是统计方法的天下，2018 年 BERT 之后预训练模型一统江湖，2022 年底 ChatGPT 之后直接进入了大模型时代。

这篇的目标不是把每个技术都讲细（各专题已有对应文章），而是给你一张**全景地图 + 决策指南**：遇到一个 NLP 任务，该走哪条路线、用什么工具、大概什么工作量。文末会链接到各个深挖文章。

> 前置阅读：[深度学习课程 09：PaddlePaddle 中文文本分类项目](/posts/deep-learning-09-paddle-chinese-text-classification/) 是一个完整的深度学习 NLP 实战，本文是它的"地图版"。

## 第一层：中文的预处理比英文麻烦在哪

英文天然按空格分词，中文没有词边界——"研究生命起源"是"研究 / 生命起源"还是"研究生 / 命起源"？所以中文 NLP 的第一步永远是**分词**：

```python
import jieba

text = "我在研究生命起源的自然语言处理方法"
print("/".join(jieba.lcut(text)))
# 我/在/研究/生命/起源/的/自然语言处理/方法

# 领域词要加自定义词典，否则"自然语言处理"会被切碎
jieba.add_word("自然语言处理")
```

实战建议：

- **jieba** 够快够用，是传统文本处理的首选；精确度要求高可以看 pkuseg、LTP。
- **自定义词典必加**：业务术语、产品名、新词，不加词典会被切得粉碎。
- 用大模型/BERT 类模型时**不需要手动分词**——它们用子词（subword）或字级 tokenizer，手动分词反而帮倒忙。这是新老路线的重要分界线。

其他预处理：停用词过滤（"的""了""是"）、繁简转换、全半角统一、去 HTML 标签。爬虫采来的文本尤其要过一遍清洗流水线。

## 第二层：文字怎么变成向量

计算机只认数字，文本表示的演进是 NLP 的主线之一：

**词袋 / TF-IDF（传统）**：每篇文档表示为"各词出现权重"的向量，维度 = 词表大小，稀疏。sklearn 两行搞定，至今仍是小数据文本分类的强力基线：

```python
from sklearn.feature_extraction.text import TfidfVectorizer

vec = TfidfVectorizer(tokenizer=jieba.lcut, max_features=5000)
X = vec.fit_transform(["今天天气不错", "明天会下雨吗", "天气预报说明天晴天"])
```

**词向量（Word2Vec / GloVe）**：每个词学一个 100-300 维的稠密向量，语义相近的词向量接近，甚至能算"国王 - 男人 + 女人 ≈ 女王"。局限是**一词一向量**——"苹果"在"吃苹果"和"苹果手机"里是同一个向量。

**上下文向量（BERT 类）**：同一个词在不同句子里向量不同，由整个句子的上下文决定。这是预训练时代的核心突破。

## 第三层：任务实战——文本分类的三条路线

文本分类（情感分析、垃圾邮件识别、新闻分类、意图识别）是 NLP 最高频的任务，我用它串三条技术路线：

**路线 A：TF-IDF + 传统模型**。几千到几万条标注数据时，这套基线常常就够打：

```python
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression

pipe = Pipeline([
    ("tfidf", TfidfVectorizer(tokenizer=jieba.lcut, max_features=10000)),
    ("clf", LogisticRegression(max_iter=1000)),
])
pipe.fit(train_texts, train_labels)
```

优点：秒级训练、CPU 就行、结果可解释（看哪个词权重高）。缺点：不理解语义，"这部电影不难看"会被"难看"带偏。

**路线 B：深度学习自建（LSTM/CNN）**。数据十万级、有 GPU、需要定制结构时。完整的字符级 BiLSTM 中文分类实战见[深度学习课程 09](/posts/deep-learning-09-paddle-chinese-text-classification/)，那里有从词表构建到部署的完整代码。

**路线 C：预训练模型微调（BERT/ERNIE）或直接调大模型**。当前主流：

- 标注数据 ≥ 几千条、追求精度、要私有化部署 → 微调 BERT 类模型（HuggingFace 生态，中文选 bert-base-chinese 或 ERNIE）。
- 标注数据极少、任务杂、要快 → 大模型 + prompt，零样本/少样本直接出结果，配合 [MindTrip RAG 系列](/posts/mindtrip-rag-prompt-and-architecture/)里的 Prompt 工程经验。

**决策口诀**：小数据先试 A 打底，精度不够上 C；B 主要用于学习和算力/延迟敏感的部署场景。

## 第四层：理解任务谱系

NLP 不只有分类。常见任务按形态归类：

| 任务 | 输入 → 输出 | 例子 | 常用方案 |
|---|---|---|---|
| 文本分类 | 文本 → 类别 | 情感分析、意图识别 | TF-IDF+LR / BERT |
| 序列标注 | 文本 → 每词标签 | 命名实体识别（NER）、词性标注 | BERT+CRF |
| 文本匹配 | 两段文本 → 相关度 | 检索、问答匹配 | 双塔向量 / 交叉编码 |
| 生成 | 文本 → 新文本 | 翻译、摘要、对话 | T5 / GPT 类大模型 |
| 抽取 | 文本 → 结构化字段 | 从简历抽技能、从合同抽条款 | 大模型 + JSON 约束输出 |

NER 和文本匹配值得单独说一句：**NER 是信息抽取的基石**（从"张三 2020 年入职阿里巴巴"抽出人名、时间、机构），大模型时代很多 NER 任务直接用 prompt + JSON 输出解决，省去标注和训练。

## 第五层：大模型时代的 NLP 工程

现在的 NLP 工程师，日常更多在做这几件事：

**RAG（检索增强生成）**：大模型不知道你的私有数据，就把相关文档检索出来塞进 prompt。这是目前落地最广的架构，我做的完整实战记录在 [MindTrip RAG 架构演进系列](/posts/mindtrip-rag-data-and-retrieval/)（共五篇，从数据层讲到评测框架），以及 [RAG 项目复盘](/posts/rag-project-retrospective/)。

**Embedding 检索**：把文本变成向量后做语义搜索，向量数据库选型对比见 [Milvus + Neo4j 构建 RAG 知识图谱实战](/posts/milvus-neo4j-rag/)。

**评测**：大模型输出怎么评？准确率不适用，要用 RAGAS 之类的框架做 faithfulness / relevance 评分，加上自建 bad case 库回归，详见[架构演进第五篇](/posts/mindtrip-rag-eval-hybrid-retrieval/)。

**部署推理**：本地跑开源模型的性能调优实录（KV Cache、量化、并发）见 [vLLM 部署 Qwen2.5 性能调优](/posts/vllm-qwen-performance-tuning/)。

## 学习路线建议

如果你的目标是求职/实战，我按投入产出比排个序：

1. **先跑通文本分类三条路线**（TF-IDF、LSTM、BERT 微调），这是面试和工作的双高频。
2. **吃透 RAG**：检索、重排、Prompt、评测一整条链，是当前岗位需求最旺的方向。
3. **补底层**：[Transformer 与注意力机制](/posts/deep-learning-07-transformer-attention/)必须能手算一遍注意力，[深度学习课程 01-03](/posts/deep-learning-01-training-loop/) 的训练基础要牢。
4. 传统语言学知识（句法分析、依存树）了解概念即可，除非做特定方向研究。

## 踩坑排查清单

| 症状 | 原因 | 处理 |
|---|---|---|
| 分类模型对否定句失灵 | TF-IDF 无语义理解 | 换 BERT 或大模型 |
| 专业术语被切碎 | 分词器不认识领域词 | 传统路线加 jieba 词典；BERT 路线看 tokenizer 词表 |
| 大模型回答幻觉 | 模型不知道私有/最新知识 | 上 RAG，别硬 prompt |
| 微调后效果不如基线 | 数据量太少或标注质量差 | 先查标注一致性，千条以下优先 prompt 方案 |
| 中文文本长度统计不对 | len() 按字符不是按词 | 明确业务要字符数还是词数 |
| 向量检索结果不相关 | Embedding 模型不适配中文 | 换 bge-large-zh 等中文向量模型 |

## 练习

1. 用 TF-IDF + 逻辑回归在一份中文新闻分类数据上打基线，记录宏 F1；再换 BERT 微调对比提升幅度。
2. 用 jieba 对比同一段专业文本在加自定义词典前后的分词差异。
3. 用 sentence-transformers 的 bge 模型把 100 个问题句变成向量，实现"输入新问题，检索最相似的 3 个历史问题"。
4. 把一段合同文本喂给大模型，用 JSON Schema 约束输出，抽取甲方、乙方、金额、日期四个字段。

## 面试常问

**Q：Word2Vec 和 BERT 的词向量有什么本质区别？**
Word2Vec 是静态向量：一个词无论出现在什么上下文都是同一个向量，无法处理多义词。BERT 是上下文相关的动态向量：同一个"苹果"在水果和手机语境下向量不同，由全句注意力计算得出。

**Q：小数据场景 NLP 任务怎么做？**
优先顺序：TF-IDF + 传统模型基线 → 大模型 few-shot prompt → 数据增强/主动学习扩充标注 → 有几百条后考虑参数高效微调（LoRA）。不要在小数据上从头训练深度模型。

**Q：RAG 相比微调的优劣？**
RAG：知识可实时更新、可追溯引用来源、成本低，但受检索质量限制、上下文长度有限。微调：知识内化、响应快、风格可控，但更新知识要重训、可能遗忘旧知识。实际系统常两者结合：微调定风格，RAG 补知识。

**Q：中文 NLP 和英文 NLP 的主要差异？**
分词（中文无词边界）、tokenizer 粒度（中文常按字或子词）、编码与简繁问题、以及多音字/歧义更突出。工程上多了 jieba、繁简转换这些预处理环节。

**Q：怎么评估一个文本生成系统？**
分两层：自动指标（BLEU/ROUGE 对参考文本的重合度，RAGAS 对 RAG 的忠实度评分）+ 人工评审；生产上一定要有 bad case 库做回归，防止修复一个问题引入三个新问题。

---

NLP 的地图画完了。下一篇回到视觉世界，做一个大家都有体感的应用：[人脸识别：从 Haar 特征到深度学习](/posts/face-recognition-opencv-deep-learning/)。
