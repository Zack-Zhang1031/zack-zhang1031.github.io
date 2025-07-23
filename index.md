---
layout: default
title: "欢迎来到 Zack 的个人博客"
description: "Zack 的学习与成长"
---

# 👋 Hi，欢迎访问我的博客！

> 记录AI、编程、成长与生活点滴。.

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


## 📝 最新文章


<ul>
  {% for post in site.posts %}
    <li>
      <a href="{{ post.url }}">{{ post.title }}</a>
      <small style="color:#888;">({{ post.date | date: "%Y-%m-%d" }})</small>
      {% if post.tags %}
        <span style="color:#0af;">#{{ post.tags | join: ', ' }}</span>
      {% endif %}
    </li>
  {% endfor %}
</ul>
<a href="/tree/master/_posts2025-07-22-python-opencv-tips-tricks.html" target="_blank">
  Python + OpenCV 日常小技巧与常见坑整理
</a>

<p style="text-align:right"><a href="/archive">查看更多…</a></p>

---

## 🌏 社交 & 订阅

[GitHub](https://github.com/Zack-Zhang1031) ・ [邮箱](mailto:zhangkun1031@hotmail.com) ・ [RSS订阅](/feed.xml)

---

<p align="center" style="color:#aaa;font-size:0.9em;">
  &copy; 2025 Zack's Blog · Powered by Jekyll & GitHub Pages
</p>
