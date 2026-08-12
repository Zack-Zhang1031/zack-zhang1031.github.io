---
title: "🎮 作品 & 项目"
date: 2024-01-01T00:00:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "Zack-Zhang1031 的独立游戏与开源项目展示"
---

<!-- 页内锚点导航 -->
<nav class="page-nav">
  <a href="#games">🕹️ 独立游戏</a>
  <a href="#github">🐙 GitHub</a>
  <a href="#gitee">🐱 Gitee</a>
</nav>

---

## 🕹️ 独立游戏 {#games}

我把做出来的休闲小游戏发布在 **CrazyGames**，欢迎试玩！每个游戏都配有**视频演示**和**截图**，点击右下角按钮切换查看。

<!-- ==================== 游戏一：数钱 ==================== -->
<div class="game-showcase" id="game-shuqian">
  <div class="gs-media-col">
    <div class="gs-main" data-media="shuqian">
      <div class="gs-display gs-display--active" data-type="video">
        <video class="gs-real-video" controls preload="metadata" poster="/images/shuqian-1.png">
          <source src="/videos/shuqian-demo.mp4" type="video/mp4">
          您的浏览器不支持视频播放。
        </video>
      </div>
      <div class="gs-display" data-type="shot">
        <img src="/images/shuqian-1.png" alt="数钱 游戏截图" class="gs-shot-img" loading="lazy" />
      </div>
      <button class="gs-corner-toggle" onclick="event.stopPropagation();window.__toggleGSMode('shuqian', this)" title="切换视频/截图">
        <span class="gct-icon">🖼️</span>
        <span class="gct-label">截图</span>
      </button>
    </div>
  </div>
  <div class="gs-info-col">
    <h3 class="game-title">💰 数钱</h3>
    <p class="game-subtitle">轻松休闲的点钞小游戏，考验你的手速与眼力。在限定时间内尽可能准确地清点钞票，挑战更高分数。</p>
    <div class="game-controls-bar">
      <button class="gs-ctrl-btn" onclick="window.__toggleVideoMute('shuqian', this)">🔇 静音</button>
      <span class="gs-ctrl-hint">🎬 点击视频播放 · 右下角切换截图</span>
    </div>
    <div class="game-actions">
      <a class="play-btn play-btn--amber" href="https://www.crazygames.com/preview/d1b4d9b3-f1e7-419c-8336-c65c37fa3419?gameBuildId=10c47402-f440-40f9-a940-448fa1466cd3&qaTool=true&disableSubmitQA=true&role=developer" target="_blank" rel="noopener">▶ 在 CrazyGames 试玩</a>
      <span class="game-tags">
        <span class="game-tag">休闲</span>
        <span class="game-tag">点击</span>
      </span>
    </div>
  </div>
</div>

<hr class="game-divider" />

<!-- ==================== 游戏二：捡钱 ==================== -->
<div class="game-showcase" id="game-jianqian">
  <div class="gs-media-col">
    <div class="gs-main" data-media="jianqian">
      <div class="gs-display gs-display--active" data-type="video">
        <video class="gs-real-video" controls preload="metadata" poster="/images/jianqian-1.png">
          <source src="/videos/jianqian-demo.mp4" type="video/mp4">
          您的浏览器不支持视频播放。
        </video>
      </div>
      <div class="gs-display" data-type="shot">
        <img src="/images/jianqian-1.png" alt="捡钱 游戏截图" class="gs-shot-img" loading="lazy" />
      </div>
      <button class="gs-corner-toggle" onclick="event.stopPropagation();window.__toggleGSMode('jianqian', this)" title="切换视频/截图">
        <span class="gct-icon">🖼️</span>
        <span class="gct-label">截图</span>
      </button>
    </div>
  </div>
  <div class="gs-info-col">
    <h3 class="game-title">💵 捡钱</h3>
    <p class="game-subtitle">欢乐的街机小游戏，操控角色接住天上掉落的金币与红包，躲开陷阱，比拼连击与高分。</p>
    <div class="game-controls-bar">
      <button class="gs-ctrl-btn" onclick="window.__toggleVideoMute('jianqian', this)">🔇 静音</button>
      <span class="gs-ctrl-hint">🎬 点击视频播放 · 右下角切换截图</span>
    </div>
    <div class="game-actions">
      <a class="play-btn play-btn--green" href="https://www.crazygames.com/preview/e072a216-66f6-45da-92e1-5462cc4a1309?gameBuildId=30f942ad-72fc-4858-b812-95dfa984c8f0&qaTool=true&disableSubmitQA=true&role=developer" target="_blank" rel="noopener">▶ 在 CrazyGames 试玩</a>
      <span class="game-tags">
        <span class="game-tag">街机</span>
        <span class="game-tag">休闲</span>
      </span>
    </div>
  </div>
