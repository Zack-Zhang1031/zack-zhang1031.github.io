---
title: "Tokenizer 与 BPE：大模型怎么「读」文本——被低估的基础设施"
date: 2026-08-30T07:50:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "BPE 分词算法从零实现、词表大小对中文的影响、为什么大模型数不清字母、token 计费的经济学、训练自己的 tokenizer。"
tags: ["Tokenizer", "BPE", "大模型", "NLP", "分词"]
categories: ["AI课程", "自然语言处理"]
math: false
---

问大模型「strawberry 里有几个 r」它会数错；中文比英文「贵」；prompt 里多敲几个空格计费就变了——这些看似无关的现象，背后都是同一个东西：**tokenizer**。它是文本进入模型的唯一入口，也是所有 LLM「怪癖」的头号嫌疑人。理解它，很多玄学问题立刻变成明学。

**前置阅读**：建议先读 [Transformer 详解](/posts/deep-learning-07-transformer-attention/)、[NLP 综合指南](/posts/nlp-comprehensive-guide/)。

## 为什么不是按词分，也不是按字分

模型输入是整数序列（token ID），核心问题是：**怎么把文本切成离散单元？**

- **按词分**：词表爆炸（英语变形、中文无空格、新词不断），词表外（OOV）的词直接不认识。
- **按字分**：词表小但序列太长——注意力复杂度 O(n²)，序列长 5 倍计算贵 25 倍；且单字符语义太稀薄，模型学着累。
- **子词（subword）**：折中答案——常见词整块（"the"），罕见词拆开（"unbelievable" → "un"+"believ"+"able"）。词表可控（3 万~15 万）、无 OOV（最差退回单字）、序列不太长。**BPE 就是学这个切分的算法**。

## BPE：从字节开始的合并游戏

Byte Pair Encoding 的思想朴素到可爱：**从单个字节开始，反复合并语料里最高频的相邻对，直到词表够大**。

```python
from collections import Counter

def train_bpe(corpus: list[str], vocab_size: int):
    # 初始：每个词拆成字符序列，词尾加 </w> 标记边界
    vocab = Counter({tuple(word) + ("</w>",): cnt for word, cnt in corpus})
    merges = []
    while len(vocab) < vocab_size:
        # 统计所有相邻对频率
        pairs = Counter()
        for word, cnt in vocab.items():
            for i in range(len(word) - 1):
                pairs[(word[i], word[i+1])] += cnt
        if not pairs:
            break
        best = pairs.most_common(1)[0][0]
        merges.append(best)
        # 全局合并这一对
        vocab = Counter({merge_pair(word, best): cnt for word, cnt in vocab.items()})
    return merges
```

举例：语料里 "low" 出现 5 次、"lower" 2 次，BPE 会先合并 `l+o`→"lo"，再 `lo+w`→"low"，然后 `low+e+r` 之类。合并顺序（merges 列表）就是分词规则——**推理时按学好的合并顺序贪心应用**，新词也能被拆成已知的子词。

现代变体：WordPiece（BERT 用，按似然而非频率选合并）、Unigram（从词表往下删）、SentencePiece（不依赖预分词，把空格也当字符——**中日韩友好**，LLaMA 系用它）。

## 亲手看看 tokenizer 眼里的世界

```python
from transformers import AutoTokenizer

tok = AutoTokenizer.from_pretrained("Qwen/Qwen2.5-7B")

for text in ["Hello world", "你好世界", "strawberry",
             "unbelievable", "  double space"]:
    ids = tok.encode(text)
    print(f"{text!r:20} → {len(ids)} tokens: {tok.convert_ids_to_tokens(ids)}")
```

你会观察到：

- 英文常见词 1 个 token；`unbelievable` 被拆成 3 块。
- `strawberry` 是 `str`+`aw`+`berry` 之类的切分——**模型从未见过完整的字母序列**，「数 r」要跨 token 边界拼字母，这就是它数错的原因。不是笨，是视角问题。
- 中文情况：主流模型每个汉字约 1 个 token（Qwen/GLM 针对中文优化），但英文中心的老模型（GPT-2 时代）一个汉字能拆到 3 个 token（UTF-8 三字节）——**同样一句话 token 数差 3 倍，计费差 3 倍，上下文容量差 3 倍**。选中文模型时这是硬指标。

## Token 经济学：工程侧的三笔账

**账一：计费**。API 按 token 收费，中文优化差的模型让你的成本隐形翻倍。批量任务前先 `tok.encode` 抽样统计真实 token 量，别按字符数估算。

**账二：上下文窗口**。128K 窗口是 token 数不是字数。RAG 塞文档前先算 token——超窗截断的静默失败（文档尾部被悄悄丢掉）是 RAG 效果差的常见暗因，见 [RAG 进阶篇](/posts/rag-advanced-chunking-rerank/)。

**账三：速度**。生成按 token 计价的不只是钱还有时间——首 token 延迟（prefill 长度）+ 每 token 生成时间。prompt 里的每一个 token 都在收租，[Prompt 工程篇](/posts/prompt-engineering-practice/)里「删掉冗余描述」的动机就在这。

## Tokenizer 带来的其他「怪癖」清单

