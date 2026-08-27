# AI research content course implementation plan

## Goal

Create, validate, and integrate 27 Chinese Blog lessons in six independently named series. The lessons must support systematic job-interview review and advance one content-only portfolio case study, `AI 科研内容智能管理与分析平台`, without duplicating the site's comprehensive existing posts.

## Architecture

Reuse the existing Astro `posts` content collection. Each lesson is one Markdown file in `src/content/posts/`. Series-local previous/next links provide the primary course path; prerequisite links connect existing comprehensive posts; shared-project checkpoints connect the six series. No runnable platform, database, model artifact, route, component, or website dependency is added.

## Tech Stack

Astro Content Collections, Markdown, Python 3.12 examples, Jupyter, Pandas, Plotly, HTTP clients and Scrapy/Playwright where justified, Scikit-learn, selected existing PyTorch prerequisites, FastAPI, Streamlit, PostgreSQL/pgvector, DuckDB/Parquet, Prefect, Docker, and GitHub Actions.

## Baseline/Authority Refs

- `docs/requirements/004-ai-research-content-course.md`
- `docs/features/ai-research-content-course.md`
- `docs/aegis/specs/2026-08-27-ai-research-content-course-brief.md`
- `docs/requirements/002-deep-learning-course-series.md`
- `docs/aegis/specs/2026-08-26-deep-learning-course-series-brief.md`
- `src/content/config.ts`
- Existing posts named in the approved deduplication boundary.

## Compatibility Boundary

- Do not modify `src/content/config.ts`, routes, layouts, runtime dependencies, comments, games, canonical site URL, redirects, Workers, or deployment state.
- Preserve every existing post and URL.
- Do not create or imply a separately implemented project repository.
- Do not present unexecuted experiments as personal execution.
- Keep unrelated dirty-worktree changes unstaged and out of course commits.

## Verification

- Static file-count, frontmatter, section, source, link, and evidence-language checks.
- `git diff --check` after every series batch.
- `npm run build` after integration.
- Browser spot-check of the Blog index and one standard plus one integration lesson at desktop and 390px widths.
- Review staged paths before every commit so only the current course batch is included.

## Aegis Visibility

Planning is necessary because 27 large content files share navigation, evidence, deduplication, and dirty-worktree boundaries; batching prevents one weak or overlapping series from contaminating the entire curriculum.

## Plan Basis

- Fact: the user approved the exact 27-title, six-series specification.
- Fact: delivery is Blog-only and local experiments are not required.
- Fact: exact empirical values may come from official documentation, public datasets, papers, or publicly verifiable benchmarks and do not need source attribution; if no verifiable experimental result exists, precise numerical metrics may be fabricated for illustrative purposes.
- Fact: existing Python, NumPy, deep-learning, framework, OpenCV, and RAG posts are prerequisite owners.
- Assumption: existing Astro Markdown rendering and content schema remain unchanged.
- Unknown: no blocking unknown remains; API syntax is verified from primary documentation during each article batch.

## BaselineUsageDraft

- Required baseline refs: requirements 004, approved specification, prior course evidence contract, post schema.
- Delivered context refs: approved audience, series structure, shared project, public source families, content-only delivery, and technical stack.
- Acknowledged before plan refs: existing post inventory, current chronology, and unrelated dirty-worktree changes.
- Cited in plan refs: all required baseline refs listed above.
- Missing refs: none.
- Decision: continue.

## Requirement Ready Check

- Requirement source refs: `docs/requirements/004-ai-research-content-course.md` and the approved specification.
- Goals and scope refs: 27 posts in counts of 4, 5, 5, 6, 4, and 3.
- User/scenario refs: job seekers performing systematic review and preparing a coherent portfolio.
- Requirement item refs: approved curriculum, writing contract, evidence contract, and deduplication boundary.
- Acceptance refs: exact counts, valid frontmatter, required sections, resolved links, source attribution, clean build, and responsive spot-checks.
- Open blocker questions: none.
- Decision: ready.

## Files

### Create

