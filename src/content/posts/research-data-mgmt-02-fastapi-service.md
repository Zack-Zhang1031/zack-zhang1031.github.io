---
title: "数据管理与 AI 自动化 02：FastAPI 科研数据服务"
date: 2026-08-29T03:00:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "AI 科研内容课程系列五第 2 课：把平台能力包成 API——FastAPI 路由设计、Pydantic 校验、语义检索端点、限流与错误处理，以及 OpenAPI 文档的免费红利。"
tags: ["FastAPI", "API设计", "Pydantic", "后端服务"]
categories: ["AI课程", "AI工程"]
math: false
---

数据底座就位，这一课把平台能力包成 HTTP API。为什么要 API 层：Streamlit 前端（系列六）、外部调用方、自动化流水线（下一课）都需要一个稳定的程序化入口。API 层是平台从"脚本集合"变成"服务"的标志。

> 前置阅读：[第 1 课 PostgreSQL 知识库](/posts/research-data-mgmt-01-postgres-pgvector/)（本课的查询都打在它的库上）。SSE 流式等高级主题见 [MindTrip 模型与流式部署](/posts/mindtrip-rag-model-and-streaming/)。

## 路由设计：资源导向，版本留位

平台的 API 按资源组织，前缀带版本号：

```
GET  /api/v1/papers/{paper_id}          # 论文详情
GET  /api/v1/papers                     # 列表：field/year 过滤 + 分页
POST /api/v1/search/semantic            # 语义检索（查询文本 → 相似论文）
POST /api/v1/classify                   # 领域分类（标题+摘要 → 领域标签）
GET  /api/v1/health                     # 健康检查
```

设计约定：读取用 GET（参数在 query string），计算型操作（检索、分类）用 POST（输入放 body，避免 URL 长度限制和语义不符）；版本前缀 `/v1` 从第一天就带，将来破坏性变更时 `/v2` 并存，旧调用方不炸。

## 输入校验：Pydantic 是免费的质量门

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(title="ResearchHub API", version="1.0")

class SemanticSearchRequest(BaseModel):
    query: str = Field(min_length=3, max_length=500)
    field: str | None = None
    year_from: int | None = Field(default=None, ge=1950, le=2026)
    topk: int = Field(default=10, ge=1, le=100)

class PaperHit(BaseModel):
    paper_id: str
    title: str
    similarity: float
    year: int | None

@app.post("/api/v1/search/semantic", response_model=list[PaperHit])
def semantic_search(req: SemanticSearchRequest):
    vec = embed_query(req.query)                    # M3 的 Embedding 模型
    rows = query_pgvector(vec, req.field, req.year_from, req.topk)
    if not rows:
        return []                                   # 空结果是正常响应，不是错误
    return rows
```

Pydantic 模型一次定义三件事：请求体结构、校验规则（长度、范围）、响应结构（`response_model` 保证输出不会多漏字段——比如数据库行里的内部字段不会意外暴露）。校验失败的请求 FastAPI 自动返回 422 和错误详情，一行代码不用写。

## 服务层的组织结构

别把 SQL 和模型调用堆在路由函数里。分层：

```
src/research_hub/service/
├── main.py          # FastAPI app、路由
├── schemas.py       # Pydantic 模型
├── repository.py    # 数据库访问（psycopg 查询函数）
└── models.py        # Embedding/分类模型的加载与推理
```

`repository.py` 是唯一碰 SQL 的地方——路由测逻辑时用假的 repository 替换（依赖注入），单元测试不需要真数据库。Embedding 模型在应用启动时加载一次（`@app.on_event("startup")` 或 lifespan），不要每个请求加载——模型加载是秒级操作，放在请求路径上等于自杀。

## 生产级细节：限流、超时、错误语义

**错误语义要分级**：客户端输入错（422，Pydantic 自动）、资源不存在（404）、上游模型/数据库故障（503 + 明确信息）。别把所有异常都兜成 500：

```python
@app.get("/api/v1/papers/{paper_id}")
def get_paper(paper_id: str):
    row = repository.get_paper(paper_id)
    if row is None:
        raise HTTPException(404, detail=f"paper not found: {paper_id}")
    return row
```

**限流**：检索端点背后是 Embedding 推理，算力有限。用 `slowapi` 加个保守上限（如 30 次/分钟/IP），防止脚本误循环把服务打挂。

**超时**：数据库查询设 statement_timeout，模型推理包超时——上游挂了不能让请求无限挂着，快速失败比缓慢成功更保护系统。

**文档红利**：FastAPI 自动生成 OpenAPI 文档（`/docs`）。这份可交互文档就是 API 的契约说明书，前端联调和外部对接都靠它，零额外成本。

## 与前端和流水线的接口约定

系列六的 Streamlit 前端和下一课的 Prefect 流水线都是这个 API 的客户端。约定：流水线打标走 `/api/v1/classify`（不复用模型文件，直接调服务——模型只有一个部署实例，版本永远一致）；前端检索走 `/api/v1/search/semantic`。**所有能力只暴露一个入口**是服务化相对脚本复用的最大优势：模型升级只改服务端，调用方无感。

## 踩坑排查

| 症状 | 原因 | 处理 |
|---|---|---|
| 第一个请求极慢 | 模型在请求路径上加载 | 启动时 lifespan 加载 |
| 响应里漏出内部字段 | 没设 response_model | 显式 response_model 过滤 |
| 高并发下数据库连接耗尽 | 每次请求新建连接 | 连接池（psycopg_pool） |
| 检索请求堆积打满 GPU | 无限流 | slowapi 限流 + 超时 |
| 本地能跑部署后 422 | 请求字段名大小写不一致 | 以 /docs 里的 schema 为准联调 |
| 服务重启期间请求全挂 | 无健康检查与优雅退出 | /health + 滚动重启 |

## 作品集证据

本课产出：带 OpenAPI 文档的服务、分层的代码结构、限流/超时/错误语义的完整处理。"我写服务的第一反应是先定契约（schema）再写逻辑"——这句话背后就是这一课的全部实践。

## 练习

1. 实现全部 5 个端点并在 /docs 里手工联调一遍。
2. 用假 repository 为检索端点写单元测试（覆盖正常、空结果、422 三种路径）。
3. 加限流后用脚本压测，观察超限请求的响应码与头部。
4. 给分类端点加响应缓存（相同输入 5 分钟内直接返回），测量命中率与延迟变化。

## 面试常问

**Q：GET 和 POST 在本课怎么分工？**
幂等的资源读取用 GET（参数进 query，可缓存可分享链接）；带复杂输入的计算型操作（检索/分类）用 POST + body——语义上它们不是"获取资源"，且输入放 URL 有长度限制与日志泄露问题。

**Q：Pydantic 在服务里的价值？**
一次定义同时得到输入校验（自动 422）、输出过滤（response_model 防内部字段泄露）、OpenAPI 文档生成。契约即代码，文档永不和实现脱节。

**Q：模型服务怎么避免重复加载？**
启动钩子（lifespan）加载一次存应用状态，请求间共享；多 worker 部署时每个进程一份（显存/内存预算要按 worker 数算）；更大规模时模型拆成独立推理服务（如 vLLM/Triton），API 层只转发。

**Q：为什么流水线也要走 API 而不是直接调模型？**
单一入口保证模型版本、预处理逻辑全局一致；服务层的限流、监控、日志自动覆盖流水线调用；模型升级不需要改任何调用方。

---

下一课：[数据管理与 AI 自动化 03：Prefect 数据流水线——让平台自己转起来](/posts/research-data-mgmt-03-prefect-pipeline/)。
