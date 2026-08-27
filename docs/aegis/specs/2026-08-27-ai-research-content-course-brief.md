# AI research content course brief

## Goal

Publish 27 coherent Blog lessons, divided into six independently named series, for job seekers who want systematic review and one portfolio-ready AI project narrative.

## Audience and scenario

- Primary reader: a learner with basic Python knowledge preparing for AI, data-analysis, machine-learning, or applied-AI interviews.
- Primary use: structured review, project explanation, interview preparation, and portfolio writing.
- Delivery: Blog articles only; no local experiments and no separate application repository.

## Shared case study

`AI 科研内容智能管理与分析平台` collects public AI and computer-science research metadata, cleans and analyzes it, applies classical machine learning and multimodal content processing, stores searchable records, exposes API and dashboard designs, and produces automated research briefs.

Primary source families:

- arXiv metadata API: <https://info.arxiv.org/help/api/basics.html>
- OpenAlex API and data reference: <https://help.openalex.org/>
- Crossref REST API: <https://www.crossref.org/documentation/retrieve-metadata/rest-api/>
- DuckDB Python API: <https://duckdb.org/docs/stable/clients/python/overview>
- Prefect workflow documentation: <https://docs.prefect.io/v3/get-started>

## Approved curriculum

### Series 1: AI research engineering foundations — 4 lessons

1. `Linux 命令行实战：文件、权限、进程、管道与远程服务器`
2. `Python 项目工程化：目录、配置、日志、异常、类型与测试`
3. `Python 异步与并发：批量请求科研 API 的正确方式`
4. `可复现开发环境：依赖锁定、环境变量、Docker 与数据契约`

Milestone: project skeleton, configuration, logging, and source-record contract.

### Series 2: Research data acquisition and analysis — 5 lessons

1. `arXiv、OpenAlex 与 Crossref：科研数据源怎么选`
2. `构建可靠采集器：分页、限流、重试、断点续传与去重`
3. `Pandas 科研数据清洗：缺失值、重复记录、连接与重塑`
4. `Plotly 数据分析与可视化：研究趋势、作者与主题看板`
5. `研究方法与数据质量：抽样偏差、时间窗口和可复现分析`

Milestone: metadata collection pipeline and research-trend analysis notebook design.

### Series 3: Classical machine learning with Scikit-learn — 5 lessons

1. `Scikit-learn 完整工作流：Pipeline、数据泄漏与交叉验证`
2. `线性回归：预测科研趋势并正确解释模型系数`
3. `决策树：论文类别预测、过拟合控制与特征解释`
4. `K-Means 聚类：自动发现论文主题和研究方向`
5. `模型评估与错误分析：指标选择、基线、调参与可解释性`

Milestone: trend regression, category classification, and topic-clustering portfolio evidence.

### Series 4: Multimodal research-content understanding — 6 lessons

1. `科研文本 NLP：清洗、TF-IDF、关键词和实体抽取`
2. `语义表示与检索：论文 Embedding、相似内容与主题发现`
3. `PDF 内容解析：正文、表格、公式、图片与 OCR`
4. `图像识别：自动判断论文图表、架构图和实验截图`
5. `人脸识别：从检测、特征向量到隐私与授权边界`
6. `语音识别：研究访谈、课程录音转写与内容索引`

Milestone: text, PDF, image, authorized face-processing, and speech-processing pipeline design.

### Series 5: Data management and AI automation — 4 lessons

1. `PostgreSQL 数据建模：论文、作者、机构、主题与版本关系`
2. `DuckDB + Parquet：单机处理大规模科研数据`
3. `FastAPI + Streamlit：构建检索 API 和可视化管理平台`
4. `Prefect 自动化工作流：定时采集、失败重试、监控和研究简报`

Milestone: searchable storage, analytical data path, API/dashboard design, and scheduled workflow.

### Series 6: Integrated project and job-search delivery — 3 lessons

1. `综合项目架构：连接采集、分析、模型、数据库和 Web 界面`
2. `自动生成科研趋势简报：从数据更新到质量评估`
3. `把 AI 项目变成求职作品集：README、架构图、简历和面试表达`

Milestone: complete portfolio narrative and interview-ready system explanation.

## Deduplication boundary

Do not rewrite existing comprehensive coverage of Python syntax and containers, NumPy, deep-learning fundamentals, neural networks, CNN, RNN, Transformer, TensorFlow/Keras, PaddlePaddle, OpenCV fundamentals, or RAG. New lessons may summarize the minimum bridge needed for the case study and must link the relevant existing post.

## Writing contract

- Standard lesson structure: goals, scenario, prerequisites, core concepts, coherent code, sourced or expected behavior, troubleshooting, exercises, interview questions, shared-project checkpoint, portfolio evidence, and navigation.
- Project lesson structure: problem and constraints, data and contracts, baseline, implementation design, result interpretation, failure analysis, final architecture, portfolio retrospective, and interview explanation.
- Standard lessons target 4,000–6,000 Chinese characters; integration lessons may use 7,000–10,000.
- Use a neutral teaching voice. First-person wording may explain a design choice but cannot claim an unperformed experiment.

