---
title: "多模态科研内容理解 06：理解流水线集成与 M3 里程碑验收"
date: 2026-08-29T01:40:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "AI 科研内容课程系列四第 6 课（收官/里程碑 M3）：把 PDF 解析、Embedding、图表抽取、融合策略组装成一条端到端理解流水线，完成验收与局限分析。"
tags: ["流水线", "系统集成", "里程碑", "端到端"]
categories: ["AI课程", "多模态理解"]
math: false
---

系列四收官。前五课各自做出了理解能力的零件：PDF 结构化、语义向量、深度分类、图表抽取、融合策略。这一课把它们组装成**一条从 PDF 到统一表示的端到端流水线**，完成 M3 里程碑验收。集成本身也是工程课——零件都能跑不等于系统能跑。

> 前置阅读：系列四全部前五课。管道设计思想参考 [AI 自动化](/posts/ai-automation-workflow/)（幂等、落盘、失败出口三原则）。

## 流水线架构：阶段、产物、契约

```
PDF 文件
  → S1 解析（GROBID）        产物：结构化 JSON（章节/参考文献）
  → S2 图表抽取（版面检测）   产物：图片文件 + 图注配对记录
  → S3 文本向量化            产物：多路 Embedding（标题摘要/图注）
  → S4 融合表示              产物：统一论文表示记录
  → S5 入库                  产物：features 层更新
```

每个阶段之间靠**落盘的产物文件 + 明确的 Schema** 通信，而不是函数调用。这就是[大数据管理](/posts/big-data-management/)分层思想和 [AI 自动化](/posts/ai-automation-workflow/)幂等原则的组合：任何阶段挂了，从它的输入产物重跑即可，不用从头再来。

各阶段间的契约示例（S1 → S2/S3 的输入约定）：

```python
# 每个阶段输入输出都是 paper_id 键控的记录
{
  "paper_id": "arxiv:1706.03762",
  "stage": "s1_parsed",
  "payload": {"sections": [...], "references": [...]},
  "parser_version": "grobid-0.8.0",
  "processed_at": "2026-08-29T01:00:00"
}
```

`parser_version` 字段关键：解析器升级后，能精确找出"哪些记录是旧版本产的"，选择性重跑。

## 编排代码：朴素但可靠的第一版

系列五会用 Prefect 正式编排，这里先用一个调度循环把设计跑通——顺序执行、断点续传、失败隔离：

```python
STAGES = [s1_parse, s2_figures, s3_embed, s4_fuse, s5_load]

def run_pipeline(paper_ids: list[str], state_path: Path):
    state = load_json(state_path, default={})

    for pid in paper_ids:
        for stage in STAGES:
            key = f"{pid}:{stage.__name__}"
            if state.get(key) == "done":
                continue                      # 幂等：做过的跳过
            try:
                stage(pid)
                state[key] = "done"
            except Exception as e:
                state[key] = f"failed: {e}"
                log_failed(pid, stage.__name__, e)
                break                         # 该论文后续阶段没意义，跳下一篇
        save_json(state_path, state)
```

注意粒度：**状态按"论文 × 阶段"记录**。某篇 PDF 解析失败不影响其他论文走完全程；解析器升级后，清掉 s1 的状态记录，只重跑受影响的阶段。

## 端到端质量门

每个阶段有自己的质量检查，集成层再加一道端到端的：

```python
def pipeline_quality_gate(paper_id):
    rec = load_record(paper_id)
    checks = {
        "解析完整": len(rec["sections"]) >= 3,
        "向量存在": rec["fused_embedding"] is not None,
        "图表有归属": all(f["caption"] for f in rec["figures"]),
        "检索可用": smoke_search_recall(paper_id) > 0,   # 用它自己的标题搜它
    }
    return all(checks.values()), checks
```

