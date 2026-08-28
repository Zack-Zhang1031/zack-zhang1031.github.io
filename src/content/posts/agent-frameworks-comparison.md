---
title: "Agent 框架选型：LangGraph、CrewAI、AutoGen 与手写循环的对决"
date: 2026-08-30T11:50:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "Agent 框架到底帮你做了什么、LangGraph 的状态机哲学、CrewAI 的角色扮演、AutoGen 的对话编排，以及什么时候手写循环才是最好的框架。"
tags: ["AI Agent", "LangGraph", "CrewAI", "AutoGen", "框架选型"]
categories: ["AI课程", "大模型应用"]
math: false
---

[AI Agent 开发实战](/posts/ai-agent-development/)讲了 Agent 的最小内核就是一个 while 循环。那问题来了：既然内核几十行代码，为什么还有一堆框架？**框架的价值不在循环本身，在循环周边的脏活**：状态持久化、中断恢复、人机协作节点、可视化调试、流式输出。选型选的是这些周边能力和你需求的匹配度。

这篇是我把四个主流方案都用过之后的对比结论。先说答案：**多数团队的最优解是「LangGraph 做骨架」或「手写循环 + 自攒周边」**。

**前置阅读**：建议先读 [AI Agent 开发实战](/posts/ai-agent-development/)（核心循环与工具设计）、[Prompt 工程实战](/posts/prompt-engineering-practice/)。

## 框架能力矩阵：它们到底替你做什么

| 能力 | LangGraph | CrewAI | AutoGen | 手写循环 |
|------|-----------|--------|---------|----------|
| 核心抽象 | 状态图（节点+边） | 角色+任务 | 多 Agent 对话 | 你自己定 |
| 控制流灵活度 | ★★★★★ 任意图 | ★★★ 顺序/层级 | ★★★ 对话驱动 | ★★★★★ |
| 状态持久化/恢复 | 内置 checkpointer | 弱 | 弱 | 自己实现 |
| 人机协作（interrupt） | 一等公民 | 支持 | 支持 | 自己实现 |
| 学习曲线 | 陡（图思维） | 平缓 | 中 | 零 |
| 调试可观测 | LangSmith 深度集成 | 一般 | 一般 | 完全自控 |
| 抽象泄漏风险 | 中 | 高（魔法多） | 中 | 零 |

## LangGraph：把 Agent 当状态机来建

LangGraph 的核心主张：**Agent 不是循环，是一张图**——节点是函数（调 LLM、调工具、人工审批），边是转移逻辑（固定或条件），状态在节点间流转并自动持久化。

```python
from langgraph.graph import StateGraph, START, END
from typing import TypedDict, Annotated
import operator

class State(TypedDict):
    messages: Annotated[list, operator.add]   # 状态字段：自动累加
    steps: int

def agent_node(state: State):
    resp = llm_with_tools.invoke(state["messages"])
    return {"messages": [resp], "steps": state["steps"] + 1}

def tool_node(state: State):
    last = state["messages"][-1]
    results = [execute(t) for t in last.tool_calls]
    return {"messages": results}

def should_continue(state: State):
    last = state["messages"][-1]
    return "tools" if getattr(last, "tool_calls", None) else END

g = StateGraph(State)
g.add_node("agent", agent_node)
g.add_node("tools", tool_node)
g.add_edge(START, "agent")
g.add_conditional_edges("agent", should_continue, {"tools": "tools", END: END})
g.add_edge("tools", "agent")
app = g.compile(checkpointer=memory_saver)   # 状态自动存，可断点续跑
```

三个杀手级特性：

1. **Checkpointer**：每步状态落库（SQLite/Postgres），进程挂了从断点恢复——长任务（几十步的调研）的救命功能。
2. **interrupt_before**：指定节点前暂停等人工——「发邮件前必须人工确认」是配置项不是工程。
3. **Time travel**：回到任意历史状态换个分支重跑——调试 Agent 的后悔药。

代价：概念税（StateGraph/reducer/条件边），简单任务用它像开航母送外卖。**我的分界线：流程里有分支、循环、人工节点、需要恢复 → LangGraph；一条直线跑到底 → 手写**。

## CrewAI：最像「搭团队」的框架

CrewAI 的抽象是组织学：Agent = 角色（研究员、写手、审校），Task 分派给角色，Crew 编排执行（顺序或层级）。入门体验最好——20 行代码一个「调研+写报告」双 Agent 团队：

```python
from crewai import Agent, Task, Crew

researcher = Agent(role="调研员", goal="搜集主题的关键事实",
                   backstory="资深行业分析师", tools=[search_tool])
writer = Agent(role="写手", goal="把素材写成通俗报告",
               backstory="科技专栏作者")

t1 = Task(description="调研 {topic} 的最新进展", agent=researcher,
          expected_output="要点列表")
t2 = Task(description="基于调研写 800 字报告", agent=writer,
          expected_output="Markdown 报告")

crew = Crew(agents=[researcher, writer], tasks=[t1, t2])
result = crew.kickoff(inputs={"topic": "MoE 架构"})
```

优点：概念直觉（招人派活）、原型飞快。缺点：**抽象泄漏**——顺序之外的复杂流程（条件分支、并行合并、动态改计划）要么绕要么 hack，backstory 一长串对行为的影响难以预测，出问题时可调试性一般。适合：流程固定的「内容生产线」类任务、演示和 POC。

## AutoGen：研究味最重的对话编排

微软的 AutoGen 把多 Agent 协作建模为「对话」：Agent 之间互相发消息，按发言规则推进（群聊、轮流、主持选择）。GroupChat 机制在「辩论式求解」「多角色评审」这类场景表达力独特。0.4 版重写后架构干净了不少，但生态位仍偏研究和实验——生产稳定性、中文社区案例都不如前两家。**适合：多 Agent 交互模式的研究探索，不适合：要扛流量的生产系统**。

