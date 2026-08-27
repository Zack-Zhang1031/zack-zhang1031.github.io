# AI research content course

## Overview

Twenty-seven Blog lessons form six independent learning series while advancing one shared portfolio case study: an AI research content intelligence and management platform.

## Design decisions

- Use a hybrid curriculum: each series teaches an employable knowledge area and produces one milestone for the shared project.
- Keep the six series independently readable instead of numbering all lessons as one monolithic course.
- Reuse existing comprehensive Python, NumPy, deep-learning, framework, OpenCV, and RAG posts as prerequisites.
- Use public AI and computer-science metadata so examples have an accessible and legally reviewable source boundary.
- Prefer DuckDB and Parquet for single-machine analytics; explain Spark only as a scale threshold.
- Provide reproducible code and verifiable sourced evidence without claiming that unexecuted experiments were personally run.
- Deliver content only; the platform is a coherent article case study, not a separately built application.

## Implementation notes

All lessons are Markdown files in `src/content/posts/` and reuse the current Astro content schema and layouts. Each lesson contains a prerequisite note when needed, a shared-project checkpoint, troubleshooting, exercises, interview questions, portfolio evidence, and adjacent-lesson navigation. No frontend route, runtime package, database, deployment, or canonical-domain change belongs to this feature.
