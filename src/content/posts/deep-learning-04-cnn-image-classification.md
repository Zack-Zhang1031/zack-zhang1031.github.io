---
title: "深度学习课程 04：CNN 从卷积、池化到图像分类"
date: 2026-08-20T09:00:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "从局部感受野和权重共享理解 CNN，使用 PyTorch 构建 CIFAR-10 图像分类基线，并排查通道、尺寸、归一化和增强问题。"
tags: ["深度学习", "CNN", "图像分类", "PyTorch"]
categories: ["AI课程", "计算机视觉"]
math: true
---

OpenCV 擅长按明确规则处理图像：缩放、滤波、边缘、轮廓、几何变换。CNN 做的是另一件事。它不要求人先写出“猫耳朵是什么形状”，而是从训练数据里学出哪些局部模式对分类有用。

这篇使用 CIFAR-10 搭一个小型卷积网络。重点不是刷榜，而是把输入尺寸、卷积输出、特征图和分类头对起来。

## 1. 全连接网络为什么不适合直接处理大图

一张 `224×224×3` 的彩色图像有 150,528 个输入值。若直接连接到 1024 个隐藏单元，第一层就需要上亿个权重。更麻烦的是，全连接层不关心像素位置：左上角的一条边和右下角的一条边使用完全不同的参数，无法自然复用“边缘”这种局部规律。

CNN 通过两个假设减少参数：

- 邻近像素共同形成局部特征；
- 同一种局部特征可能出现在图像不同位置。

对应到结构，就是局部连接与权重共享。

## 2. 卷积核到底做了什么

以单通道图像为例，一个 `3×3` 卷积核在图像上滑动。每到一个位置，就将覆盖区域与卷积核逐元素相乘再求和，得到输出特征图中的一个值。

```text
output[i, j] = sum_m sum_n input[i+m, j+n] * kernel[m, n] + bias
```

训练前，卷积核只是随机数字。反向传播会逐步调整它们。某些核对水平边缘响应更强，某些核偏向纹理或颜色组合。越靠后的层，看到的已不是原始像素，而是前面层组合后的特征。

PyTorch 的图像张量通常按以下顺序排列：

```text
[batch, channel, height, width]
```

```python
import torch
from torch import nn

x = torch.randn(8, 3, 32, 32)
conv = nn.Conv2d(
    in_channels=3,
    out_channels=16,
    kernel_size=3,
    stride=1,
    padding=1,
)
y = conv(x)
print(y.shape)  # [8, 16, 32, 32]
```

`out_channels=16` 表示学习 16 组卷积核，得到 16 张特征图。`padding=1` 在边缘补一圈，使 `3×3`、步长 1 的卷积保持高宽不变。

## 3. 输出尺寸怎么算

对一个方向，卷积输出尺寸为：

```text
out = floor((input + 2*padding - dilation*(kernel-1) - 1) / stride + 1)
```

普通 `3×3` 卷积、`padding=1`、`stride=1` 时，高宽不变；`stride=2` 时大致减半。写模型前最好在纸上或 Notebook 中打印每层 shape。分类头报矩阵乘法错误，十有八九是前面尺寸算错了。

## 4. 池化与感受野

池化压缩空间尺寸。最大池化保留窗口中的最大响应：

```python
pool = nn.MaxPool2d(kernel_size=2, stride=2)
z = pool(y)
print(z.shape)  # [8, 16, 16, 16]
```

随着卷积和下采样叠加，后层一个位置对应原图更大的区域，这个区域叫感受野。浅层更像在看边缘和颜色，深层能组合出更大结构。

池化不是必需品。现代网络也常用步长卷积完成下采样。选哪种要看模型设计，别把“卷积后必须池化”当成固定语法。

## 5. 准备 CIFAR-10 数据

```python
import torch
from torch.utils.data import DataLoader
from torchvision import datasets, transforms

train_transform = transforms.Compose([
    transforms.RandomCrop(32, padding=4),
    transforms.RandomHorizontalFlip(),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=(0.4914, 0.4822, 0.4465),
        std=(0.2470, 0.2435, 0.2616),
    ),
])

eval_transform = transforms.Compose([
    transforms.ToTensor(),
    transforms.Normalize(
        mean=(0.4914, 0.4822, 0.4465),
        std=(0.2470, 0.2435, 0.2616),
    ),
])

train_set = datasets.CIFAR10(
    root="data", train=True, download=True, transform=train_transform
)
test_set = datasets.CIFAR10(
    root="data", train=False, download=True, transform=eval_transform
)

train_loader = DataLoader(
    train_set, batch_size=128, shuffle=True, num_workers=0
)
test_loader = DataLoader(
    test_set, batch_size=256, shuffle=False, num_workers=0
)
```

