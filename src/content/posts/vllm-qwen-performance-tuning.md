---
title: "vLLM 部署 Qwen2.5 的性能调优实录：8GB 显存下，我是怎么和 KV Cache 打架的"
date: 2025-08-25T00:00:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "记录在 8GB 显存环境下使用 vLLM 部署 Qwen2.5 模型的性能调优过程，重点分析 KV Cache 管理和显存优化策略。"
tags: ["vLLM", "Qwen2.5", "性能优化", "显存管理", "大模型部署"]
categories: ["AI部署", "性能调优"]
---

第一次使用 vLLM 部署 Qwen2.5 时，我的想法很简单。

既然模型能加载：

> 那不就结束了吗？

后来发现：

**模型能加载，只能证明故事刚刚开始。**

真正做推理服务以后，你会开始接触一堆以前训练模型时不太关注的东西：

```text
TTFT
TPOT
KV Cache
PagedAttention
Continuous Batching
Chunked Prefill
max_model_len
max_num_seqs
gpu_memory_utilization
QPS
P95
```

尤其当你的显卡不是 80GB A100，而是：

```text
RTX 4070 Laptop
8GB VRAM
```

的时候，这些概念就不再是论文术语。

它们会直接变成：

> CUDA Out of Memory。

这篇文章记录一下我部署 Qwen2.5 系列模型时真正经历过的调优思路。

---

# 一、我的两个主要部署环境

我主要经历过两类环境。

### 本地开发环境

```text
Windows 11
WSL2
RTX 4070 Laptop
8GB VRAM
```

这一套环境的目标不是高并发。

更多是：

- 本地开发；
- RAG 联调；
- API 测试；
- Prompt 验证；
- 小模型部署。

---

### 服务器实验环境

另外也使用过：

```text
V100 × 2
Tensor Parallel = 2
```

来运行更大的模型。

两种环境最大的区别在于：

本地首先考虑：

> **能不能稳定跑。**

服务器环境开始考虑：

> **并发和吞吐。**

所以 vLLM 调优没有一个“万能最佳参数”。

必须先明确：

> 你是在做 Chat Demo，还是做真正的 Serving。

---

# 二、最初我为什么换到 vLLM

普通 Transformers 推理当然可以：

```python
model.generate(...)
```

但当后端开始接入：

```text
FastAPI
+
多个请求
+
SSE Streaming
```

以后，问题出现了。

多个用户请求不是整齐排队来的。

可能：

```text
Request A: 200 tokens prompt
Request B: 2000 tokens prompt
Request C: 500 tokens prompt
```

传统 Batch 很难充分利用 GPU。

vLLM 最吸引我的地方，就是：

```text
PagedAttention
+
Continuous Batching
```

简单理解：

> 请求不需要等到凑齐一个固定 Batch 才一起跑。

引擎可以持续：

```text
进请求
出 Token
插新请求
继续调度
```

这对于在线 LLM 服务非常合适。

---

# 三、第一版启动：能跑就行

以 MindTrip 后期使用的模型为例：

```text
ZhiluAI-3B-SFT-merged
```

它是基于：

```text
Qwen2.5-3B-Instruct
```

完成 LoRA 微调并合并后的模型。

一个比较基础的启动方式类似：

```bash
vllm serve ./ZhiluAI-3B-SFT-merged \
  --dtype float16 \
  --max-model-len 2048 \
  --port 8080
```

然后就可以通过 OpenAI Compatible API：

```text
/v1/chat/completions
```

调用。

FastAPI 后端甚至可以直接按照 OpenAI SDK 的方式接入。

这个体验确实很好。

但是很快第一个问题出现。

---

# 四、第一个误区：max_model_len 当然越大越好？

最开始看到模型支持较长上下文，我天然会想：

```text
2048
↓
4096
↓
8192
↓
32000
```

能不能直接开最大？

理论上当然很好。

RAG 可以塞更多资料。

聊天可以保存更多历史。

但很快你会发现：

> **上下文窗口不是配置文件里免费的一个数字。**

它直接影响：

```text
KV Cache
```

---

# 五、KV Cache 到底吃了什么？

Transformer 每生成一个 Token，都需要关注之前的 Token。

如果每生成一个 Token 都重新计算历史：

```text
成本会非常高。
```

所以推理服务会缓存历史 Token 的：

```text
Key
Value
```

