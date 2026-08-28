---
title: "SAM 与开放词汇检测：视觉基础模型的正确打开方式"
date: 2026-08-30T12:50:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "SAM 分割一切的提示工程、Grounding DINO 文本驱动检测、Grounded-SAM 组合管道、零样本视觉的落地场景与边界。"
tags: ["SAM", "Grounding DINO", "开放词汇检测", "视觉基础模型", "零样本"]
categories: ["AI课程", "计算机视觉"]
math: false
---

传统视觉 pipeline 有个铁律：做什么任务就标什么数据、训什么模型——检测狗要标一万张狗，分割车要标车的 mask。视觉基础模型打破了这个铁律：**SAM 分割「一切」，Grounding DINO 检测「任何你叫得出名字的东西」**，零样本、不训练、开箱即用。它们把 CV 的工作方式从「训模型」变成了「写 prompt」。

这篇讲清这两个模型能干什么、怎么组合、以及什么时候你仍然需要传统训练。

**前置阅读**：建议先读 [目标检测 YOLO](/posts/object-detection-yolo/)、[图像分割 U-Net](/posts/image-segmentation-unet/)、[ViT 与 CLIP](/posts/vit-clip-multimodal/)。

## SAM：分割的「GPT 时刻」

Segment Anything Model 的核心设定：**不回答「这是什么」，只回答「这块区域是什么形状」**。给它一个提示（点、框、mask），它返回该位置物体的精确分割掩码。训练数据 SA-1B：1100 万张图、11 亿个 mask——规模换来了惊人的泛化：没见过的物体类别照样切得准。

```python
from segment_anything import sam_model_registry, SamPredictor

sam = sam_model_registry["vit_b"](checkpoint="sam_vit_b.pth")
predictor = SamPredictor(sam)
predictor.set_image(image)   # 先编码图像（这步慢，可缓存）

# 点提示：positive 点选目标，negative 点排除
masks, scores, _ = predictor.predict(
    point_coords=np.array([[500, 300]]),
    point_labels=np.array([1]),
    multimask_output=True)      # 返回 3 个候选粒度
best = masks[np.argmax(scores)]
```

SAM 使用的三个实战要点：

1. **`set_image` 的编码结果可以缓存**——同一图像多次提示不用重复编码，交互式应用的关键。
2. **multimask_output=True**——一个点可能有多种合理解读（点在人身上：要整个人？还是衬衫？），SAM 返回 3 个粒度按 score 选。
3. **自动全图模式（SAM2 / automatic mask generator）**：网格撒点自动分割全图所有物体——无需提示，但会产生大量碎片 mask，需要后过滤（按面积/稳定性阈值）。

## Grounding DINO：用文本提示的检测器

传统检测器（YOLO）类别在训练时锁死；Grounding DINO 把文本编码和视觉特征深度融合，**推理时用文本指定要检测什么**——「dog. cat. red car.」一句话就是一个检测器，零样本。

```python
from groundingdino.util.inference import load_model, predict

model = load_model("groundingdino_swint_ogc.pth", "weights.pth")
boxes, logits, phrases = predict(
    model=model, image=img,
    caption="defect . scratch . dent .",   # 类别用点号分隔
    box_threshold=0.35, text_threshold=0.25)
```

阈值调优是实战关键：`box_threshold` 控制置信度（低→召回高误检多），工业缺陷检测从 0.3 起扫。提示词也有讲究：短名词短语比长句效果好；同义词枚举（「scratch . scuff .」）能提召回。

## Grounded-SAM：文本驱动分割的组合拳

两个模型各缺一块：SAM 不知道「是什么」，DINO 不知道「精确边界」。组合起来：**DINO 出框 → 框当 SAM 的提示 → 得到带语义标签的精确 mask**：

```
文本 "crack" → Grounding DINO 检测框 → SAM 框提示分割 → 语义 + 精确掩码
```

这条管道让「给裂缝分割数据集自动打标」从几周标注变成半天自动预标 + 人工修正——**自动标注是这套组合最现实的商业价值**：用基础模型预标，人只修错，标注成本降 70%+，然后拿标注数据去训你的小模型（YOLO/U-Net）上生产。

```python
# 自动标注管道的骨架
for img_path in unlabeled_images:
    img = load(img_path)
    boxes, scores, labels = dino_predict(img, caption="defect .")
    for box, label in zip(boxes, labels):
        mask = sam_predict(img, box=box)
        save_annotation(img_path, mask, label)   # 导出 COCO/YOLO 格式
```

## 什么时候基础模型不够，还得自己训

清醒认识边界，零样本不是万能的：

