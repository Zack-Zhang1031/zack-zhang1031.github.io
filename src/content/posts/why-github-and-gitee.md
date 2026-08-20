---
title: "为什么我同时维护 GitHub 和 Gitee"
date: 2026-01-05T00:00:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "聊聊同时维护 GitHub 和 Gitee 双仓库的实际动机、同步策略，以及这套方案适合和不适合什么样的项目。"
tags: ["Git", "GitHub", "Gitee", "随笔", "工作流"]
categories: ["随笔", "工具建站"]
---

经常有人问我：为什么要同时维护 GitHub 和 Gitee，不嫌麻烦吗？这篇短文聊聊我的实际考量——不是为了"看起来专业"，而是每个平台确实解决了不同的问题。也会分享我的双仓库同步策略，供同样在纠结要不要开 Gitee 的朋友参考。

---

## 一、为什么要同时用两个平台

### 1.1 GitHub 的优势

| 优势点 | 说明 |
|--------|------|
| **全球最大开源社区** | 项目曝光度天然高，更容易被国际开发者发现 |
| **GitHub Actions** | 免费 CI/CD，每月 2000 分钟免费额度，私有仓库也能用 |
| **GitHub Pages** | 免费静态站点托管 + 自动 HTTPS + 自定义域名 |
| **国际可见度** | 海外开发者搜索工具基本都在 GitHub 上找 |
| **平台对接** | CrazyGames、itch.io 等游戏发行平台要求项目托管在 GitHub |

### 1.2 Gitee 的优势

| 优势点 | 说明 |
|--------|------|
| **国内访问速度** | 不用梯子，clone/push 速度稳定在 MB/s 级别 |
| **国内搜索可见性** | 百度对 Gitee 收录友好，国内开发者搜得到 |
| **Gitee Pages** | 国内 CDN，国内用户访问博客几乎不卡 |
| **企业招聘** | 部分国内公司在简历筛选时会看 Gitee 活跃度 |

### 1.3 对独立游戏开发者的实际意义

这两个平台对我来说不是二选一，而是分工：

- **GitHub**：主战场。源码托管、CI/CD、国际玩家入口、CrazyGames 上架的"前门"
- **Gitee**：镜像 + 国内入口。国内朋友想看代码不用梯子，国内玩家下载游戏资源快

具体到我的项目分工：

| 项目 | GitHub | Gitee | 原因 |
|------|--------|-------|------|
| `myblog`（个人主页） | 主仓库 + Actions 部署 | 镜像 | 国内访问博客 |
| `AtlasSplit` | 主仓库 | 镜像 | 国内开发者下载快 |
| `mind_trip`（游戏） | 主仓库 | 镜像 | 国内玩家入口 |

国际玩家和平台对接走 GitHub，国内用户体验走 Gitee——两边用户都照顾到，才算"完整的发布渠道"。

---

## 二、我的双仓库同步策略

### 2.1 主仓库 vs 镜像仓库

明确一个原则：**GitHub 是主仓库，Gitee 是只读镜像**。

- 所有开发、commit、push 都在 GitHub 上进行
- Gitee 仓库设为只读（不在 Gitee 上直接 commit）
- 同步方向永远单向：GitHub → Gitee

这样做的好处是避免双向同步带来的冲突——Gitee 上的内容永远等于 GitHub 上某个 commit 的快照，没有"哪个版本是最新的"这种问题。

### 2.2 同步方案对比

| 方案 | 实现 | 优点 | 缺点 |
|------|------|------|------|
| **A. 手动 push** | 本地配两个 remote，分别 push | 简单，无配置成本 | 容易忘，每次 push 要敲两条命令 |
| **B. GitHub Actions 自动镜像** | workflow 里 push 到 Gitee | 全自动，push 一次同步两边 | 需要配置 Gitee PAT，依赖 Actions |
| **C. Gitee 的"强制同步"按钮** | 在 Gitee 网页点同步 | 零配置 | 手动触发，慢且经常失败 |

### 2.3 我实际在用的方式

**方案 B 为主，方案 A 偶尔兜底**。GitHub Actions 同步 workflow 配置如下：

```yaml
name: Sync to Gitee

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  mirror:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0    # 必须完整历史，否则 push 会被拒

      - name: Mirror to Gitee
        run: |
          git remote add gitee https://${{ secrets.GITEE_USER }}:${{ secrets.GITEE_TOKEN }}@gitee.com/${{ secrets.GITEE_USER }}/${{ github.event.repository.name }}.git
          git push -f gitee main
```

需要先在仓库 Settings → Secrets and variables → Actions 里加两个 secret：

- `GITEE_USER`：Gitee 用户名（比如 `rainyjensen`）
- `GITEE_TOKEN`：Gitee 的私人令牌（在 Gitee 设置 → 私人令牌生成，勾选 `projects` 权限）

`git push -f` 是强制覆盖，因为镜像只读，不会有真正的"冲突"，每次都用 GitHub 的状态覆盖 Gitee。

### 2.4 为什么不用 Gitee 自带的"强制同步"

Gitee 网页上每个仓库都有"强制同步"按钮，原理是 Gitee 服务器去 GitHub 拉。但实际上：

- 慢，经常要等几十秒到几分钟
- 失败率高，特别是仓库稍大时
- 不能在 push 后自动触发，得手动点

用 GitHub Actions 推送的好处是 push 一发生就同步，且日志在 GitHub 这边可见，失败能立即看到原因。

### 2.5 手动兜底

偶尔 Actions 同步失败（比如 Gitee 服务波动、token 过期），我会临时用本地双 remote 方式手动推一次：

