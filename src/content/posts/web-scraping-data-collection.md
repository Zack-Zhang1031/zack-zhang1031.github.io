---
title: "数据采集与爬虫：合规、稳定地拿到你想要的数据"
date: 2026-08-27T20:00:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "从 API 优先原则讲起，覆盖 requests 抓取、解析、限速重试、增量去重、Scrapy 框架和 Playwright 浏览器渲染，以及爬虫工程的合规边界。"
tags: ["爬虫", "数据采集", "requests", "Scrapy", "Playwright"]
categories: ["数据采集", "爬虫工程"]
math: false
---

做 AI 项目，数据是燃料。我做过几个需要外部数据的项目，最深的体会是：**爬虫的难点从来不是"怎么把网页下载下来"，而是"怎么稳定、合规、可恢复地持续拿到数据"**。写出一个能跑的爬虫只要半天，写出一个跑一个月不出事的爬虫，要考虑限速、重试、去重、断点续传、页面结构变化告警——这才是工程。

这篇按我自己的决策顺序来讲：能调 API 就不爬页面，能静态抓就不上浏览器，最后再谈框架和合规。

> 前置阅读：[Linux + Python 环境基础](/posts/linux-python-environment-basics/)（环境搭建）、[Pandas 数据分析与可视化](/posts/pandas-data-analysis-visualization/)（采到数据之后的处理）。

## 第一原则：先找 API，别急着写爬虫

很多网站的数据其实有官方或半官方的获取通道，比爬虫稳定一百倍：

- **官方 API**：arXiv、OpenAlex、Crossref、GitHub、Twitter/X 都有。做科研数据相关项目时，arXiv 的 API 和 OpenAlex 的 REST 接口能覆盖绝大部分论文元数据需求，带分页、带字段筛选，还明确告诉你限速规则。
- **页面里的隐藏接口**：打开浏览器开发者工具的 Network 面板，翻页时看 XHR 请求——很多"动态网页"背后就是一个返回 JSON 的接口，直接请求它比解析 HTML 舒服得多。
- **数据集平台**：Kaggle、HuggingFace Datasets、政府开放数据，能直接下载就别自己采。

只有这三条路都走不通，才轮到写传统爬虫。这个顺序省下的时间，远比学解析技巧多。

## 静态抓取：requests + 解析

静态页面（HTML 在首次响应里就完整返回）用 requests 就够了。核心骨架：

```python
import requests
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": "ResearchBot/1.0 (contact: you@example.com)",  # 诚实标明身份
}

resp = requests.get("https://example.com/list?page=1",
                    headers=HEADERS, timeout=10)
resp.raise_for_status()

soup = BeautifulSoup(resp.text, "html.parser")
for item in soup.select(".paper-item"):
    title = item.select_one(".title").get_text(strip=True)
    link = item.select_one("a")["href"]
    print(title, link)
```

三个细节决定这套代码能不能上生产：

**timeout 必须给。** 不给 timeout 的 requests 在网络抖动时会永远挂住，整个爬虫卡死。我给连接 5 秒、读取 10 秒起步。

**CSS 选择器比 XPath 好维护。** `soup.select(".paper-item .title")` 一眼能看懂；长 XPath 在页面改版时维护成本高。选择器尽量选语义化的 class，避开 `div > div:nth-child(3)` 这种结构性路径——页面一改版就碎。

**解析失败要区分"没数据"和"页面变了"。** 选择器匹配到 0 个结果时，可能是这一页真的空，也可能是页面结构改了。我的做法是：关键列表页匹配数为 0 时打 WARNING 日志并保存原始 HTML 快照，方便事后定位。

## 限速与重试：做个体面的访问者

```python
import time
import random
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

session = requests.Session()
retries = Retry(
    total=3,
    backoff_factor=1,                 # 第 n 次重试等 2^(n-1) 秒
    status_forcelist=[429, 500, 502, 503, 504],
    allowed_methods=["GET"],
)
session.mount("https://", HTTPAdapter(max_retries=retries))

def polite_get(url):
    time.sleep(random.uniform(1.0, 2.5))   # 随机间隔，别打满对方服务器
    return session.get(url, headers=HEADERS, timeout=10)
```

