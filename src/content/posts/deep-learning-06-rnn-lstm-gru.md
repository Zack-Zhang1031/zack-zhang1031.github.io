---
title: "深度学习课程 06：RNN、LSTM 与 GRU 的序列建模"
date: 2026-08-22T09:00:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "从隐藏状态、时间展开和梯度传播理解 RNN、LSTM 与 GRU，并用 PyTorch 建立可处理变长序列的分类基线。"
tags: ["深度学习", "RNN", "LSTM", "GRU", "PyTorch"]
categories: ["AI课程", "序列建模"]
math: true
---

图像中的相邻像素构成空间关系，文本、语音和传感器数据则多了一条时间轴。“今天下雨”和“下雨今天”包含相同的词，却不一定表达相同的重点。序列模型的任务，就是在读取当前位置时保留必要的历史信息。

本篇从最小 RNN 开始，逐步解释为什么需要 LSTM 和 GRU，再搭建一个变长文本分类基线。重点不是背门控公式，而是理解张量形状、隐藏状态、填充与梯度之间的联系。

## 1. 序列数据和普通表格有什么不同

表格模型常把每一行看作固定长度、相互独立的特征。序列数据至少多出三个约束：

- 长度可能不同，一句话 5 个词，另一句话 50 个词；
- 顺序携带信息，交换位置可能改变含义；
- 较早位置会影响较晚位置，依赖距离可能很长。

送入神经网络前，文本通常先转成 token 编号，再由嵌入层把离散编号映射为连续向量：

```text
token ids: [batch, length]
embedding: [batch, length, embedding_dim]
```

嵌入向量不是人工指定的词义坐标。它和分类器一起训练，使任务中用法相近的 token 获得可利用的表示。

## 2. RNN 的隐藏状态

普通 RNN 在时间步 `t` 接收当前输入 `x_t` 和上一时刻隐藏状态 `h_{t-1}`，生成新的隐藏状态：

$$
h_t = \tanh(W_x x_t + W_h h_{t-1} + b)
$$

同一组参数在每个时间步重复使用，因此模型可以处理不同长度的序列。可以把隐藏状态理解为一张不断改写的便签：读入新内容后，模型决定如何将它和已有摘要混合。

```python
import torch
from torch import nn

rnn = nn.RNN(
    input_size=128,
    hidden_size=256,
    num_layers=1,
    batch_first=True,
)

x = torch.randn(32, 40, 128)
output, h_n = rnn(x)
print(output.shape)  # [32, 40, 256]
print(h_n.shape)     # [1, 32, 256]
```

`output` 保存每个时间步的输出，`h_n` 保存每一层最后的隐藏状态。`batch_first=True` 只改变输入输出布局，不会改变隐藏状态的层维度顺序。

## 3. 时间展开与梯度问题

训练 RNN 时，反向传播会沿时间轴展开。较早时间步对最终损失的影响，需要连续乘过许多雅可比矩阵。若这些乘积的尺度持续小于 1，梯度逐渐消失；持续大于 1，则可能爆炸。

梯度消失并不是“模型完全学不会”，而是远距离信息难以获得足够更新。梯度爆炸则常表现为损失突然变成极大值或 `nan`。工程上可用梯度裁剪限制更新幅度：

```python
loss.backward()
torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
optimizer.step()
```

裁剪缓解爆炸，但不会让普通 RNN 自动拥有长期记忆。门控结构解决的是信息通路问题。

## 4. LSTM：为记忆增加受控通道

LSTM 同时维护隐藏状态 `h_t` 和细胞状态 `c_t`。遗忘门决定旧记忆保留多少，输入门决定新信息写入多少，输出门决定当前暴露多少。

$$
f_t = \sigma(W_f[x_t,h_{t-1}] + b_f)
$$

$$
i_t = \sigma(W_i[x_t,h_{t-1}] + b_i)
$$

$$
c_t = f_t \odot c_{t-1} + i_t \odot \tilde{c}_t
$$

加法更新让信息不必在每一步都经过完全相同的非线性压缩，因而更容易保留较长依赖。门值位于 0 到 1 之间，可以看成软开关，而不是硬规则。

```python
lstm = nn.LSTM(
    input_size=128,
    hidden_size=256,
    num_layers=2,
    dropout=0.2,
    bidirectional=True,
    batch_first=True,
)

output, (h_n, c_n) = lstm(x)
print(output.shape)  # [32, 40, 512]
print(h_n.shape)     # [4, 32, 256]
```

双向结构会拼接正向和反向表示，所以输出维度变为 `2 * hidden_size`。它适合整段文本已知的分类任务，不适合要求严格因果、不能查看未来输入的在线预测。

## 5. GRU：更紧凑的门控结构

GRU 把记忆与隐藏状态合并，主要使用更新门与重置门。参数通常少于同规模 LSTM，训练和推理更轻。它不是 LSTM 的简化低配版，而是另一种信息控制方式。

选择时可以先遵循朴素基线：

