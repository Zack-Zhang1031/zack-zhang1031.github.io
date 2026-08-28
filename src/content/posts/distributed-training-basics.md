---
title: "分布式训练入门：从 DDP 到 FSDP——多卡训练的第一课"
date: 2026-08-29T18:20:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "单机多卡 DDP 实战、梯度同步原理、ZeRO/FSDP 显存切分、混合精度训练，以及多卡训练最常见的六个坑，看完敢接多卡任务。"
tags: ["分布式训练", "DDP", "FSDP", "混合精度", "PyTorch"]
categories: ["AI课程", "深度学习"]
math: false
---

第一次被要求「把训练搬到 8 卡上跑」时，我以为把 `DataParallel` 包一层就完事了——结果显存爆了、速度慢了、loss 还对不上。后来才明白分布式训练不是 API 调用问题，而是要先想清楚三个问题：**数据怎么分、梯度怎么同步、显存怎么省**。

这篇按我真实的学习路径组织：先理解为什么 `DataParallel` 被淘汰，再上手 DDP（现在的绝对主流），然后讲大模型时代绕不开的 FSDP/ZeRO，最后给一套多卡训练的排坑清单。代码全部基于 PyTorch——这是目前分布式训练事实上的标准。

**前置阅读**：建议先读 [PyTorch 框架入门](/posts/deep-learning-01-training-loop/)、[神经网络基础](/posts/deep-learning-02-backprop/)，了解 GPU 基础的话更好。

## 先想清楚：并行到底在并行什么

分布式训练有三种并行维度，新手最容易混：

- **数据并行（DP）**：模型复制 N 份到 N 张卡，每张卡吃不同的数据切片，梯度在卡间同步取平均。解决「训练太慢」。
- **模型并行（MP）**：模型太大单卡放不下，把不同层切到不同卡（流水线并行）或同一层内部切开（张量并行）。解决「放不下」。
- **显存并行（ZeRO/FSDP）**：模型状态（参数、梯度、优化器状态）分片存到 N 张卡，用时再聚合。解决「放得很勉强」。

日常 90% 的需求是数据并行；大模型时代 FSDP 成为标配。本文按这个优先级展开。

## 为什么别再用 nn.DataParallel

`DataParallel`（DP）是 PyTorch 最早的单语句多卡方案，但它有三个结构性问题：

1. **单进程多线程**：一个 Python 进程管所有卡，GIL 成为瓶颈，卡越多加速比越差。
2. **梯度同步低效**：每步都要把梯度 gather 到 0 号卡算完再广播，0 卡显存和通信都是热点。
3. **batch 切分笨拙**：输入在单卡上切好再 scatter，多机场景直接不支持。

`DistributedDataParallel`（DDP）的解法：**每张卡一个独立进程**，梯度通过 NCCL 的 AllReduce 在卡间直接同步（环形算法，没有中心节点），每个进程自己切数据。结果是多卡几乎线性加速，还支持多机。记住这个结论：**永远用 DDP，不用 DP**。

## DDP 实战：把单卡训练改造成多卡

改造一个已有训练脚本，只需要动五个地方。完整模板如下：

```python
import os
import torch
import torch.distributed as dist
from torch.nn.parallel import DistributedDataParallel as DDP
from torch.utils.data.distributed import DistributedSampler

def setup():
    # 1. 初始化进程组（NCCL 后端，GPU 通信的事实标准）
    dist.init_process_group(backend="nccl")
    local_rank = int(os.environ["LOCAL_RANK"])
    torch.cuda.set_device(local_rank)
    return local_rank

def main():
    local_rank = setup()

    # 2. 模型搬到本进程的卡上，包 DDP
    model = MyModel().to(local_rank)
    model = DDP(model, device_ids=[local_rank])

    # 3. 数据：用 DistributedSampler 替每个进程切分
    dataset = MyDataset()
    sampler = DistributedSampler(dataset)   # 自动按 rank 切片
    loader = torch.utils.data.DataLoader(
        dataset, batch_size=64, sampler=sampler)

    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-4)

    for epoch in range(10):
        sampler.set_epoch(epoch)   # 4. 关键！每个 epoch 重洗，否则各卡切片不变
        for x, y in loader:
            loss = model(x.to(local_rank), y.to(local_rank))
            optimizer.zero_grad()
            loss.backward()        # 5. 梯度 AllReduce 在 backward 里自动发生
            optimizer.step()

    dist.destroy_process_group()

if __name__ == "__main__":
    main()
```

启动方式，**不要再用 python 直接跑**：

```bash
torchrun --nproc_per_node=8 train.py          # 单机 8 卡
torchrun --nnodes=2 --nproc_per_node=8 \
         --rdzv_backend=c10d --rdzv_endpoint=master:29500 train.py   # 双机 16 卡
```

### 必须理解的几个细节

**梯度同步在什么时候发生？** `loss.backward()` 时，DDP 对每个参数的梯度注册 hook，梯度一就绪就异步发起 AllReduce——通信和反向计算重叠，这是 DDP 高效的关键。bucket 机制（默认 25MB）把小张量攒批通信，减少启动开销。

