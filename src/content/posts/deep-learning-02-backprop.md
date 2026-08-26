---
title: "深度学习课程 02：神经网络为什么能学习——梯度下降与反向传播"
date: 2026-08-18T09:00:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "从线性层和链式法则出发，手算一次前向传播与参数更新，再用 PyTorch autograd 验证梯度，讲清计算图、叶子张量和梯度累加。"
tags: ["深度学习", "反向传播", "梯度下降", "PyTorch"]
categories: ["AI课程", "深度学习"]
math: true
---

上一节的训练循环里，真正让模型“学习”的一行是 `loss.backward()`。它没有搜索答案，也没有理解标签。它做的事情更朴素：沿着计算图从后往前，把损失对每个参数的偏导数算出来。

这篇会手算一个只有两个参数的小模型。数字不难，重点是看清梯度到底从哪里来。

## 1. 学习就是沿坡下山

设模型只有一个输入：

```text
预测值 y_hat = w * x + b
```

参数是 `w` 和 `b`。如果真实值为 `y`，用平方误差衡量预测偏差：

```text
loss = (y_hat - y)²
```

我们想让 loss 变小。梯度就是当前位置最陡的上坡方向，所以更新时要往反方向走：

```text
w_new = w - learning_rate * d(loss)/d(w)
b_new = b - learning_rate * d(loss)/d(b)
```

这就是梯度下降。神经网络参数很多，但更新规则没有本质变化。

## 2. 手算一次反向传播

取 `x=2`、`y=5`、`w=1`、`b=0`：

```text
y_hat = 1 * 2 + 0 = 2
loss = (2 - 5)² = 9
```

先求损失对预测值的导数：

```text
d(loss)/d(y_hat) = 2 * (y_hat - y) = -6
```

再看预测值怎样依赖参数：

```text
d(y_hat)/d(w) = x = 2
d(y_hat)/d(b) = 1
```

链式法则把局部导数串起来：

```text
d(loss)/d(w) = -6 * 2 = -12
d(loss)/d(b) = -6 * 1 = -6
```

若学习率为 0.1：

```text
w_new = 1 - 0.1 * (-12) = 2.2
b_new = 0 - 0.1 * (-6) = 0.6
```

新的预测是 `2.2 * 2 + 0.6 = 5`，刚好命中标签。这个例子过于整齐，真实训练不会一步到位，但它把方向说明白了：负梯度意味着增大参数有助于降低损失。

## 3. PyTorch 如何记录计算图

```python
import torch

x = torch.tensor(2.0)
y = torch.tensor(5.0)
w = torch.tensor(1.0, requires_grad=True)
b = torch.tensor(0.0, requires_grad=True)

y_hat = w * x + b
loss = (y_hat - y) ** 2
loss.backward()

print(w.grad)  # tensor(-12.)
print(b.grad)  # tensor(-6.)
```

`requires_grad=True` 表示需要追踪这个张量参与的运算。前向计算时，PyTorch 动态建立计算图；调用 `backward()` 后，它从 loss 节点反向遍历，把结果累加到叶子张量的 `.grad` 中。

所谓叶子张量，可以先理解为“由我们直接创建、需要被优化的参数”。中间结果 `y_hat` 也在计算图里，但默认不会把它的梯度保留在 `.grad`。通常我们也不需要。

```python
print(w.is_leaf)      # True
print(y_hat.is_leaf)  # False
print(y_hat.grad)     # None
```

调试中间梯度时，可以对非叶子张量调用 `retain_grad()`，但别把它当常规写法。保留每个中间梯度会增加内存占用。

## 4. 为什么梯度默认会累加

```python
w = torch.tensor(1.0, requires_grad=True)

loss1 = (w * 2 - 5) ** 2
loss1.backward()
print(w.grad)  # -12

loss2 = (w * 2 - 5) ** 2
loss2.backward()
print(w.grad)  # -24
```

第二次不是重新计算后覆盖，而是在原梯度上相加。这给梯度累积、多个损失共同训练等场景留下了空间。普通 mini-batch 训练则要主动清梯度：

```python
optimizer.zero_grad(set_to_none=True)
```

`set_to_none=True` 让梯度回到 `None`，而不是把原张量填成全 0。很多情况下它更省内存，也能帮助发现“这个参数本轮根本没有拿到梯度”的问题。

## 5. 多层网络只是链更长

考虑两层网络：

```text
z1 = W1*x + b1
a1 = ReLU(z1)
z2 = W2*a1 + b2
loss = CrossEntropy(z2, y)
```

要求 `loss` 对 `W1` 的梯度，需要依次经过输出层、激活函数和第一层线性变换。链式法则写成：

