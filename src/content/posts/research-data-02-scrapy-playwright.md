---
title: "科研数据获取与分析 02：用 Scrapy 与 Playwright 补充采集"
date: 2026-08-28T16:20:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "AI 科研内容课程系列二第 2 课：API 覆盖不到的数据怎么办——用 Scrapy 批量抓取会议页面、用 Playwright 处理 JS 渲染，讨论分页、限速、重试与署名边界。"
tags: ["Scrapy", "Playwright", "爬虫", "数据采集"]
categories: ["AI课程", "数据采集"]
math: false
---

上一课的 API 能拿到论文的"官方元数据"，但案例平台还需要一些 API 没有的东西：会议的录取名单页面、 workshop 的日程、某些实验室的出版物列表。这些数据只有网页，没有 API——这一课就是爬虫在科研场景的正确用法。

> 前置阅读：[数据采集与爬虫](/posts/web-scraping-data-collection/)——那一篇讲透了限速、重试、去重、合规的通用原理，本课把它们落到 Scrapy/Playwright 框架和科研场景里，并接进平台的归一化层。

## 场景定义：采什么，为什么

以"顶会录取论文列表"为例。OpenAlex 收录会议论文有滞后，刚放榜的 NeurIPS/ICLR 录取名单往往先出现在会议官网或 OpenReview 页面上。平台要采的字段很朴素：标题、作者、track（oral/poster）、页面链接。

先定边界，再写代码——爬虫项目的失败一半是边界没定清：

- **分页机制**：名单是分页还是一页长列表？URL 参数长什么样？
- **渲染方式**：右键"查看网页源代码"里有没有数据？有 → 静态抓取；没有 → JS 渲染，上 Playwright。
- **量级与频率**：一次性的名单快照，还是需要每月复查更新？决定要不要增量机制。
- **合规**：看 robots.txt 和站点条款，学术会议页面通常对抓取友好，但确认一下成本为零。

## Scrapy 项目结构：把爬虫也放进 src 布局

沿用[系列一第 4 课](/posts/ai-research-eng-04-python-project-engineering/)的工程骨架，爬虫不是一次性脚本，而是项目的一个模块：

```python
# src/research_hub/ingest/conf_spider.py
import scrapy
from urllib.parse import urljoin

class ConfListSpider(scrapy.Spider):
    name = "conf_list"

    custom_settings = {
        "DOWNLOAD_DELAY": 2,                       # 比通用爬虫更保守
        "CONCURRENT_REQUESTS_PER_DOMAIN": 1,       # 学术站点，单线程足够
        "RETRY_TIMES": 3,
        "USER_AGENT": "ResearchHub/0.1 (research; contact: you@example.com)",
        "ROBOTSTXT_OBEY": True,                    # 明确遵守 robots.txt
    }

    def __init__(self, conf_url, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.start_urls = [conf_url]

    def parse(self, response):
        for row in response.css(".paper-row"):
            yield {
                "title": row.css(".paper-title::text").get("").strip(),
                "authors": row.css(".paper-authors::text").get("").strip(),
                "track": row.css(".track-label::text").get("poster"),
                "url": urljoin(response.url, row.css("a::attr(href)").get("")),
                "source": "conf_page",
            }

        next_page = response.css("a.pagination-next::attr(href)").get()
        if next_page:
            yield response.follow(next_page, callback=self.parse)
```

运行与落盘（JSONL，与 API 采集器的输出格式对齐）：

```bash
scrapy runspider src/research_hub/ingest/conf_spider.py \
  -a conf_url="https://example-conf.org/accepted" \
  -o data/raw/conf_list_$(date +%F).jsonl
```

## Item Pipeline：抓取时就做清洗和去重

Scrapy 的 pipeline 是"边采边处理"的钩子。加两个：字段清洗 + 标题去重：

```python
# src/research_hub/ingest/pipelines.py
import hashlib
import re

class NormalizePipeline:
    def process_item(self, item, spider):
        item["title"] = re.sub(r"\s+", " ", item["title"])
        item["paper_id"] = "conf:" + hashlib.md5(
            item["title"].lower().encode()
        ).hexdigest()[:12]
        return item

class DedupPipeline:
    def __init__(self):
        self.seen = set()

    def process_item(self, item, spider):
        if item["paper_id"] in self.seen:
            raise scrapy.exceptions.DropItem(f"duplicate: {item['title']}")
        self.seen.add(item["paper_id"])
        return item
```

在 `custom_settings` 里启用：`"ITEM_PIPELINES": {"research_hub.ingest.pipelines.NormalizePipeline": 100, ...}`（数字是执行顺序）。**清洗逻辑写在 pipeline 而不是 spider 里**，解析规则变了只改 pipeline，spider 保持稳定。

## Playwright：OpenReview 这类 JS 渲染页面

OpenReview 的论文列表是客户端渲染的，requests 拿到的是空壳。Playwright 介入的原则是**只渲染、拿数据、不模拟复杂交互**：