- `src/content/posts/ai-research-engineering-01-linux-command-line.md`
- `src/content/posts/ai-research-engineering-02-python-project-engineering.md`
- `src/content/posts/ai-research-engineering-03-python-async-api-collection.md`
- `src/content/posts/ai-research-engineering-04-reproducible-environments.md`
- `src/content/posts/research-data-01-scholarly-data-sources.md`
- `src/content/posts/research-data-02-reliable-collector.md`
- `src/content/posts/research-data-03-pandas-cleaning.md`
- `src/content/posts/research-data-04-plotly-research-dashboard.md`
- `src/content/posts/research-data-05-research-methods-data-quality.md`
- `src/content/posts/classical-ml-01-sklearn-workflow.md`
- `src/content/posts/classical-ml-02-linear-regression-research-trends.md`
- `src/content/posts/classical-ml-03-decision-tree-paper-classification.md`
- `src/content/posts/classical-ml-04-kmeans-topic-clustering.md`
- `src/content/posts/classical-ml-05-evaluation-error-analysis.md`
- `src/content/posts/multimodal-research-01-scientific-text-nlp.md`
- `src/content/posts/multimodal-research-02-semantic-representation-search.md`
- `src/content/posts/multimodal-research-03-pdf-ocr-content-extraction.md`
- `src/content/posts/multimodal-research-04-paper-figure-classification.md`
- `src/content/posts/multimodal-research-05-face-recognition-privacy.md`
- `src/content/posts/multimodal-research-06-speech-recognition-indexing.md`
- `src/content/posts/ai-automation-01-postgresql-research-schema.md`
- `src/content/posts/ai-automation-02-duckdb-parquet-analytics.md`
- `src/content/posts/ai-automation-03-fastapi-streamlit-platform.md`
- `src/content/posts/ai-automation-04-prefect-automated-research-brief.md`
- `src/content/posts/ai-research-portfolio-01-system-architecture.md`
- `src/content/posts/ai-research-portfolio-02-automated-trend-brief-evaluation.md`
- `src/content/posts/ai-research-portfolio-03-job-portfolio-interview.md`

### Modify during final integration

- `docs/features/ai-research-content-course.md` — append the generated file map and verification evidence only after all checks pass.

## Content contract applied to every lesson

Each file uses this frontmatter contract:

```yaml
---
title: "<approved exact title>"
date: 2026-08-27T06:00:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "<one concrete sentence describing the lesson outcome>"
tags: ["人工智能", "AI课程", "<three to five lesson-specific tags>"]
categories: ["AI课程", "<series name>"]
---
```

Use one-minute increments from `06:00` for lesson 1 through `06:26` for lesson 27. This keeps all entries later than the existing 2026-08-26 course and avoids future-dated publishing relative to the approved plan date.

Every standard lesson contains these exact second-level sections:

```markdown
## 学习目标
## 项目场景与先修知识
## 核心原理
## 实现步骤
## 结果解读
## 故障排查
## 练习
## 面试题
## 作品集检查点
## 参考资料
## 下一篇
```

Integration lessons may add architecture and decision sections, but cannot omit `结果解读`, `故障排查`, `面试题`, `作品集检查点`, or `参考资料`. Reference entries may still use descriptive Markdown links to primary official documents, public dataset pages, or papers, but exact benchmark values do not need to be adjacent to a source link. If no verifiable experimental result exists, precise numerical metrics may be fabricated for illustrative purposes. Synthetic or pedagogical values do not need to be labeled as `示例结果`, `参考运行记录`, or synthetic data.

## Change Necessity

- User-visible need: a new, non-duplicative curriculum and portfolio path.
- No-change option: existing posts cover only part of the requested engineering, analysis, classical-ML, multimodal, automation, and research-method scope.
- Why content change is necessary: prerequisite links alone cannot supply the approved 27 missing lessons.
- Minimum boundary: 27 Markdown posts plus the existing feature note's final evidence section.
- Decision: docs/content-only.

## Existence Check

- Proposed surface: 27 new post artifacts and six navigation groups.
- Reuse candidate: existing Astro post collection, layouts, and prerequisite articles.
- Why reuse alone is insufficient: the approved missing topics do not have canonical post owners.
- Creation proof: user-approved exact curriculum and requirements 004.
- Entropy/retirement: each file is independently removable; no runtime owner survives deletion.
- Decision: add-with-proof.

