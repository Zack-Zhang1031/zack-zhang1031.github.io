---
title: "超分辨率实战：Real-ESRGAN 老照片修复与画质增强"
date: 2026-08-30T13:20:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "超分辨率的问题定义、从 SRCNN 到 ESRGAN 的演进、Real-ESRGAN 盲修复实战、人脸增强 GFPGAN、评估指标的失真陷阱。"
tags: ["超分辨率", "Real-ESRGAN", "GFPGAN", "图像增强", "GAN"]
categories: ["AI课程", "计算机视觉"]
math: false
---

老照片模糊、监控截图看不清车牌、电商主图被客户嫌弃分辨率低——**超分辨率（Super-Resolution, SR）就是从低清图重建高清图**。这个领域有个反直觉的核心矛盾：**让 PSNR 分数最高的方法，出来的图看起来糊；看起来锐利的图，PSNR 反而差**。理解这个矛盾，就理解了 SR 的全部技术路线。

**前置阅读**：建议先读 [GAN 与 Diffusion](/posts/image-generation-gan-diffusion/)、[CNN 详解](/posts/deep-learning-04-cnn-image-classification/)。

## 两条路线：保真派 vs 感知派

**保真派（PSNR-oriented）**：目标是逐像素接近真值——SRCNN、EDSR、RCAN，损失用 L1/L2。问题：L2 损失的「最优解」是所有合理答案的平均——一张既可能是纹理 A 也可能是纹理 B 的区域，平均出来就是糊的。**PSNR 高的图人眼看着「肉」**。

**感知派（Perceptual）**：目标是「看起来像真的」——SRGAN/ESRGAN 用感知损失（VGG 特征空间比）+ 对抗损失（判别器逼生成器产出真实纹理）。结果：纹理细节「补」出来了，看着锐利，但这些细节是**合理想象**而非真实还原——PSNR 反而低，且可能「脑补」出不存在的内容。

**这个 trade-off 决定了应用场景的选择**：法庭证据、医疗影像——必须保真派，脑补的细节是事故；老照片修复、画质增强、游戏纹理——感知派，好看就是正义。

## Real-ESRGAN：盲修复的工程标杆

经典 SR 假设退化是理想双三次降采样，真实世界的低清图却是「模糊 + 噪声 + JPEG 压缩」的混合——模型在理想数据上训练，遇到真实照片直接崩。Real-ESRGAN 的解法：**用二阶退化模型合成训练数据**（先模糊再加噪再压缩，重复两遍），让模型见过各种脏退化，实现「盲」修复。

实战调用（社区封装好的 Real-ESRGAN）：

```python
from realesrgan import RealESRGANer
from basicsr.archs.rrdbnet_arch import RRDBNet

model = RRDBNet(num_in_ch=3, num_out_ch=3, num_feat=64,
                num_block=23, num_grow_ch=32, scale=4)
upsampler = RealESRGANer(
    scale=4, model_path="RealESRGAN_x4plus.pth",
    model=model, tile=256)      # tile 分块处理大图，防显存爆
output, _ = upsampler.enhance(img, outscale=4)
```

`tile` 参数是实用关键：大图整张飞显存，切成 256 块分别超分再拼（有 10px 重叠去拼缝）。

## 人脸专项：GFPGAN 与 CodeFormer

通用 SR 在人脸上力不从心（人脸结构强、细节语义化）。人脸修复模型引入**人脸先验**（StyleGAN 的人脸生成知识做「参考库」）：

- **GFPGAN**：老照片人脸修复的事实标准，模糊人脸 → 清晰五官，奶奶的年轻照片能修出惊艳效果。
- **CodeFormer**：可调「保真-质量」滑杆 w（0=完全脑补漂亮但不像本人，1=忠于原图但修复弱）——**这个滑杆就是感知-保真矛盾的产品化**。

```python
from gfpgan import GFPGANer
restorer = GFPGANer(model_path="GFPGANv1.4.pth", upscale=4)
_, _, restored = restorer.enhance(old_photo, has_aligned=False)
```

注意：修复出来的人脸是「合理想象」——**用于家庭老照片温情脉脉，用于身份认证就是伪造**。技术伦理在这个领域格外具体。

## 评估指标的陷阱

SR 的评估是「指标打架」重灾区：

- **PSNR/SSIM**：逐像素保真度——感知派模型的弱项，分数低不代表难看。
- **LPIPS**：感知相似度（深度特征距离）——更接近人眼。
- **NIQE/MANIQA**：无参考质量分——没有真值图时的选择。
- **结论：SR 领域最终靠人眼**。技术报告放指标，决策靠盲评对比图。

## 落地场景与选型

