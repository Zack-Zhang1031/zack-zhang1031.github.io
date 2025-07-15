---
layout: home
title: "欢迎来到 Zack 的个人博客"
---

# 👋 Hi，欢迎访问我的博客！

> 记录AI、编程、成长与生活点滴。

---

## 🏷️ 标签云

<div style="margin-bottom: 1.5em;">
  {% for tag in site.tags %}
    <a href="/tags/{{ tag[0] }}" style="display:inline-block;margin:4px 8px;color:#fff;background:#0078e7;border-radius:8px;padding:2px 12px;text-decoration:none;font-size:1em;">
      #{{ tag[0] }} <span style="font-size:0.8em;opacity:0.7;">({{ tag[1].size }})</span>
    </a>
  {% endfor %}
</div>

---

## 🌟 文章推荐 / 热门文章

<ul>
  <li><a href="/posts/ai-trend-2025">2025年AI趋势解析</a></li>
  <li><a href="/posts/ue5-quickstart">UE5快速上手攻略</a></li>
  <li><a href="/posts/python-tips">10个提升效率的Python小技巧</a></li>
</ul>

---

## 💬 最新评论

<!-- Waline 最新评论小部件 start -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@waline/client/dist/waline.css"/>
<div id="waline-recent-comments"></div>
<script type="module">
  import { RecentComments } from 'https://cdn.jsdelivr.net/npm/@waline/client/dist/widget.mjs'
  RecentComments({
    el: '#waline-recent-comments',
    serverURL: 'https://你的-waline-服务端地址' // 这里换成你的 Waline 服务端地址
  })
</script>
<!-- Waline 最新评论小部件 end -->

---

## 📝 最新文章

<ul>
  {% for post in site.posts limit:8 %}
    <li>
      <a href="{{ post.url }}">{{ post.title }}</a>
      <small style="color:#888;">({{ post.date | date: "%Y-%m-%d" }})</small>
      {% if post.tags %}
        <span style="color:#0af;">#{{ post.tags | join: ', ' }}</span>
      {% endif %}
    </li>
  {% endfor %}
</ul>
<p style="text-align:right"><a href="/archive">查看更多…</a></p>

---

## 🌏 社交 & 订阅

[GitHub](https://github.com/Zack-Zhang1031) ・ [邮箱](mailto:zhangkun1031@hotmail.com) ・ [RSS订阅](/feed.xml)

---

<p align="center" style="color:#aaa;font-size:0.9em;">
  &copy; 2025 Zack's Blog · Powered by Jekyll & GitHub Pages
</p>