训练集使用随机裁剪与翻转，测试集只做确定性变换。不要给验证和测试数据加随机增强，否则每次评估看到的输入都不同。

示例中的均值和标准差用于演示 CIFAR-10 的常见归一化设置。如果换成自己的数据，应在训练集上重新统计，不能照抄。

## 6. 搭一个尺寸不容易写错的 CNN

全局平均池化能把任意空间尺寸压成 `1×1`，减少手算分类头输入维度的麻烦。

```python
class SmallCNN(nn.Module):
    def __init__(self, num_classes: int = 10) -> None:
        super().__init__()
        self.features = nn.Sequential(
            nn.Conv2d(3, 32, 3, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2),

            nn.Conv2d(32, 64, 3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2),

            nn.Conv2d(64, 128, 3, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(inplace=True),
            nn.AdaptiveAvgPool2d(1),
        )
        self.classifier = nn.Linear(128, num_classes)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.features(x)
        x = torch.flatten(x, 1)
        return self.classifier(x)
```

逐层打印：

```python
model = SmallCNN()
sample = torch.randn(4, 3, 32, 32)

with torch.no_grad():
    features = model.features(sample)
    logits = model(sample)

print(features.shape)  # [4, 128, 1, 1]
print(logits.shape)    # [4, 10]
```

输出 logits，不在模型末尾加 Softmax。训练循环可以直接复用本系列第 1 篇的 `train_one_epoch` 和 `evaluate`。

```python
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = SmallCNN().to(device)
criterion = nn.CrossEntropyLoss()
optimizer = torch.optim.AdamW(model.parameters(), lr=3e-4, weight_decay=1e-2)
```

## 7. 看懂特征图，而不是把模型当黑盒

可以用 hook 取出某层输出：

```python
activations = {}

def save_activation(name: str):
    def hook(_module, _inputs, output):
        activations[name] = output.detach().cpu()
    return hook

handle = model.features[0].register_forward_hook(save_activation("conv1"))

model.eval()
with torch.inference_mode():
    images, _ = next(iter(test_loader))
    _ = model(images[:1].to(device))

feature_maps = activations["conv1"]
print(feature_maps.shape)
handle.remove()
```

浅层特征图通常还能和原图位置对应。深层特征经过多次组合与下采样，不该简单解释成某个固定物体部件。可视化用于检查模型在响应什么，不是给每个通道编一个故事。

## 8. 最容易踩的四个坑

### 通道顺序错了

OpenCV 读取图像通常得到 HWC、BGR；PyTorch 卷积期望 NCHW，并且多数预训练模型按 RGB 训练。转换时要同时处理通道顺序和轴顺序。

### 归一化重复

`ToTensor()` 会把常见 8 位图像缩放到 `[0, 1]`。如果前面已经手动除以 255，再调用同类处理，数值可能被缩小两次。打印范围最可靠。

### 增强改变了标签语义

水平翻转对猫狗通常合理，对文字、交通标志、左右器官可能不合理。增强不是越多越好，要符合任务不变量。

### 分类头类别数没改

数据有 5 类，模型仍输出 10 类，训练可能不立刻报错，但多出的类别会浪费概率空间。类别映射、输出维度和标签范围必须一致。

## 数学补充：参数量为什么与图像尺寸无关

卷积层参数量为：

```text
out_channels * (in_channels * kernel_h * kernel_w + bias)
```

例如从 3 通道卷积到 32 通道，核大小 `3×3`：

```text
32 * (3 * 3 * 3 + 1)
```

参数量不随输入高宽变化，因为同一组核在所有位置复用。计算量会随图像变大，但需要学习的卷积参数不会因此增加。

## 9. 练习与面试题

1. 把第二个池化层改成步长为 2 的卷积，比较 shape 和参数量。
2. 去掉 BatchNorm，观察训练曲线的稳定性变化。
3. 将第一层卷积核改成 `5×5`，计算参数量与感受野差异。
4. 可视化第一层的 8 个特征图，检查输入归一化错误时会发生什么。

**为什么 CNN 比全连接网络更适合图像？**

它利用局部结构和空间上的权重共享，在较少参数下学习可平移复用的特征。

**`1×1` 卷积有什么用？**

它在每个空间位置混合通道，可调整通道数并加入非线性，常用于瓶颈结构和特征融合。

**池化会丢信息吗？**

会。下采样换来更大感受野、更少计算和一定位置鲁棒性。任务需要精确定位时，通常要保留高分辨率特征或加入上采样与跳跃连接。

## 下一篇

小 CNN 适合讲清结构，但真实项目的数据往往不够多。下一篇把它升级成完整案例：[图像分类综合项目：从基线到迁移学习](/posts/deep-learning-05-transfer-learning-project/)。