也就是：

```text
KV Cache
```

于是上下文越长：

```text
KV Cache 越大。
```

并发越高：

```text
KV Cache 继续变大。
```

这也是为什么你可能发现：

> 明明一个 3B 模型权重可以放进 8GB 显存，服务却还是 OOM。

因为 GPU 上不只有：

```text
Model Weights
```

还有：

```text
KV Cache
Activations
CUDA Context
Temporary Buffers
```

---

# 六、所以我的第一个重要优化：不要盲目追求长 Context

对于 MindTrip，我真正需要的场景其实是：

```text
用户问题
+
少量历史
+
TopK 检索结果
+
模型输出
```

不是拿一本几十万字小说进去。

所以后来的思路是：

> 按真实请求 Token 分布决定 max_model_len。

本地开发阶段经常使用：

```text
2048
```

或者针对具体任务再调整到：

```text
4096
```

而不是：

> 模型支持多少，我就设置多少。

这一个改变通常比很多“小参数调优”更加重要。

---

# 七、gpu_memory_utilization 也不是 1.0 最爽

vLLM 中一个非常关键的参数：

```text
gpu_memory_utilization
```

很多人第一反应：

> 当然越高越好。

比如：

```text
0.95
```

甚至更高。

理论上能够给：

```text
KV Cache
```

留下更多 GPU 空间。

但 Laptop GPU、WSL2 和桌面环境还有一个现实问题：

> 显存并不完全属于你的 vLLM。

系统本身、桌面程序、浏览器、CUDA Context 都可能占显存。

所以如果卡得太满：

```text
启动可能成功
```

但运行一段时间：

```text
突然 OOM。
```

相比峰值性能，我更愿意留安全余量。

---

# 八、显存优化和吞吐优化，有时候方向相反

比如你降低：

```text
max_num_seqs
```

可以减少同时活跃请求。

显存压力下降。

系统更稳定。

但：

```text
GPU batching 效率可能降低。
```

如果提高：

```text
max_num_seqs
```

吞吐可能上升。

但是：

```text
KV Cache
+
Active Sequence
```

都会增加。

所以这里不存在：

> “最大就是最好”。

更合理的方式是压测：

```text
8
16
32
64
```

观察：

```text
QPS
P95
TTFT
显存
OOM
```

再选甜点位。

---

# 九、我后来不再只看 tokens/s

一开始测试模型，我最喜欢看：

```text
tokens/s
```

数字越高越开心。

但真正做 API 服务以后发现：

> 一个系统 Token/s 很高，不代表用户体验好。

我后来更关心：

### TTFT

Time To First Token。

用户点下发送，到看到第一个字。

---

### TPOT

Time Per Output Token。

开始生成以后，每个 Token 出来的速度。

---

### P95 Latency

95% 请求需要多久。

---

### QPS

系统每秒能处理多少请求。

---

### GPU Memory

服务是不是离 OOM 只差一个 Chrome 标签页。

最后这一项在 8GB Laptop 上尤其现实。

---

# 十、RAG 场景里，Prefill 经常比 Decode 更值得关注

一个 RAG 请求可能是：

```text
Prompt = 3000 Tokens
Output = 300 Tokens
```

这时候模型首先需要：

```text
Prefill 3000 Tokens
```

然后才开始逐 Token Decode。

如果 Context 很长：

> 用户等第一个 Token 的时间就会明显增加。

这也是为什么我后来越来越重视：

```text
TTFT
```

而不是只看：

```text
生成阶段 tokens/s。
```

---

# 十一、Chunked Prefill 是什么？

vLLM 支持：

```text
Chunked Prefill
```

它的思路可以简单理解为：

原本一个超长 Prompt：

```text
[======================]
```

一次性做完整 Prefill。

现在可以拆成：

```text
[=====]
[=====]
[=====]
[=====]
```

让调度器更灵活地在：

```text
Prefill
和
Decode
```

之间安排工作。

例如启动时：

```bash
--enable-chunked-prefill
```

对于：

```text
长 Context
+
多并发请求
```

的场景，它有机会改善调度。

但这里我要特别强调：

> **不要因为看到“性能优化参数”四个字就默认打开。**

不同请求长度、并发和 GPU 环境下，效果可能完全不同。

最可靠的方法仍然是：

```text
压测。
```

---

# 十二、一个典型的错误优化：一次改五个参数

