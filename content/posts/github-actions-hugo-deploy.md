---
title: "用 GitHub Actions 自动部署 Hugo 站点到 Pages"
date: 2026-08-05T00:00:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "一份可用的 GitHub Actions 配置，把 Hugo 站点自动构建并部署到 GitHub Pages，包含常见报错的排查方法。"
tags: ["GitHub Actions", "Hugo", "CI/CD", "GitHub Pages", "自动化部署"]
categories: ["工具建站", "CI/CD"]
---

把 Hugo 站点部署到 GitHub Pages，最省心的方式是用 GitHub Actions 自动构建——push 到 main 就自动上线。这篇笔记分享我实际在用的 workflow 配置，以及部署过程中踩过的坑（比如第三方 action 归档、Pages 源配置冲突等）。

---

## 一、前置准备

### 1.1 仓库结构

部署前确保仓库根目录是一个标准的 Hugo 项目：

```
myblog/
├── config.toml          # 或 hugo.toml / config.yaml
├── content/             # 文章 Markdown
├── static/              # 静态资源（图片、视频）
├── themes/              # 主题（建议用 submodule）
│   └── dream/
├── archetypes/
└── .github/
    └── workflows/
        └── hugo.yml     # 本篇要写的 workflow
```

主题建议用 Git submodule 引入，这样 CI 在 checkout 时可以一次性把主题代码也拉下来。如果直接把主题拷进仓库也行，但每次主题更新都要手动同步。

### 1.2 Pages 的两种部署模式

GitHub Pages 在仓库 Settings → Pages 里提供两种 Source：

| 模式 | 工作方式 | 优点 | 缺点 |
|------|----------|------|------|
| **Deploy from branch** | 指定一个分支（如 `gh-pages`），把分支根目录当作站点根 | 配置简单 | 需要手动构建并 push 到 `gh-pages` 分支，构建过程不可见 |
| **GitHub Actions** | 由 workflow 构建并 upload artifact，GitHub 接管部署 | 不依赖额外分支、构建可追溯、可插入自定义步骤 | 需要写一份 workflow |

### 1.3 为什么推荐 Actions 模式

- **不污染分支历史**：不用再维护一个全是构建产物的 `gh-pages` 分支，main 始终是源码。
- **构建过程可追溯**：每次部署都有 Actions 运行日志，构建失败、Hugo 报错都能直接看到。
- **可插入自定义步骤**：比如压缩图片、跑 link checker、生成 OG 图、上传到 Gitee 等都可以串进同一个 workflow。
- **官方支持完善**：`actions/upload-pages-artifact` 和 `actions/deploy-pages` 是 GitHub 第一方维护的，比第三方更稳。

---

## 二、Workflow 配置详解

### 2.1 完整 YAML 配置

下面是我实际在用的 `.github/workflows/hugo.yml`：

```yaml
name: Deploy Hugo to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:   # 允许手动触发

permissions:
  contents: read
  pages: write
  id-token: write      # 部署 Pages 必需

# 同一时间只允许一份部署在跑，避免并发覆盖
concurrency:
  group: pages
  cancel-in-progress: false

defaults:
  run:
    shell: bash

jobs:
  build:
    runs-on: ubuntu-latest
    env:
      HUGO_VERSION: 0.134.0
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          submodules: recursive   # 主题是 submodule 必加
          fetch-depth: 0           # 启用 .GitInfo / lastmod

      - name: Setup Pages
        id: pages
        uses: actions/configure-pages@v5

      - name: Install Hugo CLI
        run: |
          wget -O ${{ runner.temp }}/hugo.deb \
            https://github.com/gohugoio/hugo/releases/download/v${HUGO_VERSION}/hugo_extended_${HUGO_VERSION}_linux-amd64.deb \
            --retry-connrefused --waitretry=1 --timeout=30 --tries=3
          sudo dpkg -i ${{ runner.temp }}/hugo.deb

      - name: Install Dart Sass
        run: sudo snap install dart-sass

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: '**/package-lock.json'

      - name: Install npm deps (optional)
        run: |
          if [ -f package-lock.json ]; then
            npm ci
          else
            echo "No package-lock.json, skip npm install"
          fi

      - name: Cache Hugo modules
        uses: actions/cache@v4
        with:
          path: /home/runner/.cache/hugo_cache
          key: ${{ runner.os }}-hugo-${{ hashFiles('**/go.sum') }}
          restore-keys: |
            ${{ runner.os }}-hugo-

      - name: Build with Hugo
        env:
          HUGO_ENVIRONMENT: production
          TZ: Asia/Shanghai
        run: |
          hugo \
            --minify \
            --baseURL "${{ steps.pages.outputs.base_url }}/"

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./public

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### 2.2 关键步骤说明

整个 workflow 分两个 job：`build` 负责构建产物并上传 artifact，`deploy` 负责把 artifact 推到 Pages。分开的好处是部署失败时可以单独重跑 deploy，不用重新构建。

- **checkout**：`submodules: recursive` 是用主题 submodule 时的硬性要求，否则主题目录是空的，构建时报 "theme not found"。`fetch-depth: 0` 拉取全部历史，启用 `lastmod` 和 `.GitInfo`。
- **configure-pages**：会自动把 `baseURL` 通过 outputs 传给后面的 build 步骤，避免硬编码。
- **Install Hugo CLI**：直接从 GitHub Release 下载 `.deb` 包安装，版本固定在 `HUGO_VERSION` 环境变量里，升级只改一行。
- **Build**：`--minify` 压缩 HTML/CSS/JS，`--baseURL` 用 configure-pages 给出的真实地址覆盖配置文件里的占位值。
- **upload-pages-artifact**：把 `./public` 打成 artifact，路径必须是 Hugo 的输出目录。
- **deploy-pages**：从 artifact 部署，输出最终的 page_url。

### 2.3 为什么不用 peaceiris/actions-hugo

早期大家用的都是 `peaceiris/actions-hugo` 这个第三方 action，但作者已经把它 archive 了，仓库不再维护。新项目建议直接用上面这种"从 Release 下载 .deb"的方式：

- 不依赖第三方 action，生命周期可控
- 升级 Hugo 版本只改一个环境变量
- 不用等第三方更新 action 才能用到 Hugo 新版本

如果只是想"装个 Hugo"，下面的命令就够了：

```bash
wget -O /tmp/hugo.deb \
  https://github.com/gohugoio/hugo/releases/download/v0.134.0/hugo_extended_0.134.0_linux-amd64.deb