## 手写循环：被低估的选项

回到原点：[Agent 实战篇](/posts/ai-agent-development/)那个几十行的循环，加上你自己的工具层、护栏和 trace，就是一个「框架」。它的优势随团队能力增长：**没有魔法、没有版本地狱、栈 trace 直达你的代码**。

框架的隐性成本：抽象升级带来的迁移（LangChain 的 API 变迁史是老用户的眼泪）、黑盒行为的调试成本（「框架帮我做了什么」要读源码）、依赖重量。我的经验：团队里有能维护 200 行 Agent 内核的人，手写 + 按需引入（比如只用 LangGraph 的 checkpointer 思想自己实现）常常比全家桶更健康。

## 选型决策树

```
需要人工审批节点 / 断点恢复 / 复杂分支？
 ├── 是 → LangGraph（认真学，值得）
 └── 否 → 多角色协作的内容流水线？
      ├── 是 → CrewAI 快速验证，撞墙后考虑迁 LangGraph
      └── 否 → 任务边界清晰、工具 5 个以内？
           ├── 是 → 手写循环（100 行内），别引框架
           └── 多 Agent 交互模式探索 → AutoGen / LangGraph
```

另外两个避坑提醒：MCP（Model Context Protocol）正在统一工具接入层——框架之争之下，**工具用 MCP 标准封装可以和框架解耦**，值得优先投入；以及框架版本钉死在 requirements 里，Agent 框架的 API 稳定性配不上它的迭代速度。

## 踩坑排查

| 现象 | 原因 | 解法 |
|------|------|------|
| LangGraph 状态越跑越乱 | reducer 没配对（覆盖 vs 累加） | 明确每个字段的 Annotated reducer |
| CrewAI 输出格式飘 | backstory 写了模糊的期望 | 格式要求写进 Task 的 expected_output |
| 升级框架后全挂 | API 大改版 | 版本钉死 + 升级前跑 eval 集 |
| 对话式框架里 Agent 聊个没完 | 无终止条件 | 设 max_turns + 明确终止信号 |
| 框架的 retry 和自建护栏重复 | 双层逻辑打架 | 关掉框架内建，统一一层护栏 |

## 练习

1. 用 LangGraph 实现「调研 → 写作 → 人工审批 → 发布」四节点流程，体验 checkpointer 和 interrupt。
2. 同一任务（调研+报告）分别用 CrewAI 和手写循环实现，对比代码量、可控性和调试体验。
3. 给 LangGraph 的 State 加两个字段（一个覆盖更新、一个累加更新），验证 reducer 的行为差异。
4. 把一个 CrewAI 项目改写为 LangGraph 版本，记录你在哪些地方感到「表达力解放」。

## 面试常问

**Q：LangGraph 和普通 workflow 引擎（如 Airflow）的本质区别？**
传统 workflow 是「数据的 DAG」，节点是确定性计算；LangGraph 是「状态的图」，节点可以是 LLM 决策，边可以是模型输出驱动的条件路由——图的结构里内嵌了不确定性决策点。加上 checkpointer 的长时状态和中断恢复，它是为「长周期、人在环、决策型」任务设计的。

**Q：多 Agent 框架的共同风险？**
错误级联（上游 Agent 的错被下游放大）、上下文割裂（Agent 间传参丢信息）、成本乘数（N 个 Agent N 份 token）、调试地狱（跨 Agent 的因果链）。设计原则：交接点加验证、保持层级浅、端到端 trace、能用单 Agent 别拆。

**Q：MCP 和 Agent 框架的关系？**
正交的两层：框架管「编排」（什么时候调谁），MCP 管「工具接入」（工具怎么描述、怎么调用、怎么发现）。MCP 让工具一次封装跨框架/跨宿主复用（Claude、IDE、自研 Agent 都能接）。趋势判断：编排层框架会继续洗牌，工具层 MCP 正在沉淀为标准——投资 MCP 比投资框架更保值。

**Q：什么时候应该自己写 Agent 内核？**
三个信号：① 你的流程用框架的概念表达很别扭（抽象错配）；② 团队频繁需要读框架源码才能调试（抽象泄漏成本 > 自建成本）；③ 性能敏感（框架的通用性带来序列化/调度开销）。内核 200 行 + 按需引入零件（ tracing、checkpoint 库），是很多成熟团队的终态。

**Q：评估一个 Agent 框架该看哪些维度？**
控制流表达力（分支/循环/并行/动态计划）、状态管理（持久化/恢复/共享）、人在环支持、可观测性（trace 集成）、生态与版本稳定性、与模型/工具的解耦程度。别被「5 分钟搭出 demo」迷惑——demo 能力和生产能力是两个维度，框架的价值全在后者。

## 相关阅读

- [AI Agent 开发实战](/posts/ai-agent-development/)——框架之下的核心原理
- [Prompt Engineering 实战](/posts/prompt-engineering-practice/)——Agent 的「指令层」
- [RAG 进阶](/posts/rag-advanced-chunking-rerank/)——Agent 最常用的检索工具
- [LLM 评测体系](/posts/llm-evaluation-benchmarks/)——Agent 效果的度量
- [Kafka 与实时数据管道](/posts/streaming-kafka-basics/)——Agent 事件流的基础设施

框架选型的终极标准：**它消失的那部分复杂度，是否大于它引入的那部分**。对简单任务框架是负资产，对复杂状态机它是救星——先看清你的任务是哪类，再决定要不要上船。
