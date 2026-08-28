---
title: "AI Agent 开发实战：ReAct、工具调用与多步推理——从 Demo 到可用"
date: 2026-08-29T21:20:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "Agent 的核心循环（感知-规划-行动-观察）、Function Calling 实战、ReAct 模式、错误恢复与护栏、多 Agent 协作的边界，附可运行代码。"
tags: ["AI Agent", "LLM", "Function Calling", "ReAct", "LangChain"]
categories: ["AI课程", "大模型应用"]
math: false
---

「帮我查一下明天的机票，对比高铁价格，然后把结论发到群里」——这类需求 LLM 单轮问答做不了，因为它需要**调工具、看多步结果、根据中间结果调整计划**。这就是 Agent：LLM 当大脑，工具当手脚，循环当神经。

我做过三个 Agent 项目，第一个是纯 Demo（惊艳但不可用），第二个死于错误累积（第十步的结果被第三步的错误带歪），第三个才真正上线。这篇就是第三个项目沉淀下来的东西：核心循环、工具设计、错误恢复、以及什么时候**不要**用 Agent。

**前置阅读**：建议先读 [Prompt Engineering 实战](/posts/prompt-engineering-practice/)、[AI 自动化工作流](/posts/ai-automation-workflow/)。

## Agent 的最小内核：一个 while 循环

剥掉所有框架的包装，Agent 就这几十行：

```python
import json
from openai import OpenAI

client = OpenAI()

TOOLS = [{
    "type": "function",
    "function": {
        "name": "search_flights",
        "description": "查询指定日期两个城市间的航班，返回价格和时刻",
        "parameters": {
            "type": "object",
            "properties": {
                "origin": {"type": "string"},
                "destination": {"type": "string"},
                "date": {"type": "string", "description": "YYYY-MM-DD"}
            },
            "required": ["origin", "destination", "date"]
        }
    }
}]  # 真实项目里还有 search_trains / send_message 等

def run_agent(user_goal: str, max_steps=15):
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_goal},
    ]
    for step in range(max_steps):
        resp = client.chat.completions.create(
            model="gpt-4o-mini", messages=messages, tools=TOOLS)
        msg = resp.choices[0].message
        messages.append(msg)

        if not msg.tool_calls:          # 模型认为任务完成，输出最终回答
            return msg.content

        for call in msg.tool_calls:     # 执行工具，把结果喂回去
            result = execute_tool(call.function.name,
                                  json.loads(call.function.arguments))
            messages.append({
                "role": "tool",
                "tool_call_id": call.id,
                "content": json.dumps(result, ensure_ascii=False),
            })
    raise RuntimeError("超过最大步数，任务未完成")
```

这就是全部：**循环 = LLM 决定下一步 → 执行工具 → 结果追加进上下文 → 再问 LLM**。框架（LangChain/LlamaIndex/AutoGen）做的是在这个循环上加了状态管理、记忆、检索、观测等增强。

## ReAct：推理与行动交织

上面的循环隐含了 ReAct（Reasoning + Acting）模式，值得显式理解，因为它是几乎所有 Agent 的思考方式：

```
Thought: 用户要对比机票和高铁。我先查机票。
Action: search_flights(origin="北京", destination="上海", date="2026-08-30")
Observation: [{航班: CA1501, 价格: 1280, 时刻: "08:00-10:15"}, ...]
Thought: 机票最便宜 1280。现在查高铁对比。
Action: search_trains(...)
Observation: [{车次: G1, 价格: 553, 时刻: "09:00-13:28"}, ...]
Thought: 高铁二等座 553 元 4.5 小时，机票 1280 元 2 小时 15 分。可以给出结论了。
Final Answer: ...
```

要点：**让模型把「想」和「做」交替写在同一个上下文里**，推理过程显式化带来了两个工程红利——可调试（能看到它哪步想歪了）和可纠偏（在 Thought 里注入提示）。用 Function Calling 的模型把这个过程内化了（tool_calls 就是 Action），但在 system prompt 里要求「每步先说明推理」依然有效。

## 工具设计：决定 Agent 上限的地方

新手把精力花在选框架，老手花在设计工具。三条铁律：

**1. 工具粒度：面向任务，不面向 API**。差的工具设计是把底层 API 原样暴露（`get_user_by_id`、`query_db`、`http_request`）——模型要在太细的选择空间里规划，步数爆炸、错误率飙升。好的工具是任务级的：`search_flights(origin, dest, date)` 内部封装了认证、重试、数据清洗，模型只需要理解「查航班」。