- 数据较少、部署预算紧：先试 GRU；
- 需要显式的细胞状态或已有成熟 LSTM 配方：使用 LSTM；
- 依赖很短或只验证数据管线：普通 RNN 可作为教学基线；
- 需要大规模并行和更长上下文：再比较 Transformer。

## 6. 变长序列、填充与长度

批训练要求张量整齐，因此短序列常在末尾补 `PAD`。如果直接取最后一个位置，短样本拿到的可能是填充后的状态。应保留真实长度，并在 RNN 前压紧序列：

```python
from torch.nn.utils.rnn import pack_padded_sequence

lengths = torch.tensor([8, 5, 3])
embedded = torch.randn(3, 8, 128)

packed = pack_padded_sequence(
    embedded,
    lengths.cpu(),
    batch_first=True,
    enforce_sorted=False,
)
packed_output, (h_n, c_n) = lstm(packed)
```

`lengths` 表示每个样本的有效 token 数。长度传到 CPU 是为了兼容打包接口；模型和嵌入仍可留在 GPU。若任务需要每个位置输出，可再用 `pad_packed_sequence` 还原。

## 7. 一个可替换数据的 LSTM 分类器

下面的模型约定 `padding_idx=0`，支持双向 LSTM。分类特征取最后一层两个方向的隐藏状态，而不是带填充的最后一个时间位置。

```python
class LSTMClassifier(nn.Module):
    def __init__(self, vocab_size: int, num_classes: int) -> None:
        super().__init__()
        self.embedding = nn.Embedding(
            vocab_size,
            embedding_dim=128,
            padding_idx=0,
        )
        self.encoder = nn.LSTM(
            input_size=128,
            hidden_size=192,
            num_layers=2,
            dropout=0.2,
            bidirectional=True,
            batch_first=True,
        )
        self.dropout = nn.Dropout(0.3)
        self.head = nn.Linear(192 * 2, num_classes)

    def forward(self, token_ids, lengths):
        x = self.embedding(token_ids)
        packed = pack_padded_sequence(
            x,
            lengths.cpu(),
            batch_first=True,
            enforce_sorted=False,
        )
        _, (h_n, _) = self.encoder(packed)
        forward_last = h_n[-2]
        backward_last = h_n[-1]
        features = torch.cat([forward_last, backward_last], dim=1)
        return self.head(self.dropout(features))
```

训练循环仍沿用前文的固定结构：清梯度、前向、计算交叉熵、反向、裁剪、更新。数据替换只需维持 `token_ids`、`lengths`、`label` 三项契约。

## 8. 训练与评估容易踩的坑

### 随机划分造成文本泄漏

同一模板改写、同一用户连续消息或同一文档切片被分到不同集合，会让验证结果虚高。应按来源、用户或文档分组划分。

### 只看最后一批损失

序列长度和类别比例会造成批间波动。记录整轮加权平均，并同时看验证集 Macro F1、每类召回和混淆矩阵。

### PAD 参与池化

对时间维做平均时，必须使用 mask 排除填充位置，否则短文本表示会被大量零向量稀释。

### 未限制最大长度

极少数超长样本会拖慢整批。应通过长度分布选择截断上限，并记录被截断比例，而不是任意写一个数字。

## 9. 环境与设备回退

Notebook 或 Colab 适合快速检查张量和少量样本。Windows 本地环境应先确认 PyTorch 与显卡驱动匹配，不要把“安装成功”和“CUDA 可用”混为一谈。

```python
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = LSTMClassifier(vocab_size=20000, num_classes=4).to(device)
```

CPU 回退时，可先减小 `batch_size`、隐藏维度和最大长度。代码路径保持一致，避免维护两套训练逻辑。

## 10. 数学补充：为什么门控有帮助

普通 RNN 的梯度不断乘以递归权重和激活函数导数。LSTM 细胞状态中存在加法路径：

$$
\frac{\partial c_t}{\partial c_{t-1}} = f_t
$$

当遗忘门接近 1，梯度可以沿这条路径较完整地传播；接近 0 时，旧信息主动被清除。这并不保证无限记忆，但给模型提供了学习“保留多久”的机制。

## 11. 练习与面试表达

1. 将 LSTM 替换为 GRU，保持嵌入和分类头不变，比较参数量。
2. 实现带 mask 的平均池化，与最后隐藏状态比较。
3. 统计文本长度分位数，据此选择最大长度。
4. 解释双向模型为什么不能直接用于严格因果生成。

面试时可以这样组织：数据存在变长和分组泄漏风险，因此保存真实长度并按来源划分；先用双向 GRU/LSTM 建基线，梯度裁剪保障稳定；评估不只看总体准确率，还检查每类召回和超长文本。这样讲出的不是一个层名称，而是一条完整判断链。

## 下一篇

RNN 沿时间顺序计算，难以充分并行。下一篇进入能直接建立位置间联系的结构：[Transformer 与注意力机制](/posts/deep-learning-07-transformer-attention/)。