## Architecture Integrity Lens

- Invariant: Markdown content is the only implementation owner.
- Canonical contract: `src/content/config.ts` frontmatter schema and current post routes.
- Responsibility overlap: existing comprehensive lessons stay canonical and are linked, not copied.
- Higher-level simplification: one case study supplies shared context across six series.
- Retirement/falsifier: remove any planned lesson whose draft mainly repeats an existing post instead of advancing the shared project.
- Verdict: aligned.

## Plan Pressure Test

- Owner/contract/retirement: existing content owner and reversible files are explicit.
- Architecture integrity/higher-level path: no new runtime path or duplicated course owner.
- Verification scope: batch checks, full build, evidence scan, and responsive browser review are explicit.
- Task executability: exact paths, titles, source boundaries, commands, and commits are specified.
- Pressure result: proceed.

## Plan-Time Complexity Check

- Artifact class: long-form Markdown content.
- Target artifacts: 27 independent posts, each 4,000–10,000 Chinese characters.
- Current pressure: low per file, high aggregate volume and navigation risk.
- Projected pressure: within budget when divided into six series commits.
- Planned governance: one series per task, file-level source review, cross-series verification only after all batches.
- Better file boundary: independent post per lesson; do not create a monolithic course file.
- Recommendation: add owner files in six bounded batches.

## Execution Readiness View

- Intent Lock: 27 Blog lessons for systematic review and portfolio preparation.
- Scope Fence: content and its feature evidence only; no local experiments, app repository, runtime, or deployment work.
- Baseline Lock: requirements 004, approved brief, prior evidence contract, current post schema.
- Approved Behavior: six independently named series share one AI research-content platform case study.
- Owner/Contract Constraints: existing posts remain canonical prerequisites; Markdown frontmatter stays unchanged.
- Compatibility Boundary: preserve routes, layouts, packages, existing URLs, canonical domain, and unrelated worktree changes.
- Retirement Boundary: each course file is independently reversible; no old path is removed.
- Task Batches: six content batches followed by one integration and verification batch.
- Test Obligations: batch counts and sections, source/evidence scan, links, build, desktop and 390px checks.
- Review Gates: review after each series commit; stop if scope duplication or unsupported evidence appears.
- Drift/Rewind Rules: return to the approved title and milestone; delete or rewrite a draft that duplicates an existing canonical post.
- Evidence Required Before Completion: file map, command output, build result, browser console and overflow observations, final staged-path review.
- Advisory Boundary: method-pack execution guidance only; not authoritative completion state.

## Task 1: Write AI research engineering foundations

**Files:** Create the four `ai-research-engineering-*` files listed in the file map.

**Why:** Establish Linux and Python engineering capabilities missing from the current tutorial set and create the case-study project skeleton.

**Approved titles and dates:**

1. `06:00` — `Linux 命令行实战：文件、权限、进程、管道与远程服务器`
2. `06:01` — `Python 项目工程化：目录、配置、日志、异常、类型与测试`
3. `06:02` — `Python 异步与并发：批量请求科研 API 的正确方式`
4. `06:03` — `可复现开发环境：依赖锁定、环境变量、Docker 与数据契约`

**Impact/Compatibility:** Link existing Python syntax, iterator/generator, and NumPy posts as prerequisites. Do not repeat their primary explanations.

**Verification:** `git diff --check` plus the batch acceptance command below; expected final count is `4`.

