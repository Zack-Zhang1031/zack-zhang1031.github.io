---
layout: home
title: "欢迎来到 Zack 的个人博客"
---

<!-- 随机头图 -->
<img src="https://source.unsplash.com/1200x350/?blog,code,ai,notebook" alt="Banner" style="width:100%; border-radius: 12px; margin-bottom: 1em;">

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
  <!-- 可以手动推荐，也可以改成统计阅读数后自动推荐 -->
  <li><a href="/posts/ai-trend-2025">2025年AI趋势解析</a></li>
  <li><a href="/posts/ue5-quickstart">UE5快速上手攻略</a></li>
  <li><a href="/posts/python-tips">10个提升效率的Python小技巧</a></li>
</ul>

---

## 💬 最新评论

<!-- 
如果你用 Gitalk/Giscus/Waline，可以在这里嵌入最新评论 JS 组件，或跳转留言区
推荐写成一个入口（因为 GitHub Pages 静态站点不支持直接渲染动态最新评论） 
-->
<p>欢迎在每篇文章底部参与讨论~</p>
<p>
  <a href="/comments" style="background:#f2f2f2;border-radius:8px;padding:4px 12px;color:#0078e7;">查看所有评论</a>
</p>

<!-- 进阶玩法：嵌入第三方评论系统提供的“最新评论”小部件。Giscus/Waline/Gitalk/Disqus等都支持。 -->

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