</div>

<hr class="game-divider" />

📺 **更多游戏实况与开发日志**：欢迎关注我的 [哔哩哔哩主页](https://space.bilibili.com/31032895)

---

## 🐙 GitHub 开源项目 {#github}

<div class="project-grid">
  <a class="project-card" href="https://github.com/Zack-Zhang1031/MindFace-Lite" target="_blank" rel="noopener">
    <div class="pc-head">
      <strong>MindFace-Lite</strong>
      <span class="lang-badge lang-badge--python">Python</span>
    </div>
    <p class="pc-desc">轻量实时语音驱动数字人口型系统：PyTorch 训练 + ONNX 部署 + RKNN 边缘部署。</p>
  </a>
  <a class="project-card" href="https://github.com/Zack-Zhang1031/word_tool" target="_blank" rel="noopener">
    <div class="pc-head">
      <strong>word_tool ⭐</strong>
      <span class="lang-badge lang-badge--tex">TeX</span>
    </div>
    <p class="pc-desc">PDF/TXT/Excel 英文单词提取工具：过滤已学单词 + 批量翻译为中文，导出 Excel，支持 OCR。</p>
  </a>
  <a class="project-card" href="https://github.com/Zack-Zhang1031/crisis-social-media-classification" target="_blank" rel="noopener">
    <div class="pc-head">
      <strong>crisis-social-media-classification</strong>
      <span class="lang-badge lang-badge--jupyter">Jupyter</span>
    </div>
    <p class="pc-desc">危机事件社交媒体文本分类的机器学习实验与分析。</p>
  </a>
  <a class="project-card" href="https://github.com/Zack-Zhang1031/zack-zhang1031.github.io" target="_blank" rel="noopener">
    <div class="pc-head">
      <strong>zack-zhang1031.github.io</strong>
      <span class="lang-badge lang-badge--hugo">Hugo</span>
    </div>
    <p class="pc-desc">本站源码：基于 Hugo + Dream 主题的个人主页 / 博客。</p>
  </a>
</div>

---

## 🐱 Gitee 项目 {#gitee}

<div class="project-grid">
  <a class="project-card" href="https://gitee.com/rainyjensen/mind-trip" target="_blank" rel="noopener">
    <div class="pc-head">
      <strong>MindTrip</strong>
      <span class="lang-badge lang-badge--gitee">Gitee</span>
    </div>
    <p class="pc-desc">基于 RAG + Agent 的智能旅行规划系统：Qwen2-72B + Milvus + LangChain + FastAPI + UniApp。</p>
  </a>
  <a class="project-card" href="https://gitee.com/rainyjensen/AtlasSplit" target="_blank" rel="noopener">
    <div class="pc-head">
      <strong>AtlasSplit</strong>
      <span class="lang-badge lang-badge--gitee">Gitee</span>
    </div>
    <p class="pc-desc">表格分摊与结算智能体：自然语言 → 受控代码 → 本地执行 → 可审计结果。</p>
  </a>
</div>

---

> 想了解更多或合作？欢迎回到 [首页](/) 点头像查看「关于我」，或直接发邮件给我 ✉️