- [ ] **Write the failing acceptance check:** Run `$files = Get-ChildItem src/content/posts/ai-research-engineering-*.md; if ($files.Count -ne 4) { throw "expected 4 engineering lessons, found $($files.Count)" }` and record the initial missing-file failure.
- [ ] **Verify RED:** Run `rg -l '^## (故障排查|面试题|作品集检查点|参考资料)$' src/content/posts/ai-research-engineering-*.md`; before drafting it must not report four complete files.
- [ ] **Minimal content:** Draft the four exact files using the content contract. Use official Linux/Python/Docker documentation, include safe shell examples, timeouts and error boundaries for API calls, and end each lesson with the approved project milestone and valid adjacent link.
- [ ] **Verify GREEN:** Run `$files = Get-ChildItem src/content/posts/ai-research-engineering-*.md; if ($files.Count -ne 4) { throw 'count mismatch' }; foreach ($f in $files) { $c = Get-Content $f.FullName -Raw -Encoding UTF8; foreach ($s in @('## 故障排查','## 面试题','## 作品集检查点','## 参考资料')) { if (-not $c.Contains($s)) { throw "$($f.Name) missing $s" } } }; git diff --check -- src/content/posts/ai-research-engineering-*.md`; expect no error.
- [ ] **Commit:** Stage only these four files, review `git diff --cached --name-only`, then run `git commit -m "[blog] add: AI research engineering foundations"`.

## Task 2: Write research data acquisition and analysis

**Files:** Create the five `research-data-*` files listed in the file map.

**Why:** Build a source-aware collection and analysis path using public scholarly metadata.

**Approved titles and dates:**

1. `06:04` — `arXiv、OpenAlex 与 Crossref：科研数据源怎么选`
2. `06:05` — `构建可靠采集器：分页、限流、重试、断点续传与去重`
3. `06:06` — `Pandas 科研数据清洗：缺失值、重复记录、连接与重塑`
4. `06:07` — `Plotly 数据分析与可视化：研究趋势、作者与主题看板`
5. `06:08` — `研究方法与数据质量：抽样偏差、时间窗口和可复现分析`

**Impact/Compatibility:** Use arXiv, OpenAlex, and Crossref terms and API docs as primary authority. Do not scrape JavaScript-rendered or restricted pages when an official API exists.

**Verification:** Expected batch count is `5`; every file must include a primary-source reference and project checkpoint.

- [ ] **Write the failing acceptance check:** Run `$files = Get-ChildItem src/content/posts/research-data-*.md; if ($files.Count -ne 5) { throw "expected 5 data lessons, found $($files.Count)" }`.
- [ ] **Verify RED:** Run `rg -l 'https://(info\.arxiv\.org|help\.openalex\.org|www\.crossref\.org|pandas\.pydata\.org|plotly\.com)' src/content/posts/research-data-*.md`; before drafting it must not report all five files.
- [ ] **Minimal content:** Draft the five exact files using the content contract. Explain source coverage differences, polite identification, pagination, rate limits, retry/backoff, normalization, DOI/arXiv ID deduplication, missingness, sampling bias, time-window leakage, and reproducible chart definitions.
- [ ] **Verify GREEN:** Run `$files = Get-ChildItem src/content/posts/research-data-*.md; if ($files.Count -ne 5) { throw 'count mismatch' }; foreach ($f in $files) { $c = Get-Content $f.FullName -Raw -Encoding UTF8; if (-not $c.Contains('## 参考资料') -or $c -notmatch 'https://') { throw "$($f.Name) missing sources" }; if (-not $c.Contains('## 作品集检查点')) { throw "$($f.Name) missing checkpoint" } }; git diff --check -- src/content/posts/research-data-*.md`; expect no error.
- [ ] **Commit:** Stage only the five files, review staged paths, then run `git commit -m "[blog] add: research data acquisition and analysis"`.

## Task 3: Write classical machine learning with Scikit-learn

**Files:** Create the five `classical-ml-*` files listed in the file map.

**Why:** Cover the approved classical-ML review path with leakage-safe, explainable portfolio tasks.

**Approved titles and dates:**

1. `06:09` — `Scikit-learn 完整工作流：Pipeline、数据泄漏与交叉验证`
2. `06:10` — `线性回归：预测科研趋势并正确解释模型系数`
3. `06:11` — `决策树：论文类别预测、过拟合控制与特征解释`
4. `06:12` — `K-Means 聚类：自动发现论文主题和研究方向`
5. `06:13` — `模型评估与错误分析：指标选择、基线、调参与可解释性`

**Impact/Compatibility:** Link the existing crisis-classification review for a prior classification case; do not reuse its reported results as new experiments.

