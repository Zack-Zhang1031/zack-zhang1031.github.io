---
title: "Hugo + Dream 主题定制经验：从踩坑到顺手"
date: 2026-01-18T00:00:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "记录用 Hugo + Dream 主题搭建个人主页的定制经验：Goldmark raw HTML 转义、导航栏改造、自定义 CSS/JS 注入、OG 分享图配置等常见问题。"
tags: ["Hugo", "建站", "Dream主题", "前端", "踩坑记录"]
categories: ["工具建站", "Hugo"]
---

这个个人主页就是用 Hugo + Dream 主题搭的，过程中踩了不少坑——Goldmark 把 HTML 标签转义成纯文本、导航栏默认项重复、静态资源不同步、OG 分享图配置……这篇笔记把这些定制经验集中记录下来，既给自己留个备忘，也帮同样在用 Dream 主题的人少走弯路。

---

## 一、为什么选 Hugo + Dream 主题

### 1.1 静态站点生成器对比

搭个人博客前我对比了三个最主流的 SSG：

| 生成器 | 语言 | 构建速度 | 生态 | 部署 |
|--------|------|----------|------|------|
| **Hugo** | Go | 极快（千页秒级） | 中等，主题数量够用 | 单二进制，CI 友好 |
| **Hexo** | Node.js | 较快 | 成熟，中文社区活跃 | 需要 Node 环境 |
| **Jekyll** | Ruby | 慢 | GitHub 原生支持 | 依赖 bundler，Windows 装环境麻烦 |

我之前用的是 Jekyll + Cayman 主题，迁到 Hugo 主要原因有三：

- **Jekyll 构建慢**：文章多了之后本地 `jekyll serve` 要等好几秒才能热更新，Hugo 几乎是瞬间。
- **Ruby 环境维护烦**：每次换电脑都要重新 `bundle install`，Gemfile 版本冲突是家常便饭。Hugo 是单二进制，下载即用。
- **GitHub Pages 原生 Jekyll 限制多**：很多 plugin 不让用，需要本地构建再 push 产物。Hugo 配合 Actions 反而更自由。

### 1.2 Dream 主题的优缺点