这套组合是我在项目里验证过的配置：随机 1–2.5 秒间隔 + 指数退避重试 + 只对 5xx/429 重试。对 4xx（403/404）重试没有意义——403 是被拒了，重试只会让对方封得更狠；404 是资源不存在，重试一万次也不会有。

## 增量抓取与去重：爬虫的续命机制

全量重爬既慢又不礼貌。生产爬虫必须记住"我抓到哪了"：

```python
import json
import hashlib
from pathlib import Path

STATE_FILE = Path("crawler_state.json")
SEEN_FILE = Path("seen_ids.json")

def load_state():
    state = json.loads(STATE_FILE.read_text()) if STATE_FILE.exists() else {}
    seen = set(json.loads(SEEN_FILE.read_text())) if SEEN_FILE.exists() else set()
    return state, seen

def item_id(title, link):
    return hashlib.md5(f"{title}|{link}".encode()).hexdigest()

state, seen = load_state()
start_page = state.get("last_page", 1)

for page in range(start_page, start_page + 10):
    resp = polite_get(f"https://example.com/list?page={page}")
    items = parse(resp.text)              # 解析逻辑略
    new_items = [it for it in items if item_id(it["title"], it["link"]) not in seen]

    save_items(new_items)                 # 落盘
    seen.update(item_id(it["title"], it["link"]) for it in new_items)

    state["last_page"] = page + 1
    STATE_FILE.write_text(json.dumps(state))
    SEEN_FILE.write_text(json.dumps(list(seen)))
```

设计要点：**每页抓完就落盘状态和结果**，进程被 kill 了下次从断点继续，而不是从头再来。去重键用"标题+链接"的哈希，比单纯 URL 稳——有些站点同一篇文章会出现在多个列表页，URL 参数还不一样。

## Scrapy：量大的时候上框架

单脚本 requests 适合几百到几千页的抓取；要上十万页、要并发、要 pipeline 化处理，就该用 Scrapy：

```python
import scrapy

class PaperSpider(scrapy.Spider):
    name = "papers"
    start_urls = ["https://example.com/list?page=1"]

    custom_settings = {
        "DOWNLOAD_DELAY": 1.5,                    # 限速是礼貌也是自保
        "CONCURRENT_REQUESTS_PER_DOMAIN": 2,
        "RETRY_TIMES": 3,
        "USER_AGENT": "ResearchBot/1.0 (contact: you@example.com)",
    }

    def parse(self, response):
        for item in response.css(".paper-item"):
            yield {
                "title": item.css(".title::text").get(),
                "link": item.css("a::attr(href)").get(),
            }

        next_page = response.css("a.next-page::attr(href)").get()
        if next_page:
            yield response.follow(next_page, callback=self.parse)
```

跑起来：`scrapy runspider paper_spider.py -o papers.jsonl`。Scrapy 的价值不在语法，而在它内置的工程能力：自动限速（AutoThrottle 会根据响应时间动态调整）、请求去重、并发控制、中间件管线（可以在 pipeline 里接清洗、入库、告警）。这些用 requests 自己写，等于重新发明一遍。

## 动态页面：Playwright 兜底

有些页面内容是 JavaScript 渲染出来的，requests 拿到的 HTML 是空壳。这时上 Playwright——用真实浏览器去渲染：

```python
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto("https://example.com/dynamic-list")
    page.wait_for_selector(".paper-item")     # 等目标元素渲染出来

    items = page.query_selector_all(".paper-item")
    for it in items:
        print(it.query_selector(".title").inner_text())

    browser.close()
```

Playwright 的代价：慢（每次开一个浏览器进程）、重（内存占用高）、更容易被识别。所以它永远是兜底方案——优先找隐藏 JSON 接口，实在找不到再用浏览器。用 Playwright 时还有一个技巧：`page.route()` 拦截掉图片、字体、CSS 请求，只加载 HTML 和必要 JS，速度能快好几倍。

## 合规边界：技术之外的硬约束

