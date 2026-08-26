# Deep learning course series

## Overview

Ten Blog lessons alternate foundational theory with image- and text-classification projects.

## Design decisions

- PyTorch owns the conceptual path; TensorFlow/Keras demonstrates high-level engineering workflows; PaddlePaddle owns the Chinese text project.
- Ordinary lessons use a course structure. Image classification, text classification, and final tuning use a development-log structure.
- General lessons describe expected trends without fabricated exact metrics. Project metrics, when useful for interpretation, are explicitly presented as reference records.
- Existing Python, NumPy, OpenCV, and RAG posts are linked as prerequisites instead of being rewritten.

## Implementation notes

All lessons are Markdown files in `src/content/posts/` and use the current Astro content schema. No frontend dependencies or routes are added.
