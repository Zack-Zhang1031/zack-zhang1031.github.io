---
title: "多模态科研内容理解 04：图表与公式——论文里的视觉信息"
date: 2026-08-29T00:20:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "AI 科研内容课程系列四第 4 课：从论文 PDF 中抽取图表与公式——版面检测、图注配对、图表分类，以及视觉信息在平台中的用途。"
tags: ["图表抽取", "版面分析", "OpenCV", "公式识别"]
categories: ["AI课程", "多模态理解"]
math: false
---

论文不只有文字。实验结果在表格里、方法架构在示意图里、核心贡献常常是图 3 的那条曲线。平台的"多模态理解"这一环，就是把 PDF 里的视觉信息（图、表、公式）抽出来并赋予结构。这一课做这件事的最小可用版本：检测 → 抽取 → 图注配对 → 粗分类。

> 前置阅读：[第 1 课 PDF 解析](/posts/research-mm-01-pdf-parsing/)、OpenCV 基础见 [OpenCV 系列](/posts/opencv-contour-feature-extraction/)、CNN 图像分类见 [深度学习课程 04](/posts/deep-learning-04-cnn-image-classification/)。

## 版面分析：先找到"图在哪"

PDF 里抽图有两条路线：

**路线 1：直接提取嵌入图片。** PDF 里的位图是独立对象，PyMuPDF 可以直接挖出来：

```python
import fitz

doc = fitz.open("paper.pdf")
for page_num, page in enumerate(doc):
    for img_index, img in enumerate(page.get_images(full=True)):
        xref = img[0]
        pix = fitz.Pixmap(doc, xref)
        if pix.width < 100 or pix.height < 100:
            continue                      # 滤掉装饰性小图/图标
        pix.save(f"figures/p{page_num}_{img_index}.png")
```

这条路线的坑：矢量图（科研论文里的曲线图大多是矢量绘制的）**不是嵌入位图**，提取不出来；表格本质是文字排版，更不是图片。

**路线 2：版面检测模型。** 用目标检测的思路把页面当图片分析，检测"图/表/公式/正文"区域。LayoutParser + PubLayNet 预训练模型是这个方向的标准工具：

```python
import layoutparser as lp
import cv2

model = lp.Detectron2LayoutModel(
    "lp://PubLayNet/faster_rcnn_R_50_FPN_3x/config",
    label_map={0: "Text", 1: "Title", 2: "List", 3: "Table", 4: "Figure"})

img = cv2.imread("page_render.png")      # PDF 页面渲染成图
layout = model.detect(img)
figures = [b for b in layout if b.type == "Figure" and b.score > 0.7]

for i, fig in enumerate(figures):
    crop = fig.pad(left=5, right=5).crop_image(img)   # 留边裁出
    cv2.imwrite(f"figures/detected_{i}.png", crop)
```

路线 2 的优势是**图、表、公式一视同仁**——不管它在 PDF 里怎么实现，渲染成页面图后都是像素。工程上两条路线常混用：嵌入图走路线 1（保真度高），矢量图和表格区域走路线 2。

## 图注配对：图的意义在图注里

一张孤立的架构图没有上下文信息，它的语义在"图 3：模型总体架构"这句图注里。GROBID 解析出的 TEI 里有 `figure` 元素含图注文本；版面检测给出的图区域有坐标。按**页面 + 垂直距离最近**的原则配对：

```python
def pair_figures_captions(detected_figs, grobid_figs):
    pairs = []
    for fig in detected_figs:
        candidates = [g for g in grobid_figs if g.page == fig.page]
        if candidates:
            nearest = min(candidates,
                          key=lambda g: abs(g.y - fig.y))
            pairs.append({"image": fig.path, "caption": nearest.caption})
    return pairs
```

配对必然有误差（多栏排版、跨页图），抽样检查配对准确率并记录——平台的"按图注搜图"功能质量上限就是这条配对的准确率。

## 图表粗分类：让检索可以按类型过滤

