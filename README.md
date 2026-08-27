# Leon Zhang — Personal Website

> AI Engineer · Agent / RAG · Model Fine-tuning · Deployment · Indie Game Developer

这是 **Leon Zhang** 的个人主页与技术博客，基于 [Astro](https://astro.build/) + [Tailwind CSS](https://tailwindcss.com/) 构建，并通过 [Vercel](https://vercel.com/) 部署。

线上地址：<https://zk.lz1031.workers.dev/>

## 站点结构

- **首页**：游戏展示卡片 + 最新博客 + GitHub/Gitee 项目
- **作品**（`/games/`）：独立游戏在线游玩（Cocos Web Mobile 内嵌）+ 视频演示
- **日志**（`/posts/`）：技术博客（Astro Content Collections，35 篇）
- **关于**（`/about/`）：Leon Zhang 的个人简介、技能栈、项目经历与联系方式

## 技术栈

- **框架**：Astro 5（静态输出）
- **样式**：Tailwind CSS + 自定义 CSS 变量主题
- **内容**：Astro Content Collections（类型安全的 Markdown 博客）
- **评论**：Giscus（GitHub Discussions）
- **统计**：不蒜子
- **部署**：Vercel（自动构建）
- **游戏**：Cocos Creator Web Mobile 构建内嵌

## 本地预览

```bash
npm install
npm run dev
# 打开 http://localhost:4321/
```

## 构建

```bash
npm run build
# 输出到 dist/
```

## 目录结构

```
src/
├── layouts/
│   └── BaseLayout.astro      # 全局布局（导航 + 页脚 + 主题切换）
├── pages/
│   ├── index.astro            # 首页
│   ├── games.astro            # 作品展示页
│   ├── about.astro            # 关于页
│   └── posts/
│       ├── index.astro        # 博客列表（分类筛选）
│       └── [...slug].astro    # 博客详情（Giscus 评论）
├── content/
│   ├── config.ts              # Content Collections 配置
│   └── posts/                 # 博客 Markdown 文件（35 篇）
├── about.md                   # 关于页 Markdown 内容
└── styles/
    └── global.css             # 全局样式 + Tailwind 指令

public/
├── games/                     # Cocos Web Mobile 游戏构建
│   ├── shuqian/
│   └── jianqian/
├── images/                    # 图片资源
├── videos/                     # 视频资源
├── css/                        # 自定义 CSS
└── js/                         # 游戏切换等 JS 脚本
```

## 部署

推送到 `main` 分支后，Vercel 自动构建并部署。

---

**Leon Zhang** · AI Engineer & Builder