这部分不是建议，是底线：

1. **看 robots.txt 和服务条款。** `https://example.com/robots.txt` 明确写了哪些路径不许爬。robots.txt 在法律上不是授权文件，但无视它在很多判例里是重要的不利证据。
2. **别碰需要登录的内容和明确付费墙后面的内容。**
3. **控制频率。** 把对方服务器打挂，从技术问题变成法律问题。我的默认上限：每秒不超过 1 个请求，对方明确写了限速就按对方的来。
4. **版权与署名。** 采到的数据用于研究分析通常没问题，用于再发布、商用训练就是另一回事。保留来源字段，需要引用时能溯源。
5. **个人信息零容忍。** 用户评论里可能带手机号、邮箱，落库前做脱敏，能不采就不采。

我自己的项目原则：优先选择 arXiv、OpenAlex 这类**明确鼓励程序化访问**的开放数据源。它们的 API 文档里直接写着限速和批量下载方式，合规风险最低，数据质量还高。

## 踩坑排查清单

| 症状 | 原因 | 处理 |
|---|---|---|
| 返回 403 | 被识别为爬虫 / 触发风控 | 降速、换正常 UA、检查是否需要 Cookie；持续 403 就停手 |
| 解析结果为空 | 页面改版或内容是 JS 渲染 | 保存 HTML 快照对比；确认是否要走 Playwright |
| 抓到一半超时卡死 | 没设 timeout | 所有请求加 timeout，重试用指数退避 |
| 重复数据一大堆 | 没去重 / 去重键不稳 | 用内容哈希做去重键，持久化 seen 集合 |
| 程序重启后从头再爬 | 状态没落盘 | 每页抓完更新 state 文件 |
| 中文乱码 | 页面编码不是 UTF-8 | `resp.encoding = resp.apparent_encoding` |
| IP 被封 | 频率太高 | 降速 + 随机间隔；量大考虑代理池（注意合规） |

## 练习

1. 用 OpenAlex API 拉取"2024 年发表的 NLP 领域论文"前 200 条（用 cursor 分页），存成 CSV 并用 Pandas 统计各机构论文数。
2. 写一个带状态文件的增量爬虫，抓任意公开博客的列表页，手动 kill 掉进程再重启，验证它能从断点继续。
3. 用 Playwright 打开一个动态页面，用 `page.route()` 拦截所有图片请求，对比拦截前后的加载耗时。
4. 找三个你常用的网站，读它们的 robots.txt，记录各自禁止哪些路径。

## 面试常问

**Q：requests 和 Scrapy 怎么选？**
规模小、目标站点少、逻辑简单——requests + BeautifulSoup 一个文件搞定；需要并发、限速、去重、pipeline、多站点——Scrapy。判断标准是"你会不会开始自己造 Scrapy 已经造好的轮子"。

**Q：如何应对反爬？**
合规前提下：降速、随机间隔、正常 UA、会话保持；JS 渲染用 Playwright。滑块、验证码这类强对抗场景，首先要问的不是"怎么破"，而是"这个数据值不值得、有没有授权渠道"——绕过访问控制本身可能就是违规行为。

**Q：怎么保证采到的数据质量？**
三层：采集时校验字段完整性（必填字段缺失就告警）；落库时去重；采集后抽样人工检查 + 用 Pandas 跑分布统计（比如日期分布突变往往意味着页面结构变了）。

**Q：增量抓取怎么设计？**
核心是外部化状态：游标（页码/cursor）+ 已见 ID 集合，都持久化到磁盘，每处理完一页就更新。这样进程崩溃、机器重启都能续跑。

**Q：robots.txt 有法律效力吗？**
它本身不是访问控制机制，只是站点声明的意愿。但无视它去抓取，在多起司法判例中被认定为"未经授权访问"的重要参考因素。工程上遵守它成本很低，法律上无视它风险很高，没有理由不守。

---

数据拿到手之后，下一步就是让它产生价值。下一篇进入机器学习的主线：[机器学习基础与 Scikit-learn：把建模流程跑通一遍](/posts/ml-basics-scikit-learn/)。
