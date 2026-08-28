---
title: "数据管理与 AI 自动化 04：Docker 与 GitHub Actions——打包、CI 与 M4 验收"
date: 2026-08-29T04:20:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "AI 科研内容课程系列五第 4 课（收官/里程碑 M4）：用 Docker 打包 API 服务、GitHub Actions 做测试与构建 CI，完成「服务可部署」里程碑验收。"
tags: ["Docker", "GitHub Actions", "CI/CD", "部署"]
categories: ["AI课程", "AI工程"]
math: false
---

系列五收官课。服务代码能在开发机上跑不算完——这一课把它装进容器、接上 CI，完成里程碑 **M4：数据服务可部署、流水线可持续**。验收标准是：换一台干净机器，几条命令把服务跑起来；每次代码推送，测试自动跑。

> 前置阅读：[第 2 课 FastAPI 服务](/posts/research-data-mgmt-02-fastapi-service/)、[GitHub Actions 部署](/posts/github-actions-hugo-deploy/)（Actions 语法基础那篇讲过）。

## Dockerfile：分层缓存是构建速度的关键

```dockerfile
FROM python:3.12-slim

WORKDIR /app

# 依赖单独一层：requirements 不变时这层走缓存
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 代码层：改动最频繁，放最后
COPY src/ ./src/
COPY pyproject.toml .
RUN pip install --no-cache-dir -e .

# 非 root 运行
RUN useradd -m appuser
USER appuser

EXPOSE 8000
CMD ["uvicorn", "research_hub.service.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

三个要点：

**层序按变更频率排**：基础镜像 → 依赖 → 代码。代码每次提交都变，放最后；依赖层不变就命中缓存，重建从分钟级降到秒级。把 `COPY src/` 放 `pip install` 之前是新手最常见的构建缓存杀手。

**模型不进镜像。** Embedding 模型几百 MB 到几 GB，打进镜像又慢又臃肿。运行时从挂载卷或对象存储加载，镜像只装代码——镜像小、启动快、模型可独立更新。

**非 root + 显式端口**。安全基线与部署约定，写进 Dockerfile 比写在运维文档里可靠。

## docker-compose：服务 + 数据库一把起

本地和测试环境用 compose 把 API 和 PostgreSQL 编排在一起：

```yaml
services:
  db:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s

  api:
    build: .
    environment:
      DATABASE_URL: postgresql://postgres:${DB_PASSWORD}@db:5432/research
    depends_on:
      db:
        condition: service_healthy      # 等数据库真正就绪，不是仅仅启动
    ports: ["8000:8000"]
    volumes:
      - ./models:/models:ro              # 模型只读挂载

volumes:
  pgdata:
```

`depends_on: service_healthy` 是个高频坑的解药：数据库进程启动≠能接受连接，健康检查保证 API 不会在数据库就绪前启动然后崩掉。

## GitHub Actions：CI 的三段式

```yaml
# .github/workflows/ci.yml
name: ci
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: pip                       # 依赖缓存，提速明显

      - run: pip install -e .[dev]
      - run: ruff check src tests          # 质量门
      - run: pytest tests/ -x -q           # 测试

  docker:
    needs: test                            # 测试过了才构建镜像
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - run: docker build -t research-hub:${{ github.sha }} .
      - run: docker run --rm research-hub:${{ github.sha }} python -c "import research_hub"
```

设计意图：**测试是镜像构建的前置**（`needs: test`）——测试不过的代码连镜像都不该有；镜像构建完跑一次 import 冒烟，验证"装得上、导得入"这个最低部署标准。触发器覆盖 push 和 PR：直接推主干和走 PR 的都拦得住。

部署环节（推到镜像仓库、触发服务器更新）本课程只到 CI 边界——真实部署因环境而异，但 CI 通过后的镜像就是可部署的最小单元。

## M4 验收清单

1. 干净机器上 `docker compose up` 一把拉起 db + api，`/api/v1/health` 返回正常。
2. 镜像分层缓存生效：改一行代码的重建在秒级完成。
3. CI 绿：ruff + pytest + 镜像构建 + import 冒烟全过；故意制造一个失败验证拦截生效。
4. 上一课的 Prefect 管线以容器化服务为依赖（调 API 地址），端到端跑通一次日增量。
5. README 更新：一张架构图 + 本地启动命令 + CI 徽章。
6. `git tag m4-service-cicd`。

## 踩坑排查

| 症状 | 原因 | 处理 |
|---|---|---|
| 每次构建都重装依赖 | COPY 代码在 pip install 前 | 层序按变更频率排 |
| compose 起后 API 立刻崩 | 数据库没就绪就连 | healthcheck + condition |
| 镜像 3GB+ | 模型/缓存打进镜像 | 运行时挂载；--no-cache-dir；.dockerignore |
| CI 里测试过本地不过（或相反） | 环境差异 | 在容器里跑测试最彻底；锁依赖版本 |
| Actions 排队极慢 | 缓存没用上 | setup-python 的 cache: pip |
| 密钥进了镜像层 | COPY 了 .env | .dockerignore 排除；密钥走运行时环境变量 |

## 作品集证据

M4 证明"工程交付能力"：可复现的构建、一条命令的部署、每次提交的质量门。配合前三个里程碑，你已经能讲出"从数据到服务"的完整故事。

## 练习

1. 写 Dockerfile 并验证分层缓存：只改代码时构建耗时应秒级。
2. 配 compose 一把拉起，用 curl 验证 /health 和一个检索端点。
3. 提交一个故意让 ruff 失败的 PR，确认 CI 拦截；修复后确认镜像构建触发。
4. 给 README 画架构图（Mermaid 或手绘导出），标出四个里程碑的位置。

## 面试常问

**Q：Docker 镜像分层缓存的原理？**
每一层是只读增量，构建时逐层比对缓存：某层没变且其所有父层没变就复用。所以"变更频率低的内容放前面的层"是镜像构建优化的第一原则。

**Q：CI 里测试和构建的顺序为什么这么定？**
测试便宜构建贵，测试是构建的质量前置：测试不过的代码不该有可部署产物。needs 串行保证了这个语义，也让失败尽早暴露（fast fail）。

**Q：模型文件怎么管理部署？**
不进镜像（体积、更新频率不匹配）。运行时从挂载卷/对象存储加载，或拆独立推理服务。镜像只含代码与依赖，模型版本由部署清单管理。

**Q：compose 和 Kubernetes 的边界？**
compose 管单机上多容器的编排，适合开发、测试、小部署；多机、弹性伸缩、滚动更新、服务发现是 Kubernetes 的领域。项目规模到需要多机容错前，compose 的简单是优势而非缺陷。

---

**里程碑 M4 达成。** 下一课进入收官系列：[综合项目与求职交付 01：Streamlit 集成应用——把五个里程碑拼成一个产品](/posts/research-capstone-01-streamlit-app/)。
