---
title: "AI 科研工程基础 04：Python 项目工程化——结构、配置与测试"
date: 2026-08-28T15:00:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "AI 科研内容课程系列一第 4 课：把科研代码从脚本的档次提升到工程的档次——src 布局、分层配置、ruff 检查、pytest 测试与 pre-commit 质量门。"
tags: ["Python", "工程化", "pytest", "pre-commit", "项目结构"]
categories: ["AI课程", "科研工程"]
math: false
---

系列一的收官课。前面三课解决了环境、版本控制和实验探索，这一课解决最后一个问题：**让代码达到"别人（和三个月后的你）敢接手"的工程标准**。工程化不是过度设计——它的每一个动作都在为"可复现"和"可演进"这两个科研刚需服务。

> 前置阅读：系列一[第 1-3 课](/posts/ai-research-eng-03-jupyter-reproducible/)。Python 语法基础见 [Python 编程从入门到精通全指南](/posts/python-guide-from-beginner-to-advanced/)。

## src 布局：让导入行为可预测

第 1 课给了目录骨架，这一课把 `src/` 布局的关键细节补上：

```
research-hub/
├── src/
│   └── research_hub/
│       ├── __init__.py
│       ├── ingest/
│       │   ├── __init__.py
│       │   ├── arxiv.py
│       │   └── openalex.py
│       ├── analysis/
│       │   ├── __init__.py
│       │   └── fields.py
│       └── config.py
├── tests/
│   └── test_fields.py
└── pyproject.toml
```

用 `pip install -e .`（可编辑安装）把包装进 venv，之后任何位置都能 `from research_hub.ingest import openalex`，不再依赖"碰巧在哪个目录运行脚本"。`pyproject.toml` 的最小配置：

```toml
[project]
name = "research-hub"
version = "0.1.0"
requires-python = ">=3.12"

[build-system]
requires = ["setuptools>=68"]
build-backend = "setuptools.build_meta"

[tool.setuptools.packages.find]
where = ["src"]
```

这个布局的好处：测试、服务、notebook 都以同一种方式引用包，消除了"本地能跑、CI 挂掉"的一类经典问题。

## 配置分层：代码里不出现任何环境相关的硬编码

科研代码的典型腐化路径：路径、API 地址、密钥散落在脚本各处，换台机器全部要改。配置分三层：

```python
# src/research_hub/config.py
from pathlib import Path
import os
from dataclasses import dataclass

@dataclass(frozen=True)
class Settings:
    data_dir: Path = Path(os.getenv("RH_DATA_DIR", "data"))
    openalex_base: str = "https://api.openalex.org"
    openalex_email: str = os.getenv("OPENALEX_EMAIL", "")   # 礼貌池标识
    request_timeout: int = 10
    seed: int = 42

settings = Settings()
```

规则只有三条：

- **默认值进代码**（开发友好），**覆盖走环境变量**（部署灵活），**密钥只走环境变量**（永不入库）。
- 配置集中在一个模块，全项目 `from research_hub.config import settings` 取用——改一处，全局生效。
- 配置对象 `frozen=True`，防止运行中被某个函数偷偷改掉。

## 测试：科研代码需要什么样的测试

科研代码不需要追求覆盖率数字，需要追求**关键假设被守住**。按价值排序，三类测试必写：

**1. 数据契约测试（最重要）。** 解析外部数据的函数，用一小段真实样本守住解析逻辑：

```python
# tests/test_openalex.py
SAMPLE_WORK = {
    "id": "https://openalex.org/W123",
    "title": "Attention Is All You Need",
    "publication_year": 2017,
    "authorships": [{"author": {"display_name": "Ashish Vaswani"}}],
    "cited_by_count": 100000,
}

def test_parse_work_extracts_core_fields():
    from research_hub.ingest.openalex import parse_work
    paper = parse_work(SAMPLE_WORK)
    assert paper.title == "Attention Is All You Need"
    assert paper.year == 2017
    assert paper.authors == ["Ashish Vaswani"]
```

外部 API 的字段会悄悄变化，契约测试是这类变化的第一道警报。

**2. 边界与脏数据测试。** 缺失字段、空列表、年份为 None——这些数据必然出现，测试替你把"必然"变成"已知行为"：

