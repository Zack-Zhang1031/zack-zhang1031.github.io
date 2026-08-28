---
title: "AI 科研工程基础 02：Git 与 GitHub 的科研协作工作流"
date: 2026-08-28T13:40:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "AI 科研内容课程系列一第 2 课：Git 分支模型、提交纪律、冲突处理和 GitHub PR 流程在科研工程项目中的实战用法，附实验代码与论文代码管理的特殊约定。"
tags: ["Git", "GitHub", "版本控制", "科研协作"]
categories: ["AI课程", "科研工程"]
math: false
---

科研项目的代码管理有个独特矛盾：**探索是混乱的，但结果必须可复现**。一个实验分支上试了五种特征组合，四种失败了——这些失败的尝试要不要进版本库？我的答案是：过程可以乱，主干必须干净。这一课讲支撑这个原则的 Git 工作流。

> 前置阅读：[第 1 课：开发环境与贯穿案例](/posts/ai-research-eng-01-dev-environment/)。本站已有 [GitHub Actions 自动部署](/posts/github-actions-hugo-deploy/) 和 [为什么我同时维护 GitHub 和 Gitee](/posts/why-github-and-gitee/) 两篇相关文章，CI 细节在系列五第 4 课展开。

## 分支模型：主干、功能、实验三类

科研项目里我只用三类分支：

```bash
main                          # 永远可运行，受保护
feat/ingest-openalex          # 功能分支：开发明确的功能
exp/tfidf-vs-embedding        # 实验分支：探索性对比，允许混乱
```

规则很简单：

- **main 永远能跑**。合入 main 的唯一通道是 PR + 测试通过。案例平台的所有里程碑（M1 数据集、M2 分类器……）都以 main 上的 tag 标记：`git tag m1-dataset`。
- **feat/ 分支做功能**，生命周期短，合完就删。
- **exp/ 分支做实验**，允许提交混乱、允许失败。实验有了结论，把有效的那部分**整理成干净提交**合回 main，实验分支本身可以留着存档或删除。

这套模型的核心是承认"科研探索天然产生垃圾提交"，但把混乱隔离在 exp/ 分支里。直接在 main 上边试边改，三个月后没人知道哪个版本产出了论文里的数字。

## 提交纪律：让历史可读

提交信息是写给未来的自己看的。我的约定：

```
feat: add OpenAlex cursor pagination     # 新功能
fix: handle null author in Crossref      # 修 bug
exp: compare chunk sizes 256/512/1024    # 实验记录
data: refresh arxiv cs.CL snapshot       # 数据相关（脚本/配置变更）
docs: update milestone M1 notes          # 文档
chore: bump dependencies                 # 杂务
```

`类型: 一句话描述`，类型前缀让 `git log --oneline` 一眼能筛出某类变更。两个细节：

**一个提交只做一件事。**"修了两个 bug 顺便加了个功能"的提交，在需要 revert 其中一个 bug 修复时就是灾难。`git add -p` 可以逐块挑选暂存，值得练熟。

**实验提交记录参数和结果。** exp 分支的提交信息直接写关键数字：`exp: chunk=512, recall@10=0.83`。这样 `git log` 本身就是一份实验台账，配合[研究方法](/posts/research-methods-ai/)一篇的实验记录模板使用效果更佳。

## 日常操作速查

```bash
# 从 main 开功能分支
git checkout -b feat/crossref-ingest main

# 逐块暂存（只提交想要的部分）
git add -p

# 改完发现上一条提交信息写错了
git commit --amend -m "fix: correct cursor pagination offset"

# 功能开发期间 main 前进了，同步最新 main
git fetch origin && git rebase origin/main

# 实验分支想扔掉重来
git reset --hard origin/main

# 找"哪个提交引入了 bug"：二分查找
git bisect start && git bisect bad && git bisect good v0.3
```

`git bisect` 是被低估的神器：标记一个好版本和一个坏版本，Git 二分定位到引入问题的提交。数据管道突然产出异常时，它比肉眼翻历史快得多。

## GitHub 协作：PR 是质量门

单人项目也值得走 PR 流程，因为它强制你**在合并前用审查的眼光看一遍自己的改动**：

