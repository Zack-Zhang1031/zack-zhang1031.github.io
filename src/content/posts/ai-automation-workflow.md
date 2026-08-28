---
title: "AI 自动化：用工作流和 Agent 把重复工作交给机器"
date: 2026-08-28T12:00:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "从 cron 定时脚本到 Prefect 工作流再到 LLM Agent，讲清三个层次的 AI 自动化各自解决什么问题、怎么落地，以及自动化系统必不可少的监控和失败处理。"
tags: ["AI自动化", "Prefect", "Agent", "工作流", "定时任务"]
categories: ["AI课程", "AI工程"]
math: false
---

AI 自动化是个范围很大的词，我用一条演进线来组织它：**定时脚本 → 工作流编排 → LLM Agent**。这三层不是替代关系，而是能力递增：脚本能干的事别动用 Agent，Agent 能干的事脚本想都别想。选对层次，是自动化工程的第一决策。

我自己维护着一套日常自动化：定时采集数据、定时跑报告、用 Agent 处理需要"看懂内容"的任务。这篇把这套体系的设计思路和踩坑记录整理出来。

> 前置阅读：[Linux + Python 环境基础](/posts/linux-python-environment-basics/)（tmux、进程管理）、[数据采集与爬虫](/posts/web-scraping-data-collection/)（自动化最常见的上游）。

## 第一层：定时脚本——确定性任务的底线方案

"每天凌晨 2 点抓一次数据""每小时检查一次磁盘"——输入固定、逻辑固定、输出固定，这类任务用 cron 就够了：

```bash
# crontab -e 添加：
0 2 * * * cd /data/projects/crawler && /data/projects/crawler/.venv/bin/python main.py >> /var/log/crawler.log 2>&1
```

cron 的坑全在环境上，我全踩过：

- **PATH 是精简的**：cron 环境没有你 shell 里的 PATH，python、脚本、数据文件全部写绝对路径。
- **没有交互终端**：脚本里任何等待输入的代码会永远挂住。
- **失败是静默的**：任务挂了没人知道。所以输出必须重定向到日志文件，重要任务再补一条"失败时发通知"的逻辑。

macOS 上对应 launchd，Windows 上是任务计划程序，思路相同。单脚本自动化的黄金标准就三条：绝对路径、日志落盘、失败可感知。

## 第二层：工作流编排——多步骤、有依赖、要重试

当任务变成"A 跑完跑 B，B 失败要重试 3 次，C 依赖 A 和 B 都成功"，cron 就力不从心了。这是工作流引擎的地盘，我的选择是 Prefect（轻量、Python 原生）：

```python
from prefect import flow, task

@task(retries=3, retry_delay_seconds=60)
def fetch_data():
    """采集数据：失败自动重试 3 次"""
    return run_crawler()          # 调你的爬虫

@task
def clean_data(raw_path):
    return run_cleaning(raw_path)

@task
def build_report(clean_path):
    return generate_report(clean_path)

@flow(name="daily-paper-pipeline")
def daily_pipeline():
    raw = fetch_data()            # 步骤间自动传递依赖
    clean = clean_data(raw)
    report = build_report(clean)
    notify(f"日报已生成: {report}")

if __name__ == "__main__":
    daily_pipeline()
```

相比 cron 脚本，Prefect 给的东西：**每个 task 独立重试**（抓取挂了重跑抓取，不用整条流水线重来）、**运行状态面板**（哪步成功哪步失败一目了然）、**定时调度内建**（`prefect deploy` 时声明 cron 表达式）。

同类工具还有 Airflow（重、生态大、适合团队数据平台）和 Dagster。个人/小团队项目 Prefect 的性价比最高。

### 设计工作流的三个原则

1. **每个 task 幂等**：同一个输入跑两次，结果一样、不产生副作用叠加。这样任何一步失败后重跑都安全。
2. **中间产物落盘**：task 之间传文件路径而不是内存对象。流水线跑一半挂了，重启能从断点续，不用从头再来。
3. **失败要有出口**：`on_failure` 钩子发通知（邮件/Webhook），别让流水线带病运行一周才发现。

## 第三层：LLM Agent——处理"需要看懂内容"的任务

前两层的共同前提：**每一步的逻辑是确定的**。但有一类任务逻辑写不出来：

- "看完这 20 篇新论文的摘要，挑出和我们方向相关的 5 篇并写摘要"
- "客户邮件来了，判断意图，查询订单系统，起草回复"
- "代码仓库有更新，审计这次改动有没有风险"

这些任务需要理解语义、做判断、组合工具——这是 LLM Agent 的领地。Agent 的核心循环：**观察 → 思考 → 调用工具 → 再观察**，直到任务完成：

```python
# 一个极简的 Agent 骨架（以 function calling 为例）
tools = {
    "search_papers": search_papers,     # 检索论文
    "read_abstract": read_abstract,     # 读摘要
    "save_digest": save_digest,         # 保存筛选结果
}

def agent_loop(user_goal, max_steps=10):
    messages = [{"role": "user", "content": user_goal}]
    for _ in range(max_steps):
        resp = llm.chat(messages, tools=tool_schemas)
        if resp.tool_calls:
            for call in resp.tool_calls:
                result = tools[call.name](**call.arguments)
                messages.append(tool_result_message(call, result))
        else:
            return resp.content          # 模型认为任务完成
    return "超过最大步数，任务中止"
```