**2. description 就是工具的 prompt**。模型选择工具的唯一依据是 name + description + 参数 schema。写得差的 description（`"查询数据"`）让模型瞎猜；写得好的（`"查询两个城市间的航班。注意：只支持国内城市，日期必须在 30 天内"`）能避免一半的误调用。参数描述同样重要：`date` 的格式要求写清楚，不然模型会传「明天」。

**3. 工具返回要「模型友好」**。工具返回原始 API 的 500 行 JSON，一半 token 浪费在无关字段上，还稀释上下文。在工具内部做投影，只返回模型决策需要的字段；超长结果截断并注明（`"前5条，共87条"`），让模型知道有分页这回事。

## 错误恢复：Demo 和产品的分水岭

我第二个 Agent 项目死于「错误累积」：第三步搜索返回了空结果，模型没察觉，基于幻觉编了第四步的输入，最终输出了一个自信满满的错误答案。上线的第三个项目加了四层防线：

**① 工具层：错误显式返回，不抛异常**。

```python
def execute_tool(name, args):
    try:
        return {"ok": True, "data": TOOL_IMPL[name](**args)}
    except Exception as e:
        return {"ok": False, "error": str(e),
                "hint": "参数可能不合法，请检查后重试或换其他工具"}
```

让模型看到结构化错误并有机会自我修正——LLM 看到「城市名不存在」后换个写法重试的成功率相当高。

**② 步数与预算护栏**。max_steps、最大 token 消耗、单工具最大调用次数，超限熔断。没有护栏的 Agent 循环是一个会烧钱的发电机。

**③ 关键节点验证**。高风险动作（发消息、下单、删数据）前加确定性校验：金额范围检查、收件人格式检查、或干脆转人工确认。「模型说发就发」是不可接受的。

**④ 最终答案自检**。输出前让模型（或另一个模型）对照原始目标检查：「任务要求对比机票和高铁，当前回答是否两者都包含了价格和时间？」这个 verification 步骤成本低、拦截率高。

## 记忆与上下文：Agent 的阿喀琉斯之踵

多步任务很快撞上上下文窗口。三个应对策略，按实施成本排序：

1. **裁剪工具返回**：Observation 只保留关键字段（上面已讲）。
2. **摘要压缩**：每 N 步让模型把历史压缩成一段「当前进展摘要」，替换掉原始消息。注意摘要是有损的，关键数据（价格、ID、时间）要在摘要 prompt 里点名保留。
3. **结构化状态**：把「已确认的机票价格 1280、高铁 553」这类中间结论写进一个显式的 state 对象（字典/数据库），每步注入。这实际上把 Agent 从「纯上下文驱动」拉回「状态机驱动」，可控性大增。

## 多 Agent：慎用，但有两种情况值得

「一个 Agent 不够就上多 Agent」是常见的过度设计。单 Agent + 好工具能覆盖 80% 场景。真正值得多 Agent 的两种情况：

- **角色能力差异大**：写代码的 Agent 和审代码的 Agent 用不同 system prompt、不同模型（生成用快模型、审查用强模型），比一个模型精分两个角色效果好。这就是「生成-批评」模式。
- **任务天然并行**：调研类任务拆成 5 个独立子问题同时跑，最后汇总。注意是**真独立**——有依赖关系的并行只会制造同步地狱。

多 Agent 的代价：通信协议设计、状态一致性、调试复杂度指数上升。AutoGen/CrewAI 把编排模板化了，但「什么时候该拆」的判断框架给不了你。我的准则：**能用一条链（workflow）解决的别用 Agent，能用单 Agent 的别用多 Agent**。

## 什么时候不要用 Agent

这是最贵的一节，请刻在脑门上：

| 场景 | 该用什么 |
|------|----------|
| 流程固定、步骤已知（每天抓数→清洗→出报表） | **确定性工作流**（代码 if-else，或 LangGraph 的固定图） |
| 单次问答 + 知识检索 | **RAG**，不需要循环 |
| 需要 100% 可靠的核心业务（支付、风控） | **传统代码**，LLM 只做辅助判断 |
| 步骤不定、需要临场决策、多工具组合 | **这才是 Agent 的地盘** |

Agent 的本质是用「可靠性换灵活性」。判断标准一句话：**如果流程能画成一张固定的流程图，就不要用 Agent**。我在 [AI 自动化工作流](/posts/ai-automation-workflow/)里的原则就是「固定流程代码化、开放决策 Agent 化」。

## 可观测性：没有 trace 的 Agent 没法维护

Agent 的 bug 形态是「最终答案错了，但不知道哪步开始错的」。必须记录完整 trace：每步的 Thought、工具入参出参、耗时、token 数。工具链：LangSmith（LangChain 系）、Langfuse（开源自部署，我的选择）、或自己往 [Kafka](/posts/streaming-kafka-basics/) 里打事件。