```bash
git push -u origin feat/crossref-ingest
# 在 GitHub 上开 PR，填写：
# - 做了什么（链接里程碑/问题）
# - 怎么验证的（跑了什么测试、看了什么输出）
# - 风险点（改了哪些共享代码路径）
```

PR 模板里"怎么验证的"这一栏对科研项目最重要。代码正确不等于结果正确——一个解析脚本语法没错，但把 Crossref 的 `published-online` 和 `published-print` 日期字段搞混了，只有看输出样本才看得出来。PR 里贴一段真实输出，是最便宜的同行评审。

合并策略选 **Squash and merge**：功能分支上的 20 个零碎提交压成 main 上的一条干净记录。实验分支不合 main 时直接删分支，历史留在 PR 页面里可查。

## 科研代码的特殊约定

**实验配置进库，实验产物不进库。** 配置文件（yaml/json）、随机种子、数据获取脚本全部版本化；训练出的模型文件、中间数据集不进 Git，用 `data/` 分层 + 外部存储管理，README 里写清楚获取方式。

**结果可复现三件套。** 任何一个产生数字的实验，合入 main 时必须满足：配置在库里、种子固定、README 里有一条命令能重跑。缺任何一件，这个数字就不该出现在报告里。

**Notebook 的特殊处理。** Jupyter notebook 输出里有大段 base64 图片，diff 完全没法看。两个方案：提交前清空输出（`jupyter nbconvert --clear-output`），或用 `nbstripout` 插件自动剥离。探索在 notebook 里做，定型后把代码搬进 `src/` 的 `.py` 文件——notebook 是草稿纸，不是交付物。

## 踩坑排查

| 症状 | 原因 | 处理 |
|---|---|---|
| 提交了 .venv 或大数据文件 | .gitignore 漏配 | `git rm -r --cached <路径>` 清缓存后补 ignore |
| rebase 冲突越解越乱 | 对共享分支 rebase | 只对自己的功能分支 rebase；共享分支用 merge |
| 误删分支找回 | 分支删了但提交还在 | `git reflog` 找提交哈希，`git branch 恢复名 <hash>` |
| amend 之后 push 被拒 | 改写了已推送的历史 | 确认是私有分支后用 `--force-with-lease` |
| 两人改了同一段配置冲突 | 没有配置分层约定 | 公共配置 + 本地覆盖文件（后者不进库） |

## 作品集证据

完成本课后，你的案例项目应该具备：三类分支的实际使用记录、带类型前缀的提交历史、至少一次 exp/ 分支的"实验 → 整理 → 合回"完整循环。GitHub 仓库的 Insights 页面本身就是面试时可以展示的工程能力证据。

## 练习

1. 在案例项目中走一遍完整循环：开 `exp/ingest-batch-size` 分支做两次带结果数字的实验提交，把有效结论整理成一条 `feat:` 提交，通过 PR squash 合回 main。
2. 故意制造一次 rebase 冲突并解决它，记录冲突文件和解决思路。
3. 用 `git bisect` 在一段构造的历史里定位一个"引入 bug 的提交"。
4. 给仓库写一个 PR 模板（`.github/pull_request_template.md`），包含"怎么验证的"一栏。

## 面试常问

**Q：rebase 和 merge 的区别，什么时候用哪个？**
merge 保留真实历史（产生合并提交），rebase 把分支提交"搬"到最新主干上、历史线性但改写了提交。约定：自己的功能分支同步主干用 rebase（历史干净）；合入主干用 merge/squash（保留事实）；已推送的共享分支绝不 rebase。

**Q：科研项目用 Git 和软件项目有什么不同？**
多了实验分支这层：探索性工作允许混乱但隔离存放，结论整理后干净合回；强调配置/种子/数据脚本的版本化而非数据本身；提交信息直接记录实验参数与结果，让 git log 兼任实验台账。

**Q：怎么向面试官描述你的 Git 协作习惯？**
讲分支模型（三类分支及各自规则）、提交纪律（类型前缀、原子提交）、质量门（PR 模板里的验证栏）、以及一次真实的用 bisect 定位问题的经历——有具体故事比背概念有力得多。

---

下一课：[AI 科研工程基础 03：Jupyter 与可复现实验工作流](/posts/ai-research-eng-03-jupyter-reproducible/)。