## Evidence contract

- Local execution and model training are not required.
- Exact experimental values require an official, paper, public-dataset, or publicly verifiable benchmark source.
- If no verifiable result exists, describe expected trends without an invented exact metric.
- Synthetic teaching tables are labeled `参考运行记录` or `示例结果`.
- Code must be coherent and reproducible in principle, but the article must distinguish source-backed outcomes from unexecuted reproduction instructions.

## TaskIntentDraft

- Outcome: 27 indexed Blog lessons across six series.
- Goal: systematic review plus one coherent job-search portfolio case study.
- Success evidence: scope counts, valid frontmatter, resolved links, evidence-language scan, successful Astro build, and representative mobile checks.
- Stop condition: all 27 lessons and indexes pass the acceptance checks; no deployment or separate project work follows automatically.
- Non-goals: local model training, fabricated personal experiments, a new application repository, website runtime changes, and deployment changes.
- Main risks: topic duplication, unsupported metrics, API drift, excessive article length, and a case study that reads as implemented software rather than a content-only design.

## BaselineReadSetHint

- `docs/requirements/004-ai-research-content-course.md`
- `docs/features/ai-research-content-course.md`
- `docs/requirements/002-deep-learning-course-series.md`
- `docs/aegis/specs/2026-08-26-deep-learning-course-series-brief.md`
- `src/content/config.ts`
- Existing posts named in the deduplication boundary.

## BaselineUsageDraft

- Required baseline refs: current post schema, approved 27-lesson curriculum, prior course writing and evidence contracts.
- Delivered context refs: user-approved audience, six-series structure, shared case study, content-only delivery, public-source evidence rule, and technical stack.
- Acknowledged before plan refs: existing comprehensive post inventory and current dirty-worktree boundary.
- Cited in design refs: requirements 004, feature description, prior deep-learning course requirement, and official source documentation.
- Missing refs: none blocking specification.
- Decision: continue.

## Requirement Ready Check

- Requirement source refs: user approvals in the design conversation and `docs/requirements/004-ai-research-content-course.md`.
- Goals and scope refs: 27 lessons, six series, one shared case study, Blog-only output.
- User and scenario refs: job seekers performing systematic review and portfolio preparation.
- Requirement item refs: curriculum and writing/evidence contracts in this brief.
- Acceptance refs: file counts, series counts, frontmatter, links, evidence scan, build, and mobile checks.
- Open blocker questions: none.
- Decision: ready.

## ImpactStatementDraft

- Affected layers: Markdown content and documentation indexes only.
- Canonical owners: `src/content/posts/` for lessons; `docs/requirements/` for product scope; this brief for approved curriculum detail.
- Invariants: post schema, routes, layouts, runtime packages, canonical URL, comments, games, and deployment state remain unchanged.
- Compatibility: old posts and links remain valid; new lessons link rather than replace them.
- Non-goals: runtime application, database, model training, publication automation, and deployment mutation.

## Existence Check

- Proposed new surface: one new curriculum requirement, feature note, specification, and 27 Markdown posts.
- Existing owner or reuse candidate: current requirements/features/Aegis docs and Astro posts collection.
- Why existing surface is insufficient: the prior ten-part deep-learning course does not own the broader engineering, analysis, classical-ML, multimodal, automation, and research-method curriculum.
- Creation proof: user approved six independent series and the exact 27-title scope.
- Entropy and retirement impact: content-only files; removal is reversible and does not create a runtime owner.
- Decision: add-with-proof.

## Product Risk Lens

- Value: converts a broad topic list into a coherent review path and portfolio narrative.
- Non-goals: claiming personal experiments, duplicating comprehensive posts, or building a production platform.
- Trade-offs: 27 lessons improve coverage but require strict deduplication and navigation discipline.
- Decision needed: approved; proceed to implementation planning only after user reviews this written brief.

## Architecture Integrity Lens

- Invariant: Blog content remains the only implementation surface.
- Canonical contract: existing Astro post schema and routes.
- Responsibility overlap: avoided by linking existing comprehensive lessons.
- Higher-level simplification: six series share one case study and evidence contract.
- Retirement or falsifier: if a proposed lesson primarily repeats an existing post, replace it with a prerequisite link and remove it from the generation plan before drafting.
- Verdict: aligned.

## Acceptance

- Exactly 27 new posts exist in counts of 4, 5, 5, 6, 4, and 3.
- Titles and primary lesson scope do not duplicate existing comprehensive articles.
- Every lesson contains the required learning, troubleshooting, interview, and portfolio sections appropriate to its type.
- All internal links resolve and required frontmatter validates.
- Exact empirical claims are sourced; unperformed experiments are not presented as personal execution.
- `git diff --check` and `npm run build` succeed.
- Representative articles have no desktop or 390px overflow regressions.