有了 trace，优化就变成了数据工作：把失败 case 拉出来分类——规划错误？工具误用？数据问题？比例指导你改哪里。这和传统 ML 的错误分析一脉相承（[研究方法那篇](/posts/research-methods-ai/)讲的 iterate loop 完全适用）。

## 踩坑排查

| 现象 | 原因 | 解法 |
|------|------|------|
| Agent 死循环反复调同一工具 | 工具报错信息没帮模型理解问题 / 无步数上限 | 错误消息给 hint；加 max_steps 和重复调用检测 |
| 模型编造工具参数 | 参数 schema 描述不清 | description 写清格式和约束，给示例值 |
| 步数爆炸，十几步还没收敛 | 工具粒度太细 | 合并成任务级工具，减少决策点 |
| 中间错了最终错 | 无中间验证 | 关键节点加校验；最终自检步骤 |
| 上下文溢出 | 工具返回过长 + 历史无压缩 | 返回裁剪、摘要压缩、结构化状态 |
| 成本失控 | 无预算护栏 + 大模型跑全流程 | 分层用模型（规划用强的、执行用弱的）、token 预算熔断 |
| 线上表现和调试时不一样 | 工具外部依赖变化（API 改版、数据变化） | trace 监控 + 定期回归测试 |

## 练习

1. 用文中的最小循环实现一个「天气 + 日历」双工具 Agent，观察它在「明天要出差吗」这种需要组合两个工具的问题上的表现。
2. 故意让一个工具返回错误，看模型能否自我修正；然后把错误消息从「Exception」改成「结构化 hint」，对比修正率。
3. 给 Agent 加 trace 记录（每步存 JSON），跑一次复杂任务，事后回答：哪步耗时最长？哪步 token 最多？失败 case 的断点在哪？
4. 把同一个任务分别用「固定 workflow 代码」和「Agent 循环」实现，对比成功率、延迟、成本——亲手验证「该用哪个」的判断。

## 面试常问

**Q：ReAct 和 Chain-of-Thought 的区别？**
CoT 是纯推理链，一次性生成，不接触外部世界；ReAct 把推理（Thought）与行动（Action/Observation）交织，推理基于真实工具返回逐步修正。CoT 适合封闭问题（数学），ReAct 适合需要外部信息的任务。幻觉处理上 ReAct 显著更好，因为事实来自 Observation 而非模型记忆。

**Q：Agent 和普通 workflow 的边界？**
决策点：步骤和分支是否在编写时完全已知。已知 → workflow（可靠、便宜、可测试）；未知、需动态规划 → Agent。灰色地带：LangGraph 这类「图 + 条件边」的框架允许「大部分固定、个别节点交给模型决策」，是实践中最常见的形态。

**Q：怎么评估一个 Agent？**
三层：任务成功率（端到端，需要评测集和明确的成功标准）、过程质量（步数、工具调用正确率、无效调用率）、资源效率（token 成本、延迟）。注意单看成功率会掩盖「蒙对的」——过程指标才有优化指导意义。

**Q：Function Calling 和让模型输出 JSON 再解析有什么区别？**
Function Calling 是模型训练时就对齐了「何时调用、参数怎么填」的能力，输出经过约束解码，格式可靠性高一个量级；手解 JSON 依赖 prompt 约束，边角失败率高。另外 FC 的并行调用（一次返回多个 tool_calls）是原生能力。能用 FC 就不用自由文本协议。

**Q：多 Agent 系统的主要风险？**
错误传播（一个 Agent 的输出是另一个的输入，错误被放大）、目标漂移（长链路上逐步偏离原始目标）、调试困难（跨 Agent 的因果链）、成本叠加。缓解：每个交接点做验证、保持任务分解浅层化、端到端 trace。

## 相关阅读

- [Prompt Engineering 实战](/posts/prompt-engineering-practice/)——工具 description 和 system prompt 的写法
- [AI 自动化工作流实战](/posts/ai-automation-workflow/)——workflow 与 Agent 的搭配哲学
- [Milvus + Neo4j 搭建 RAG 知识库](/posts/milvus-neo4j-rag/)——检索工具是 Agent 最常用的手
- [Kafka 与实时数据管道](/posts/streaming-kafka-basics/)——Agent 事件和 trace 的传输底座
- [LLM 微调实战：LoRA 与 QLoRA](/posts/llm-finetuning-lora/)——当通用模型不够用时的定制化路径

Agent 是 2024 年以来最被高估也最被低估的技术——高估在 Demo 视频里，低估在「工具设计 + 护栏 + trace」这套工程体系真正成熟的地方。希望这篇让你站在后者一边。
