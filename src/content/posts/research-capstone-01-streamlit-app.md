---
title: "综合项目与求职交付 01：Streamlit 集成应用——把五个里程碑拼成一个产品"
date: 2026-08-29T05:00:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "AI 科研内容课程系列六第 1 课（项目课）：用 Streamlit 把检索、分类、趋势分析、主题地图集成成可演示的平台应用——页面设计、状态管理、缓存策略与演示叙事。"
tags: ["Streamlit", "综合项目", "前端集成", "作品集"]
categories: ["AI课程", "项目实战"]
math: false
---

收官系列第一课。前面五个里程碑产出了数据集、分类器、理解流水线、数据库和 API——但它们还是后端能力，外人看不见。这一课用 Streamlit 做一个可交互的应用，把能力变成**可演示的产品**。面试时打开一个网页现场演示，和对着简历口述项目，是两种量级的说服力。

> 前置阅读：本课程全部前 24 课。本课代码调用[系列五的 API](/posts/research-data-mgmt-02-fastapi-service/)，不直接碰模型和数据库——前端只是 API 的客户端。

## 应用定位：先想清楚给谁演示什么

动手前先回答产品问题。这个应用的观众是面试官/同行，演示动线是：**5 分钟内看到"数据规模 → 检索智能 → 模型能力 → 趋势洞察"四个递进**。由此定四个页面：

1. **总览页**：数据规模、领域分布、增长趋势（M1 + EDA 成果）。
2. **语义检索页**：输入自然语言，返回相关论文（M3 + M4 能力）。
3. **自动分类页**：贴标题摘要，实时返回领域预测与置信度（M2 能力）。
4. **主题地图页**：UMAP 交互图，按主题着色（系列三第 4 课成果）。

演示动线决定页面顺序，页面顺序决定导航结构——先有叙事，再有界面。

## 页面骨架：多页应用与共享状态

```python
# app.py —— 入口与导航
import streamlit as st

st.set_page_config(page_title="ResearchHub", layout="wide")

page = st.sidebar.radio("功能", ["总览", "语义检索", "自动分类", "主题地图"])
st.sidebar.markdown("---")
st.sidebar.caption("数据版本: m1.0 · 模型: bge-large + LR")

if page == "总览":
    from pages_app import overview; overview.render()
elif page == "语义检索":
    from pages_app import search; search.render()
# ...
```

侧栏底部的"数据版本 + 模型版本"标签是个小心思：演示时被问"这是基于多少数据跑的"，答案直接印在页面上——版本意识是工程成熟度的外显。

## 总览页：缓存是生命线

总览页的统计查询扫全库，没有缓存的话每次切换页面都重新算几秒——Streamlit 的交互模型是"任何控件变化都重跑整个脚本"，不缓存就卡死：

```python
import streamlit as st
import requests

API = "http://localhost:8000/api/v1"

@st.cache_data(ttl=3600)          # 统计结果缓存 1 小时
def load_overview():
    stats = requests.get(f"{API}/stats/overview", timeout=10).json()
    trend = requests.get(f"{API}/stats/yearly-trend", timeout=10).json()
    return stats, trend

def render():
    st.header("平台总览")
    stats, trend = load_overview()

    cols = st.columns(4)
    cols[0].metric("收录论文", f"{stats['total']:,}")
    cols[1].metric("覆盖领域", stats["fields"])
    cols[2].metric("最早年份", stats["year_min"])
    cols[3].metric("今日新增", stats["today_new"])   # 昨日管线产物

    import plotly.express as px
    import pandas as pd
    df = pd.DataFrame(trend)
    st.plotly_chart(px.area(df, x="year", y="papers", color="field",
                            title="各领域年度论文趋势"),
                    use_container_width=True)
```

`@st.cache_data` 按参数缓存返回值：参数没变就直接用缓存。什么时候清缓存想明白：统计数据 TTL 一小时合理；但检索结果不该按查询文本缓存（用户可能想看最新），演示场景下首屏数据缓存是刚需。

## 语义检索页：演示的核心亮点

这是"哇塞时刻"页面。设计要点是**让智能看得见**：

```python
def render():
    st.header("语义检索")
    query = st.text_input("描述你的研究兴趣",
                          placeholder="例如：parameter efficient fine-tuning for LLMs")

    col1, col2 = st.columns([3, 1])
    field_filter = col1.selectbox("限定领域", ["全部", "cs.CL", "cs.CV", "cs.LG"])
    topk = col2.slider("返回数量", 5, 50, 10)

    if query:
        with st.spinner("检索中..."):
            resp = requests.post(f"{API}/search/semantic", json={
                "query": query,
                "field": None if field_filter == "全部" else field_filter,
                "topk": topk,
            }, timeout=30).json()

        for hit in resp:
            with st.container(border=True):
                st.markdown(f"**{hit['title']}**")
                st.caption(f"{hit['year']} · {hit['field']} · "
                           f"相似度 {hit['similarity']:.3f} · {hit['venue'] or '预印本'}")
                with st.expander("摘要"):
                    st.write(hit["abstract"])
```

体验细节：**显示相似度分数**（透明的系统更可信）、**spinner 提示**（检索要 1-2 秒，没有反馈用户会以为卡死）、**摘要折叠**（默认页面干净，想看细节再展开）。演示时现场输入一个面试官感兴趣的方向，检索结果的"懂语义"是任何口述都替代不了的。

