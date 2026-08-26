---
title: "深度学习课程 09：PaddlePaddle 中文文本分类项目"
date: 2026-08-25T09:00:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "从数据契约、字符词表和双向 LSTM 基线出发，用 PaddlePaddle 完成中文文本分类项目，并加入 Transformer 对照、错误分析与推理接口。"
tags: ["深度学习", "PaddlePaddle", "中文文本分类", "NLP项目"]
categories: ["AI项目", "自然语言处理"]
math: false
---

中文文本分类看起来像一个简单的“输入一句话，输出一个类别”，真正决定项目质量的却往往不是分类层。重复样本会不会跨集合？类别名称是否稳定？超长文本怎么处理？训练词表是否偷看测试集？模型高置信预测时能否拒绝未知输入？

这篇按开发日志组织 PaddlePaddle 项目。基础版本采用字符级词表，先用双向 LSTM 建立基线，再增加 Transformer 编码器对照。

文中的具体指标属于“参考运行记录”，用于展示如何读曲线和做决策，不代表读者在不同数据、硬件与随机种子下会得到相同结果。

## 1. 需求与验收边界

项目输入是一段 UTF-8 中文文本，输出类别名称和置信度。最低工程目标包括：

- 训练、验证、测试按来源分组，避免同源改写泄漏；
- 类别映射、词表、最大长度和模型参数一起保存；
- 同一份预处理代码同时服务训练和推理；
- 评估包含 Macro F1、每类召回和混淆矩阵；
- 对空文本、超长文本和低置信预测给出明确行为；
- CPU 环境可以完成小规模流程验证。

测试分数不是唯一目标；少数类别漏判代价较高时，要单独关注该类召回。

## 2. 数据格式与目录

使用简单的 JSON Lines，每行保存文本、标签和可选分组：

```json
{"text":"订单付款后一直没有发货","label":"物流问题","group":"ticket-001"}
{"text":"如何修改账号绑定的手机号","label":"账号问题","group":"ticket-002"}
```

`group` 可以是用户、文档、会话、来源文章或采集批次。划分应在生成三个文件之前完成，同组样本只能进入一个集合。若数据本身已经固定划分，仍要检查文本哈希和近重复。

## 3. 清洗策略：少做但可解释

中文文本容易出现全角空格、网页实体、连续空白和不可见字符。清洗不应把语义一并删掉。金额、日期、型号、标点和英文缩写可能正是分类依据。

```python
import re
import unicodedata

def normalize_text(text: str) -> str:
    text = unicodedata.normalize("NFKC", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text
```

NFKC 会统一部分兼容字符，使用前要抽样检查业务中的特殊符号。清洗后为空的文本应被统计并按规则处理，不能悄悄塞进训练集。

## 4. 只用训练集建立字符词表

字符级方案实现稳定、未知词问题较弱，但序列更长，词语边界需由模型学习。

```python
from collections import Counter

PAD_TOKEN = "<pad>"
UNK_TOKEN = "<unk>"

def build_vocab(texts: list[str], min_frequency: int = 2) -> dict[str, int]:
    counter = Counter(char for text in texts for char in normalize_text(text))
    vocab = {PAD_TOKEN: 0, UNK_TOKEN: 1}
    for char, count in counter.most_common():
        if count >= min_frequency:
            vocab[char] = len(vocab)
    return vocab
```

词表只能读取训练文本。测试集字符即使提前可见，也不应参与词表筛选，否则预处理已经利用了测试分布。类别映射同样应固定并保存，推理不能依赖字典偶然的遍历顺序。

## 5. 编码、截断与长度记录

```python
def encode_text(text: str, vocab: dict[str, int], max_length: int):
    normalized = normalize_text(text)
    ids = [vocab.get(char, vocab[UNK_TOKEN]) for char in normalized]
    ids = ids[:max_length]
    length = max(len(ids), 1)
    if not ids:
        ids = [vocab[UNK_TOKEN]]
    ids += [vocab[PAD_TOKEN]] * (max_length - len(ids))
    return ids, length
```

最大长度应由训练集分布和业务代价决定。若关键信息常在末尾，可改为保留首尾、分段预测或层次聚合。

## 6. Paddle Dataset 与 DataLoader

```python
import json
import paddle

class TextDataset(paddle.io.Dataset):
    def __init__(self, path, vocab, label_to_id, max_length):
        super().__init__()
        self.samples = []
        with open(path, "r", encoding="utf-8") as stream:
            for line_number, line in enumerate(stream, start=1):
                item = json.loads(line)
                text = normalize_text(item["text"])
                label = item["label"]
                if not text or label not in label_to_id:
                    raise ValueError(f"invalid sample at line {line_number}")
                ids, length = encode_text(text, vocab, max_length)
                self.samples.append((ids, length, label_to_id[label]))

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, index):
        ids, length, label = self.samples[index]
        return (
            paddle.to_tensor(ids, dtype="int64"),
            paddle.to_tensor(length, dtype="int64"),
            paddle.to_tensor(label, dtype="int64"),
        )
```

