# Zack-Zhang1031 个人主页

基于 [Hugo](https://gohugo.io/) + [hugo-theme-dream](https://github.com/g1eny0ung/hugo-theme-dream) 的个人主页 / 博客,通过 GitHub Actions 自动部署到 GitHub Pages。

🔗 线上地址:<https://zack-zhang1031.github.io/>

## 站点结构

- **首页**:博客文章列表(`content/posts/`)
- **作品**(`content/games.md`,`/games/`):独立游戏展示(CrazyGames)+ GitHub / Gitee 开源项目卡片
- **关于我**(`content/about/`,点头像翻面):个人简介、技能栈、联系方式、社交链接

## 关键配置

- 站点配置:[`config.toml`](config.toml)
  - 个人信息、社交链接、导航栏自定义项(`[params.navItems]`)
  - 已开启 `markup.goldmark.renderer.unsafe = true`,以支持文章中嵌入 `<img>` / `<video>` / `<iframe>` 等原始 HTML
- 社交链接(footer / 关于页):[`data/socials.toml`](data/socials.toml)

## 本地预览

```bash
hugo server -D
# 打开 http://localhost:1313/
```

## 部署

推送到 `main` 分支后,`.github/workflows/hugo.yaml` 会自动构建并部署到 GitHub Pages。

## 如何更新内容

- **新增博客文章**:在 `content/posts/` 下新建 `.md`
- **更新游戏截图 / 视频**:编辑 `content/games.md`,把 `<div class="media-slot">...</div>` 替换为 `<img>` 或 B 站 `<iframe>`
- **更新个人信息 / 联系方式**:编辑 `content/about/` 下的 `me.md` / `skills.md` / `contact.md`
