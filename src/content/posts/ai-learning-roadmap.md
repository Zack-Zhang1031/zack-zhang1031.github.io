---
title: "AI 学习路线图：77 篇实战文章的使用说明书——从 Linux 到 LLM 的完整路径"
date: 2026-08-31T08:00:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "本站全部 AI 课程文章的导航索引：按十大模块组织、标注难度星级与前置依赖、给出 24 周学习节奏建议和每阶段自测清单，从零基础到能独立做项目。"
tags: ["学习路线", "AI课程", "导航", "置顶"]
categories: ["AI课程", "学习路线"]
math: false
---

这个博客的 AI 课程系列已经积累到七十多篇，新读者最常见的问题是：**「这么多，从哪篇开始？」**这篇文章就是答案——我把全部文章按依赖关系整理成十大模块、四个阶段，标注每篇的难度和前置，给出节奏建议和自测标准。建议收藏，每完成一个阶段回来看看下一关在哪。

**难度标注**：⭐ 入门（零基础可读）｜⭐⭐ 进阶（需要模块内前置）｜⭐⭐⭐ 实战/深入（建议动手后再读）

---

## 阶段一：编程与工具地基（第 1~4 周）

> 目标：能在 Linux 服务器上独立跑起 Python 项目，代码有工程素养。

**Python 语言**（按顺序读）：

| 文章 | 难度 |
| --- | --- |
| [Python 从入门到进阶指南](/posts/python-guide-from-beginner-to-advanced/) | ⭐ |
| [数据类型与容器](/posts/python-data-types-containers/) | ⭐ |
| [控制流语句](/posts/python-control-flow-statements/) | ⭐ |
| [可变性与集合类型](/posts/python-mutability-and-set-types/) | ⭐ |
| [列表字典推导与魔法方法](/posts/list-dict-magic-methods/) | ⭐⭐ |
| [迭代器与生成器](/posts/python-iterator-generator-guide/) | ⭐⭐ |
| [Python 高级编程](/posts/python-advance-basics/) | ⭐⭐ |
| [正则表达式与文本处理](/posts/regex-text-processing/) | ⭐⭐ |
| [包管理与虚拟环境](/posts/python-package-management/) | ⭐ |

**Linux 与工程环境**：

| 文章 | 难度 |
| --- | --- |
| [Linux 与 Python 环境基础](/posts/linux-python-environment-basics/) | ⭐ |
| [开发环境搭建](/posts/ai-research-eng-01-dev-environment/) | ⭐ |
| [Git 版本控制](/posts/ai-research-eng-02-git-version-control/) | ⭐ |
| [Jupyter 与可复现性](/posts/ai-research-eng-03-jupyter-reproducible/) | ⭐⭐ |
| [Python 项目工程化](/posts/ai-research-eng-04-python-project-engineering/) | ⭐⭐ |
| [Shell 与 Linux 训练运维](/posts/shell-linux-ml-ops/) | ⭐⭐ |

**自测**：能在服务器上用 tmux 跑一个过夜任务、会用 Git 管理实验代码、能独立配置 conda 环境，过关。

## 阶段二：数据处理与分析（第 5~8 周）

> 目标：拿到任何结构化数据，能清洗、分析、可视化、讲故事。

| 文章 | 难度 |
| --- | --- |
| [NumPy 笔记](/posts/modular-numpy-notes/) | ⭐ |
| [Pandas 数据分析与可视化](/posts/pandas-data-analysis-visualization/) | ⭐ |
| [NumPy 与 Python 性能优化](/posts/numpy-python-performance/) | ⭐⭐ |
| [数据可视化叙事](/posts/data-visualization-storytelling/) | ⭐⭐ |
| [数据采集与爬虫](/posts/web-scraping-data-collection/) | ⭐⭐ |
| [SQL 数据库实践](/posts/sql-database-practice/) | ⭐ |
| [Dask 与 Polars：超越 Pandas](/posts/dask-polars-bigdata-pandas/) | ⭐⭐⭐ |
| [大数据管理概论](/posts/big-data-management/) | ⭐⭐ |
| [Hadoop 与 Hive 数据仓库](/posts/hadoop-hive-data-warehouse/) | ⭐⭐ |
| [PySpark 与 Airflow 流水线](/posts/pyspark-airflow-pipeline/) | ⭐⭐⭐ |
| [Kafka 流处理基础](/posts/streaming-kafka-basics/) | ⭐⭐ |
| [NoSQL 选型](/posts/nosql-selection/) | ⭐⭐ |

**自测**：独立完成一次端到端分析——爬取或下载一个真实数据集，清洗后产出一份带图表的分析报告。

## 阶段三：机器学习核心（第 9~14 周）

> 目标：理解经典算法的原理与适用边界，能独立完成一个 Kaggle 级别项目。