我以前也干过：

```text
max_model_len 调了
max_num_seqs 调了
gpu_memory_utilization 调了
chunked prefill 开了
swap space 也调了
```

然后一跑：

> 快了。

问题来了：

**到底为什么快？**

不知道。

下一次变慢：

**到底为什么慢？**

还是不知道。

后来我尽量一次只改变一个维度。

例如：

```text
Test A
max_num_seqs = 8

Test B
max_num_seqs = 16

其他参数全部相同
```

记录：

```text
TTFT
P95
QPS
Peak VRAM
```

这才真正叫性能调优。

否则只是：

> 参数炼丹。

---

# 十三、量化模型：AWQ 并不是单纯为了“模型更小”

我也使用过类似：

```text
Qwen2.5-3B-Instruct-AWQ
```

并尝试：

```text
awq_marlin
```

这样的量化执行路径。

量化最直接的好处当然是：

```text
减少权重显存。
```

比如 FP16：

```text
一个参数约 2 bytes。
```

4bit：

```text
理论权重体积显著下降。
```

这样释放出来的显存，可以留给：

```text
KV Cache
```

这对于 Serving 很关键。

因为：

> 节约下来的显存，不一定是为了再塞一个更大的模型，也可能是为了服务更多用户。

---

# 十四、但是量化不是免费的

4bit 并不意味着：

> 一定比 FP16 快 4 倍。

真实情况取决于：

- GPU；
- Kernel；
- Batch；
- Quant Format；
- vLLM 版本；
- Marlin 等执行路径。

有时候：

```text
显存明显下降
```

但：

```text
单请求延迟未必同比例下降。
```

所以我对量化的理解后来变成：

> 首先是 Memory Optimization，其次才可能是 Speed Optimization。

---

# 十五、Tensor Parallel：两张 V100 不意味着性能自动翻倍

在：

```text
V100 × 2
```

环境里，我使用过：

```text
tensor_parallel_size = 2
```

简单理解：

模型矩阵被拆到两张 GPU 上计算。

好处是：

```text
更大的模型可以放进去。
```

但是通信也会带来成本。

所以两张卡：

```text
不等于单卡速度 × 2。
```

尤其对于小模型：

> 通信成本甚至可能让 TP 没有什么必要。

所以我的判断标准是：

### 模型单卡放不下

优先考虑 TP。

### 模型单卡已经轻松放下

不要为了“我有两张卡”就强行 TP。

---

# 十六、SSE 让我重新理解性能

MindTrip 的生成服务最后通过：

```text
vLLM
↓
FastAPI
↓
SSE
↓
UniApp
```

流式返回。

如果不用 Streaming：

```text
第 0 秒：空白
第 1 秒：空白
第 2 秒：空白
第 3 秒：空白
第 5 秒：突然出现完整答案
```

如果使用 Streaming：

```text
第 0.8 秒：第一句话
第 1.1 秒：继续生成
第 1.4 秒：继续生成
...
```

哪怕：

```text
最终总时间相差不大，
```

体验都是完全不同的。

所以后来我把：

> **第一个 Token 是否足够快**

看成一个产品指标，而不只是模型指标。

---

# 十七、RAG 还有一个隐藏性能杀手：Embedding

最开始测试：

```text
LLM 响应慢。
```

我天然怀疑 vLLM。

后来拆链路发现一次请求其实是：

```text
Query
  ↓
Embedding
  ↓
FAISS
  ↓
Context Build
  ↓
vLLM Prefill
  ↓
Decode
```

如果：

```text
BGE-M3 在 CPU 上跑
```

Query Embedding 本身就可能占掉不少时间。

于是性能分析一定需要拆分：

```text
T_total =
T_embedding
+ T_retrieval
+ T_context
+ T_prefill
+ T_decode
```

否则非常容易：

> 优化错地方。

---

# 十八、为什么 FAISS IndexFlatIP 反而很舒服

对于 MindTrip 当前的数据规模：

```text
352 城市
47,124 条旅游问答
```

FAISS：

```text
IndexFlatIP
```

其实非常够用。

因为这部分搜索并不是瓶颈。

如果为了追求“高级”换：

```text
复杂 ANN Index
```

可能检索从：

```text
非常快
```

优化成：

```text
还是非常快。
```

但代码复杂度上升一倍。

这种情况我后来坚决不做。

