# Deep learning course series

## Overview

Add a ten-part deep-learning course to the existing Blog. The series alternates theory and projects, complements rather than repeats existing Python, NumPy, OpenCV, NLP, and RAG articles, and supports both structured study and portfolio review.

## User Stories

- As a learner, I can follow a progressive path from a training loop to CNN, RNN, Transformer, evaluation, and deployment.
- As a job seeker, I can review practical failure modes, interview questions, and project-extension ideas.
- As a mobile reader, I can scan short sections, code blocks, checkpoints, and summaries without reading one unbroken chapter.

## Functional Reqs

- Publish ten Markdown posts using the existing `posts` content collection.
- Use PyTorch for the theory path and core training implementations.
- Use TensorFlow/Keras for engineering training APIs and export.
- Use PaddlePaddle for a Chinese text-classification project.
- Use public small datasets in examples and expose clear replacement seams for private datasets.
- Use the standard course structure for ordinary lessons and the development-log structure for project and tuning lessons.
- Include exercises, interview questions, troubleshooting, and links between adjacent lessons.

## Non-Functional Reqs

- Ordinary lessons target 4,000–6,000 Chinese characters; project/tuning lessons target 7,000–10,000 when the subject requires it.
- Code must be internally coherent and suitable for Notebook/Colab, Windows CUDA, and CPU fallback.
- Local model training is not required for article production.
- Do not claim that unexecuted training was personally run.
- Experimental numbers may come from official documentation, public datasets, papers, or publicly verifiable benchmarks, and must identify the source.
- When no verifiable result is available, describe expected behavior and trends without inventing exact metrics.
- Any synthetic or pedagogical project metrics must be called `参考运行记录` or `示例结果`.
- Keep dependencies inside code examples; do not add website runtime dependencies.

## Data Model

No schema change. Posts retain the existing frontmatter fields: `title`, `date`, `draft`, `author`, `description`, `tags`, `categories`, and optional `math`.

## UI/UX

- Reuse the current Blog list and post-detail layout.
- Use short paragraphs, tables, headings, and checkpoint callouts for mobile readability.
- Use descriptive titles and consistent series labels.

## API

No website API changes. Framework APIs shown in articles must be checked against current official documentation before publication.

## Testing

- Validate ten new files and required frontmatter.
- Scan for prohibited empirical-claim wording, unsupported exact metrics, and missing benchmark attribution.
- Build all Astro routes with `npm run build`.
- Spot-check the Blog list and at least one lesson at 390px width.

## Open Questions

- Replacing public datasets with personal project data is deferred until the user supplies authorized data.
- Disabling deployment addresses is a separate destructive operation and requires exact target confirmation.