**基础与数学**：

| 文章 | 难度 |
| --- | --- |
| [机器学习数学基础](/posts/ml-math-foundations/) | ⭐ |
| [信息论基础](/posts/information-theory-basics/) | ⭐⭐ |
| [机器学习基础与 Scikit-learn](/posts/ml-basics-scikit-learn/) | ⭐ |

**算法专题**（线性→树→集成→无监督，按此顺序）：

| 文章 | 难度 |
| --- | --- |
| [线性回归](/posts/ml-linear-regression/) | ⭐ |
| [逻辑回归与 SVM](/posts/logistic-regression-svm/) | ⭐⭐ |
| [朴素贝叶斯](/posts/naive-bayes/) | ⭐ |
| [决策树](/posts/ml-decision-tree/) | ⭐ |
| [集成学习：随机森林与 XGBoost](/posts/ensemble-learning-rf-xgboost/) | ⭐⭐ |
| [K-Means 聚类](/posts/ml-kmeans-clustering/) | ⭐ |
| [降维：PCA 与 UMAP](/posts/dimensionality-reduction-pca-umap/) | ⭐⭐ |
| [时间序列分析](/posts/time-series-analysis/) | ⭐⭐ |
| [推荐系统基础](/posts/recommender-system-basics/) | ⭐⭐ |
| [异常检测实战](/posts/anomaly-detection-practice/) | ⭐⭐ |

**工程方法**（算法之后必读，决定你能否做出「能用的模型」）：

| 文章 | 难度 |
| --- | --- |
| [特征工程实战](/posts/feature-engineering-practice/) | ⭐⭐ |
| [模型评估与类别不平衡](/posts/model-evaluation-metrics-imbalance/) | ⭐⭐ |
| [过拟合与正则化](/posts/overfitting-regularization/) | ⭐⭐ |
| [超参数搜索与 AutoML](/posts/automl-optuna-tuning/) | ⭐⭐ |
| [数据集构建与标注](/posts/dataset-construction-labeling/) | ⭐⭐ |
| [模型可解释性 SHAP](/posts/model-interpretability-shap/) | ⭐⭐ |
| [因果推断基础](/posts/causal-inference-basics/) | ⭐⭐⭐ |
| [A/B 测试与统计](/posts/ab-testing-statistics/) | ⭐⭐ |
| [Kaggle 参赛指南](/posts/kaggle-competition-guide/) | ⭐⭐⭐ |

**自测**：Kaggle 上选一个入门赛（Titanic 之后的表格赛），独立进前 20%，过关。

## 阶段四：深度学习（第 15~20 周）

> 目标：理解训练的全部细节，能手写训练循环，能调通一个真模型。

**核心系列**（01~10 严格按序）：

| 文章 | 难度 |
| --- | --- |
| [训练循环与自动求导](/posts/deep-learning-01-training-loop/) | ⭐ |
| [反向传播推导](/posts/deep-learning-02-backprop/) | ⭐⭐ |
| [训练稳定性实战](/posts/deep-learning-03-training-stability/) | ⭐⭐ |
| [CNN 图像分类](/posts/deep-learning-04-cnn-image-classification/) | ⭐⭐ |
| [迁移学习项目](/posts/deep-learning-05-transfer-learning-project/) | ⭐⭐ |
| [RNN、LSTM 与 GRU](/posts/deep-learning-06-rnn-lstm-gru/) | ⭐⭐ |
| [Transformer 注意力详解](/posts/deep-learning-07-transformer-attention/) | ⭐⭐ |
| [TensorFlow/Keras 工程化](/posts/deep-learning-08-tensorflow-keras-engineering/) | ⭐⭐ |
| [PaddlePaddle 中文文本分类](/posts/deep-learning-09-paddle-chinese-text-classification/) | ⭐⭐ |
| [模型评估调参与部署](/posts/deep-learning-10-model-evaluation-tuning-deployment/) | ⭐⭐ |

**训练进阶**：

| 文章 | 难度 |
| --- | --- |
| [优化器与学习率调度](/posts/optimizer-lr-schedule/) | ⭐⭐ |
| [混合精度与显存优化](/posts/mixed-precision-memory/) | ⭐⭐⭐ |
| [分布式训练基础](/posts/distributed-training-basics/) | ⭐⭐⭐ |
| [强化学习基础](/posts/reinforcement-learning-basics/) | ⭐⭐ |
| [强化学习进阶：DQN 到 PPO](/posts/rl-dqn-ppo-advanced/) | ⭐⭐⭐ |
| [自监督学习](/posts/self-supervised-learning/) | ⭐⭐⭐ |
| [图神经网络](/posts/gnn-graph-neural-network/) | ⭐⭐⭐ |