| 场景 | 基础模型 | 专用模型 |
|------|----------|----------|
| 通用物体（猫狗车人） | 直接零样本，效果很好 | 没必要 |
| 细粒度差异（相似零件型号） | 经常混淆 | 必须微调/自训 |
| 工业缺陷（语义弱、形态怪） | 阈值难调、漏检多 | 自训为主 |
| 实时视频流（30fps+） | ViT-H 太重，边缘跑不动 | YOLO-Nano 等 |
| 医疗影像（域差异极大） | 需要 MedSAM 等微调版 | 领域微调 |

**生产落地的标准配方**：Grounded-SAM 零样本验证可行性 → 自动标注攒数据 → 训轻量专用模型部署 → 基础模型做兜底和难例挖掘。基础模型是「启动器」不是「终点」。

## 踩坑排查

| 现象 | 原因 | 解法 |
|------|------|------|
| SAM 分割结果碎成很多块 | 自动模式碎片 | 面积/稳定性阈值过滤；或改点/框提示 |
| DINO 检测不到自定义类别 | 提示词写法/阈值 | 名词短语 + 同义词枚举；降 box_threshold |
| 同一物体检出多个重叠框 | 阈值过低 | 提高阈值 + NMS |
| 分割边界在细结构处粗糙 | SAM ViT-B 能力限制 | 换 ViT-H 或 HQ-SAM |
| GPU 内存爆 | ViT-H + 大图 | 图像降采样到 1024 内；换 ViT-B |

## 练习

1. 用 SAM 点提示分割 10 张不同领域的图（含 2 张医学/工业），记录哪些类别零样本就切得好。
2. 用 Grounding DINO 检测一个「训练集里绝对没有」的类别（如「traffic cone」），扫 box_threshold 看召回-误检变化。
3. 搭建 Grounded-SAM 自动标注管道，给 50 张图自动打标，人工统计修正率——算一笔「省了百分之多少标注时间」的账。
4. 对比实验：Grounded-SAM 零样本 vs 用其自动标注训练的 YOLOv8，在 30 张测试图上比 mAP——验证「启动器 → 专用模型」的迁移逻辑。

## 面试常问

**Q：SAM 的架构三个部分及各自作用？**
Image Encoder（ViT，把图编码成 embedding，重但一次）、Prompt Encoder（点/框/mask 编码成提示向量，轻）、Mask Decoder（交叉注意力融合两者输出 mask + 质量分，轻量可反复调用）。这个「重编码 + 轻解码」的解耦是交互式应用的关键设计——图像编码一次，提示随意改。

**Q：开放词汇检测和传统闭集检测的本质区别？**
闭集检测：分类头输出固定 N 类的 softmax，类别集合训练时锁死；开放词汇：检测头的「分类」变成「视觉区域特征与文本特征的相似度匹配」——文本侧是自由输入，所以类别集合推理时任意指定。CLIP 式对比预训练提供了对齐的图文空间，Grounding DINO 把检测框特征接进这个空间。

**Q：零样本检测的局限在哪？**
① 细粒度类别（模型靠语义先验，相似零件的区分靠领域知识）；② 语义弱的目标（缺陷「裂了一小道」没有清晰概念锚点）；③ 提示词敏感（措辞影响大，缺稳定的 prompt 工程方法）；④ 长尾分布（训练图文对里罕见概念表现差）。这些是「语义先验」路线的固有边界——零样本的本质是借用互联网图文的知识，超出这个知识覆盖就得回到标注训练。

**Q：用基础模型自动标注再训小模型，有什么陷阱？**
① 标注噪声被小模型继承（基础模型的系统性错误会变成训练标签的系统性偏差——人工抽检率不能省）；② 分布偏窄（基础模型只标得出它认得的，罕见模式进不了训练集）；③ 评估污染（测试集如果也是自动标注的，指标会虚高——测试集必须人工标）。

**Q：SAM 2 相对 SAM 的进步？**
统一图像与视频：加入记忆机制（memory attention）做视频目标跟踪——给第一帧的 mask，后续帧自动跟随同一物体分割；交互修正可沿时间传播。图像侧速度与精度也有提升。视频分割/跟踪场景（[视频理解篇](/posts/video-understanding-basics/)）它是新基线。

## 相关阅读

- [图像分割 U-Net 实战](/posts/image-segmentation-unet/)——专用分割模型的对照
- [目标检测实战：YOLO](/posts/object-detection-yolo/)——闭集检测的效率王者
- [ViT 与 CLIP：多模态基石](/posts/vit-clip-multimodal/)——开放词汇的语义空间来源
- [视频理解入门](/posts/video-understanding-basics/)——SAM2 的用武之地
- [图像数据增强](/posts/image-augmentation-mixup-cutmix/)——自动标注数据的后续加工

基础模型改变了 CV 项目的经济学：**冷启动成本从「先标三个月数据」变成「先写三行 prompt」**。但记住它的角色是点火器——量产的火，还是要靠自己训的柴。