```python
def test_parse_work_handles_missing_year():
    paper = parse_work({"id": "W1", "title": "t", "publication_year": None,
                        "authorships": [], "cited_by_count": 0})
    assert paper.year is None
```

**3. 管道冒烟测试。** 端到端跑一遍小数据集，断言产出非空且形状正确。它不证明逻辑对，但能拦住"重构后管道彻底断了"。

## 质量门：ruff + pre-commit

人工记住所有规范不现实，让工具在提交前自动拦：

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.6.0
    hooks:
      - id: ruff        # 检查：未使用的导入、命名、复杂度
      - id: ruff-format # 格式化
  - repo: https://github.com/nbQA-dev/nbQA
    rev: 1.8.7
    hooks:
      - id: nbqa-ruff   # notebook 里的代码同样检查
        args: [--extend-ignore=E402]
```

```bash
pip install pre-commit && pre-commit install
# 之后每次 git commit 自动跑检查，不过就提交不了
```

ruff 一个工具覆盖了过去 flake8 + black + isort 三个的事，速度快且规则统一。质量门的价值不是代码好看，而是**把风格争议从 code review 里消灭**——评审只讨论逻辑，格式交给机器。

## 把一课串起来：本系列的工程闭环

至此系列一的四课形成一个闭环：[环境](/posts/ai-research-eng-01-dev-environment/) 保证"在哪都能跑"，[Git](/posts/ai-research-eng-02-git-version-control/) 保证"历史可追溯"，[Jupyter 工作流](/posts/ai-research-eng-03-jupyter-reproducible/) 保证"实验可复现"，本课保证"代码可演进"。后面所有系列的数据、模型、服务代码，都建立在这个骨架上。

## 踩坑排查

| 症状 | 原因 | 处理 |
|---|---|---|
| `import research_hub` 找不到 | 没做可编辑安装 | `pip install -e .` |
| pre-commit 在 CI 和本地行为不同 | hook 版本没锁 | rev 固定具体版本号 |
| 测试在 CI 挂本地过 | 测试依赖了本地数据文件 | 测试数据随库走（小样本）或生成于 fixture |
| 配置改了但没生效 | 多处各自读环境变量 | 统一走 settings 单一入口 |
| ruff 报一堆历史遗留 | 老代码没格式化 | 一次性 `ruff format` 全库后单独提交 |

## 作品集证据

本课产出：`pip install -e .` 可安装的 src 布局包、单一入口的配置模块、覆盖数据契约的 pytest 套件、pre-commit 质量门。面试时一句"我的项目克隆下来 `pip install -e . && pytest` 就能跑"，胜过十句"我注重代码质量"。

## 练习

1. 把案例项目改造成 src 布局并完成 `pip install -e .`，验证 notebook、脚本、测试三处 import 路径一致。
2. 为上一课重构出的分析函数补一个数据契约测试和一个脏数据测试。
3. 接入 pre-commit（ruff + nbqa），故意提交一段不规范代码，观察拦截过程。
4. 审查项目里所有硬编码路径/密钥，收编进 config 模块。

## 面试常问

**Q：src 布局和平铺布局有什么区别？**
src 布局强制通过安装后的包导入，测试和脚本面对的是"安装态"的代码，能提前暴露打包问题；平铺布局的 import 依赖运行目录，容易出现"本地碰巧能跑"的隐性依赖。正经项目一律 src 布局。

**Q：科研代码的测试策略和业务代码有什么不同？**
业务代码追求覆盖分支逻辑；科研代码优先守数据契约（外部数据解析）、边界行为（脏数据）和管道连通性（冒烟）。前者防逻辑错，后者防"数据变了但代码不知道"。

**Q：配置管理的反模式有哪些？**
硬编码在代码里、散落多处各自读环境变量、密钥入库、配置可被运行时修改。对应的解法是单一配置模块、默认值+环境变量覆盖、密钥只走环境变量、配置对象不可变。

**Q：pre-commit 解决了什么问题？**
把风格与基础质量检查从人工 review 前移到提交时刻，机器拦截格式问题，人专注逻辑评审；hook 版本锁定保证本地和 CI 行为一致。

---

系列一完结。下一课进入数据世界：[科研数据获取与分析 01：arXiv、OpenAlex 与 Crossref API 实战](/posts/research-data-01-open-metadata-apis/)。