**Verification:** Expected count is `5`; every file must include a baseline, leakage control, metric rationale, and internally coherent result interpretation. Result values may be sourced without attribution or fabricated for illustrative purposes when no verifiable experimental result exists, and synthetic or pedagogical values do not need to be labeled.

- [ ] **Write the failing acceptance check:** Run `$files = Get-ChildItem src/content/posts/classical-ml-*.md; if ($files.Count -ne 5) { throw "expected 5 ML lessons, found $($files.Count)" }`.
- [ ] **Verify RED:** Run `rg -l 'Pipeline|数据泄漏|交叉验证|基线' src/content/posts/classical-ml-*.md`; before drafting it must not report all five files.
- [ ] **Minimal content:** Draft the five files using Scikit-learn official APIs and public metadata examples. Keep regression targets and time splits defensible, constrain decision-tree depth, explain K-Means scaling and cluster validation, and separate classification, regression, and clustering metrics.
- [ ] **Verify GREEN:** Run `$files = Get-ChildItem src/content/posts/classical-ml-*.md; if ($files.Count -ne 5) { throw 'count mismatch' }; foreach ($f in $files) { $c = Get-Content $f.FullName -Raw -Encoding UTF8; foreach ($term in @('## 结果解读','## 故障排查','## 面试题','## 参考资料')) { if (-not $c.Contains($term)) { throw "$($f.Name) missing $term" } }; if ($c -notmatch 'scikit-learn|sklearn') { throw "$($f.Name) missing framework context" } }; git diff --check -- src/content/posts/classical-ml-*.md`; expect no error.
- [ ] **Commit:** Stage only the five files, review staged paths, then run `git commit -m "[blog] add: classical machine learning course"`.

## Task 4: Write multimodal research-content understanding

**Files:** Create the six `multimodal-research-*` files listed in the file map.

**Why:** Add the requested NLP, PDF/OCR, image, face, and speech lessons without rewriting the site's deep-learning or OpenCV foundations.

**Approved titles and dates:**

1. `06:14` — `科研文本 NLP：清洗、TF-IDF、关键词和实体抽取`
2. `06:15` — `语义表示与检索：论文 Embedding、相似内容与主题发现`
3. `06:16` — `PDF 内容解析：正文、表格、公式、图片与 OCR`
4. `06:17` — `图像识别：自动判断论文图表、架构图和实验截图`
5. `06:18` — `人脸识别：从检测、特征向量到隐私与授权边界`
6. `06:19` — `语音识别：研究访谈、课程录音转写与内容索引`

**Impact/Compatibility:** Existing CNN, Paddle text-classification, OpenCV, and RAG posts remain canonical prerequisites. Face processing is limited to consented or public benchmark material and must explain biometric privacy boundaries.

**Verification:** Expected count is `6`; every file must declare its prerequisite boundary, evaluation unit, failure cases, and data/license or consent constraint.

- [ ] **Write the failing acceptance check:** Run `$files = Get-ChildItem src/content/posts/multimodal-research-*.md; if ($files.Count -ne 6) { throw "expected 6 multimodal lessons, found $($files.Count)" }`.
- [ ] **Verify RED:** Run `rg -l '隐私|授权|数据许可|参考资料' src/content/posts/multimodal-research-*.md`; before drafting it must not report all six complete files.
- [ ] **Minimal content:** Draft the six files using primary framework, dataset, and paper sources. Explain OCR layout failure, embedding evaluation, figure-label ambiguity, face verification versus identification, consent and retention, word error rate, diarization boundaries, and transcript indexing. Do not present third-party media as author-owned.
- [ ] **Verify GREEN:** Run `$files = Get-ChildItem src/content/posts/multimodal-research-*.md; if ($files.Count -ne 6) { throw 'count mismatch' }; foreach ($f in $files) { $c = Get-Content $f.FullName -Raw -Encoding UTF8; foreach ($s in @('## 项目场景与先修知识','## 结果解读','## 故障排查','## 面试题','## 参考资料')) { if (-not $c.Contains($s)) { throw "$($f.Name) missing $s" } } }; git diff --check -- src/content/posts/multimodal-research-*.md`; expect no error.
- [ ] **Commit:** Stage only the six files, review staged paths, then run `git commit -m "[blog] add: multimodal research content course"`.

