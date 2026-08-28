---
title: "人脸识别实战：从 Haar 检测到深度学习特征比对"
date: 2026-08-28T11:00:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "分清人脸检测与人脸识别两个概念，用 OpenCV 做检测、用深度学习模型提取人脸特征向量做比对，走通 检测 → 对齐 → 特征 → 比对 的完整链路。"
tags: ["人脸识别", "OpenCV", "计算机视觉", "深度学习"]
categories: ["AI课程", "计算机视觉"]
math: false
---

人脸识别是计算机视觉里最有"体感"的应用：手机解锁、门禁打卡、相册自动归类人物，都是它。但先纠正一个普遍的概念混淆——**人脸检测**和**人脸识别**是两件事：

- **检测（Detection）**：图里有没有人脸？在哪？（画框）
- **识别（Recognition）**：这张人脸是谁？（比对身份）

检测是识别的前置步骤。完整的识别系统是一条流水线：**检测 → 对齐 → 特征提取 → 特征比对**。这篇把这条链路走通。

> 前置阅读：[OpenCV 图像轮廓处理与几何特征提取](/posts/opencv-contour-feature-extraction/)（OpenCV 基础）、[深度学习课程 04：CNN 图像分类](/posts/deep-learning-04-cnn-image-classification/)（CNN 基础）。OpenCV 系列其他文章见 [OpenCV 实战项目](/posts/opencv-practical-projects/)。

## 第一步：人脸检测

### 传统方案：Haar 级联

OpenCV 自带的 Haar 检测器是 2001 年的经典算法，优点是零依赖、CPU 毫秒级、不用训练：

```python
import cv2

face_cascade = cv2.CascadeClassifier(
    cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
)

img = cv2.imread("group_photo.jpg")
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

faces = face_cascade.detectMultiScale(
    gray, scaleFactor=1.1, minNeighbors=5, minSize=(60, 60)
)

for (x, y, w, h) in faces:
    cv2.rectangle(img, (x, y), (x + w, y + h), (0, 255, 0), 2)

cv2.imwrite("detected.jpg", img)
print(f"检测到 {len(faces)} 张人脸")
```

两个参数值得理解：`scaleFactor` 控制图像金字塔的缩放步长（1.1 表示每次缩小 10%），越小检测越细但越慢；`minNeighbors` 是"候选框要重叠多少次才算数"，调大减少误检、调小减少漏检。

Haar 的局限也很明显：**侧脸、遮挡、大角度、暗光下表现差**，只适合正脸近景的教学演示。

### 现代方案：深度学习检测器

实际项目建议直接上 RetinaFace 或 YuNet（OpenCV 4.5+ 内置）：

```python
# OpenCV 内置 YuNet，ONNX 模型文件需单独下载
detector = cv2.FaceDetectorYN.create("face_detection_yunet_2023mar.onnx", "",
                                     (320, 320), score_threshold=0.9)
h, w = img.shape[:2]
detector.setInputSize((w, h))
_, faces = detector.detect(img)
```

YuNet 不仅画框，还返回 5 个关键点（双眼、鼻尖、双嘴角）——这正是下一步"对齐"需要的输入。

## 第二步：人脸对齐

同一个人，正脸照和侧头照在人眼看来是一个人，但对模型来说像素差异巨大。对齐就是根据关键点把人脸**旋转、缩放到标准姿态**（比如双眼水平、固定在图像固定位置），消除姿态差异，让后续模型只关注"长相"本身：

```python
import numpy as np

def align_face(img, left_eye, right_eye, output_size=(112, 112)):
    # 根据双眼连线计算旋转角度
    dx, dy = right_eye[0] - left_eye[0], right_eye[1] - left_eye[1]
    angle = np.degrees(np.arctan2(dy, dx))

    # 以双眼中心为原点旋转
    center = tuple(((np.array(left_eye) + np.array(right_eye)) / 2).astype(int))
    M = cv2.getRotationMatrix2D(center, angle, scale=1.0)
    aligned = cv2.warpAffine(img, M, output_size)
    return aligned
```

对齐是工程上性价比极高的一步：同样的识别模型，加上对齐后准确率明显提升。

## 第三步：特征提取——人脸变成 512 维向量

核心思想：用一个预训练的深度模型（FaceNet、ArcFace 等）把对齐后的人脸图像压缩成一个**特征向量（Embedding）**。训练这类模型时用了特殊的损失函数（三元组损失、ArcFace 的加性角度间隔），使得：

> **同一个人的照片，向量距离近；不同人的照片，向量距离远。**

```python
import onnxruntime as ort

# ArcFace ONNX 模型，输入 112x112 对齐人脸，输出 512 维向量
session = ort.InferenceSession("arcface_r100.onnx")

def get_embedding(aligned_face):
    blob = cv2.dnn.blobFromImage(aligned_face, 1.0 / 127.5, (112, 112),
                                 (127.5, 127.5, 127.5), swapRB=True)
    emb = session.run(None, {session.get_inputs()[0].name: blob})[0][0]
    return emb / np.linalg.norm(emb)   # L2 归一化，方便算余弦相似度
```

归一化后，两个人脸向量之间的**余弦相似度**就是它们的"相似分数"。

## 第四步：比对——"这是谁"变成一道查表题

识别阶段就简单了：把库里所有人脸的特征向量预存好，新人脸来了算一遍相似度，找最像的：