sudo dpkg -i /tmp/hugo.deb
hugo version
```

注意必须下 `hugo_extended_*` 这个变体，**普通版不带 SCSS 支持**，而现代主题（包括 Dream）大量使用 SCSS，普通版会直接构建失败。

### 2.4 缓存策略

加速构建主要缓存两样东西：

- **Hugo module 缓存**：`~/.cache/hugo_cache`，按 `go.sum` hash 作为 key。
- **npm 依赖**：通过 `actions/setup-node` 的 `cache: 'npm'` 自动处理。

如果主题没用 npm 和 module（比如 Dream 用 submodule 引入，且主题自身没装 npm 包），上面的 npm 步骤可以删掉。我自己的 blog 实际只用了 Hugo module 缓存这一项。

---

## 三、常见报错与排查

### 3.1 "Module not found" / 主题拉取失败

典型报错：

```
Error: Failed to read module: module "dream" not found
```

**根因**：主题用 submodule 引入，但 checkout 没加 `submodules: recursive`。

**解决**：在 `actions/checkout@v4` 步骤里加上：

```yaml
- uses: actions/checkout@v4
  with:
    submodules: recursive
    fetch-depth: 0
```

如果主题 submodule 用的是 SSH 地址（`git@github.com:...`），CI 还会拉不下来——记得把 submodule 的 `.gitmodules` URL 改成 HTTPS。

### 3.2 Hugo extended vs standard

报错类似：

```
Error: error building site: TOCSS: failed to transform "scss/main.scss"
```

**根因**：装了 Hugo 标准版，标准版不带 SCSS 编译器。

**解决**：在下载链接里务必选 `hugo_extended_*_linux-amd64.deb`，不要下成 `hugo_*_linux-amd64.deb`。也可以装 Dart Sass 让 Hugo 用外部 Sass 编译器：

```bash
sudo snap install dart-sass
```

### 3.3 Pages 部署权限

报错：

```
Error: Deploying is not allowed: no permission
```

或：

```
Error: Requested deployment not permitted
```

**根因**：workflow 缺少 Pages 写权限。

**解决**：

1. 在 workflow 顶层声明权限：

```yaml
permissions:
  contents: read
  pages: write
  id-token: write
```

2. 仓库 Settings → Pages → Source 选 **GitHub Actions**（不是 branch！）。这是最常见的坑——很多人配完 workflow 还是部署失败，根因是 Source 还停留在 Deploy from branch。

3. 仓库 Settings → Actions → General → Workflow permissions 设为 **Read and write permissions**。

### 3.4 YAML 语法陷阱

YAML 看起来人畜无害，但有几个坑能让你查半天：

- **制表符不能用**：YAML 只允许空格缩进。编辑器默认按 Tab 会插入 `\t`，导致 `did not find expected key`。在 VS Code 里把 `Insert Spaces` 打开，对 YAML 文件强制用空格。
- **BOM 头**：Windows 上某些编辑器保存 UTF-8 时会加 BOM（`\xEF\xBB\xBF`），GitHub Actions 解析 YAML 会失败但报错信息含糊。用 VS Code 右下角的编码切换为 "UTF-8 without BOM" 重新保存即可。
- **冒号后必须有空格**：`key:value` 会报错，必须写成 `key: value`。
- **字符串里的特殊字符**：URL 里如果有 `:` 或 `#`，最好用引号包起来，比如 `baseURL: "https://example.com/"`。