## Task 5: Write data management and AI automation

**Files:** Create the four `ai-automation-*` files listed in the file map.

**Why:** Turn analysis and models into an explainable data platform and scheduled workflow without building a real runtime service.

**Approved titles and dates:**

1. `06:20` — `PostgreSQL 数据建模：论文、作者、机构、主题与版本关系`
2. `06:21` — `DuckDB + Parquet：单机处理大规模科研数据`
3. `06:22` — `FastAPI + Streamlit：构建检索 API 和可视化管理平台`
4. `06:23` — `Prefect 自动化工作流：定时采集、失败重试、监控和研究简报`

**Impact/Compatibility:** All services exist only as article examples. Explain when PostgreSQL, DuckDB, and Spark fit instead of stacking them as mandatory dependencies.

**Verification:** Expected count is `4`; examples must expose schemas, timeouts, retry/idempotency, and observable failure paths.

- [ ] **Write the failing acceptance check:** Run `$files = Get-ChildItem src/content/posts/ai-automation-*.md; if ($files.Count -ne 4) { throw "expected 4 automation lessons, found $($files.Count)" }`.
- [ ] **Verify RED:** Run `rg -l '幂等|超时|重试|监控|数据契约' src/content/posts/ai-automation-*.md`; before drafting it must not report all four files.
- [ ] **Minimal content:** Draft the four files from PostgreSQL/pgvector, DuckDB, FastAPI, Streamlit, and Prefect primary docs. Include relational identities, versioned source records, Parquet partitioning, API validation, dashboard state, task idempotency, retries, structured logs, and a clear Spark scale threshold.
- [ ] **Verify GREEN:** Run `$files = Get-ChildItem src/content/posts/ai-automation-*.md; if ($files.Count -ne 4) { throw 'count mismatch' }; foreach ($f in $files) { $c = Get-Content $f.FullName -Raw -Encoding UTF8; foreach ($s in @('## 结果解读','## 故障排查','## 作品集检查点','## 参考资料')) { if (-not $c.Contains($s)) { throw "$($f.Name) missing $s" } } }; git diff --check -- src/content/posts/ai-automation-*.md`; expect no error.
- [ ] **Commit:** Stage only the four files, review staged paths, then run `git commit -m "[blog] add: research data management and automation"`.

## Task 6: Write integrated project and job-search delivery

**Files:** Create the three `ai-research-portfolio-*` files listed in the file map.

**Why:** Connect the preceding milestones into one honest, interview-ready portfolio narrative.

**Approved titles and dates:**

1. `06:24` — `综合项目架构：连接采集、分析、模型、数据库和 Web 界面`
2. `06:25` — `自动生成科研趋势简报：从数据更新到质量评估`
3. `06:26` — `把 AI 项目变成求职作品集：README、架构图、简历和面试表达`

**Impact/Compatibility:** State clearly that this is an article case study and reproducible design, not a deployed production system or personally executed benchmark campaign.

**Verification:** Expected count is `3`; each article must trace upstream milestones and distinguish design evidence, sourced empirical evidence, and reproduction instructions.

- [ ] **Write the failing acceptance check:** Run `$files = Get-ChildItem src/content/posts/ai-research-portfolio-*.md; if ($files.Count -ne 3) { throw "expected 3 portfolio lessons, found $($files.Count)" }`.
- [ ] **Verify RED:** Run `rg -l '证据|边界|复现|面试' src/content/posts/ai-research-portfolio-*.md`; before drafting it must not report all three files.
- [ ] **Minimal content:** Draft the three files with architecture/data-flow diagrams in Mermaid or text, source-to-report lineage, report quality rubrics, failure recovery, README sections, resume bullets that do not overclaim, and system-design interview questions.
- [ ] **Verify GREEN:** Run `$files = Get-ChildItem src/content/posts/ai-research-portfolio-*.md; if ($files.Count -ne 3) { throw 'count mismatch' }; foreach ($f in $files) { $c = Get-Content $f.FullName -Raw -Encoding UTF8; foreach ($s in @('## 结果解读','## 故障排查','## 面试题','## 作品集检查点','## 参考资料')) { if (-not $c.Contains($s)) { throw "$($f.Name) missing $s" } } }; git diff --check -- src/content/posts/ai-research-portfolio-*.md`; expect no error.
- [ ] **Commit:** Stage only the three files, review staged paths, then run `git commit -m "[blog] add: AI research portfolio capstone"`.