```python
def identify(face_emb, database, threshold=0.4):
    best_name, best_score = "未知", -1
    for name, emb in database.items():
        score = float(np.dot(face_emb, emb))   # 归一化后点积=余弦相似度
        if score > best_score:
            best_name, best_score = name, score
    return best_name if best_score >= threshold else "未知", best_score
```

**阈值是识别系统的总开关**：设高了，真人识别不出（拒真率高）；设低了，陌生人被认错（认假率高）。门禁宁可拒真不可认假（0.5+），相册归类宁可认错不可漏（0.3 左右）。这个值必须用你自己的数据实测标定，别抄别人的。

人脸库大了之后，逐个比对会慢，这时该上向量索引（Faiss / Milvus），毫秒级从百万库里找最近邻——思路和 [Milvus + Neo4j 构建 RAG 实战](/posts/milvus-neo4j-rag/) 里的语义检索完全一样。

## 完整的最小系统

把四步串起来，一个"录入 + 识别"的小系统：

```python
def enroll(img_path, name, database):
    """录入：检测 → 对齐 → 提特征 → 存库"""
    img = cv2.imread(img_path)
    faces = detect_and_align(img)           # YuNet 检测 + 对齐
    if len(faces) != 1:
        raise ValueError(f"录入照必须恰好一张正脸，检测到 {len(faces)} 张")
    database[name] = get_embedding(faces[0])

def recognize(img_path, database):
    """识别：同样流水线，然后比对"""
    img = cv2.imread(img_path)
    for face in detect_and_align(img):
        emb = get_embedding(face)
        yield identify(emb, database)
```

加上摄像头实时读取（`cv2.VideoCapture`）就是实时门禁的雏形。活体检测（防照片/视频欺骗）是另一个大话题，商用场景必须加，教学场景先放。

## 踩坑排查清单

| 症状 | 原因 | 处理 |
|---|---|---|
| Haar 一张脸都检测不到 | 图像太小/侧脸/光线暗 | 调 minSize/scaleFactor；换 YuNet |
| 同一个人两次识别分数差很多 | 没做对齐或光照差异大 | 检查对齐步骤；录入多角度照片取均值向量 |
| 陌生人全被认成某人 | 阈值太低 | 用真实数据标定阈值，画 ROC 曲线选工作点 |
| 真人经常识别失败 | 阈值太高 / 录入照质量差 | 录录入规范（正脸、均匀光照、无遮挡） |
| 识别速度慢 | 逐库暴力比对 | Faiss/Milvus 建索引 |
| ONNX 模型加载报错 | 输入尺寸/通道顺序不对 | 检查 blobFromImage 的 swapRB 和归一化参数 |
| 戴墨镜/口罩全失效 | 训练数据里这类样本少 | 换支持遮挡的模型，或要求配合摘口罩 |

## 伦理与合规提醒

人脸是敏感生物特征信息。国内《个人信息保护法》把人脸信息列为敏感个人信息，采集使用需要**单独同意**，公共场所无差别采集、售楼部人脸识别这类玩法已经被监管明确处罚过。技术学习没问题，做成产品前务必想清楚数据来源的合法性。此外模型在不同人种的准确率差异（算法偏见）也是严肃的工程问题，商用系统要做分人群的精度测试。

## 练习

1. 用 Haar 检测器处理一张多人合影，调整 `minNeighbors` 从 3 到 8，观察误检/漏检变化。
2. 录入 3 个人各 3 张照片（正脸、微侧、微笑），对比"只存正脸向量"和"存三个向量取均值"两种录入策略的识别准确率。
3. 在 50 对人脸对上计算相似度分数分布（25 对同人、25 对不同人），画出两组分布，据此选阈值并估算拒真率/认假率。
4. 给识别系统加一个"未登记人脸自动聚类"功能：未知人脸的向量存起来，用 [K-Means](/posts/ml-kmeans-clustering/) 聚类，看看能不能把同一个人的多次出现聚到一团。

## 面试常问

**Q：人脸识别的完整流程是什么？**
检测（找到人脸框和关键点）→ 对齐（按关键点摆正到标准姿态）→ 特征提取（深度模型输出 Embedding）→ 比对（与库内向量算相似度，过阈值定身份）。追问活体检测就补：在检测后加防攻击环节（红外、动作配合、纹理分析）。

**Q：为什么用余弦相似度而不是欧氏距离？**
特征向量经 L2 归一化后，余弦相似度（点积）只反映方向差异，不受向量模长影响；人脸特征的判别信息主要在方向上。且归一化后余弦相似度和欧氏距离单调相关，但余弦计算更直接、阈值含义更直观。

**Q： threshold 怎么定？**
用验证集画 ROC 曲线：扫描所有候选阈值，统计拒真率（FRR）和认假率（FAR），按业务代价选工作点。安防类 FAR 优先压到万分之一以下，体验类（相册归类）可以适当放松 FRR。

**Q：一个人登记多张照片，特征怎么存？**
常见做法：存每张照片的向量、识别时取最大相似度；或求平均向量（要先 L2 归一化再平均再归一化）。前者对姿态多样性好，后者省存储省计算。

**Q：百万级人脸库怎么做实时比对？**
暴力比对不可行，用向量索引：Faiss（本地、IVF/HNSW 索引）或 Milvus（分布式服务化）。思路是把"最近邻搜索"从 O(N) 降到近似 O(log N)，精度和速度通过索引参数权衡。

---

视觉和听觉的单点技术都过了一遍，下一篇聊数据规模大起来之后的管理问题：[大数据管理：从单机 DuckDB 到分布式思维](/posts/big-data-management/)。