## 自动分类页：把 M2 的置信度机制演出来

分类页展示的不只是"能分类"，还有[第 2 课](/posts/research-ml-02-field-classification/)设计的置信度降级：

```python
def render():
    st.header("领域自动分类")
    title = st.text_area("论文标题")
    abstract = st.text_area("摘要", height=150)

    if st.button("分类", type="primary") and title:
        resp = requests.post(f"{API}/classify",
                             json={"title": title, "abstract": abstract},
                             timeout=30).json()

        conf = resp["confidence"]
        if conf >= 0.6:
            st.success(f"预测领域：**{resp['field']}**（置信度 {conf:.2f}）")
        else:
            st.warning(f"置信度 {conf:.2f} 低于阈值，建议人工确认。"
                       f"最可能：{resp['field']}")

        st.bar_chart(resp["top5_distribution"])   # Top-5 类别概率分布
```

低置信时黄色警告而不是硬给答案——这个细节演示时一定要讲：它体现的是[模型评估](/posts/research-ml-05-evaluation-tuning-milestone/)一课的服务水平设计，而不只是调了个 API。Top-5 分布条形图让"模型在哪些类别间犹豫"可视化，是错误分析（相邻领域混淆）的产品化表达。

## 主题地图页：预计算 + 静态化

UMAP 地图十万点的计算不可能实时做。策略是**离线预计算、前端只渲染**：

```python
@st.cache_data
def load_topic_map():
    return pd.read_parquet("assets/topic_map.parquet")   # 系列三第4课的产物

def render():
    df = load_topic_map()
    fig = px.scatter(df.sample(20000), x="x", y="y", color="topic_name",
                     hover_data=["title"], title="研究主题地图")
    fig.update_traces(marker=dict(size=3, opacity=0.6))
    st.plotly_chart(fig, use_container_width=True)
```

后端能力（UMAP）变成静态资产（Parquet），前端零计算——**演示应用的正确架构是"重活在线下"**。这个原则反过来约束流水线：主题地图成为[每日管线](/posts/research-data-mgmt-03-prefect-pipeline/)的周期性产物（比如每周重算一次）。

## 部署与演示 checklist

应用用 Docker 一起打包（沿用 [M4 的 compose](/posts/research-data-mgmt-04-docker-cicd/)，加一个 streamlit 服务）。演示前的自查清单：

- 冷启动时间测过（首次加载各页面都在 3 秒内）。
- 断网兜底：每个 API 调用有 try/except + 友好错误页，演示现场网络抖动不死。
- 数据版本标签显示正常。
- 准备三条演示查询：一个热门口径（LLM 微调）、一个交叉口径（医学影像的 Transformer）、一个刁钻口径（精确术语）——展示系统的能力和诚实的边界。

## 踩坑排查

| 症状 | 原因 | 处理 |
|---|---|---|
| 页面切一次卡几秒 | 统计查询没缓存 | @st.cache_data 加 TTL |
| 控件交互导致数据重取 | Streamlit 重跑模型 | 区分缓存粒度；表单用 st.form 批量提交 |
| 主题地图渲染卡死 | 前端一次画十万点 | 抽样 2 万 + marker 调小 |
| API 挂了页面白屏 | 没有异常处理 | try/except + st.error 友好提示 |
| 缓存了过期数据 | TTL 太长 | 统计数据 TTL 1h；管线更新后主动清 |
| 演示现场检索超时 | 冷模型首次推理慢 | 启动后先打一发 warmup 请求 |

## 作品集证据

本课产出：一个可现场演示的四页应用。它是把 M1-M4 五个里程碑"翻译"给非技术观众的界面——作品集的最高形态不是代码仓库，是打开就能用的东西。

## 练习

1. 实现四个页面并完成本地串联演示，录屏 3 分钟。
2. 给所有 API 调用加异常兜底与超时，断网测试各页面行为。
3. 测量冷启动耗时，把首屏时间压到 3 秒内。
4. 准备三条演示查询并写出每条的"展示点"解说词。

## 面试常问

**Q：Streamlit 的定位和局限？**
定位：数据/AI 应用的快速演示界面，Python 全栈、零前端成本。局限：重跑模型带来的状态管理反直觉、复杂交互吃力、多人并发性能有限。所以它是"演示与内部工具"的答案，不是 C 端产品的答案。

**Q：演示应用的架构原则？**
重活在线下（预计算静态化）、前端只做渲染与交互、缓存分粒度设计、外部依赖全部有兜底。演示场景的第一优先级是"稳"，不是"全"。

**Q：怎么处理 Streamlit 的重跑机制？**
任何控件变化触发整个脚本重跑。应对：@st.cache_data 缓存昂贵计算、st.session_state 存跨重跑状态、st.form 把多控件输入批量提交。不理解重跑模型，Streamlit 应用必然卡。

**Q：这个项目里哪些决策体现了产品思维？**
演示动线先于界面设计；置信度降级可视化（展示系统的自知）；相似度分数透明展示；准备覆盖能力与边界的演示查询。产品思维 = 始终从"观众 5 分钟内看懂什么"倒推。

---

下一课：[综合项目与求职交付 02：项目复盘——把 24 课写成一份作品集叙事](/posts/research-capstone-02-project-retro-portfolio/)。
