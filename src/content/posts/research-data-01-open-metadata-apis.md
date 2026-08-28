---
title: "科研数据获取与分析 01：arXiv、OpenAlex 与 Crossref API 实战"
date: 2026-08-28T15:40:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "AI 科研内容课程系列二第 1 课：用三大公开科研元数据 API 搭建案例平台的采集层——分页、限速、重试、字段映射与来源归一化。"
tags: ["arXiv", "OpenAlex", "Crossref", "API", "数据采集"]
categories: ["AI课程", "数据采集"]
math: false
---

系列二开工，目标是一个里程碑：**M1——科研元数据数据集**。这一课解决数据的第一个来源：官方 API。arXiv、OpenAlex、Crossref 三个来源各有分工——arXiv 有预印本全文链接和分类，OpenAlex 有丰富的引用与机构关系，Crossref 是出版商 DOI 元数据的权威。平台的策略是以 OpenAlex 为主干，其余两家做补充和交叉校验。

> 前置阅读：[数据采集与爬虫](/posts/web-scraping-data-collection/)（限速、重试、增量抓取的原理本篇直接复用）、[系列一第 4 课：配置与测试](/posts/ai-research-eng-04-python-project-engineering/)（采集代码落在 src 布局里）。

## OpenAlex：主力数据源

OpenAlex 是免费开放的知识图谱 API，覆盖 2 亿+ 论文实体，无需密钥，在请求里带上邮箱即可进入"礼貌池"（更稳定的限速待遇）。

核心接口是 `/works`，支持过滤、搜索和游标分页：

```python
import requests
import time
from research_hub.config import settings

BASE = settings.openalex_base
PARAMS_BASE = {"mailto": settings.openalex_email}

def fetch_works(field_id: str, start: str, end: str, per_page: int = 200):
    """按领域和日期范围拉取论文元数据，游标分页直到取完。"""
    cursor = "*"
    while True:
        params = {
            **PARAMS_BASE,
            "filter": f"primary_topic.field.id:{field_id},"
                      f"from_publication_date:{start},to_publication_date:{end}",
            "per-page": per_page,
            "cursor": cursor,
        }
        resp = requests.get(f"{BASE}/works", params=params,
                            timeout=settings.request_timeout)
        resp.raise_for_status()
        payload = resp.json()

        for work in payload["results"]:
            yield work

        cursor = payload["meta"].get("next_cursor")
        if not cursor or not payload["results"]:
            break
        time.sleep(0.2)   # 礼貌池允许 10 req/s，我们留足余量
```

两个工程细节：

**用游标分页，不用 offset。** OpenAlex 的 `page` 参数分页在深翻页时不稳定（数据在实时更新），官方推荐 cursor——每次响应返回 `next_cursor`，原样带回去拿下一页。深分页全量采集必须用游标。

**filter 语法是生产力的核心。** 上面演示了"领域 + 日期范围"组合过滤。常用过滤器还有 `authorships.institutions.id`（按机构）、`cited_by_count:>100`（高被引）、`is_oa:true`（只要开放获取）。过滤器在服务端执行，比拉回全量再本地过滤快几个量级。

## arXiv：预印本与全文入口

arXiv 提供 OAI-PMH 和一套查询 API。查询 API 按分类和日期检索，返回 Atom XML：

```python
import feedparser   # pip install feedparser

def fetch_arxiv(category: str, start: int = 0, batch: int = 100):
    url = (
        "https://export.arxiv.org/api/query?"
        f"search_query=cat:{category}&start={start}&max_results={batch}"
        "&sortBy=submittedDate&sortOrder=descending"
    )
    feed = feedparser.parse(requests.get(url, timeout=30).text)
    for entry in feed.entries:
        yield {
            "arxiv_id": entry.id.split("/abs/")[-1],
            "title": entry.title.replace("\n", " "),
            "abstract": entry.summary.replace("\n", " "),
            "authors": [a.name for a in entry.authors],
            "categories": [t.term for t in entry.tags],
            "published": entry.published,
            "pdf_url": next(l.href for l in entry.links if l.type == "application/pdf"),
        }
```

arXiv 的硬规则：**连续请求间隔 ≥ 3 秒**，官方文档写得很明确。批量拉数据宁可慢不要快，封 IP 的代价比等几个小时大得多。arXiv 对平台的独特价值是 `pdf_url`——系列四的全文解析课会从这里下载 PDF。

## Crossref：DOI 元数据交叉校验

Crossref 是 DOI 注册机构的数据库，出版商元数据最全。平台用它做两件事：补充非预印本论文的正式发表信息、校验 arXiv/OpenAlex 两边字段的一致性（标题、作者、年份对不上时以 Crossref 为准的可能性高）。

```python
def fetch_crossref_by_doi(doi: str):
    resp = requests.get(f"https://api.crossref.org/works/{doi}",
                        headers={"User-Agent": f"ResearchHub/0.1 (mailto:{settings.openalex_email})"},
                        timeout=settings.request_timeout)
    resp.raise_for_status()
    msg = resp.json()["message"]
    return {
        "doi": doi,
        "title": (msg.get("title") or [""])[0],
        "container": (msg.get("container-title") or [""])[0],   # 期刊/会议名
        "publisher": msg.get("publisher"),
        "issued": msg.get("issued", {}).get("date-parts", [[None]])[0][0],
    }
```

