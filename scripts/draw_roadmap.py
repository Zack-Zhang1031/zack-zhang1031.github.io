# -*- coding: utf-8 -*-
"""绘制 AI 学习路线图：四阶段 + 三方向依赖图"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(sys.executable).parent.parent.parent))
from daimon_runtime import setup_plot
setup_plot()

import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

fig, ax = plt.subplots(figsize=(16, 9), dpi=150)
ax.set_xlim(0, 16)
ax.set_ylim(0, 9)
ax.axis("off")
fig.patch.set_facecolor("#fafaf7")
ax.set_facecolor("#fafaf7")

# 配色（低饱和、分阶段）
C = {
    "s1": "#dbeafe", "s1e": "#3b82f6",   # 阶段一 蓝
    "s2": "#dcfce7", "s2e": "#22c55e",   # 阶段二 绿
    "s3": "#fef3c7", "s3e": "#f59e0b",   # 阶段三 橙
    "s4": "#fee2e2", "s4e": "#ef4444",   # 阶段四 红
    "tr": "#ede9fe", "tre": "#8b5cf6",   # 方向 紫
    "en": "#cffafe", "ene": "#0891b2",   # 工程 青
    "ca": "#fce7f3", "cae": "#db2777",   # 职业 粉
    "re": "#f1f5f9", "ree": "#64748b",   # 研究 灰
}

def box(x, y, w, h, text, fc, ec, fs=13, bold=False, sub=None, subfs=9.5):
    p = FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.08,rounding_size=0.12",
                       facecolor=fc, edgecolor=ec, linewidth=1.8, zorder=3)
    ax.add_patch(p)
    weight = "bold" if bold else "normal"
    if sub:
        ax.text(x + w/2, y + h/2 + 0.18, text, ha="center", va="center",
                fontsize=fs, fontweight=weight, color="#1f2937", zorder=4)
        ax.text(x + w/2, y + h/2 - 0.28, sub, ha="center", va="center",
                fontsize=subfs, color="#4b5563", zorder=4)
    else:
        ax.text(x + w/2, y + h/2, text, ha="center", va="center",
                fontsize=fs, fontweight=weight, color="#1f2937", zorder=4)

def arrow(x1, y1, x2, y2, color="#9ca3af", style="-|>", lw=2.0, rad=0.0):
    a = FancyArrowPatch((x1, y1), (x2, y2), arrowstyle=style, mutation_scale=18,
                        color=color, linewidth=lw, zorder=2,
                        connectionstyle=f"arc3,rad={rad}")
    ax.add_patch(a)

ax.text(8, 8.55, "AI 学习路线图 · 模块依赖总览", ha="center", fontsize=22,
        fontweight="bold", color="#111827")
ax.text(8, 8.12, "实线 = 强依赖（建议先学） ｜ 四阶段为主线，方向模块任选其一深入",
        ha="center", fontsize=11, color="#6b7280")

# 主链四阶段
box(0.4, 4.6, 2.4, 1.3, "阶段一\n编程基础", C["s1"], C["s1e"], 14, True, "Linux · Python · Git", 9)
box(3.6, 4.6, 2.4, 1.3, "阶段二\n数据处理", C["s2"], C["s2e"], 14, True, "NumPy · Pandas · 大数据", 9)
box(6.8, 4.6, 2.4, 1.3, "阶段三\n机器学习", C["s3"], C["s3e"], 14, True, "sklearn · 特征 · 评估", 9)
box(10.0, 4.6, 2.4, 1.3, "阶段四\n深度学习", C["s4"], C["s4e"], 14, True, "PyTorch · 训练 · 调优", 9)

arrow(2.9, 5.25, 3.55, 5.25)
arrow(6.1, 5.25, 6.75, 5.25)
arrow(9.3, 5.25, 9.95, 5.25)

# 三大方向（从阶段四分叉）
box(12.9, 6.6, 2.7, 1.2, "方向 A · 计算机视觉", C["tr"], C["tre"], 12.5, True, "OpenCV · YOLO · SAM", 9)
box(12.9, 4.9, 2.7, 1.2, "方向 B · NLP 与大模型", C["tr"], C["tre"], 12.5, True, "BERT · LLM · RAG", 9)
box(12.9, 3.2, 2.7, 1.2, "方向 C · 语音", C["tr"], C["tre"], 12.5, True, "ASR · TTS · 声纹", 9)

arrow(12.45, 5.4, 12.85, 7.0, rad=-0.25)
arrow(12.45, 5.25, 12.85, 5.5, rad=-0.08)
arrow(12.45, 5.1, 12.85, 4.0, rad=0.25)

# 工程化与部署（汇聚）
box(10.0, 1.2, 2.4, 1.2, "工程化与部署", C["en"], C["ene"], 13, True, "FastAPI · 压缩 · 监控", 9)
arrow(14.2, 3.15, 12.0, 2.45, rad=-0.2)
arrow(11.2, 4.55, 11.2, 2.5, rad=0.0)

# 项目实战与职业
box(13.0, 1.2, 2.6, 1.2, "项目实战与职业", C["ca"], C["cae"], 13, True, "综合项目 · 简历 · 面试", 9)
arrow(12.45, 1.8, 12.95, 1.8)

# 研究系列（旁支）
box(6.8, 1.2, 2.4, 1.2, "研究系列项目", C["re"], C["ree"], 13, True, "数据 · ML · 多模态", 9)
arrow(8.0, 4.55, 8.0, 2.5, color="#94a3b8")
arrow(9.25, 1.8, 9.95, 1.8, color="#94a3b8")

# 周数标注
ax.text(1.6, 4.35, "1~4 周", ha="center", fontsize=10, color="#3b82f6", fontweight="bold")
ax.text(4.8, 4.35, "5~8 周", ha="center", fontsize=10, color="#16a34a", fontweight="bold")
ax.text(8.0, 4.35, "9~14 周", ha="center", fontsize=10, color="#d97706", fontweight="bold")
ax.text(11.2, 4.35, "15~20 周", ha="center", fontsize=10, color="#dc2626", fontweight="bold")
ax.text(14.25, 7.95, "任选其一深入", ha="center", fontsize=10, color="#7c3aed", fontweight="bold")

out = Path("public/images/ai-learning-roadmap.png")
fig.savefig(out, bbox_inches="tight", facecolor=fig.get_facecolor())
print("saved:", out, out.stat().st_size, "bytes")
