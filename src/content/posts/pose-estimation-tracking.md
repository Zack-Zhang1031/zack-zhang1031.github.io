---
title: "姿态估计与多目标跟踪：视频里「人在动」怎么算——从 MediaPipe 到 DeepSORT"
date: 2026-08-30T14:20:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "人体姿态估计的两种范式、MediaPipe/RTMPose 实战、多目标跟踪的检测-匹配框架、DeepSORT 的 ReID 与卡尔曼滤波，以及行为识别应用。"
tags: ["姿态估计", "多目标跟踪", "DeepSORT", "MediaPipe", "计算机视觉"]
categories: ["AI课程", "计算机视觉"]
math: false
---

「数清楚视频里有几个人、各自在做什么动作」——健身 APP 要数深蹲、工厂要抓违规操作、商场要算客流动线。这类需求拆开是两个技术的组合：**姿态估计**（一帧里人的关节在哪）和**多目标跟踪**（跨帧的同一个人是同一个人）。这篇把这对组合拳一次讲透。

**前置阅读**：建议先读 [目标检测 YOLO](/posts/object-detection-yolo/)、[视频理解入门](/posts/video-understanding-basics/)、[OpenCV 基础](/posts/opencv-image-interpolation-mask-roi-watermark-grayscale-tutorial/)。

## 姿态估计：从 heatmap 到实时端侧

人体姿态估计 = 定位人体关键点（鼻、肩、肘、腕、髋、膝、踝等 17~33 个点）。两种范式：

**Top-down**：先检测人（YOLO 出框）→ 框内单人姿态估计。精度高、人越多越慢——每个框都要过一次姿态网络。
**Bottom-up**：先检测全图所有关键点 → 再把点「组装」成各个人。OpenPose 的 PAF（部位亲和场）是经典——速度与人数无关，人群遮挡时组装容易错。

实战选型 2026 年版：**MediaPipe Pose（33 点，端侧实时，手机能跑 30fps）** 和 **RTMPose（精度标杆，服务器端）**。

```python
import mediapipe as mp
import cv2

mp_pose = mp.solutions.pose
with mp_pose.Pose(min_detection_confidence=0.5,
                  min_tracking_confidence=0.5) as pose:
    results = pose.process(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
    if results.pose_landmarks:
        # 33 个关键点的归一化坐标 (x, y, z, visibility)
        knee = results.pose_landmarks.landmark[mp_pose.PoseLandmark.LEFT_KNEE]
        print(f"左膝: x={knee.x:.2f}, y={knee.y:.2f}, 可见度={knee.visibility:.2f}")
```

关键点的 `visibility` 字段别忽略：遮挡点（visibility < 0.5）的坐标不可信——做动作判断时先过滤低可见度点，否则深蹲计数会被抖动带飞。

### 应用层的核心：从关键点到动作判断

关键点只是坐标，变成「深蹲了一次」需要规则或模型。规则法（角度计算）简单可靠，覆盖 80% 健身场景：

```python
import numpy as np

def angle(a, b, c):
    """三点夹角（b 为顶点），如 髋-膝-踝 的膝角"""
    ba, bc = np.array(a) - np.array(b), np.array(c) - np.array(b)
    cos = ba @ bc / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-6)
    return np.degrees(np.arccos(np.clip(cos, -1, 1)))

# 深蹲判定：膝角 < 90° 记为下蹲，回直（>160°）记一次
if knee_angle < 90 and state == "standing":
    state = "squatting"
elif knee_angle > 160 and state == "squatting":
    count += 1
    state = "standing"
```

复杂动作（瑜伽流派、违规操作识别）规则写不动时，上时序模型：关键点序列（T×33×3）喂 ST-GCN（骨骼图卷积）或小 Transformer——骨骼数据量比 RGB 小几百倍，训练成本低且天然抗外观干扰。

## 多目标跟踪（MOT）：检测之外的另一半

检测器逐帧独立工作——第 1 帧的「人A」和第 2 帧的「人B」是不是同一个人？检测不知道。跟踪就是给每个人分配**跨帧稳定的 ID**。主流框架「检测 + 匹配」（tracking-by-detection）：

**DeepSORT 三件套**：

1. **检测**：YOLO 每帧出框。
2. **运动预测**：卡尔曼滤波——用历史轨迹预测下一帧框的位置（匀速模型），遮挡帧也能外推。
3. **匹配**：匈牙利算法做框分配，代价 = 马氏距离（位置像不像）+ 余弦距离（ReID 外观像不像）双特征。

```python
from deep_sort_realtime.deepsort_tracker import DeepSort

tracker = DeepSort(max_age=30,        # 丢失 30 帧内保持 ID
                   n_init=3,          # 连续 3 帧命中才确认新目标
                   max_cosine_distance=0.4)
# 每帧：dets = [( [x1,y1,w,h], conf, class ), ...]
tracks = tracker.update_tracks(dets, frame=frame)
for t in tracks:
    if t.is_confirmed():
        print(f"ID {t.track_id}: {t.to_ltrb()}")
```

三个关键参数的实际含义：`max_age` 是「人被挡住多久还算同一个人」——出入口场景调大（30~90），防 ID 切换；`n_init` 防误检生成幽灵 ID；`max_cosine_distance` 是 ReID 外观匹配的严格度，相似着装场景（工服）要收紧。

## 组合实战：客流统计 + 行为分析

完整管道长这样：

```
视频帧 → YOLO 检测人 → DeepSORT 分配 ID → MediaPipe 姿态（仅对跟踪框内）
   → 轨迹分析（跨线计数、停留时长）/ 动作判断（跌倒、违规）
```