| 场景 | 方案 |
|------|------|
| 老照片修复 | Real-ESRGAN 整体 + GFPGAN 修脸 |
| 视频超分 | BasicVSR++ / RealBasicVSR（时序一致性） |
| 动漫/插画 | Real-ESRGAN 的 anime 专用模型（x4_anime_6B） |
| 实时（游戏/会议） | FSRCNN 等轻量模型，或浏览器端 SR |
| 文档/扫描件 | 保真派（SwinIR），防脑补改字 |

推理性能参考：Real-ESRGAN x4 在 RTX 4090 上，512×512 输入约 0.3s/张；1080p 图 tile 处理约 2~3s。批量业务放队列异步跑，别同步阻塞。

## 踩坑排查

| 现象 | 原因 | 解法 |
|------|------|------|
| 输出有规则拼缝/色块 | tile 边界 | 确认 tile_pad=10 重叠；或整图跑 |
| 人脸修复后不像本人 | 脑补过度 | CodeFormer 调 w 到 0.7+ 保真 |
| 文字区域被改成乱码 | 感知派脑补 | 文档类换保真派模型 |
| 显存溢出 | 输入图太大 | 降 tile 尺寸或先降采样 |
| 噪声被当成纹理放大 | 原图噪点重 | 先去噪再超分，或用带降噪版模型 |

## 练习

1. 用 Real-ESRGAN 处理 5 张不同类型的低清图（老照片/截图/压缩过的图），对比原图与输出的细节，找出「脑补」和「还原」的区域。
2. 用 CodeFormer 的 w 从 0 到 1 扫 5 档处理同一张模糊人脸，观察「像本人-漂亮」的权衡。
3. 实验：分别用双三次插值和 Real-ESRGAN 把 256×256 放大到 1024，计算 PSNR（相对原图）并肉眼对比——理解 PSNR 与观感的背离。
4. 设计一个「老照片修复」的完整 pipeline：去污 → 超分 → 人脸修复 → 上色（DDColor），写成可调用的脚本。

## 面试常问

**Q：为什么 L2 损失会导致结果模糊？**
L2 惩罚逐像素均方误差，在「多解」区域（高频纹理的真值不确定），最小化期望损失的输出是所有可能真值的均值——即模糊。这是回归问题的本质：随机变量的条件期望是均值的平滑。GAN/扩散模型改为「采样一个合理样本」而非「输出均值」，所以锐利但可能偏离真值。

**Q：Real-ESRGAN 相对 ESRGAN 的核心改进？**
退化模型。ESRGAN 用理想双三次降采样合成训练对，Real-ESRGAN 用「高阶退化过程」：随机模糊核（高斯/运动/盘形）→ 噪声（高斯/泊松）→ JPEG 压缩，串联两遍，模拟真实世界脏退化。另有 U-Net 判别器（输出逐像素真假而非整图）稳定训练。**数据合成的真实性决定盲修复能力**——这是「数据工程 > 模型结构」的又一例证。

**Q：视频超分比图像难在哪？**
时序一致性：逐帧独立超分会产生帧间闪烁（纹理在每帧脑补得不一样）。视频模型用光流或可变形卷积对齐相邻帧特征，融合时序信息——但要处理遮挡和运动模糊的对齐失败。工程上还要考虑：长视频滑窗、在线 vs 离线模式。

**Q：怎么判断一个场景该用保真派还是感知派？**
问一个问题：输出里的细节需要「是真的」还是「像真的」？身份识别、医疗、司法、文档——必须真，保真派；展示、娱乐、美化——像就行，感知派。灰色地带（电商产品图）：脑补可能误导消费者，谨慎使用并考虑标注「AI 增强」。

**Q：扩散模型做 SR 相比 GAN 的优劣？**
扩散 SR（StableSR、SUPIR 等）：生成质量上限更高、细节更自然、可用文本提示引导；劣势：推理慢（多步采样 vs GAN 一次前向）、脑补更「自由」所以保真更难控、显存需求大。当前实践：离线高质场景开始转向扩散，实时/批量场景 GAN（Real-ESRGAN 系）仍是主力。

## 相关阅读

- [GAN 与 Diffusion 图像生成](/posts/image-generation-gan-diffusion/)——感知派的生成模型基础
- [图像分割 U-Net](/posts/image-segmentation-unet/)——U-Net 结构在 SR 判别器中的应用
- [模型压缩与部署](/posts/model-compression-deployment/)——SR 模型端侧化的路径
- [边缘 AI 与移动端部署](/posts/edge-ai-mobile-deployment/)——实时 SR 的落地约束
- [OpenCV 基础](/posts/opencv-image-interpolation-mask-roi-watermark-grayscale-tutorial/)——传统插值方法的对照基线

超分辨率是「生成模型落地最成熟」的领域之一——它的教训也最具普适性：**先想清楚你要的是「真」还是「美」，再选模型**。这个顺序反了，技术指标再好也是错的产品。