**自测**：不看教程从零写一个 CNN 训练脚本（含混合精度、学习率调度、验证评估），在 CIFAR-10 上跑到 90%+，过关。

## 模块五：计算机视觉

> 建议顺序：OpenCV 传统视觉 → 检测/分割 → 前沿专题 → 实战。

| 文章 | 难度 |
| --- | --- |
| [OpenCV 图像基础操作](/posts/opencv-image-interpolation-mask-roi-watermark-grayscale-tutorial/) | ⭐ |
| [几何变换](/posts/python-opencv-geometry-transform/) | ⭐ |
| [轮廓与特征提取](/posts/opencv-contour-feature-extraction/) | ⭐⭐ |
| [霍夫变换与亮度处理](/posts/opencv-hough-transform-brightness/) | ⭐⭐ |
| [OpenCV 实用技巧](/posts/python-opencv-tips/) | ⭐⭐ |
| [OpenCV 实战项目](/posts/opencv-practical-projects/) | ⭐⭐ |
| [人脸识别](/posts/face-recognition-opencv-deep-learning/) | ⭐⭐ |
| [目标检测 YOLO](/posts/object-detection-yolo/) | ⭐⭐ |
| [图像分割 U-Net](/posts/image-segmentation-unet/) | ⭐⭐ |
| [OCR 文字识别](/posts/ocr-text-recognition/) | ⭐⭐ |
| [数据增强：Mixup 与 CutMix](/posts/image-augmentation-mixup-cutmix/) | ⭐⭐ |
| [SAM 与开放词汇检测](/posts/sam-open-vocabulary-detection/) | ⭐⭐⭐ |
| [超分辨率 ESRGAN](/posts/super-resolution-esrgan/) | ⭐⭐⭐ |
| [姿态估计与多目标跟踪](/posts/pose-estimation-tracking/) | ⭐⭐⭐ |
| [ViT 与 CLIP 多模态](/posts/vit-clip-multimodal/) | ⭐⭐⭐ |
| [图像生成：GAN 与扩散模型](/posts/image-generation-gan-diffusion/) | ⭐⭐⭐ |
| [3D 视觉与点云](/posts/3d-vision-point-cloud/) | ⭐⭐⭐ |
| [视频理解基础](/posts/video-understanding-basics/) | ⭐⭐⭐ |
| [工业视觉质检项目](/posts/industrial-visual-inspection/) | ⭐⭐⭐ |

## 模块六：NLP 与大模型

> 建议顺序：NLP 全景 → 表示演进 → LLM 专题 → RAG/Agent。

| 文章 | 难度 |
| --- | --- |
| [NLP 综合指南](/posts/nlp-comprehensive-guide/) | ⭐ |
| [从 Word2Vec 到 BERT](/posts/word2vec-to-bert/) | ⭐⭐ |
| [Tokenizer 与 BPE](/posts/tokenizer-bpe/) | ⭐⭐ |
| [序列标注与 NER](/posts/sequence-labeling-ner/) | ⭐⭐ |
| [机器翻译与文本摘要](/posts/machine-translation-summarization/) | ⭐⭐ |
| [Prompt 工程实践](/posts/prompt-engineering-practice/) | ⭐ |
| [LoRA 微调实战](/posts/llm-finetuning-lora/) | ⭐⭐ |
| [SFT、RLHF 与 DPO 对齐](/posts/llm-alignment-sft-rlhf-dpo/) | ⭐⭐⭐ |
| [LLM 架构：MoE 与长上下文](/posts/llm-architecture-moe-longcontext/) | ⭐⭐⭐ |
| [预训练数据工程](/posts/llm-pretraining-data/) | ⭐⭐⭐ |
| [推理优化](/posts/llm-inference-optimization/) | ⭐⭐⭐ |
| [评测基准](/posts/llm-evaluation-benchmarks/) | ⭐⭐ |
| [Embedding 与向量数据库](/posts/embedding-vector-database/) | ⭐⭐ |
| [RAG 进阶：分块与重排](/posts/rag-advanced-chunking-rerank/) | ⭐⭐ |
| [Agent 框架对比](/posts/agent-frameworks-comparison/) | ⭐⭐ |
| [AI Agent 开发](/posts/ai-agent-development/) | ⭐⭐ |
| [知识图谱构建](/posts/knowledge-graph-construction/) | ⭐⭐⭐ |

## 模块七：语音

| 文章 | 难度 |
| --- | --- |
| [语音识别基础](/posts/speech-recognition-basics/) | ⭐ |
| [声学模型：CTC 与 RNN-T](/posts/acoustic-model-ctc-rnnt/) | ⭐⭐⭐ |
| [Whisper 微调与声音克隆](/posts/whisper-finetune-voice-clone/) | ⭐⭐ |
| [语音合成 TTS](/posts/tts-speech-synthesis/) | ⭐⭐ |
| [声纹识别](/posts/voiceprint-speaker-verification/) | ⭐⭐ |

