# Personal site initial baseline

Date: `2026-08-26`
Status: `initial dual-baseline snapshot`

## Purpose

Record the current content and runtime boundaries used to assess the deep-learning Blog series.

## Product / Requirement Baseline

- The site presents games, projects, technical posts, and personal information.
- Blog content is static Markdown and should remain readable on mobile.
- The approved course is a ten-part theory-and-project series.
- Existing comprehensive Python, NumPy, OpenCV, and RAG content must not be duplicated.

## Architecture / Runtime Boundary Baseline

- `src/content/posts/` is the canonical owner for Blog articles.
- `src/content/config.ts` is the canonical frontmatter schema.
- `src/pages/posts/` owns list and detail routes.
- Static output and the current canonical Worker URL must remain unchanged by content generation.

## Compatibility boundary

- Existing routes, comments, game builds, account UI, and user worktree changes must remain intact.
- Deployment retirement is not authorized without exact target confirmation.
