# AI research content course

## Overview

Add a 27-part, six-series Blog curriculum for job seekers who need systematic AI review and a coherent portfolio narrative. The lessons share one case study, an AI research content intelligence and management platform built around public artificial-intelligence and computer-science metadata. Existing comprehensive Python, NumPy, deep-learning, framework, and OpenCV posts remain prerequisites instead of being rewritten.

## User Stories

- As an AI job seeker, I can review Linux, Python engineering, data analysis, classical machine learning, multimodal processing, data management, automation, and research methods through one structured path.
- As a portfolio author, I can explain how each lesson advances one credible end-to-end system instead of presenting unrelated tutorial demos.
- As a reader, I can open any individual series independently while still following links to the shared project milestones.
- As a mobile reader, I can scan short sections, code blocks, tables, troubleshooting notes, exercises, and interview questions without reading an unbroken chapter.

## Functional Reqs

- Publish exactly 27 Markdown posts grouped into six independently named series:
  - AI research engineering foundations: 4 lessons.
  - Research data acquisition and analysis: 5 lessons.
  - Classical machine learning with Scikit-learn: 5 lessons.
  - Multimodal research-content understanding: 6 lessons.
  - Data management and AI automation: 4 lessons.
  - Integrated project and job-search delivery: 3 lessons.
- Use the shared case study `AI 科研内容智能管理与分析平台` throughout the curriculum.
- Focus source data on public AI and computer-science research metadata from arXiv, OpenAlex, Crossref, and compatible public datasets.
- Use Python 3.12, Jupyter, Pandas, Plotly, Scrapy or Playwright when browser acquisition is justified, Scikit-learn, PyTorch where an existing lesson is linked, FastAPI, Streamlit, PostgreSQL with pgvector, DuckDB, Prefect, Docker, and GitHub Actions.
- Treat Spark as a scale-up comparison, not a required project dependency.
- Include code, result interpretation, troubleshooting, exercises, interview questions, portfolio evidence, and links to adjacent lessons.
- Link existing comprehensive posts as prerequisites for Python syntax, NumPy, deep learning, neural networks, CNN, RNN, Transformer, TensorFlow/Keras, PaddlePaddle, OpenCV, and RAG.
- Deliver Blog content only. Do not create, train, execute, deploy, or claim to provide a separate application repository.

## Non-Functional Reqs

- Standard lessons target 4,000–6,000 Chinese characters; project and integration lessons target 7,000–10,000 when needed.
- Code examples must be internally coherent and organized so a reader can reproduce them, but local execution is not required for article production.
- Experimental values must come from official documentation, public datasets, papers, or publicly verifiable benchmarks and identify their source.
- When no verifiable result exists, describe expected behavior without inventing exact metrics.
- Synthetic or pedagogical tables must be explicitly labeled `参考运行记录` or `示例结果`.
- Do not claim that the author personally executed unperformed experiments.
- Verify current framework and data-source APIs against primary official documentation before publication.
- Keep website runtime dependencies, routes, schema, canonical URL, and deployment state unchanged.

## Data Model

No website schema change. Posts retain the existing frontmatter fields: `title`, `date`, `draft`, `author`, `description`, `tags`, `categories`, and optional `math`.

The conceptual case-study model includes papers, authors, institutions, venues, topics, source records, assets, transcripts, model outputs, collection runs, and report versions. It is described in articles only and does not add a website database.

## UI/UX

- Reuse the existing Blog list and article layout.
- Give every series a consistent Chinese label and lesson number.
- Link previous and next lessons within a series and link shared project milestones across series.
- Use short paragraphs, descriptive headings, tables, callouts, and code blocks suitable for narrow screens.
- Add a compact prerequisite note when a lesson relies on an existing comprehensive post.

## API

- No website API changes.
- Article examples may use arXiv, OpenAlex, Crossref, FastAPI, PostgreSQL, DuckDB, Prefect, and related libraries.
- Examples must document pagination, rate limits, retry behavior, timeouts, attribution, and terms-of-use boundaries when relevant.

## Testing

- Verify exactly 27 new Markdown files and all required frontmatter fields.
- Verify series counts of 4, 5, 5, 6, 4, and 3.
- Verify all previous, next, prerequisite, and cross-series milestone links resolve.
- Scan for duplicated scope against existing comprehensive posts.
- Scan for first-person unperformed-run claims, unsupported exact metrics, and missing benchmark attribution.
- Run `git diff --check` and `npm run build`.
- Spot-check the Blog index and representative standard and project lessons at desktop and 390px widths.

## Open Questions

- No separate runnable project repository is in scope unless the user authorizes it in a later requirement.
- Exact publication dates are assigned during article generation using the site's existing chronology; future-dated publication is not assumed.
- Replacing public research metadata with private or licensed corpora requires separate authorization and source review.