抽出来的图表做一个轻量分类：架构图 / 曲线图 / 表格 / 公式 / 其他。用[深度学习课程 05](/posts/deep-learning-05-transfer-learning-project/)的迁移学习范式，标注几百张图微调一个 ResNet18 就能做到可用水平。

这个分类的产品价值直接可见：用户搜"attention 架构图"时只返回架构图类；统计"某领域论文的表格密度"时表格类单独计数。分类器的训练数据从已配对的图注引导——图注含"architecture"的图大概率是架构图，这种**弱监督标注**省掉大量人工。

## 公式：识别是深水区，先做好边界

公式的完整识别（PDF → LaTeX）是独立的研究方向（pix2tex 等模型）。平台的务实策略：**定位与裁剪交给版面检测，LaTeX 识别作为可选增强**。默认只存公式区域的图片和位置，识别层后续按需接入。这个"先划清边界"的决定本身值得写进技术文档——明确不做什么和做什么同样重要。

## 数据落地：图表成为平台的一等公民

图表抽取结果按平台惯例落盘：

```json
{
  "figure_id": "fig:1706.03762:p2:f0",
  "paper_id": "arxiv:1706.03762",
  "page": 2, "type": "architecture",
  "caption": "Figure 1: The Transformer - model architecture.",
  "image_path": "figures/1706.03762_p2_f0.png",
  "extractor": "layoutparser+embed",
  "extracted_at": "2026-08-29T00:30:00"
}
```

保留 `extractor` 和坐标信息：解析方案升级后可以只重跑旧方案产出的记录，增量演进。

## 踩坑排查

| 症状 | 原因 | 处理 |
|---|---|---|
| 抽出的图里没有曲线图 | 矢量图不是嵌入位图 | 走版面检测路线 |
| 检测结果大量误检 | 置信度阈值太低 | score > 0.7 起步，抽样标定 |
| 图注配对错位 | 多栏布局垂直距离失效 | 加栏位置约束；人工抽验 |
| 表格被当成图 | 检测器类别混淆 | 后处理：区域文本密度高的改判 Table |
| 扫描版 PDF 全失败 | 无文本层，渲染分辨率低 | 标记走 OCR 支线 |
| 图片数量爆炸占盘 | 装饰图没滤掉 | 尺寸 + 长宽比过滤 |

## 作品集证据

本课产出：图表检测-抽取-配对-分类的完整流水线 + 配对准确率的抽验报告。平台的论文卡片从此有了"图"的维度。

## 练习

1. 用 PyMuPDF 提取 10 篇论文的嵌入图，统计被尺寸过滤掉的占比。
2. 用 LayoutParser 对 20 个渲染页面做版面检测，人工核对 Figure/Table 的检测准确率。
3. 实现图注配对并抽验 30 对，报告准确率与主要错误模式。
4. 用图注关键词做弱监督标注，训练一个图表粗分类器并报告混淆矩阵。

## 面试常问

**Q：科研 PDF 的图表抽取为什么难？**
实现异构：位图可直接提取，矢量图和表格需版面分析；语义分离：图的意义在图注里，要跨元素配对；格式多样：模板、单双栏、扫描版各有坑。所以是"检测+配对+分类"的流水线而非单一模型。

**Q：弱监督标注在本课怎么体现的？**
用图注文本的启发式规则（含 architecture → 架构图）自动生成带噪声的标签，省去全人工标注；后续可用人工小样本做验证集，量化弱标签的噪声率。

**Q：版面检测和 OCR 的区别？**
版面检测回答"页面哪块区域是什么类型"（检测框+类别），OCR 回答"图像区域里写了什么文字"。扫描版 PDF 两者都要：先版面检测找结构，再 OCR 各区域。原生数字 PDF 文字层直接可读，不需要 OCR。

---

下一课：[多模态科研内容理解 05：多模态融合——统一表示一篇论文](/posts/research-mm-05-multimodal-fusion/)。