[Dream](https://github.com/g1eny0ung/hugo-theme-dream) 是一个基于 Tailwind CSS + DaisyUI 的现代主题，作者是 g1eny0ung。

优点：

- **Tailwind + DaisyUI**：现成的设计系统，颜色和组件开箱即用
- **暗色模式**：自动跟随系统设置，也可手动切换
- **响应式**：手机端体验不错
- **Masonry 布局**：首页文章卡片是瀑布流，看起来不呆板

缺点：

- **文档少**：作者文档主要是个 demo 站，很多配置要直接读源码才能搞清楚
- **定制需要读源码**：比如导航栏默认行为不符合习惯，得改 `renderNavItem.html`
- **Tailwind 升级有破坏性变更**：主题从 Tailwind v2 升到 v3 时改了不少 class 名，老配置会失效

### 1.3 从 Jekyll Cayman 迁移的动机

Cayman 是 GitHub 默认主题之一，长这样：顶部一个 banner，下面是文章列表。设计简单到几乎没有定制空间——想加个导航图标、改个布局都得自己写 HTML。

迁到 Hugo + Dream 之后能做的事多很多：

- 自定义导航栏（文字链接 + 图标链接混合）
- 文章页加上 Open Graph 分享图
- 嵌入自定义 JS（比如我的 game-switcher.js，用于游戏展示页的视频/截图切换）
- 用 shortcode 嵌入复杂 HTML 组件

如果你也在 Jekyll 上感觉"想改点啥都改不动"，迁过来是值得的。

---

## 二、Goldmark raw HTML 转义问题

这是搭站过程中**花时间最多的一个坑**，值得详细记录。

### 2.1 问题现象

在 `games.md` 里嵌入 `<video>`、`<img>`、`<div>` 等 HTML 标签后，页面上没有出现视频和图片，而是显示了一堆被转义的标签文本：

```
&lt;video controls&gt;&lt;source src="..."&gt;&lt;/video&gt;
```

### 2.2 根因：Goldmark 默认禁用 raw HTML

Hugo 从 0.60 起把默认 Markdown 渲染器从 BlackFriday 换成了 **Goldmark**。Goldmark 出于安全考虑，默认把所有 HTML 标签当作纯文本转义输出（`unsafe = false`）。

### 2.3 解决方案一：开启 unsafe 渲染

在 `config.toml` 中添加：

```toml
[markup]
  [markup.goldmark]
    [markup.goldmark.renderer]
      unsafe = true
```

这会让 Goldmark 把 Markdown 中的 HTML 标签原样输出。改完之后 `<video>` 标签确实出现了——但视频还是不显示。

### 2.4 解决方案二：HTML 块内部不能有空行（隐蔽陷阱）

这才是真正卡了很久的问题。**即使 `unsafe = true`，如果 HTML 块内部出现空行，Goldmark 会把空行之后的内容当作「缩进代码块」（indented code block）处理，而不是 HTML。**

错误写法（块内有空行）：

```markdown
<div class="game-showcase">
  <h3>数钱</h3>

  <!-- ↑这里有一个空行，下面的内容会被转义 -->
  <video controls>
    <source src="/videos/demo.mp4" type="video/mp4">
  </video>
</div>
```

正确写法（块内无空行）：

```markdown
<div class="game-showcase">
  <h3>数钱</h3>
  <video controls>
    <source src="/videos/demo.mp4" type="video/mp4">
  </video>
</div>
```

**规则**：一个 HTML 块从开始标签到结束标签之间，**不能有任何空行**，否则 Goldmark 认为这个 HTML 块已经结束，后续内容切换回 Markdown 解析模式。

### 2.5 解决方案三：用 rawhtml shortcode 处理大段 HTML

如果 HTML 块实在太长、内部确实需要空行（比如包含多段结构），可以用 Hugo 内置的 `rawhtml` shortcode 绕过 Goldmark 解析：

```markdown
{{</* rawhtml */>}}
<div class="complex-layout">
  <p>第一段</p>

  <p>第二段（中间有空行也没关系）</p>
</div>
{{</* /rawhtml */>}}
```

`rawhtml` 会把包裹的内容原样输出，不经过 Markdown 解析器。适合在文章里嵌入复杂的自定义 HTML 组件。

### 2.6 验证技巧

排查 Goldmark 转义问题时，用浏览器开发者工具检查渲染后的 HTML：

- 看到 `&lt;video&gt;` → 说明 `unsafe` 没开
- 看到 `<video>` 标签正常但内容被包在 `<pre><code>` 里 → 说明 HTML 块内有空行
- 标签正常、资源 404 → 说明是路径问题，不是 Goldmark 问题

---

## 三、导航栏定制

### 3.1 reorderNavItems 的作用与默认项清理

Dream 主题的导航栏默认渲染一组固定项目，顺序由 `params.reorderNavItems` 控制：

```toml
[params]
  reorderNavItems = ["about", "search", "rss", "posts", "categories", "tags"]
```

但默认项有几个让我用着不爽的地方：

- **`posts`** 渲染为一个"归档"图标（日历），不是文字链接，新用户根本不知道点哪里看所有文章
- **`about`** 渲染为翻转卡片（flip card），点击不会跳转到 `/about/` 页面，而是触发卡片翻转动画
- **`search`/`rss`** 是图标按钮，符合预期，保留

光调 `reorderNavItems` 解决不了这些问题，得自己加自定义导航项。

### 3.2 自定义 navItems 配置

Dream 主题支持两种自定义导航项：

- **文字链接**：`href` + `title` + `target`
- **图标链接**：`href` + `title` + `target` + `icon`

在 `config.toml` 里这样写：

```toml
[[params.navItems]]
  type = "text"          # 文字链接
  href = "/"
  title = "首页"
  target = "_self"

[[params.navItems]]
  type = "text"
  href = "/games/"
  title = "作品"
  target = "_self"

[[params.navItems]]
  type = "text"
  href = "/posts/"
  title = "日志"
  target = "_self"

[[params.navItems]]
  type = "text"
  href = "/about/"
  title = "关于"
  target = "_self"

[[params.navItems]]
  type = "icon"          # 图标链接
  href = "https://github.com/Zack-Zhang1031"
  title = "GitHub"
  target = "_blank"
  icon = "github"        # DaisyUI 的图标名

[[params.navItems]]
  type = "icon"
  href = "https://gitee.com/rainyjensen"
  title = "Gitee"
  target = "_blank"
  icon = "gitee"

[[params.navItems]]
  type = "icon"
  href = "https://space.bilibili.com/xxx"
  title = "B站"
  target = "_blank"
  icon = "bilibili"
```

### 3.3 修改 renderNavItem.html 让配置生效

主题默认的 `layouts/partials/header/renderNavItem.html` 不一定优先读 `navItems`，所以需要覆盖这个 partial。在项目根目录创建：

```
layouts/partials/header/renderNavItem.html
```

让它优先检查 `site.Params.navItems`：

```go-html-template
{{/* 自定义导航项：优先使用 site.Params.navItems */}}
{{ range .Site.Params.navItems }}
  {{ if eq .type "text" }}
    <a href="{{ .href }}" target="{{ .target }}" class="navbar-item">
      {{ .title }}
    </a>
  {{ else if eq .type "icon" }}
    <a href="{{ .href }}" target="{{ .target }}" class="navbar-item icon-link"
       title="{{ .title }}" aria-label="{{ .title }}">
      <i class="icon icon-{{ .icon }}"></i>
    </a>
  {{ end }}
{{ else }}
  {{/* 没配 navItems 时 fallback 到主题默认行为 */}}
  {{ partial "header/defaultNavItems.html" . }}
{{ end }}
```

这样做的好处是不需要 fork 整个主题，只覆盖一个 partial 文件，主题升级时影响最小。

### 3.4 导航排序建议

我最终用的排序是：

1. **文字链接**：首页 → 作品 → 日志 → 关于（核心导航，按访问频率排）
2. **图标链接**：GitHub → Gitee → B站（社交链接，放右边）
3. **搜索图标**：放最末尾（DaisyUI 的搜索 modal 触发器）

这样首页就能让访客一眼看到"这里有什么内容"，社交入口次之，搜索作为辅助工具放最后。

---

## 四、自定义 CSS/JS 注入

### 4.1 通过 params.Advanced.customCSS / customJS 加载

Dream 主题在 `baseof.html` 里留了 hook，可以直接在 `config.toml` 里声明要加载的自定义资源：

```toml
[params.Advanced]
  customCSS = ["css/custom.css"]
  customJS  = ["js/game-switcher.js"]
```

主题会自动在 `<head>` 和 `</body>` 前插入对应的 `<link>` 和 `<script>` 标签。把文件放在 `static/css/custom.css` 和 `static/js/game-switcher.js`，Hugo 构建时会原样复制到 `public/`。

### 4.2 不 fork 主题的前提下扩展样式

按"覆盖 partial 优先于 fork 整个主题"的原则，自定义样式优先用 `customCSS` 注入，而不是去改主题的 SCSS 源码。比如我想给导航栏的文字链接加 hover 下划线：

```css
/* static/css/custom.css */
.navbar-item.text-link {
  position: relative;
  transition: color 0.2s;
}
.navbar-item.text-link:hover {
  color: var(--primary);
}
.navbar-item.text-link::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 0;
  width: 0;
  height: 2px;
  background: var(--primary);
  transition: all 0.2s;
}
.navbar-item.text-link:hover::after {
  left: 0;
  width: 100%;
}
```

只有在主题的 partial 完全没法满足需求时才考虑 fork——fork 之后主题每次升级都得手动 rebase，维护成本高得多。

### 4.3 game-switcher.js 的实现思路

我在 `/games/` 页面给每个游戏做了"视频 / 截图"切换按钮，外加一个静音控制。核心思路：

- **视频/截图切换**：每个 showcase 容器里同时有 `<video>` 和 `<img>`，通过 `data-type` 属性控制 display
- **静音控制**：点击静音按钮切换 `video.muted`

核心代码：

```javascript
// static/js/game-switcher.js
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-game-showcase]').forEach((showcase) => {
    const video = showcase.querySelector('video');
    const screenshot = showcase.querySelector('img.screenshot');
    const videoBtn = showcase.querySelector('[data-action="show-video"]');
    const screenshotBtn = showcase.querySelector('[data-action="show-screenshot"]');
    const muteBtn = showcase.querySelector('[data-action="toggle-mute"]');

    // 切换到视频
    if (videoBtn) {
      videoBtn.addEventListener('click', () => {
        video.style.display = 'block';
        screenshot.style.display = 'none';
        video.play().catch(() => {/* 自动播放被拦截，忽略 */});
      });
    }

    // 切换到截图
    if (screenshotBtn) {
      screenshotBtn.addEventListener('click', () => {
        video.style.display = 'none';
        screenshot.style.display = 'block';
        video.pause();
      });
    }

    // 静音切换
    if (muteBtn && video) {
      muteBtn.addEventListener('click', () => {
        video.muted = !video.muted;
        muteBtn.classList.toggle('is-muted', video.muted);
        muteBtn.setAttribute('aria-pressed', String(video.muted));
      });
    }
  });
});
```

实现并不复杂，关键是把每个游戏展示块用 `data-game-showcase` 属性圈起来，让 JS 通过 querySelector 找到对应的子元素，避免 ID 冲突。

---

## 五、Open Graph 分享图配置

### 5.1 site.Params.images 的作用

Hugo 内置的 `_internal/opengraph.html` partial 会读取 `site.Params.images`，把它作为整站默认的 OG 图。当文章 frontmatter 里没单独指定 `images` 时，就用这张兜底图。

```toml
[params]
  images = ["/images/og-image_1200x630.png"]
```

注意路径以 `/` 开头，Hugo 会把它解析成 `baseURL + /images/...`。

### 5.2 1200×630 OG 图的设计

OG 图的推荐尺寸是 **1200×630**，这个比例在各大平台都吃得开。我自己的设计是：

- **背景**：深蓝渐变（`#0f172a` → `#1e293b`），呼应站点的暗色主题
- **网格线**：琥珀色（`#f59e0b`）低透明度网格，做技术感
- **文字**：白色站点名 + 副标题（"独立游戏 / AI 与算法"）

生成方式可以用任意图像工具——我用 Figma 手摆的，也可以用 Python + Pillow 程序化生成。

### 5.3 各平台预览效果

| 平台 | 缓存行为 | 见效时间 |
|------|----------|----------|
| **微信** | 缓存非常激进，第一次抓取的图会缓存很久 | 改图后可能要等几小时甚至换 URL 才能刷新 |
| **Twitter / X** | 几乎实时抓取 | 立即生效 |
| **Telegram** | 几乎实时抓取 | 立即生效 |
| **Discord** | 缓存适中 | 几分钟内 |

调试时可以用 [Open Graph Debugger](https://www.opengraph.xyz/) 强制刷新缓存预览。微信里测试时建议每改一版就在 URL 后加个 `?v=2` 之类的查询参数强制重新抓取。

---

## 六、GitHub Actions 自动部署

### 6.1 简述 workflow

详细的 workflow 配置我专门写了一篇 [《用 GitHub Actions 自动部署 Hugo 站点到 Pages》]({{< relref "github-actions-hugo-deploy.md" >}})，这里只说几个关键点：

- workflow 文件放在 `.github/workflows/hugo.yml`
- 触发条件：`push` 到 `main` 分支
- 两个 job：`build`（构建并 upload artifact）→ `deploy`（部署到 Pages）

### 6.2 Pages 源设为 GitHub Actions 的注意事项

**最容易踩的坑**：workflow 写好了、跑成功了，但访问站点还是 404——原因是 GitHub Pages 的 Source 还停留在默认的 "Deploy from branch"。

正确设置：

1. 仓库 Settings → Pages
2. **Source** 下拉选 **GitHub Actions**
3. 不要在 Branch 那里指定分支（指定了也没用，会被 Actions 模式覆盖）

切换 Source 后第一次 push 触发 workflow，部署成功后才能访问。如果切换前已经部署过一次，可能需要等几分钟清掉旧缓存。

---

## 七、常用调试技巧

### 7.1 hugo server 本地预览

```bash
hugo server -D    # -D 包含 draft 文章
```

本地预览时有个常见问题：**新增的 `static/` 文件不生效**。比如往 `static/images/` 里塞了一张新图，浏览器访问 `http://localhost:1313/images/xxx.png` 还是 404。

**根因**：Hugo 的 livereload 不会自动同步新加进 `static/` 的文件，需要重启 `hugo server`。

**解决**：

- 临时方案：Ctrl+C 停掉再 `hugo server` 重启
- 长期方案：用 `hugo server --watch` 加 `--disableFastRender`，让所有改动都触发完整重建（代价是慢一点）

### 7.2 public 目录与 static 目录的关系

这两个目录经常被混淆：

| 目录 | 角色 | 是否纳入版本控制 |
|------|------|------------------|
| `static/` | **源**：你手动放的静态资源 | 是，提交到仓库 |
| `public/` | **产物**：Hugo 构建生成的站点 | 否，应该加进 `.gitignore` |

构建时 Hugo 把 `static/` 下的所有文件原样复制到 `public/` 根目录。所以 `static/images/a.png` 在站点上的访问路径是 `/images/a.png`，不是 `/static/images/a.png`——这点新手很容易写错。

`.gitignore` 里至少要有：

```
/public/
/resources/_gen/
/.hugo_build.lock
```

### 7.3 frontmatter 规范

常用的 frontmatter 字段：

| 字段 | 作用 |
|------|------|
| `draft` | `true` 时不构建该文章（生产环境看不到） |
| `headless` | `true` 时不生成对应 URL，但内容可被其他页面引用 |
| `aliases` | 重定向列表，访问旧 URL 自动跳到本页 |
| `lastmod` | 最后修改时间，影响 sitemap 和排序 |
| `weight` | 同级页面排序权重，数值小的靠前 |

### 7.4 headless bundle

`content/about/` 目录下如果有 `_index.md`，Hugo 默认会为它生成 `/about/` 这个 URL。但如果设置 `headless: true`：

```markdown
---
title: "About"
headless: true
---
```

这个目录就**不会生成 URL**，但里面的内容（图片、Markdown 片段）可以作为资源被其他页面通过 `.Resources` 引用。

典型用法：

- 在文章里嵌入一个图片画廊，所有图片放在 `content/posts/xxx/images/`，把 `_index.md` 设为 headless
- 通过 `{{</* relref "..." */>}}` 或 `Resources.Get` 引用，避免把图片暴露成独立 URL

这是 Hugo 比较隐蔽但很有用的特性，能保持站点结构干净。

---

## 小结

Dream 主题的定制其实不算难，难点在于很多行为要去读源码才能搞清楚。这篇文章记录的几个坑——Goldmark 转义、导航栏默认项、自定义 CSS/JS、OG 图配置、静态资源不同步——都是搭站过程中真实遇到的问题。如果你也在用 Dream 主题，希望这份笔记能帮你少花点时间在调试上，多花点时间在写内容上。