```python
train_loader = paddle.io.DataLoader(
    train_dataset,
    batch_size=64,
    shuffle=True,
    drop_last=False,
    num_workers=0,
)
val_loader = paddle.io.DataLoader(
    val_dataset,
    batch_size=128,
    shuffle=False,
    drop_last=False,
    num_workers=0,
)
```

Windows 或 Notebook 初次验证建议 `num_workers=0`，流程稳定后再增加工作进程并测吞吐。

## 7. 双向 LSTM 基线

```python
import paddle.nn as nn
import paddle.nn.functional as F

class BiLSTMClassifier(nn.Layer):
    def __init__(self, vocab_size, num_classes, pad_id=0):
        super().__init__()
        self.embedding = nn.Embedding(
            vocab_size,
            embedding_dim=128,
            padding_idx=pad_id,
        )
        self.encoder = nn.LSTM(
            input_size=128,
            hidden_size=192,
            num_layers=2,
            direction="bidirectional",
            dropout=0.2,
        )
        self.dropout = nn.Dropout(0.3)
        self.classifier = nn.Linear(192 * 2, num_classes)

    def forward(self, token_ids, lengths):
        x = self.embedding(token_ids)
        encoded, _ = self.encoder(x, sequence_length=lengths)
        mask = token_ids != 0
        mask = paddle.unsqueeze(mask.astype("float32"), axis=-1)
        summed = paddle.sum(encoded * mask, axis=1)
        counts = paddle.clip(paddle.sum(mask, axis=1), min=1.0)
        pooled = summed / counts
        return self.classifier(self.dropout(pooled))
```

使用带 mask 的平均池化可以避免直接取 PAD 位置。`sequence_length` 告诉循环层每条序列的有效长度，池化 mask 则确保输出汇总不包含填充。

## 8. 训练循环与最佳模型

```python
from pathlib import Path

device = "gpu" if paddle.device.is_compiled_with_cuda() else "cpu"
paddle.set_device(device)

model = BiLSTMClassifier(len(vocab), len(label_to_id))
criterion = nn.CrossEntropyLoss()
optimizer = paddle.optimizer.AdamW(
    learning_rate=3e-4,
    parameters=model.parameters(),
    weight_decay=1e-2,
    grad_clip=paddle.nn.ClipGradByGlobalNorm(1.0),
)

artifact_dir = Path("artifacts")
artifact_dir.mkdir(parents=True, exist_ok=True)
best_macro_f1 = -1.0

for epoch in range(1, 21):
    model.train()
    for token_ids, lengths, labels in train_loader:
        logits = model(token_ids, lengths)
        loss = criterion(logits, labels)
        loss.backward()
        optimizer.step()
        optimizer.clear_grad()

    metrics = evaluate(model, val_loader)
    if metrics["macro_f1"] > best_macro_f1:
        best_macro_f1 = metrics["macro_f1"]
        paddle.save(model.state_dict(), artifact_dir / "best.pdparams")
```

`evaluate` 应在 `model.eval()` 与 `paddle.no_grad()` 中收集预测，并在整个验证集上计算指标。不要平均每个批次的 F1：F1 不是可按批次直接加权求和的量，应先合并混淆计数或所有预测。

## 9. 指标计算与错误表

```python
import numpy as np
from sklearn.metrics import classification_report, confusion_matrix

def build_report(targets, predictions, class_names):
    report = classification_report(
        targets,
        predictions,
        target_names=class_names,
        output_dict=True,
        zero_division=0,
    )
    matrix = confusion_matrix(targets, predictions)
    return report, matrix
```

除了总体指标，保存一张错误样本表：原文、真实类别、预测类别、置信度、文本长度和来源分组。按“高置信错误”“少数类别漏判”“超长文本”“含大量未知字符”筛选，比从全部错误中随机翻阅更容易形成下一步假设。

## 10. 参考运行记录：从基线到改动

下面是用于说明分析方法的一组参考运行记录。数据为四分类中文服务文本，集合按会话分组；记录中的具体数值只服务流程示例。

| 版本 | 主要变化 | 验证 Macro F1 | 测试 Macro F1 | 观察 |
|---|---|---:|---:|---|
| R0 | 字符平均池化线性基线 | 0.742 | 0.731 | 相似意图混淆明显 |
| R1 | 双向 LSTM + mask 池化 | 0.814 | 0.806 | 长句召回改善 |
| R2 | 分组去重 + 类别权重 | 0.826 | 0.819 | 少数类别召回更均衡 |
| R3 | 小型 Transformer 编码器 | 0.834 | 0.823 | 提升有限，推理成本更高 |