## 模块八：工程化与部署

> 模型训练的终点是上线。这一模块决定你是「炼丹师」还是「工程师」。

| 文章 | 难度 |
| --- | --- |
| [FastAPI 模型服务](/posts/fastapi-model-serving/) | ⭐⭐ |
| [模型压缩与部署](/posts/model-compression-deployment/) | ⭐⭐⭐ |
| [端侧与移动端部署](/posts/edge-ai-mobile-deployment/) | ⭐⭐⭐ |
| [实验追踪与模型监控](/posts/ml-experiment-tracking-monitoring/) | ⭐⭐ |
| [vLLM 性能调优实录](/posts/vllm-qwen-performance-tuning/) | ⭐⭐⭐ |
| [AI 自动化工作流](/posts/ai-automation-workflow/) | ⭐⭐ |
| [AI 编程助手实战](/posts/ai-coding-assistant/) | ⭐ |
| [ML 系统设计面试](/posts/ml-system-design-interview/) | ⭐⭐⭐ |

## 模块九：项目实战与职业

| 文章 | 难度 |
| --- | --- |
| [综合实战一：Streamlit 应用](/posts/research-capstone-01-streamlit-app/) | ⭐⭐ |
| [综合实战二：项目复盘](/posts/research-capstone-02-project-retro-portfolio/) | ⭐⭐ |
| [综合实战三：求职答辩](/posts/research-capstone-03-job-interview-defense/) | ⭐⭐ |
| [智能客服端到端项目](/posts/customer-service-ai-project/) | ⭐⭐⭐ |
| [AI 简历与作品集](/posts/ai-resume-portfolio/) | ⭐ |
| [论文复现方法论](/posts/paper-reproduction-method/) | ⭐⭐ |
| [AI 研究方法](/posts/research-methods-ai/) | ⭐⭐ |

## 模块十：研究系列（AI 科研内容平台）

一个贯穿十余篇的完整研究项目，覆盖数据（[开放数据 API](/posts/research-data-01-open-metadata-apis/)、[Scrapy 与 Playwright](/posts/research-data-02-scrapy-playwright/)、[清洗](/posts/research-data-03-cleaning-pandas/)、[EDA](/posts/research-data-04-eda-plotly/)、[DuckDB](/posts/research-data-05-duckdb-parquet/)）、数据管理（[Postgres](/posts/research-data-mgmt-01-postgres-pgvector/)、[FastAPI](/posts/research-data-mgmt-02-fastapi-service/)、[Prefect](/posts/research-data-mgmt-03-prefect-pipeline/)、[Docker CI/CD](/posts/research-data-mgmt-04-docker-cicd/)）、机器学习（[特征](/posts/research-ml-01-feature-engineering/)、[分类](/posts/research-ml-02-field-classification/)、[回归](/posts/research-ml-03-citation-regression/)、[聚类](/posts/research-ml-04-topic-clustering/)、[评估](/posts/research-ml-05-evaluation-tuning-milestone/)）与多模态理解（[PDF 解析](/posts/research-mm-01-pdf-parsing/)、[语义检索](/posts/research-mm-02-embedding-semantic-search/)、[深度文本模型](/posts/research-mm-03-deep-text-models/)、[图表公式](/posts/research-mm-04-figure-formula/)、[多模态融合](/posts/research-mm-05-multimodal-fusion/)、[里程碑](/posts/research-mm-06-understanding-pipeline-milestone/)）。适合阶段四之后作为综合演练。

## 三条给不同人的路线建议

- **在校生/转行者**：严格按阶段一到四走，模块五到七按兴趣选一个深入（推荐 CV 或 NLP），全程约 24 周。
- **在职工程师补 AI**：跳过阶段一，从阶段三快速过一遍，重点投入阶段四 + 模块六（LLM），约 10 周。
- **目标是就业**：四个阶段 + 模块八 + 模块九的简历面试篇，项目至少做出两个可演示的。

## 通用学习纪律

1. **每篇文章的练习必须动手**——只读不练的吸收率不足 20%。
2. **踩坑表比正文值钱**——那是别人花时间买的教训，遇到报错先查表。
3. **卡壳两周以上就换路线**——先往后走，很多前置知识会在后面被「用会」。
4. **输出倒逼输入**——学完一个模块，自己写一篇复盘或给身边人讲一遍。

路线图会随新文章持续更新。祝学习顺利。

**相关阅读**：[AI 简历与作品集](/posts/ai-resume-portfolio/)、[Kaggle 参赛指南](/posts/kaggle-competition-guide/)、[论文复现方法论](/posts/paper-reproduction-method/)。