```bash
git remote add gitee https://gitee.com/rainyjensen/<repo>.git
git push -f gitee main
```

这种 fallback 用来应对自动化失效的情况，不作为日常手段。

---

## 三、什么项目适合双平台，什么不适合

### 3.1 适合双平台的项目

| 类型 | 为什么适合 |
|------|------------|
| **个人主页 / 博客** | 国内访问体验差异巨大，Gitee Pages 是刚需 |
| **面向国内开发者的开源工具** | 国内用户下载/clone 速度 |
| **教学项目 / 课程资料** | 学生网络条件不一，多一个入口 |
| **国内游戏项目** | 国内玩家下载游戏资源 |

我的 `AtlasSplit` 就是典型适合双平台——它是给游戏开发者拆图集用的，目标用户里有大量国内 Cocos Creator 开发者，Gitee 镜像能让他们 clone 项目快得多。

### 3.2 不适合双平台的项目

| 类型 | 为什么不适合 |
|------|------------|
| **活跃协作的大型项目** | Issue / PR 在两边难同步，协作成本翻倍 |
| **仅国际受众的项目** | CrazyGames 上架的游戏、英文文档工具等 |
| **依赖 GitHub Actions / Pages 重度定制的项目** | Gitee 没有等价服务，镜像意义有限 |
| **私有项目** | Gitee 私有仓库限制更严（免费版仅 5 人） |

### 3.3 判断标准

一句话：**目标用户是否包含国内开发者**。

- 包含 → 双平台
- 不包含 → 只用 GitHub

不用每个项目都双平台。我自己也是按这个标准筛选——博客和开源工具双平台，纯英文文档项目只用 GitHub。

---

## 四、常见问题答疑

### Q1：两个平台的内容会冲突吗？

**不会**，前提是把 Gitee 当作只读镜像。我的所有 commit 都在 GitHub 上做，Gitee 永远是被强制覆盖的那一方。只要不在 Gitee 网页或本地对 Gitee remote 做任何 commit，两边就不会产生分叉。

如果哪天不小心在 Gitee 上提交了，处理也简单：

```bash
git fetch gitee
git checkout main
git reset --hard gitee/main   # 把 Gitee 的提交拉到本地
git push origin main          # 推到 GitHub，统一为最新
```

之后再让 Actions 重新同步一次即可。

### Q2：Gitee Pages 和 GitHub Pages 有什么区别？

| 维度 | GitHub Pages | Gitee Pages |
|------|--------------|-------------|
| 实名认证 | 不需要 | **需要**（身份证 + 人脸识别） |
| 自定义域名 | 免费 | **免费版不支持**，需要 Gitee Pages Pro |
| HTTPS | 自动签发 Let's Encrypt | 免费版不支持 |
| 部署方式 | GitHub Actions / branch | branch 或 Gitee Go |
| 缓存延迟 | 推送后几分钟内生效 | 免费版有时要等十几分钟 |
| 国内速度 | 一般（看运营商） | 快 |

如果你只是给国内朋友看博客，Gitee Pages 免费版够用；如果要自定义域名 + HTTPS，要么升 Gitee Pages Pro，要么走 CDN。

### Q3：Issue / PR 要不要两边都开？

**不建议**。原因：

- 两边的 Issue / PR 难以同步，回复漏一边很常见
- 协作者不知道去哪个仓库讨论
- 标签、里程碑、看板都得维护两份

我的做法是：

- **GitHub**：开启 Issue / PR，作为唯一协作入口
- **Gitee**：仓库设置为"只读"，关闭 Issue / PR 入口

Gitee 仓库设置里有"仓库管理 → 允许使用 Issues"开关，关掉即可。这样国内用户能看到代码，但提问题会被自动引导到 GitHub。

### Q4：Gitee 的私人令牌权限要怎么勾？

只勾选 `projects`（项目读写）就够了，**不要勾 `user_info`、`emails` 等无关权限**。GitHub Actions 里用的 token 越小越好，万一泄露损失越小。

### Q5：同步 workflow 失败了怎么排查？

常见原因排序：

1. **token 过期**：Gitee 令牌默认有效期 30/90/365 天，过期就 401。重新生成并更新 GitHub Secrets 即可。
2. **Gitee 仓库不存在**：同步前要先在 Gitee 上手动创建同名空仓库。
3. **网络波动**：Gitee 偶尔抽风，重跑 workflow 一般就好。
4. **fetch-depth 不够**：必须 `fetch-depth: 0` 拉完整历史，否则 `git push -f` 会被 Gitee 拒绝（non-fast-forward）。

---

## 五、小结

### 5.1 成本与收益

| 项 | 内容 |
|----|------|
| **维护成本** | 一个 ~20 行的 GitHub Actions workflow + 偶尔检查同步状态 |
| **隐性成本** | Gitee 实名认证、token 续期 |
| **收益** | 国内访问速度、双备份、覆盖国内外用户 |

整体算下来成本极低，对个人开发者来说几乎是稳赚的买卖。

### 5.2 如果只选一个

如果硬要二选一，**选 GitHub**。理由：

- 生态更完整（Actions、Pages、Packages、Codespaces 一条龙）
- 国际可见度
- 工具链兼容性最好（很多第三方服务只对接 GitHub）

**Gitee 作为补充**，在需要国内访问加速时再开。我自己的顺序永远是：先在 GitHub 上把项目跑通，验证有国内访问需求后再开 Gitee 镜像——而不是一开始就两边并行。

如果你也在做面向国内用户的开源项目或个人主页，强烈建议花十分钟配个 Gitee 镜像 workflow，长期收益远大于这十分钟的成本。