这组记录最重要的结论不是 R3 数字最大，而是 R2 的数据与损失改动已经解决主要错误，R3 增益较小却增加资源成本。如果产品更重视低延迟，R2 可能是更合适的交付版本。

## 11. 加入类别权重

类别不平衡时，可根据训练集频率生成权重并传给 `nn.CrossEntropyLoss(weight=weights)`。权重不能修复错误标签，也不应跨数据集照搬。应同时检查每类召回、精确率和混淆方向，确认关键漏判减少而非误报转移。

## 12. Transformer 对照模型

Paddle 的编码器层同样要求嵌入维度能被头数整除。为了控制对照变量，词表、数据划分、最大长度和分类头应保持一致。

```python
class TransformerTextClassifier(nn.Layer):
    def __init__(self, vocab_size, num_classes, max_length=256):
        super().__init__()
        d_model = 256
        self.embedding = nn.Embedding(vocab_size, d_model, padding_idx=0)
        self.position = nn.Embedding(max_length, d_model)
        layer = nn.TransformerEncoderLayer(
            d_model=d_model,
            nhead=8,
            dim_feedforward=768,
            dropout=0.1,
            activation="gelu",
        )
        self.encoder = nn.TransformerEncoder(layer, num_layers=3)
        self.norm = nn.LayerNorm(d_model)
        self.classifier = nn.Linear(d_model, num_classes)

    def forward(self, token_ids, lengths=None):
        batch_size, seq_len = token_ids.shape
        positions = paddle.arange(seq_len).unsqueeze(0)
        positions = paddle.expand(positions, [batch_size, seq_len])
        x = self.embedding(token_ids) + self.position(positions)

        padding = token_ids == 0
        attention_mask = padding.unsqueeze(1).unsqueeze(2)
        encoded = self.encoder(x, src_mask=attention_mask)

        valid = (~padding).astype("float32").unsqueeze(-1)
        pooled = paddle.sum(encoded * valid, axis=1)
        pooled /= paddle.clip(paddle.sum(valid, axis=1), min=1.0)
        return self.classifier(self.norm(pooled))
```

掩码形状和布尔语义应结合当前 Paddle 版本用一个小样本验证。最直接的测试是修改 PAD 区域 token，确认有效位置输出不应发生不合理变化。

## 13. 推理制品与接口

```python
def load_for_inference(model, checkpoint_path):
    state_dict = paddle.load(checkpoint_path)
    model.set_state_dict(state_dict)
    model.eval()
    return model

@paddle.no_grad()
def predict_text(model, text, vocab, id_to_label, max_length, threshold=0.55):
    ids, length = encode_text(text, vocab, max_length)
    token_ids = paddle.to_tensor([ids], dtype="int64")
    lengths = paddle.to_tensor([length], dtype="int64")
    probabilities = F.softmax(model(token_ids, lengths), axis=-1)[0]
    class_id = int(paddle.argmax(probabilities).item())
    confidence = float(probabilities[class_id].item())
    if confidence < threshold:
        return {"label": "需要人工确认", "confidence": confidence}
    return {"label": id_to_label[class_id], "confidence": confidence}
```

阈值应根据验证集、误判成本和覆盖率选择；置信度也不天然等于真实概率。发布目录除权重外，还应包含：

```text
artifacts/
  best.pdparams
  vocab.json
  labels.json
  config.json
  environment.txt
```

`config.json` 至少记录模型类型、维度、最大长度、特殊 token 编号和清洗版本，避免权重能加载却无法复现输入。

## 14. 从公开数据替换为个人数据

替换时先完成数据审计：

1. 写清类别定义、反例和模糊样本处理；
2. 按用户、会话或来源划分并检查近重复；
3. 统计类别、长度、空文本和异常字符；
4. 只用训练集生成词表和类别权重；
5. 人工审阅错误并固定回归样本。

个人数据若含隐私，应在训练前脱敏，日志不输出完整原文。

## 15. 项目复盘与面试表达

项目可按“约束—基线—错误—改动—证据—取舍”来讲：按会话分组防止泄漏；字符词表减少分词依赖；LSTM 建立轻量基线；依据少数类和长句错误加入权重并检查 mask；Transformer 只作为成本对照；制品携带词表、标签和预处理，低置信结果进入人工确认。

## 16. 练习

1. 增加文本哈希与近重复检测报告。
2. 比较字符级与预训练 tokenizer 的长度和未知率。
3. 补充空文本、超长文本和未知字符测试。
4. 画置信度分桶图并导出错误样本。

## 下一篇

完成模型并不意味着项目结束。最后一篇把评估、调优、导出和监控串成闭环：[模型评估、调优与部署](/posts/deep-learning-10-model-evaluation-tuning-deployment/)。
