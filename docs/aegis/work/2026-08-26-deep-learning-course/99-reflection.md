# Deep learning course reflection

## What shipped

- Ten numbered deep-learning articles with theory and project lessons interleaved.
- PyTorch as the teaching mainline, TensorFlow/Keras for engineering workflow, and PaddlePaddle for the Chinese text project.
- Replaceable public-data seams, Colab/Notebook guidance, Windows/CUDA checks, and CPU fallback paths.
- Exact project metrics restricted to sections explicitly labeled as reference run records.

## Decisions that held

- Content-only scope avoided new routes, dependencies, schemas, and runtime owners.
- Ordinary lessons emphasize principles and expected trends rather than invented benchmarks.
- Project lessons use constraint, baseline, evidence, decision, and boundary narration.
- The series links forward lesson by lesson and closes by returning to lesson 1.

## Verification boundary

- Static content checks completed in the isolated worktree.
- The isolated worktree cannot spawn Astro subprocesses because Windows returns `EPERM`.
- Final build and browser checks must therefore run in the main workspace after integration.
- No deployment alias or project retirement is attempted without exact target confirmation.
