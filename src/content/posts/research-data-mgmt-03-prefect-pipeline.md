---
title: "数据管理与 AI 自动化 03：Prefect 数据流水线——让平台自己转起来"
date: 2026-08-29T03:40:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "AI 科研内容课程系列五第 3 课：用 Prefect 编排平台的日常运转——每日增量采集、解析、向量化、入库、报告，含重试、告警与幂等设计。"
tags: ["Prefect", "工作流", "数据流水线", "自动化"]
categories: ["AI课程", "AI工程"]
math: false
---

平台至此有了数据、模型、服务，但都靠人手动跑。这一课用 Prefect 把整个日常运转自动化：每天定时增量采集新论文 → 解析 → 向量化 → 入库 → 出日报。这是平台从"项目"变成"产品"的最后一跃。

> 前置阅读：[AI 自动化](/posts/ai-automation-workflow/)（cron/工作流/Agent 三层的原理与分层决策，本篇是它的落地）、[M3 理解流水线](/posts/research-mm-06-understanding-pipeline-milestone/)（被编排的对象）。

## 流程拓扑：每日增量管线

```
fetch_increment      # 采集昨日新论文（OpenAlex/arXiv 增量）
    → parse_fulltext     # GROBID 解析 PDF（只对增量）
    → embed_and_fuse     # 生成融合向量
    → load_postgres      # 入库（幂等 upsert）
    → classify_field     # 调 /api/v1/classify 打领域标签
    → daily_report       # 生成日报并通知
```

设计红线（继承自 M3 和自动化篇）：**每个 task 幂等、中间产物落盘、失败有出口**。逐条在代码里兑现：

```python
from prefect import flow, task
from datetime import date, timedelta

@task(retries=3, retry_delay_seconds=120)
def fetch_increment(day: date) -> str:
    """采集某天的新论文，输出 JSONL 路径（幂等：重跑覆盖同名文件）"""
    out = f"data/raw/increment_{day}.jsonl"
    collect_openalex_increment(day, out)
    return out

@task(retries=2)
def parse_fulltext(raw_path: str) -> str:
    return run_grobid_batch(raw_path)         # 内部按 paper_id 跳过已解析

@task
def load_postgres(fused_path: str) -> int:
    return upsert_papers(fused_path)          # ON CONFLICT 覆盖，天然幂等

@task
def daily_report(day: date, n_loaded: int) -> str:
    return render_report(day, n_loaded)

@flow(name="daily-increment")
def daily_pipeline(day: date = date.today() - timedelta(days=1)):
    raw = fetch_increment(day)
    parsed = parse_fulltext(raw)
    fused = embed_and_fuse(parsed)
    n = load_postgres(fused)
    classify_via_api()                        # 走 API，模型单一入口
    report = daily_report(day, n)
    notify(report)
```

## 关键设计决策逐条说

**默认补昨天，参数可重放任意一天。** `day` 参数化后，补采历史数据、重跑失败日期都只是换个参数——调度器每天不传参跑昨天，人工补数传任意日期。这是数据管线最重要的接口设计。

**幂等的最后一环是数据库 upsert。** `INSERT ... ON CONFLICT (paper_id) DO UPDATE`——同一天重跑三次，库里的状态都一样。幂等让"重试"和"补跑"从高危操作变成日常操作。

**分类走 API 不直接加载模型。** 上一课定下的纪律：模型只有一个部署实例。管线调 `/api/v1/classify`，模型升级时管线代码不动。

**日报是结果合理性检查。** 不只是"跑完了"，还要"数字像话"：今日新增 0 条（采集挂了？）、解析失败率 30%（GROBID 挂了？）、入库数 > 采集数（重复计算？）。日报把这些数字摆出来，异常一眼可见——这是[自动化篇](/posts/ai-automation-workflow/)"结果层监控"的落地。

## 调度与告警

```python
# 部署时声明 cron 调度：每天 06:17 跑（避开整点拥堵）
if __name__ == "__main__":
    daily_pipeline.serve(
        name="daily-increment-prod",
        cron="17 6 * * *",
        parameters={"day": None},   # None → flow 内默认昨天
    )
```

告警两级：flow 失败（Prefect 的 `on_failure` 钩子发 Webhook 通知）+ 心跳巡检（独立小脚本检查"最后成功时间"，超过 26 小时没成功就告警）。两级覆盖不同失效模式：前者抓"跑了但失败"，后者抓"压根没跑"（调度器自己挂了）。

## 和上一课 M3 朴素循环的关系

M3 的手写调度循环验证了设计（幂等、状态、失败隔离），本课把它搬进 Prefect 换回三样东西：**每个 task 独立重试**（采集挂了重跑采集，解析成果不丢）、**状态面板**（哪天哪步失败一目了然，不用翻日志）、**调度与历史**（cron 声明、每次运行记录可查）。自己手写这三样就是在重新发明 Prefect——这正是[自动化篇](/posts/ai-automation-workflow/)决策框架的应用实例。

## 踩坑排查

| 症状 | 原因 | 处理 |
|---|---|---|
| 重跑产生重复数据 | 入库不是 upsert | ON CONFLICT DO UPDATE |
| 失败 task 重试全从头 | 状态粒度太粗 | task 内部按 paper_id 幂等 |
| 补采历史数据要改代码 | 日期写死 | day 参数化，默认昨天 |
| 凌晨任务挂了没人知 | 只有日志没有通知 | on_failure Webhook + 心跳巡检 |
| 日报数字对不上 | 各环节口径不同 | 日报数字从数据库统计，不从中间产物 |
| 调度时间整点拥堵 | 大家都跑 0 分 | cron 用非整点分钟 |

## 作品集证据

本课产出：生产级每日增量管线（幂等 + 重试 + 告警 + 日报）。面试问题"你的数据管道怎么保证可靠性"的完整答案就在这一课。

## 练习

1. 实现 daily_pipeline 并手动重跑同一天三次，验证数据库状态一致。
2. 故意断网让 fetch 失败，验证重试与告警链路。
3. 给日报加"环比异常检测"：今日采集量偏离 7 日均值 ±50% 时标红。
4. 用 day 参数补采一周历史数据，观察管线在批量补数时的表现。

## 面试常问

**Q：幂等在这条管线里怎么落地的？**
三层：文件层按日期命名覆盖写；处理层按 paper_id 跳过已完成；数据库层 ON CONFLICT upsert。任何一层重跑都不产生副作用叠加，重试和补数因此成为安全操作。

**Q：Prefect 相比 cron 的核心收益？**
task 级独立重试与状态复用、运行状态面板与历史记录、声明式调度与参数化运行、失败钩子。cron 能跑的任务 Prefect 能跑，但"哪步失败、从哪步续、失败了谁知道"这三个问题只有后者能答。

**Q：心跳巡检和失败告警为什么都要？**
失败告警依赖"任务真的被调度执行了"；调度器挂掉、机器宕机时任务根本没跑，没有任何失败事件可报。心跳巡检从另一个方向看："该成功的成功了吗"，覆盖"静默缺席"这一类失效。

**Q：数据管线的接口设计要点？**
日期/范围参数化（补数与重放）、产物路径约定化（下游不依赖上游内部结构）、每个 task 的输入输出可独立验证。管线演进时只改内部实现，接口保持稳定。

---

下一课：[数据管理与 AI 自动化 04：Docker 与 GitHub Actions——打包、CI 与 M4 验收](/posts/research-data-mgmt-04-docker-cicd/)。