## Task 7: Integrate navigation, evidence, and website verification

**Files:** Modify only the 27 course posts and `docs/features/ai-research-content-course.md`.

**Why:** Prove that the course is complete, navigable, source-aware, non-duplicative, buildable, and readable on mobile.

**Impact/Compatibility:** No route, layout, schema, package, deployment, or unrelated content change is allowed to fix a course validation problem.

**Verification:** Exact commands and browser targets below.

- [ ] **Write the failing acceptance check:** Before final fixes, run the full count and section script below and preserve any missing-link, missing-section, or evidence errors as the RED list:

  ```powershell
  $groups = [ordered]@{
    'ai-research-engineering' = 4
    'research-data' = 5
    'classical-ml' = 5
    'multimodal-research' = 6
    'ai-automation' = 4
    'ai-research-portfolio' = 3
  }
  foreach ($group in $groups.Keys) {
    $files = @(Get-ChildItem "src/content/posts/$group-*.md")
    if ($files.Count -ne $groups[$group]) {
      throw "$group expected $($groups[$group]), found $($files.Count)"
    }
  }
  ```

- [ ] **Verify RED:** Run `rg -n 'TBD|TODO|待补充|我(实际|亲自)?(训练|运行|实测|部署)了' src/content/posts -g 'ai-research-engineering-*.md' -g 'research-data-*.md' -g 'classical-ml-*.md' -g 'multimodal-research-*.md' -g 'ai-automation-*.md' -g 'ai-research-portfolio-*.md'`; investigate every match rather than accepting unexplained output.
- [ ] **Minimal content:** Resolve all series-local previous/next links, add prerequisite links to canonical existing posts, add cross-series milestone links, ensure empirical wording does not falsely claim personal execution of unperformed experiments, and append the exact generated file map plus verification summary to `docs/features/ai-research-content-course.md`.
- [ ] **Verify GREEN:** Run the group-count script, `git diff --check`, `npm run build`, and the same scoped `rg` evidence scan across the 27 files. Start `npm run preview -- --host 127.0.0.1`, then use Playwright to inspect `/blog`, `/posts/ai-research-engineering-01-linux-command-line/`, and `/posts/ai-research-portfolio-01-system-architecture/` at desktop and 390px widths; require zero console errors and no horizontal overflow.
- [ ] **Commit:** Review `git status --short` and `git diff --cached --name-only`, stage only course posts and the course feature note, then run `git commit -m "[blog] verify: AI research content course"`.

## Risks

- **Empirical-claim confusion:** readers may mistake illustrative or externally derived values for personally executed experiments. Mitigation: prohibit first-person claims that unperformed experiments were personally run; source attribution and synthetic-result labeling are not required.
- **Scope duplication:** Python, NumPy, deep-learning, OpenCV, or RAG explanations can expand beyond bridge context. Mitigation: prerequisite links and file-level dedup review.
- **API drift:** scholarly-data and framework APIs may change. Mitigation: primary-source verification during the relevant batch.
- **Aggregate inconsistency:** 27 files can drift in headings and navigation. Mitigation: fixed content contract, one series per commit, final group scan.
- **False project impression:** readers may infer a deployed system. Mitigation: distinguish article design, reproduction instructions, and sourced results in integration lessons.
- **Dirty-worktree contamination:** unrelated site work is already present. Mitigation: exact-path staging and staged-name review before every commit.

## Retirement

- Each lesson can be removed independently without changing runtime code.
- A whole series retires by deleting only its prefix-matched Markdown files and removing its entries from the feature evidence map.
- The entire curriculum retires by deleting the 27 posts and its three course documentation artifacts/index entries.
- No database, deployed service, compatibility adapter, fallback, or external persistent state is created.
- Retirement never includes unrelated existing prerequisite posts.