**batch size 和学习率怎么换算？** DDP 下 `batch_size=64` 是**每张卡** 64，全局 batch = 64 × 卡数。经典换算是线性缩放规则：全局 batch 乘 8，lr 也乘 8，配 warmup。但大 batch 有极限，超过临界点后泛化下降，这时候该上 LAMB/LARS 或者梯度累积。

**为什么要有 `sampler.set_epoch(epoch)`？** DistributedSampler 内部用 `epoch` 作为随机种子切片，不调用的话每个 epoch 各卡拿到的切片完全相同，等于丢掉了 shuffle。这是多卡训练最常见的 bug 之一，症状是「多卡效果反而比单卡差」。

## 混合精度：和多卡几乎绑定出现

8 卡 DDP 标配混合精度（AMP），一行 `autocast` + `GradScaler`，显存省一半、速度快 1.5~3 倍（Tensor Core 的 FP16/BF16 矩阵乘）：

```python
scaler = torch.cuda.amp.GradScaler()

for x, y in loader:
    with torch.autocast(device_type="cuda", dtype=torch.bfloat16):
        loss = model(x, y)
    scaler.scale(loss).backward()
    scaler.step(optimizer)
    scaler.update()
```

经验：**新卡（A100/H100/4090）直接用 BF16**，数值范围和 FP32 一致不需要 GradScaler 的精细调节；老卡（V100）才用 FP16 + scaler。BF16 + DDP 是我现在所有训练的默认开局。

## FSDP：当模型大到单卡放不下

DDP 的前提是「每张卡都放得下整个模型」。70 亿参数模型 BF16 权重就 14GB，加上梯度和 Adam 优化器状态（两份动量），单卡需要约 112GB——4090 只有 24GB，怎么办？

ZeRO 的思想（FSDP 是其 PyTorch 实现）：**参数、梯度、优化器状态不再每卡全量复制，而是切片摊到所有卡上**，前向/反向需要时通过 AllGather 临时聚齐，用完即弃。

```python
from torch.distributed.fsdp import FullyShardedDataParallel as FSDP
from torch.distributed.fsdp import ShardingStrategy

model = FSDP(
    model,
    sharding_strategy=ShardingStrategy.FULL_SHARD,  # 参数+梯度+优化器状态全切
    auto_wrap_policy=transformer_auto_wrap_policy,   # 按 TransformerBlock 自动分片
    mixed_precision=bf16_policy,
    device_id=local_rank,
)
```

三个切分级别对应 ZeRO 三个阶段：`SHARD_GRAD_OP`（切梯度+优化器）→ `FULL_SHARD`（连参数也切）→ `HYBRID_SHARD`（机内全切、机间复制，多机省带宽）。

**FSDP vs DDP 的代价权衡**：FSDP 省显存但每层多两次 AllGather 通信，计算通信比下降。所以经验法则是——**单卡放得下就 DDP，放不下才 FSDP**。我在 4×A100 上训 13B 模型，DDP+AMP 爆显存，换 FULL_SHARD 后吞吐是单卡理想值的 78%，可以接受。

### 生态位补充：DeepSpeed 和 Megatron

- **DeepSpeed**：微软的 ZeRO 原创实现，功能比 FSDP 全（ZeRO-Offload 能把优化器状态甩到 CPU 内存），LLM 微调常用。
- **Megatron-LM**：NVIDIA 的张量并行 + 流水线并行实现，千卡预训练的标准件。张量并行把单层的矩阵乘切到多卡（比如注意力头分组），通信量极大，必须 NVLink/InfiniBand。
- **HuggingFace Accelerate**：在 DDP/FSDP/DeepSpeed 上面包了一层统一 API，`accelerate config` 交互式生成配置，训练代码几乎不用改。中小团队首选。

实际选型：个人/小团队 **Accelerate + DDP/FSDP**；LLM 预训练 **Megatron 或现成框架（llamafactory、torchtitan）**；需要 CPU Offload 省卡 **DeepSpeed**。我在 [LoRA 微调文章](/posts/llm-finetuning-lora/)里用的就是 llamafactory，底层就是这套东西。

## 性能分析：多卡不等于快

多卡训练最常见的幻觉是「8 卡就该 8 倍速」。实际上加速比受三个因素制约：

1. **通信占比**：模型小、batch 小时，梯度同步时间占比上升，加速比骤降。判断方法：`torch.profiler` 或 `nsys` 看 AllReduce 时间占比，>20% 就要警惕。
2. **数据加载瓶颈**：8 张卡每秒吞吐的样本量是单卡 8 倍，DataLoader 的 `num_workers` 和磁盘 IO 先被打爆。我遇到过一次 8 卡训练 GPU 利用率只有 30%，查了半天是 JPEG 解码在 CPU 上排队。
3. **网络带宽**：多机场景以太网 10Gbps 是杯水车薪，InfiniBand + NCCL 的 GPUDirect RDMA 才是正解。

度量指标用**吞吐（samples/sec）**而不是「step 时间」，盯 GPU 利用率（`nvidia-smi dmon`）和通信占比，这是多卡调优的两盏灯。