最后一项"用论文标题搜它自己"是最便宜的端到端冒烟测试：一篇论文进完流水线后，在检索系统里搜它自己的标题必须排第一。搜不到，说明向量错位、入库漏行之类的问题——这种测试零标注成本，拦全链路断点。

## M3 验收清单

1. 流水线五个阶段全部幂等可重跑，状态按论文×阶段粒度持久化。
2. 在 500 篇论文上端到端跑通，端到端质量门通过率 ≥ 95%，失败样本有画像分类。
3. 检索质量复测：[第 2 课](/posts/research-mm-02-embedding-semantic-search/)评测集上融合表示的 Recall@10 不低于单独文本向量（融合不能开倒车）。
4. 每篇论文的处理成本（耗时、token/算力）有台账，为规模化做预算依据。
5. 已知局限文档化：扫描版 PDF 未覆盖、公式只做定位未识别、参考文献未做实体消歧。
6. `git tag m3-understanding-pipeline`。

## 与 M1/M2 的联动检查

里程碑不是孤立的：M3 的理解流水线输出要回流验证前两个里程碑——解析出的正文章节能不能提升 [M2 分类器](/posts/research-ml-05-evaluation-tuning-milestone/)（留作系列六的优化实验）；融合检索的语料版本是不是钉在 [M1 的 m1.0](/posts/research-data-05-duckdb-parquet/) 数据集上。里程碑之间的依赖关系画成图，是项目叙事（系列六）的主线。

## 踩坑排查

| 症状 | 原因 | 处理 |
|---|---|---|
| 重跑流水线结果翻倍 | 阶段产物追加写不幂等 | 产物按 paper_id 覆盖写 |
| 某篇失败导致全批中断 | 异常没隔离到论文粒度 | try/except 按论文隔离 + 失败台账 |
| 升级解析器后新旧结果混杂 | 无 parser_version | 产物带版本，按版本选择性重跑 |
| 流水线越跑越慢 | 每阶段重复读全量数据 | 阶段间传路径，数据按需加载 |
| 检索冒烟测试失败 | 向量/id 错位或漏入库 | 按第 2 课的对齐校验排查 |
| 端到端通过率低 | 坏 PDF 没分流 | 扫描版/损坏件提前标记跳过 |

## 作品集证据

M3 是"系统集成能力"的证明：五个异构组件（含外部服务、深度学习模型、向量计算）编排成一条可靠流水线，有状态管理、质量门、成本台账和失败画像。这是从"会写模型"到"会做系统"的分水岭证据。

## 练习

1. 实现五阶段流水线并在 100 篇论文上验证断点续传（中断后重跑只补未完成项）。
2. 实现端到端质量门，构造一个"向量错位"故障验证冒烟测试能抓住。
3. 统计每篇论文的分阶段耗时，找出瓶颈阶段并给出一个优化方案。
4. 画 M1→M2→M3 的里程碑依赖图，标注每个里程碑的验收标准。

## 面试常问

**Q：多阶段流水线的设计原则？**
阶段间落盘通信（而非内存传递）、每阶段幂等、状态细粒度持久化（论文×阶段）、失败隔离不中断批次、产物带版本支持选择性重跑、端到端冒烟测试。

**Q：怎么验收一条 AI 流水线？**
三层：各阶段质量指标（解析完整率、检测准确率）、端到端指标（质量门通过率、检索 Recall 不回退）、工程指标（吞吐、单篇成本、失败率）。只有单点指标没有端到端验证，集成等于没验收。

**Q：已有模型/服务升级时怎么管理？**
产物带版本号（parser_version/model_version），升级后按版本标记选择性重跑；新旧版本指标对比通过后切换；保留回滚路径（旧产物不立即删）。

---

**里程碑 M3 达成。** 下一课进入系列五，把平台变成可持续运转的服务：[数据管理与 AI 自动化 01：PostgreSQL + pgvector 科研知识库](/posts/research-data-mgmt-01-postgres-pgvector/)。
