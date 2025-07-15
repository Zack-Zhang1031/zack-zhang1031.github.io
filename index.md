---
layout: home
title: "欢迎来到 Zack 的个人博客"
---

<!-- 随机头图（Unsplash API，每次刷新自动变换） -->
<img src="https://source.unsplash.com/1200x350/?nature,landscape,technology" alt="Banner" style="width:100%; border-radius: 12px; margin-bottom: 1em;">

# 👋 Hi，欢迎访问我的博客！

> 分享AI、编程、游戏与生活，记录点滴成长。

<!-- 每日一句（如果你有 API 可换成自己的，下面是静态范例） -->
<blockquote style="font-size:1.1em;color:#888;">
  “Stay hungry. Stay foolish.” – Steve Jobs
</blockquote>

---

## 🔍 快速导航

- [关于我](/about)
- [标签](/tags)
- [归档](/archive)
- [联系我](/contact)

---

## 📝 最新文章

<ul>
  {% for post in site.posts limit:5 %}
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

## 📚 分类精选

<div style="display: flex; flex-wrap: wrap; gap: 1em;">
  <div style="flex:1;min-width:200px;">
    <h3>Python</h3>
    <ul>
      {% assign python_posts = site.categories.Python | slice: 0, 3 %}
      {% for post in python_posts %}
        <li><a href="{{ post.url }}">{{ post.title }}</a></li>
      {% endfor %}
    </ul>
  </div>
  <div style="flex:1;min-width:200px;">
    <h3>AI/深度学习</h3>
    <ul>
      {% assign ai_posts = site.categories.AI | slice: 0, 3 %}
      {% for post in ai_posts %}
        <li><a href="{{ post.url }}">{{ post.title }}</a></li>
      {% endfor %}
    </ul>
  </div>
  <div style="flex:1;min-width:200px;">
    <h3>游戏开发</h3>
    <ul>
      {% assign game_posts = site.categories.Game | slice: 0, 3 %}
      {% for post in game_posts %}
        <li><a href="{{ post.url }}">{{ post.title }}</a></li>
      {% endfor %}
    </ul>
  </div>
</div>

---

## 🌏 社交链接

[GitHub](https://github.com/Zack-Zhang1031) ・ [知乎](#) ・ [邮箱](mailto:zhangkun1031@hotmail.com) ・ [RSS](/feed.xml)

---

<p align="center" style="color:#aaa;font-size:0.9em;">
  &copy; 2025 Zack's Blog · Powered by Jekyll & GitHub Pages
</p>