## 踩坑排查

| 现象 | 原因 | 解法 |
|------|------|------|
| 启动卡死在 init_process_group | 多机网络不通 / 防火墙拦端口 | 检查 `NCCL_SOCKET_IFNAME` 网卡名，telnet 主节点端口 |
| loss 比单卡高且不收敛 | 忘了 `sampler.set_epoch(epoch)` | 每个 epoch 开头调用 |
| 各卡 loss 差异巨大后发散 | 某卡数据有问题或 lr 未按卡数缩放 | 全局 batch ×N，lr 相应缩放 + warmup |
| 8 卡只比 4 卡快 1.2 倍 | 数据加载瓶颈或通信占比过高 | 加 num_workers、预解码；profiler 看通信 |
| 显存溢出但单卡够 | DDP 每卡都存全量模型+batch 没调 | 每卡 batch 减半，梯度累积补上 |
| FSDP 训练比 DDP 慢很多 | 模型其实单卡放得下，白付通信税 | 单卡放得下就别用 FULL_SHARD |
| 评估时指标忽高忽低 | 多卡上 metrics 没 all-gather | 指标要在卡间聚合再平均，否则只算了 1/N 数据 |

## 练习

1. 把单卡 CIFAR-10 训练脚本改成 DDP 双卡版，对比 1 卡 vs 2 卡的吞吐和最终精度，验证线性加速比。
2. 故意注释掉 `sampler.set_epoch(epoch)`，观察 20 epoch 的训练曲线和正常版差多少，直观理解这个 bug 的危害。
3. 用 `torch.profiler` 抓取一次 backward，找出 AllReduce（`nccl:all_reduce` kernel）的时间占比。
4. 进阶：用 Accelerate 把脚本改成配置驱动，同一份代码分别用 DDP 和 FSDP 跑，记录显存峰值差异。

## 面试常问

**Q：DDP 的梯度同步原理？为什么比 DP 快？**
DDP 每卡一进程，反向传播时梯度通过 NCCL Ring-AllReduce 在卡间同步——环形拓扑上每张卡只和左右邻居通信，带宽利用率最优，且无中心热点。通信与反向计算重叠（梯度一就绪就异步通信）。DP 是单进程 + 中心 gather/scatter，GIL 和 0 卡热点双重瓶颈。

**Q：Ring-AllReduce 的通信量是多少？**
2(N−1)/N × 梯度总量，N 为卡数。关键洞察：通信量几乎与卡数无关（N 越大系数越接近 2），所以 Ring-AllReduce 可以扩展到几百卡。

**Q：ZeRO 三个阶段分别切什么？**
Stage 1：切优化器状态（Adam 的两份动量，省最多）；Stage 2：再切梯度；Stage 3：连参数也切，每卡只存 1/N 的参数分片。PyTorch FSDP 的 FULL_SHARD 对应 Stage 3。

**Q：全局 batch 变大后为什么要调学习率？**
梯度方差随 batch 增大而减小，同样的 lr 下参数更新方向更「确定」但步长相对不足，等效于 lr 变小。线性缩放规则（batch ×k → lr ×k）在 SGD 类优化器上经验有效，但必须配 warmup——训练初期参数远离最优点，大 lr 直接发散。Adam 类通常用平方根缩放更稳。

**Q：什么时候需要张量并行而不是 FSDP？**
单卡连一份参数分片都放不下（比如万亿参数模型），或者单层计算本身就要切开时。张量并行把矩阵乘按维度切到多卡，每层需要两次 AllReduce，通信量远大于 FSDP 的 AllGather，所以必须 NVLink 级带宽。FSDP 是「省显存的通信」，张量并行是「没它就跑不了」。

**Q：多机训练网络怎么配？**
NCCL 后端 + InfiniBand（或 RoCE）；`NCCL_IB_HCA` 指定 IB 网卡、`NCCL_SOCKET_IFNAME` 指定初始化用的以太网卡；确保节点间 SSH 免密或用 torchrun 的 rendezvous。云上训练（AWS p4d、阿里灵骏）这些已预配好，自建集群要自己踩。

## 相关阅读

- [LLM 微调实战：LoRA 与 QLoRA](/posts/llm-finetuning-lora/)——PEFT 大幅降低多卡门槛，单卡微调 7B
- [模型压缩与部署实战](/posts/model-compression-deployment/)——训练完之后的下一站
- [深度学习框架入门：PyTorch 与 TensorFlow](/posts/deep-learning-01-training-loop/)——DDP 代码的框架基础
- [大数据管理：Hadoop、Spark 与数据仓库](/posts/big-data-management/)——数据侧的分布式思想，和训练侧互为镜像
- [vLLM 部署 Qwen 性能调优实录](/posts/vllm-qwen-performance-tuning/)——推理侧的并行策略（TP/PP）

分布式训练的核心心法就一句：**先想清楚瓶颈是计算、显存还是通信，再选对应的并行策略**。工具会过时（今天 DDP，明天可能是别的），这个分析框架不会。