**Agent 工程的关键不是模型，是护栏**：

- **max_steps 必须设**：模型陷入循环调用的成本是实打实的 token 费。
- **工具要有边界**：能查就别让它能改，能改就别让它能删。我做过一个执行 LLM 生成 Python 代码的 Agent（AtlasSplit），为此专门设计了 AST 静态审计 + 沙箱，详见 [AtlasSplit 的 AST 审计与沙箱设计](/posts/atlassplit-ast-audit-sandbox/)。
- **输出要结构化**：让模型返回 JSON 而不是自由文本，下游程序才能可靠消费。
- **每次运行留痕**：输入、每步工具调用、最终输出全部记日志。Agent 出错时这是唯一的排查依据。关于 LLM 生成代码会怎么翻车，我做过一次系统的错误分布分析：[AtlasSplit 错误类型分布分析](/posts/atlassplit-llm-code-error-analysis/)。

## 怎么选层次：一个决策框架

拿到一个自动化需求，按顺序问自己：

1. **输入输出固定、规则能写全？** → cron 脚本。别过度设计。
2. **多步骤、有依赖、要重试要监控？** → Prefect 工作流。
3. **某一步需要理解非结构化内容或做开放判断？** → 只有那一步用 LLM，嵌进工作流当一个 task。

第 3 点是我在实践中最重要的经验：**Agent 不应该是整个系统，而应该是确定性工作流里的一个"智能节点"**。采集、清洗、存储这些步骤保持确定性代码，只有"判断这篇论文是否相关""总结这份报告"这种步骤交给 LLM。这样的系统既有 Agent 的能力，又有工作流的可靠性。

## 监控：自动化系统的另一半

自动化上线只是开始。我的监控三板斧：

- **心跳机制**：任务每次成功运行就更新一个"最后成功时间"文件，另一个巡检脚本发现"超过 26 小时没成功过"就告警。这比监控失败日志可靠——有些失败根本不写日志。
- **结果合理性检查**：不只是"跑完了"，还要"结果像话"——今天采集 0 条数据、报告文件只有 200 字节，都是异常信号。
- **成本仪表盘**：LLM Agent 的 token 消耗要记账，按天看趋势。某次 prompt 改动让 token 翻了 5 倍这种事，只有看账才发现得了。

## 踩坑排查清单

| 症状 | 原因 | 处理 |
|---|---|---|
| cron 手动能跑定时不跑 | PATH/环境变量差异 | 全部绝对路径；脚本开头 `source` 环境 |
| 流水线凌晨挂了没人知道 | 无失败通知 | on_failure 钩子 + 心跳监控 |
| Agent 一次跑掉几百块 | 无步数/成本上限 | max_steps + token 预算熔断 |
| 重跑流水线产生重复数据 | task 不幂等 | 输出按键覆盖写，不要追加写 |
| LLM 输出解析失败 | 自由文本不稳定 | JSON 模式/Schema 约束输出 |
| 定时任务时间漂移 | 时区/夏令时 | cron 明确写时区，容器内检查 TZ |

## 练习

1. 把[数据采集](/posts/web-scraping-data-collection/)一篇的增量爬虫改成 cron 每日运行，要求日志落盘、失败时输出明确错误行。
2. 用 Prefect 写一个三 task 流水线（采集 → 清洗 → 统计），故意让清洗步骤第一次运行失败，验证重试和断点续跑。
3. 写一个 LLM Agent：输入一个研究关键词，自动检索 5 篇论文、读摘要、输出 JSON 格式的相关性评分。加上 max_steps 护栏和完整调用日志。
4. 给你的自动化系统加心跳监控：一个"成功时间戳"文件 + 一个巡检脚本，模拟任务停跑 2 天，验证告警触发。

## 面试常问

**Q：cron 和工作流引擎怎么选？**
单脚本、无依赖、失败重跑成本低——cron；多步骤有依赖、需要独立重试、需要可视化状态、多人协作——工作流引擎。判断信号是"你要不要为 cron 脚本自己写状态管理和重试逻辑"，要，就该换了。

**Q：什么是幂等性，为什么自动化任务要幂等？**
幂等：同一输入执行多次和执行一次效果相同。自动化任务会因重试、调度重跑而重复执行，不幂等就会产生重复数据、重复通知、重复扣费。实现手段：以业务键覆盖写、执行前查"是否已处理"、去重表。

**Q：LLM Agent 和传统工作流的本质区别？**
工作流的每一步逻辑是开发者预先写死的；Agent 的下一步行动由模型根据上下文动态决定。前者可靠可预测，后者灵活能处理开放任务。工程上的最佳实践是混合：确定性流程为主干，LLM 只承担其中需要语义判断的节点。

**Q：Agent 系统怎么做安全防护？**
最小权限工具集（只读优先）、危险操作白名单/人工确认、代码执行走沙箱（参考 AST 审计思路）、max_steps 与 token 预算双熔断、全链路日志可审计。

**Q：怎么监控一个无人值守的自动化系统？**
三层：进程层（心跳，检测"没在跑"）、结果层（合理性校验，检测"跑得不对"）、成本层（资源/token 消耗趋势，检测"跑得太贵"）。只监控进程存活是不够的，静默的错误结果比崩溃更危险。

---

自动化的最后一环，是把"做事情"升级成"做研究"。下一篇是本系列收官：[研究方法：从问题到结论的完整路径](/posts/research-methods-ai/)。
