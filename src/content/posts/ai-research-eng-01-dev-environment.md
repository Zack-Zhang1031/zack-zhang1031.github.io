---
title: "AI 科研工程基础 01：开发环境与贯穿案例——AI 科研内容智能管理与分析平台"
date: 2026-08-28T13:00:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "AI 科研内容课程系列一第 1 课：搭建科研工程开发环境，介绍贯穿全部 27 课的案例平台——基于公开科研元数据的 AI 科研内容智能管理与分析平台。"
tags: ["AI科研", "开发环境", "Git", "课程系列"]
categories: ["AI课程", "科研工程"]
math: false
---

这是"AI 科研内容课程"的开篇。整个课程共 27 课、六个系列，围绕同一个案例展开：**AI 科研内容智能管理与分析平台**——一个基于 arXiv、OpenAlex、Crossref 等公开科研元数据，完成"采集 → 清洗 → 分析 → 分类 → 检索 → 服务化"全链路的系统。每一课既教一块可就业的知识，也为这个平台交付一个里程碑。

选择公开科研元数据作为案例数据源，有两个原因：数据合法合规、获取门槛低（官方 API 明确鼓励程序化访问）；同时它的结构足够真实——论文、作者、机构、引用关系，足够撑起从数据分析到机器学习的所有环节。

## 课程体系与里程碑地图

| 系列 | 课数 | 交付里程碑 |
|---|---|---|
| 一、AI 科研工程基础 | 4 | 可复现的开发环境与工程骨架 |
| 二、科研数据获取与分析 | 5 | M1：科研元数据数据集 |
| 三、经典机器学习（Scikit-learn） | 5 | M2：论文领域分类器 |
| 四、多模态科研内容理解 | 6 | M3：内容理解流水线 |
| 五、数据管理与 AI 自动化 | 4 | M4：数据服务与自动化流水线 |
| 六、综合项目与求职交付 | 3 | M5：可演示的平台应用与作品集叙事 |

六个系列可以独立阅读，但平台里程碑把它们串成一条线：你学到的每个技能，都在同一个可信的项目里留下证据。

## 本课任务：环境检查与工程骨架

> 前置阅读：[Linux + Python 环境基础](/posts/linux-python-environment-basics/)。虚拟环境、SSH、tmux 这些基础本篇不再重复。

### 1. 固定技术栈

全课程统一使用以下版本，建议现在就把它们装进一个专用虚拟环境：

```bash
python3.12 -m venv .venv && source .venv/bin/activate

pip install \
  pandas plotly pyarrow duckdb \
  scikit-learn jupyter \
  requests scrapy playwright \
  fastapi uvicorn streamlit \
  psycopg[binary] \
  prefect \
  pytest ruff pre-commit
```

 PyTorch 在[深度学习课程](/posts/deep-learning-01-training-loop/)里已经装过，系列四用到时再按那篇的方式安装对应 CUDA 版本即可。Spark 本课程只做规模对比讨论，不作为项目依赖。

### 2. 项目目录约定

整个案例平台在单一目录下演进（注意：本课程只交付文章内容，不要求你真的建仓库——但你自己跟练时建议按这个结构组织）：

```
research-hub/
├── .venv/                  # 不进 Git
├── data/
│   ├── raw/                # 采集落地，只读
│   ├── cleaned/            # 清洗后
│   └── features/           # 模型特征
├── notebooks/              # Jupyter 探索
├── src/
│   ├── ingest/             # 采集
│   ├── analysis/           # 分析
│   ├── models/             # 机器学习
│   └── service/            # FastAPI 服务
├── tests/
├── requirements.txt
└── README.md
```

 `data/` 三层（raw / cleaned / features）的纪律来自[大数据管理](/posts/big-data-management/)一篇：每一层之间用脚本转换、脚本进 Git，任何一份数据都能回答"从哪来的"。

### 3. Git 初始化与第一个提交

```bash
git init research-hub && cd research-hub

cat > .gitignore << 'EOF'
.venv/
__pycache__/
data/raw/
*.pyc
.ipynb_checkpoints/
EOF

git add . && git commit -m "chore: project skeleton"
```

注意 `.gitignore` 里把 `data/raw/` 排除了：原始数据集动辄几百 MB，不该进 Git。进 Git 的是**获取数据的脚本**——别人 clone 后跑一遍脚本就能复现数据，这才是科研工程的正确姿势。

### 4. 环境自检脚本

沿用环境篇的思路，给这个项目写一个专用的 `check_env.py`：

```python
import importlib
import sys

REQUIRED = ["pandas", "duckdb", "sklearn", "fastapi", "streamlit", "prefect"]

print(f"Python: {sys.version}")
for pkg in REQUIRED:
    try:
        m = importlib.import_module(pkg)
        print(f"  ✓ {pkg} {getattr(m, '__version__', '?')}")
    except ImportError:
        print(f"  ✗ {pkg} 未安装")
```

每次换新机器、重装环境后跑一遍，十秒确认环境完整。

## 案例平台的数据模型（概念层）

先建立词汇表，后面每一课都会用到这些实体：

- **Paper**：标题、摘要、发表年份、venue（会议/期刊）、领域标签、引用数。
- **Author / Institution**：作者与其所属机构。
- **SourceRecord**：一条从 arXiv/OpenAlex/Crossref 采到的原始记录，记录采集时间和来源 API。
- **CollectionRun**：一次采集任务的元信息（时间、参数、采集量）。
- **ModelOutput**：模型对某篇论文的预测结果（领域分类、主题聚类）。
- **ReportVersion**：分析报告的快照版本。

这个模型只存在于文章描述中，课程不建真实数据库 schema——但到系列五，我们会用 PostgreSQL + pgvector 把其中核心部分落成真实表结构。

## 踩坑排查

| 症状 | 原因 | 处理 |
|---|---|---|
| 安装 psycopg 编译失败 | 用了源码版 | 用 `psycopg[binary]` 预编译包 |
| Jupyter 里 import 不到 venv 的包 | kernel 指向了别的 Python | `python -m ipykernel install --user --name research-hub` |
| git 提交把 data/raw 也提交了 | .gitignore 写晚了一步 | `git rm -r --cached data/raw` 后重提 |
| 课程示例代码版本报错 | 依赖版本漂移 | 以本文 pip 清单为准，必要时锁版本 |

## 练习

1. 按本文目录结构创建 `research-hub` 骨架，配好 venv 并完成第一次 Git 提交。
2. 写一个 `requirements.txt` 并用它在全新 venv 中复现环境，跑通 `check_env.py`。
3. 在 README 里用 200 字描述这个案例平台的目标和六个里程碑——这是系列六作品集叙事的初稿。

## 面试常问

**Q：为什么用公开科研元数据做教学案例？**
合法合规（官方 API 鼓励程序化访问）、获取零成本、结构真实（论文-作者-机构-引用是天然的关联数据），能覆盖数据采集、清洗、分析、建模、服务化的完整链路。

**Q：项目里 data 目录为什么要分层？**
raw 只读保留原始证据，cleaned 是清洗结果，features 是模型输入。分层让数据血缘清晰、转换可重放，任何中间层出问题只需要从上一层重跑。

**Q：为什么数据不进 Git 而脚本进？**
Git 是版本控制系统，不是存储系统；大二进制文件会让仓库膨胀到不可用。脚本进库 + 数据可复现，等于间接版本化了数据。

---

下一课：[AI 科研工程基础 02：Git 与 GitHub 的科研协作工作流](/posts/ai-research-eng-02-git-version-control/)。