| 怪癖 | 原因 |
|------|------|
| 大小写敏感地影响输出 | "THE" / "The" / "the" 是不同 token |
| 前导空格改变行为 | " word" 和 "word" 不同 token，prompt 末尾空格影响续写 |
| 数字计算差 | "12345" 可能拆成 "123"+"45"，按位运算要跨边界 |
| 代码缩进敏感 | 4 空格缩进是 1 个 token，2 个 2 空格是 2 个 |
| 某些「诅咒 token」 | 训练语料里的乱码 token（如 Reddit 用户名）触发诡异输出 |

## 训练自己的 tokenizer

垂直领域（医疗、法律、代码）术语被通用 tokenizer 拆得稀碎时，值得训练领域 tokenizer：

```python
from tokenizers import Tokenizer, models, trainers, pre_tokenizers

tokenizer = Tokenizer(models.BPE())
tokenizer.pre_tokenizer = pre_tokenizers.ByteLevel()
trainer = trainers.BpeTrainer(vocab_size=32000,
    special_tokens=["<|endoftext|>", "<|im_start|>", "<|im_end|>"])
tokenizer.train(["corpus_zh.txt", "corpus_medical.txt"], trainer)
tokenizer.save("my_tokenizer.json")
```

注意：换 tokenizer 意味着 embedding 层全部重训——**通常的做法是扩充词表**（把领域高频词加进现有 tokenizer 并初始化新 embedding）而非整体替换，LoRA 微调时配合 `modules_to_save=["embed_tokens"]` 使用。

## 踩坑排查

| 现象 | 原因 | 解法 |
|------|------|------|
| 中文 token 数是预期 3 倍 | 用了英文中心的 tokenizer | 换中文优化的模型/tokenizer |
| RAG 回答漏掉文档尾部内容 | 超窗静默截断 | 输入前统计 token，控制预算 |
| 同样 prompt 输出不一致 | 行尾空格/换行差异 | prompt 模板统一 strip |
| 微调后新 token 输出乱码 | 新词表 token 的 embedding 未训练 | 加进 modules_to_save 或全量微调 embedding |
| token 统计和账单对不上 | 统计用了不同模型的 tokenizer | 用服务端同模型的 tokenizer 计数 |

## 练习

1. 用文中的 BPE 代码在 1000 个词的玩具语料上训练，打印前 20 个 merge 规则，观察它先学什么。
2. 对比 Qwen、LLaMA、GPT-2 三个 tokenizer 对同一段中文的切分结果和 token 数，算成本差。
3. 找一段英文技术文档，统计「字符数/token 数」比例，再对中文文档做同样统计，得出中英文的 token 膨胀系数。
4. 用 tiktoken/HF tokenizer 检查你的常用 prompt 模板，找出可以删减的 token 浪费（重复前缀、冗余空格）。

## 面试常问

**Q：BPE 和 WordPiece 的区别？**
都是迭代合并的子词算法。BPE 选「频率最高」的相邻对合并；WordPiece 选「合并后使语言模型似然提升最大」的对（等价于频率除以单字频率乘积，偏好「组合比独立更常见」的对）。实践差异不大，BERT 用 WordPiece、GPT 系用 BPE、LLaMA/Qwen 用 SentencePiece 实现的 BPE。

**Q：词表大小的权衡？**
大词表：序列短（省算力省窗口）、罕见词整块（表示好），但 embedding 参数多、尾部 token 训练不充分；小词表：相反。经验值：英文 32k~50k，多语言 100k~256k（为多语言腾位置）。趋势是词表变大（LLaMA3 用 128k），因为算力相对便宜了而长序列收益真实。

**Q：为什么 LLM 算术差？怎么改善？**
数字被任意切分（"1234" → "12"+"34"），模型学不到按位对齐的数字表征。改善：① prompt 让模型逐位/分步算（CoT）；② 调工具（calculator/code interpreter）——工程正解；③ 新型 tokenizer 按位切数字（LLaMA3 起部分模型做了）；④ 专门研究如 xVal 数字编码。

**Q：SentencePiece 解决了什么？**
传统分词假设先按空格分词（西方语言），中文日文无空格就抓瞎。SentencePiece 把输入当原始字节流，空格编码为特殊符号「▁」，直接从无预分词的文本学 BPE/Unigram——语言无关。它还保证了可逆性（decode(encode(x)) == x，空格信息无损），这对生成任务重要。

**Q：多语言模型的 tokenizer 怎么平衡各语言？**
语料采样配比决定词表分配：英文语料多，英文子词就占满词表，小语种被拆成字节——「tokenizer 公平性」问题。手段：语料温度采样（给小语种升采样）、按语言分配词表配额、字节级 fallback 保底。评估多语言模型先看各语言的 fertility（每词平均 token 数），差距大说明 tokenizer 偏科。

## 相关阅读

- [Transformer 详解](/posts/deep-learning-07-transformer-attention/)——token 进入模型后的旅程
- [LLM 架构专题：RoPE、长上下文与 MoE](/posts/llm-architecture-moe-longcontext/)——token 序列变长之后的架构应对
- [RAG 进阶](/posts/rag-advanced-chunking-rerank/)——token 预算管理的实战
- [Prompt Engineering 实战](/posts/prompt-engineering-practice/)——token 经济学的应用
- [机器翻译与文本摘要](/posts/machine-translation-summarization/)——分词对评估指标（BLEU）的影响

Tokenizer 是 LLM 世界里「看不见的尺码」：它不参与推理的智力，却框定了智力的边界。花一两个小时理解它，你对大模型的所有直觉都会变得更准。