```text
d(loss)/d(W1)
= d(loss)/d(z2)
* d(z2)/d(a1)
* d(a1)/d(z1)
* d(z1)/d(W1)
```

矩阵形式看起来更复杂，但仍是局部导数相乘。反向传播的价值是复用已经算过的中间结果，从输出层向前高效传播，不需要为每个参数单独重算完整函数。

## 6. 激活函数为什么不能省

如果两层之间没有非线性：

```text
W2 * (W1*x + b1) + b2
= (W2*W1)*x + (W2*b1 + b2)
```

无论叠多少层，最后仍可合并成一个线性变换。ReLU、Sigmoid、GELU 等激活函数打破了这种可合并性，使网络能拟合弯曲边界和更复杂的映射。

ReLU 的导数很直白：输入大于 0 时导数为 1，小于 0 时为 0。它计算便宜，也缓解了深层 Sigmoid 常见的梯度衰减，但并非没有代价。某个神经元长期落在负区间，梯度一直是 0，就可能“死掉”。

## 7. 用有限差分检查梯度

自动微分方便，但自定义算子写错时，需要独立检查。最朴素的方法是有限差分：

```text
f'(w) ≈ [f(w + ε) - f(w - ε)] / (2ε)
```

```python
def f(value: float) -> float:
    return (value * 2.0 - 5.0) ** 2

epsilon = 1e-4
numeric_grad = (f(1.0 + epsilon) - f(1.0 - epsilon)) / (2 * epsilon)
print(numeric_grad)  # 接近 -12
```

数值梯度不是训练方法，它慢，而且会受到浮点误差影响。它适合做小规模单元检查：自动微分与数值近似差得很远时，先检查前向公式和张量形状。

## 8. 停止梯度的正确姿势

有时希望某段计算只产生数值，不参与反向传播：

```python
with torch.no_grad():
    prediction = model(inputs)
```

推理场景更适合 `torch.inference_mode()`。如果只想把某个张量从当前计算图分离：

```python
detached = features.detach()
```

不要写 `tensor.data` 绕过 autograd。它可能让计算图记录与真实数值不一致，错误往往到后面才出现。

## 数学补充：Softmax 与交叉熵的梯度为什么简洁

对单个样本，Softmax 把 logits `z` 转成概率 `p`：

```text
p_i = exp(z_i) / sum_j exp(z_j)
```

若真实类别是 `k`，交叉熵为：

```text
L = -log(p_k)
```

将两者合并求导，可以得到：

```text
dL/dz_i = p_i - 1(i = k)
```

也就是说，非真实类别的梯度就是预测概率，真实类别则再减 1。模型越自信地预测错误，修正信号越强。这也是训练时直接传 logits 给 `CrossEntropyLoss` 的原因：框架可以把 Softmax 和对数运算组合成更稳定的实现。

## 9. 常见错误

- **在原地修改参与计算图的张量**：可能触发版本检查错误，或让梯度逻辑难以追踪。
- **把 loss 转成 Python 数字后再 backward**：`loss.item()` 已脱离计算图，只用于日志。
- **忘记梯度只对浮点或复数张量有意义**：整数标签不需要 `requires_grad`。
- **误以为 `backward()` 会更新参数**：它只算梯度，更新仍由优化器完成。
- **重复对同一张计算图反向传播**：图默认在反向后释放。确实需要重复时才考虑 `retain_graph=True`，先问清楚为什么。

## 10. 练习与面试题

1. 用 PyTorch 重现手算例子，并手动写参数更新，不使用优化器。
2. 把平方误差改成绝对误差，比较在 `y_hat = y` 附近的梯度行为。
3. 为一个两层网络打印每层参数的梯度范数。
4. 用有限差分检查其中一个权重的梯度。

**为什么反向传播比对每个参数做有限差分高效？**

因为它沿计算图复用中间导数，一次反向遍历就能得到所有参数的梯度；有限差分需要逐个扰动参数并重新前向计算。

**什么是梯度消失？**

梯度在多层链式乘法中不断缩小，前面层几乎收不到更新信号。激活函数、初始化、归一化、残差连接和网络结构都会影响它。

**计算图为什么叫“动态”？**

PyTorch 在 Python 执行前向代码时即时记录真实发生的运算，控制流改变时图也随之改变。它不是先固定一张完整静态图再运行。

## 下一篇

梯度算出来不代表训练一定顺利。下一篇处理更现实的问题：loss 震荡、过拟合、梯度爆炸，以及怎样建立排查顺序：[训练神经网络的常见问题](/posts/deep-learning-03-training-stability/)。