两个应用级技巧：

- **跨线计数**：在画面画一条虚拟线，跟踪轨迹与线段的交点 + 方向判断——进店/出店分开计。比「数人头」准确得多（避免了重复计数）。
- **跌倒检测**：姿态 + 跟踪的组合特征——人体 bbox 宽高比突变（竖变横）+ 髋部中心 y 坐标快速下降 + 之后静止——规则三连比直接训「跌倒分类器」好收集数据得多。

## 性能与部署

- MediaPipe Pose：CPU 可跑（BlazePose 架构，移动端优化），GPU 上 RTX 4060 单路 60fps+。
- DeepSORT 的瓶颈在 ReID 特征提取（每人每框一次前向）——人数多时批处理 ReID，或换 ByteTrack（不用 ReID、纯运动匹配，更快但遮挡后易换 ID）。
- 多路视频：解码是 CPU 瓶颈（参考 [视频理解篇](/posts/video-understanding-basics/)的抽帧策略），推理用 batch 聚合多路帧。

## 踩坑排查

| 现象 | 原因 | 解法 |
|------|------|------|
| ID 频繁切换 | ReID 阈值太松/遮挡后 max_age 太短 | 收紧 cosine 阈值；max_age 加大 |
| 关键点抖动剧烈 | 逐帧独立检测无时序平滑 | 卡尔曼/EMA 平滑关键点轨迹 |
| 遮挡后计数翻倍 | 同一人被发新 ID | max_age > 遮挡时长；出入口用跨线计数 |
| 深蹲计数偏多 | 低可见度关键点的角度噪声 | visibility 过滤 + 状态机滞回 |
| 人多时帧率暴跌 | top-down 姿态逐人推理 | 限制最大人数/batch 推理/换 bottom-up |

## 练习

1. 用 MediaPipe 实现深蹲计数器：膝角状态机 + visibility 过滤，对着健身视频验证计数准确性。
2. 用 YOLOv8 + DeepSORT 跑一段街道视频，输出每人的轨迹，画出轨迹图——观察 ID 切换发生在什么时刻。
3. 实现跨线双向计数：虚拟线 + 轨迹交点方向判断，对比人工数的结果。
4. 把 30 帧的关键点序列（33×3）拼成向量，训练一个简单的 LSTM 分类「走/跑/站」，体会骨骼时序建模。

## 面试常问

**Q：Top-down 和 Bottom-up 的取舍？**
Top-down（检测→单人姿态）：精度高、人数线性放大成本、框的质量影响姿态；Bottom-up（全图关键点→组装）：速度恒定、遮挡/密集人群组装易错。实践：稀疏人群精度优先 top-down（RTMPose），密集人群/实时优先 bottom-up（OpenPose/MoveNet）。现代方案（如 RTMO）在向「单阶段」融合演进。

**Q：DeepSORT 里卡尔曼滤波和 ReID 各解决什么？**
卡尔曼解决「运动连续性」——预测下一帧位置，处理短时遮挡和检测噪声；ReID 解决「外观一致性」——运动预测失效时（交叉、长遮挡）靠外观特征把人对回去。双特征加权匹配：位置接近但外观不像（两人交叉）靠 ReID 区分；外观像但位置远（同款衣服不同人）靠运动约束排除。

**Q：ByteTrack 相比 DeepSORT 的改进？**
抛弃 ReID，核心创新是**低分框的二次匹配**：DeepSORT 只用高置信度框，ByteTrack 先用高分框匹配，再用低分框（遮挡导致的低置信度检测）匹配剩余轨迹——遮挡期不断 ID，速度快一个量级（无 ReID 前向）。代价：纯运动匹配在长遮挡/交叉后不如 ReID 稳。工程选择：算力紧选 ByteTrack，遮挡严重选 DeepSORT/BoT-SORT。

**Q：骨骼行为识别相比 RGB 视频行为识别的优劣？**
骨骼：数据量小（坐标 vs 像素）、抗外观干扰（衣着/光照/背景不影响）、隐私友好（不存人脸画面）、算力省；RGB：信息全（物体交互、环境上下文骨骼没有——「拿刀」的动作骨骼只看得到姿势）。骨骼适合「动作模式清晰」的场景（健身/跌倒/手势），涉及物体交互的场景还得 RGB 或两路融合。

**Q：关键点检测的评估指标？**
PCK（预测点落在真值点指定比例距离内的比例）、OKS（类似 IoU 的关键点相似度，COCO 官方）、mAP@OKS。业务侧更常用端到端指标：深蹲计数准确率、跌倒召回率/误报率——**应用指标和学术指标都要看，前者决定产品成败**。

## 相关阅读

- [目标检测实战：YOLO](/posts/object-detection-yolo/)——检测是跟踪和姿态的地基
- [视频理解入门](/posts/video-understanding-basics/)——视频管道的通用工程
- [OpenCV 基础](/posts/opencv-image-interpolation-mask-roi-watermark-grayscale-tutorial/)——坐标变换与绘图工具
- [SAM 与开放词汇检测](/posts/sam-open-vocabulary-detection/)——检测侧的新武器
- [边缘 AI 部署](/posts/edge-ai-mobile-deployment/)——端侧姿态估计的落地

姿态估计和跟踪是 CV 里「最像产品」的技术——它们输出的是直接的业务答案（次数、轨迹、告警），不是中间特征。这也意味着：端到端指标的打磨（计数准确率、ID 稳定性）比刷榜重要一百倍。