```python
from playwright.sync_api import sync_playwright

def fetch_openreview_list(venue_url: str, limit: int = 500):
    results = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        # 拦截图片/字体/样式，只留文档和 XHR，提速数倍
        page.route(r"\.(png|jpg|woff2?|css)$", lambda r: r.abort())
        page.goto(venue_url, wait_until="networkidle")
        page.wait_for_selector(".note_item")

        for el in page.query_selector_all(".note_item")[:limit]:
            results.append({
                "title": el.query_selector("h4").inner_text().strip(),
                "url": el.query_selector("a").get_attribute("href"),
                "source": "openreview",
            })
        browser.close()
    return results
```

`wait_until="networkidle"` + `wait_for_selector` 双保险：等网络静默、再等目标元素出现，避免"渲染还没完成就开始抓"的空结果。抓到的数据走与 Scrapy 相同的归一化函数——**不管从哪采，出口都是统一结构**，这是平台数据层最重要的纪律。

## 科研采集的特殊注意点

相比通用爬虫，科研场景有三点额外要求：

**署名与归属。** 每条记录带 `source` 和原始 URL。报告里用到这批数据时，注明"数据采集自 XX 会议官网，采集时间 XX"——学术场景对出处的要求比一般商业爬虫更高。

**保守的访问频率。** 学术站点很多是志愿者维护的基础设施，没有商业级的抗压能力。`DOWNLOAD_DELAY: 2` + 单并发是我的默认配置；名单类数据是一次性快照，慢一点没有任何代价。

**快照思维。** 会议名单会变（撤稿、补录），每次采集的文件名带日期（`conf_list_2026-08-28.jsonl`），平台存多份快照而不是覆盖。快照之间的 diff 本身就是有价值的信息（哪些论文被撤了）。

## 与 API 采集层的合流

两类采集器的产出在 `data/raw/` 汇合，由[上一课](/posts/research-data-01-open-metadata-apis/)的归一化逻辑统一成 `Paper` 记录。归一化时爬虫数据有两件事必须做：补 `fetched_at`；`paper_id` 用标题哈希（网页数据没有 DOI），并在后续与 API 数据合并时参与标题相似度去重。

## 踩坑排查

| 症状 | 原因 | 处理 |
|---|---|---|
| Scrapy 抓 0 条 | 页面是 JS 渲染 | 查看源代码确认；换 Playwright |
| Playwright 选择器超时 | 渲染慢/选择器失效 | wait_until networkidle + 快照 HTML 对比 |
| 被抓站点 403 | 频率过高或 UA 可疑 | 降速到 2s+/请求；诚实 UA 带联系方式 |
| 去重后数据少了一半 | 标题规范化过度（大小写/空格差异被抹掉导致误判是小事，反之漏判更常见） | 规范化规则写测试守住 |
| 翻页死循环 | 最后一页的"下一页"链接指向自己 | 记录已访问 URL 集合，命中即停 |
| 定时复查时全量重抓 | 没做快照 diff | 文件名带日期，入库前与上一快照比对 |

## 作品集证据

本课产出：一个遵守 robots.txt、带 pipeline 清洗去重的 Scrapy spider，一个 Playwright 渲染抓取器，以及"API + 网页双通道归一化"的数据合流设计。面试时这套东西对应的岗位语言是："我做过异构数据源的采集与实体对齐"。

## 练习

1. 选一个公开的会议录取名单页面，写 Scrapy spider 抓全量并输出 JSONL，确认 robots.txt 允许。
2. 加一个"已访问 URL"集合防止翻页循环，并在最后一页验证 spider 正常终止。
3. 用 Playwright 抓一个 JS 渲染的学术页面，对比拦截静态资源前后的耗时。
4. 对两个日期的名单快照做 diff，列出新增和消失的论文。

## 面试常问

**Q：Scrapy 和 Playwright 怎么选？**
静态 HTML、多页批量、需要并发与 pipeline——Scrapy；内容是 JS 渲染、需要等 DOM 就绪——Playwright。两者不是替代关系：复杂项目里 Playwright 只负责"拿到渲染后的 HTML"，解析和流程仍可以复用统一的数据层。

**Q：学术数据采集的合规要点？**
遵守 robots.txt 与服务条款、保守频率（这些是公共基础设施）、诚实 UA 带联系方式、数据保留来源与采集时间、报告里注明出处。量级大时优先联系站点方获取批量数据通道。

**Q：网页数据怎么和 API 数据合并去重？**
网页数据缺强标识符，用规范化标题哈希做主键，与 API 数据合并时用标题相似度 + 作者列表做实体对齐；保留两边来源字段，冲突字段按来源可信度（Crossref > OpenAlex > 网页）取信。

**Q：ITEM_PIPELINES 的数字是什么意思？**
执行优先级，数字小的先执行。清洗（100）应在去重（300）之前——先规范化标题再算哈希，否则同一标题的不同空格形态会被当成两条。

---

下一课：[科研数据获取与分析 03：元数据清洗与对齐](/posts/research-data-03-cleaning-pandas/)。
