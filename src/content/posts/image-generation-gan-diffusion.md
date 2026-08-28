---
title: "图像生成入门：GAN、VAE 与 Diffusion——三代生成模型的思想演进"
date: 2026-08-29T08:00:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "生成式视觉的三代范式：VAE 的显式概率建模、GAN 的对抗博弈、Diffusion 的渐进去噪，讲清各自原理、优缺点，并用 diffusers 跑通文生图。"
tags: ["图像生成", "GAN", "Diffusion", "生成模型"]
categories: ["AI课程", "计算机视觉"]
math: true
---

判别式模型学"图里是什么"，生成式模型学"图该怎么画"。图像生成是过去十年视觉领域最波澜壮阔的线：2014 年 GAN 横空出世，2020 年 Diffusion 后来居上，如今 Stable Diffusion 系已是事实标准。这篇按三代范式的思想演进讲，理解"为什么新一代替代旧一代"比记住每个模型结构更重要。

> 前置阅读：[深度学习课程 04：CNN](/posts/deep-learning-04-cnn-image-classification/)、[07：Transformer 与注意力](/posts/deep-learning-07-transformer-attention/)（现代文生图的文本条件靠它）。

## 共同的问题：怎么学"图片的分布"

生成模型的目标是学习真实图像的分布 $p(x)$，然后从中采样。困难在于图像空间巨大且 $p(x)$ 无法显式写出。三代模型给出了三种绕法：

## VAE：把生成变成"编码-解码"

变分自编码器的想法：假设图像由低维隐变量 $z$ 生成，训练一个编码器把图压成 $z$ 的分布、一个解码器把 $z$ 还原成图。生成时从标准正态分布采样 $z$ 喂给解码器。

$$\mathcal{L} = \underbrace{\|x - \hat{x}\|^2}_{\text{重建}} + \underbrace{KL(q(z|x) \| \mathcal{N}(0, I))}_{\text{让隐分布接近正态}}$$

VAE 训练稳定、理论漂亮，但生成图模糊——平方损失倾向"平均化"所有可能的重建。它今天更多作为组件存在（Stable Diffusion 的潜空间就是 VAE 压出来的）。

## GAN：生成器和判别器的博弈

GAN 的思想最富戏剧性：生成器 $G$ 从噪声造图，判别器 $D$ 分辨真假，两者对抗训练——$G$ 学会骗过 $D$ 的那天，它造的图就以假乱真：

$$\min_G \max_D \; \mathbb{E}_{x}[\log D(x)] + \mathbb{E}_{z}[\log(1 - D(G(z)))]$$

GAN 生成的图像锐利逼真，StyleGAN 系的人脸生成达到过以假乱真的水平。但训练以"难伺候"著称：

- **模式崩溃（mode collapse）**：生成器发现糊弄判别器的捷径，只产出少数几种图，多样性塌掉。
- **训练震荡**：两者力量此消彼长，loss 曲线剧烈抖动，什么时候停全靠看生成图。
- 没有似然估计，评估只能靠 FID 这类间接指标。

## Diffusion：把生成变成"逐步去噪"

Diffusion 换了个天才视角：定义一个前向过程，逐步往图上加噪声直到变成纯噪声；训练模型学习**逆过程**——每一步预测并去掉一点噪声。生成时从纯噪声出发，几十步去噪后得到清晰图像。

训练目标朴素得出奇：往真图加已知噪声，让 U-Net 预测加的噪声是什么（MSE 损失）。没有博弈、没有对抗，训练稳定，生成质量和多样性双高——这就是它终结 GAN 时代的原因。

** latent diffusion（Stable Diffusion 的路线）**再加两个工程巧思：先用 VAE 把图压进低维潜空间（扩散过程在潜空间做，算力需求降一个量级）；文本条件通过 CLIP 文本编码器 + U-Net 里的交叉注意力注入，实现"文字指挥画面"。

## 上手：diffusers 三行文生图

```python
# pip install diffusers transformers accelerate
from diffusers import StableDiffusionPipeline
import torch

pipe = StableDiffusionPipeline.from_pretrained(
    "runwayml/stable-diffusion-v1-5", torch_dtype=torch.float16
).to("cuda")

image = pipe("a watercolor painting of mountains at dawn, mist",
             num_inference_steps=30, guidance_scale=7.5).images[0]
image.save("dawn.png")
```

两个关键参数：`num_inference_steps` 是去噪步数（20-50，越多越精细越慢）；`guidance_scale` 是 CFG 强度——控制"多听话"，太低放飞自我，太高画面过饱和，7-8 是常用区间。

## 怎么选：2026 年的实用答案

- **文生图/图生图应用**：直接用 Stable Diffusion 系或更新的扩散模型，别考虑自己训 GAN。
- **理解原理/面试**：三代范式各自的核心思想、损失、失败模式必须能讲——这篇的三节就是答案。
- **学术研究**：扩散模型的加速采样（DDIM、一致性模型）和可控生成（ControlNet）是活跃方向。

## 踩坑排查

| 症状 | 原因 | 处理 |
|---|---|---|
| GAN 生成全是同一种图 | 模式崩溃 | 换损失（WGAN-GP）、调两者学习率比 |
| 生成图模糊 | VAE 的均方损失特性 | 换感知损失/上 GAN/Diffusion |
| 显存爆 | 全精度加载/分辨率高 | float16、enable_attention_slicing |
| 画面和 prompt 无关 | guidance 太低/步数太少 | 提 guidance_scale 到 7+ |
| 颜色过饱和伪影 | guidance 太高 | 降 CFG 或用动态阈值 |
| 中文 prompt 效果差 | 文本编码器是英文 CLIP | 先翻译成英文 prompt |

## 练习

1. 固定随机种子，扫 guidance_scale ∈ {1, 3, 7.5, 15}，对比画面变化并总结规律。
2. 固定 prompt，对比 10/30/50 步的生成质量与耗时。
3. 用 diffusers 跑 img2img：输入一张草图，不同 strength 参数对比。
4. 画一张三代范式的对比表：损失、训练稳定性、生成质量、多样性、代表模型。

## 面试常问

**Q：GAN 为什么会模式崩溃？**
生成器的目标只是骗过当前判别器，一旦找到判别器的盲区（少数几种图就能骗过），就没有动力覆盖真实分布的多样性。缓解：WGAN-GP 的稳定训练、minibatch discrimination、Unrolled GAN 等。

**Q：Diffusion 为什么比 GAN 稳定？**
训练目标是简单的回归（预测噪声），不存在两个网络博弈的对抗动态；渐进生成的过程本身平滑可控。代价是推理要多步迭代，慢——后来的加速采样研究都在补这个短板。

**Q：Stable Diffusion 的三个核心组件？**
VAE（图像 ↔ 潜空间互转）、U-Net（潜空间去噪主干，含交叉注意力注入文本条件）、CLIP 文本编码器（prompt → 条件向量）。生成在潜空间进行是它能在消费级显卡跑起来的关键。

**Q：CFG（classifier-free guidance）是什么？**
训练时随机丢弃文本条件让模型同时学会有条件和无条件去噪；推理时用两者的差值外推增强文本引导。guidance_scale 就是外推强度——这是"听话程度"的旋钮。

---

相关阅读：[目标检测实战](/posts/object-detection-yolo/)（视觉的判别侧）、[图像分割入门](/posts/image-segmentation-unet/)。