性能优化最基本的原则仍然是：

> **先找到瓶颈。**

---

# 十九、我的 vLLM 调优顺序最后变成这样

如果重新做一次，我会按照这个顺序：

## Step 1：确定模型

先决定：

```text
3B
7B
还是更大模型
```

---

## Step 2：确定精度

```text
FP16
BF16
AWQ
GPTQ
```

---

## Step 3：根据真实请求决定 Context

而不是：

```text
根据模型最大支持 Context。
```

---

## Step 4：确定显存安全边界

观察：

```text
Idle VRAM
Model VRAM
KV Cache
Peak VRAM
```

---

## Step 5：调并发

测试：

```text
max_num_seqs
```

---

## Step 6：测试 Chunked Prefill

尤其：

```text
Long Prompt + Concurrent Requests
```

场景。

---

## Step 7：测试 Streaming

记录：

```text
TTFT
TPOT
```

---

## Step 8：再看 QPS / P95

最后才是：

> 服务到底能扛多少人。

---

# 二十、一个更合理的启动配置思路

对于本地 3B 模型，我更倾向类似：

```bash
vllm serve ./ZhiluAI-3B-SFT-merged \
  --dtype float16 \
  --max-model-len 2048 \
  --gpu-memory-utilization 0.8 \
  --enable-chunked-prefill \
  --port 8080
```

但这里的：

```text
0.8
2048
Chunked Prefill
```

都不应该理解为所谓：

> “最佳参数”。

它们只是：

> **一个具有安全余量的起始点。**

真正最佳值必须根据实际请求分布测试。

---

# 二十一、最大的坑：Benchmark 和真实业务不是一回事

你可以构造：

```text
100 个完全相同、长度一致的 Prompt
```

然后跑出非常漂亮的 QPS。

但真实用户请求会是：

```text
200 Token
1100 Token
4000 Token
600 Token
```

输出也可能：

```text
50 Token
300 Token
1000 Token
```

所以最后真正值得测试的应该是：

> **Production-like Workload。**

对于 MindTrip 就应该模拟：

```text
短问答
+
三日行程
+
五日行程
+
多轮修改
+
同时请求
```

而不是只跑：

```text
Hello
```

1000 次。

---

# 二十二、我最后真正关心的是稳定性

调到后面，我已经不太追求：

> 跑出最高的瞬时 tokens/s。

更希望：

```text
连续跑几个小时不 OOM
P95 不突然爆炸
长请求不会堵死短请求
主服务不会因为模型异常退出
```

这也是从“模型实验”走向“工程部署”以后一个很明显的变化。

Benchmark 第一名很好看。

但线上真正重要的是：

> **第 1001 个请求还能不能正常回答。**

---

# 二十三、vLLM 教会我的一个核心认知

训练模型的时候，我们经常关注：

```text
参数量
Loss
Accuracy
Epoch
Learning Rate
```

做 Serving 以后，关注点变成：

```text
Memory
Scheduling
Cache
Concurrency
Latency
Throughput
```

这两套知识其实完全不同。

一个模型效果很好：

> 不代表它适合部署。

一个模型能部署：

> 不代表它能支撑并发。

一个 Benchmark 吞吐很好：

> 也不代表真实用户体验好。

而 vLLM 最有意思的地方，就是逼着我真正理解：

> **LLM 不只是模型，它最后也是一个需要被调度、缓存、并发和监控的软件服务。**

---

# 二十四、最后总结：别从参数开始优化

如果现在有人问我：

> vLLM 应该怎么调？

我不会先告诉他：

```text
gpu_memory_utilization=0.9
max_num_seqs=32
```

我反而会先问三个问题：

```text
你的 GPU 是什么？
你的 Prompt 一般多长？
你的并发是多少？
```

因为没有这些信息：

> 所谓“最佳配置”基本都没有意义。

我现在更认可的优化公式是：

```text
真实业务负载
        ↓
确定瓶颈
        ↓
一次改变一个变量
        ↓
记录 TTFT / TPOT / P95 / QPS / VRAM
        ↓
重新测试
```

而不是：

```text
复制网上一串神秘启动参数
        ↓
祈祷。
```

如果说 MindTrip 让我真正理解了 RAG 的工程化，

那么 vLLM 则让我第一次真正意识到：

> **大模型部署的核心问题，有时候并不是“大模型”，而是“部署”。**