排查这类问题的笨办法是：把 workflow 文件贴到 [yamllint](https://www.yamllint.com/) 在线校验一遍。

### 3.5 构建成功但页面空白

构建日志显示成功，部署也成功了，但访问站点看到的是空白页或缺少样式。

**根因 1**：`baseURL` 配置错误。`config.toml` 里如果写的是：

```toml
baseURL = "https://zack-zhang1031.github.io/blog/"
```

但实际站点在 `https://zack-zhang1031.github.io/`（根路径），CSS/JS 链接就会全部 404。

**解决**：用 `configure-pages` 的 outputs 动态覆盖：

```yaml
hugo --minify --baseURL "${{ steps.pages.outputs.base_url }}/"
```

**根因 2**：用了自定义域名但 `baseURL` 还写着 `username.github.io`。改完域名后必须同步更新 `baseURL`。

---

## 四、自定义域名与 HTTPS

### 4.1 配置 CNAME

在仓库 Settings → Pages → Custom domain 里填入你的域名（比如 `blog.zack.dev`），GitHub 会在仓库里自动创建一个 `CNAME` 文件。也可以手动在 `static/` 下放一个只包含域名的 `CNAME` 文件，Hugo 会原样复制到 `public/`。

DNS 解析侧：

| 记录类型 | 主机记录 | 记录值 |
|----------|----------|--------|
| CNAME | `blog` | `zack-zhang1031.github.io.` |

如果用顶级域名（apex domain），用 A 记录指向 GitHub Pages 的 IP：

```
@  A  185.199.108.153
@  A  185.199.109.153
@  A  185.199.110.153
@  A  185.199.111.153
```

### 4.2 自动 HTTPS

在 Pages 设置里勾选 **Enforce HTTPS**，GitHub 会自动向 Let's Encrypt 申请证书并续期，全程无需手动操作。证书生效前这一栏可能显示"证书正在签发中"，等几分钟到几小时就会变绿。

### 4.3 生效时间

- DNS 生效：通常 5-30 分钟（TTL 决定）
- 证书签发：DNS 生效后立即触发，10 分钟到 1 小时内完成
- HTTPS 强制开启：证书签发完成后再勾选

DNS 没生效就强制 HTTPS 会导致访问报证书错误，记得等 DNS 解析正确再开启。

---

## 五、进阶：多环境部署

### 5.1 同时部署到 Gitee Pages

Gitee 的 Pages 服务对国内访问更快，可以做一个镜像部署。但 Gitee 不像 GitHub 有第一方的 deploy action，需要自己写：

```yaml
  sync-to-gitee:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Mirror to Gitee
        env:
          GITEE_TOKEN: ${{ secrets.GITEE_TOKEN }}
        run: |
          # 把 build job 的 artifact 拉下来
          # 然后 push 到 Gitee 的 gh-pages 分支
          # 这里需要一个 PAT，存在 Secrets 里
          echo "Gitee mirror push here"
```

实际操作中我更推荐用 [Gitee Go](https://gitee.com/help/articles/4356) 或专门的镜像 action（如 `Yikun/hub-mirror-action`）。Gitee Pages 服务要求实名认证，免费版有缓存延迟，需要点耐心。

### 5.2 PR 预览部署

在 PR 上自动部署一个预览站点，方便 review 时直接看效果。核心思路是用一个独立 environment：

```yaml
on:
  pull_request:
    branches: [main]

jobs:
  build-preview:
    runs-on: ubuntu-latest
    environment:
      name: deploy-preview
    steps:
      - uses: actions/checkout@v4
        with:
          submodules: recursive
      - name: Install Hugo
        run: |
          wget -O /tmp/hugo.deb https://github.com/gohugoio/hugo/releases/download/v0.134.0/hugo_extended_0.134.0_linux-amd64.deb
          sudo dpkg -i /tmp/hugo.deb
      - name: Build
        run: hugo --minify --baseURL "https://${{ github.repository_owner }}.github.io/${{ github.event.repository.name }}-preview/pr-${{ github.event.number }}/"
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./public
```

注意 GitHub Pages 免费版只支持一个 production environment，PR 预览需要 organization 或 pro 账号才能开多个 environment。个人账号一般做不到，更轻量的替代方案是把 `public/` 上传到一个 Cloudflare Pages 或 Netlify 的预览分支。

### 5.3 构建产物缓存优化

Hugo 已经很快了，但大站点可以缓存 `resources/_gen` 让首次构建再快一点：

```yaml
      - name: Cache Hugo resources
        uses: actions/cache@v4
        with:
          path: resources/_gen
          key: ${{ runner.os }}-hugo-resources-${{ hashFiles('content/**/*.md') }}
          restore-keys: |
            ${{ runner.os }}-hugo-resources-
```

注意：缓存 key 用 content hash，内容变化时才会重建。如果用了图片处理（`Resize`、`Fit` 等），这个缓存价值很大；如果只是纯 Markdown + 静态资源，提升不明显。

---

## 小结

一份能跑的 Hugo 部署 workflow 看起来长，关键点其实就四个：

1. checkout 时 `submodules: recursive`
2. 装 Hugo **extended** 版本
3. Pages Source 选 **GitHub Actions**
4. workflow 顶层声明 `pages: write` 和 `id-token: write` 权限

把这几个点配齐，剩下的就是迭代配置细节。下次再有人问"我的 Hugo 博客怎么部署到 GitHub Pages"，把这份 workflow 丢给他就够了。