Crossref 的数据"脏"在细节里：`title` 是列表、日期是 `date-parts` 嵌套数组、字段缺失是常态。解析函数必须全部按"可能缺失"来写——这就是[上一课](/posts/ai-research-eng-04-python-project-engineering/)数据契约测试的用武之地。

## 归一化：三个来源一张表

三个来源字段各异，采集层要输出统一的 `Paper` 记录。关键设计：

- **主键策略**：DOI 优先，arXiv ID 次之，都没有就用标题哈希兜底。同一篇论文在 arXiv（预印本）和 Crossref（正式发表）各有记录，靠 DOI 关联——arXiv 记录里常带 `doi` 字段指向正式版。
- **来源溯源**：每条记录保留 `source` 字段（arxiv/openalex/crossref）和 `fetched_at` 采集时间。数据出问题时这两个字段是排查的起点。
- **原样保留 + 解析字段并存**：原始 JSON 整体存 `raw` 列，解析出的干净字段平铺。解析逻辑改进了可以重跑，原始数据永远不用重新采集。

```python
# 统一输出（示意）
{
    "paper_id": "doi:10.48550/arxiv.1706.03762",
    "title": "Attention Is All You Need",
    "year": 2017,
    "source": "openalex",
    "fetched_at": "2026-08-28T15:00:00",
    "raw": {...}   # 原始 JSON
}
```

## 落地：每页落盘与断点续传

采集器的最后一块是可靠性，复用[爬虫篇](/posts/web-scraping-data-collection/)的模式：**每页结果追加写入 JSONL，游标持久化到 state 文件**：

```python
def collect(field_id, start, end, out_path, state_path):
    state = load_json(state_path, default={})
    cursor = state.get("cursor", "*")

    with open(out_path, "a", encoding="utf-8") as f:
        for work in iterate_with_cursor(field_id, start, end, cursor):
            f.write(json.dumps(normalize(work), ensure_ascii=False) + "\n")
            state["cursor"] = work["_next_cursor"]
            if work["_page_done"]:
                save_json(state_path, state)   # 每页落一次状态
```

进程中断后重跑，从上次游标继续——按领域 × 年份切片采集时，这个机制让几十万条的采集任务可以随时暂停和恢复。

## 踩坑排查

| 症状 | 原因 | 处理 |
|---|---|---|
| OpenAlex 深翻页丢数据 | 用了 page 参数 | 改 cursor 分页 |
| arXiv 返回 403 | 请求间隔太短 | 间隔 ≥3 秒；检查是否被临时封禁 |
| Crossref 解析 KeyError | 字段缺失是常态 | 全部用 `.get()` + 默认值，契约测试守住 |
| 同一论文重复入库 | 预印本/正式版未关联 | DOI 优先的去重键 |
| 采到一半中断了从头再来 | 状态没落盘 | 游标持久化，每页更新 |
| 中文标题乱码 | 响应编码识别错 | `resp.encoding = "utf-8"` 显式指定 |

## 作品集证据

本课产出：`src/ingest/` 下的三个来源采集器 + 统一 `Paper` 记录结构 + 断点续传机制。这是平台 M1 里程碑的第一块积木，面试时可以直接讲"我怎么把三个异构 API 归一化成一张干净的表"。

## 练习

1. 用 OpenAlex 拉取 2024 年 `cs.CL` 领域的前 1000 篇论文，统计引用数 Top 10 及其标题。
2. 实现游标持久化：采集中途手动中断，重跑验证从断点继续。
3. 对同一篇有 DOI 的 arXiv 论文，分别从 arXiv 和 Crossref 取元数据，列出两边不一致的字段并分析原因。
4. 为三个解析函数各写一组数据契约测试（含缺失字段用例）。

## 面试常问

**Q：OpenAlex 游标分页和 offset 分页的区别？**
offset 分页假设数据集在翻页期间静止，实时更新的数据深翻页会重复或遗漏；游标是服务端生成的位置标记，与数据快照绑定，深分页全量采集必须用游标。

**Q：多个数据源的记录怎么做实体对齐？**
优先用强标识符（DOI > arXiv ID > ISBN），缺失时退到弱信号组合（标题规范化 + 作者 + 年份的相似度）。对齐决策要可解释、可回放，错误合并在科研数据里是硬伤。

**Q：API 采集的合规要点？**
读文档里的限速并留余量、用官方要求的标识（mailto/User-Agent）、尊重 robots 与服务条款、保留来源与采集时间用于溯源。开放数据集不代表没有使用规则。

**Q：采集层的可靠性怎么设计？**
每条数据可追溯（source + fetched_at + raw 原文）、每页落盘、游标持久化断点续传、按维度切片（领域×年份）让任务可分批可重跑。

---

下一课：[科研数据获取与分析 02：用 Scrapy 与 Playwright 补充采集](/posts/research-data-02-scrapy-playwright/)。
