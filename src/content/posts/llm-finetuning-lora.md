---
title: "大模型微调实战：LoRA/QLoRA——用一张消费级显卡定制你的 LLM"
date: 2026-08-29T09:20:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "全参数微调 vs 参数高效微调（PEFT）：LoRA 的低秩原理、QLoRA 的 4bit 量化、数据格式设计、训练参数配置与效果评估的完整实战流程。"
tags: ["LLM", "微调", "LoRA", "QLoRA", "PEFT"]
categories: ["AI课程", "自然语言处理"]
math: true
---

预训练大模型什么都会一点，但不懂你的领域语气、格式和私有知识。微调（SFT）把它教成你想要的样子。全参数微调一个 7B 模型要上百 GB 显存，普通人玩不起；LoRA/QLoRA 把门槛降到一张 24GB 甚至 12GB 的消费卡。这篇是完整实战：原理、数据、训练、评估。

> 前置阅读：[深度学习课程 07：Transformer](/posts/deep-learning-07-transformer-attention/)（模型结构）、[NLP 综合篇](/posts/nlp-comprehensive-guide/)（微调在 NLP 版图中的位置）。推理侧见 [vLLM 部署调优](/posts/vllm-qwen-performance-tuning/)。

## LoRA：不动大模型，只学"补丁"

全参数微调更新模型全部权重 $\theta$。LoRA 的洞察：**微调带来的权重变化量 $\Delta W$ 是低秩的**——可以用两个小矩阵的乘积近似：

$$W' = W + \Delta W = W + BA, \quad B \in \mathbb{R}^{d \times r},\ A \in \mathbb{R}^{r \times k},\ r \ll d$$

冻结 $W$，只训练 $A$ 和 $B$。秩 $r$ 取 8-64，可训练参数量降到原模型的 0.1%-1%，显存需求骤降。推理时把 $BA$ 合并回 $W$（无额外延迟），或保持外挂（多任务切换方便）。

LoRA 一般加在注意力层的 Q/K/V/O 投影上（`target_modules`），MLP 层加上会更强但更贵。

## QLoRA：再叠一层量化

QLoRA = 4bit 量化的基座模型 + LoRA。基座权重以 NF4 格式存（4bit 正态分布量化），训练时反向传播只更新 LoRA 参数，再加上分页优化器防显存尖峰——7B 模型微调的显存需求压到 10GB 上下，13B 也能在 24GB 卡上跑。

精度损失存在但可接受：QLoRA 论文和大量实践都表明下游任务分数接近全量 LoRA。代价是训练速度慢一些（量化/反量化开销）。

## 数据：微调效果的 80% 在这里

SFT 数据是指令-响应对，格式通常是带模板的对话：

```json
{"messages": [
  {"role": "system", "content": "你是科研论文分析助手"},
  {"role": "user", "content": "总结这篇摘要的贡献"},
  {"role": "assistant", "content": "该工作提出了……"}
]}
```

数据三原则（我踩过全部反例）：

1. **质量 > 数量**：1000 条人工精修胜过 10 万条机器生成。模型会放大数据里的每一类错误——格式不一致、答案啰嗦、事实错误，全都会被学进去。
2. **分布对齐真实用途**：客服场景微调就喂客服对话，别拿通用语料凑数。
3. **留出评测集**：和训练集严格隔离，用来回答"微调到底有没有用"。

## 训练：peft + trl 最小流程

```python
# pip install peft trl transformers bitsandbytes
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import LoraConfig, get_peft_model
from trl import SFTTrainer, SFTConfig
import torch

model = AutoModelForCausalLM.from_pretrained(
    "Qwen/Qwen2.5-7B-Instruct",
    load_in_4bit=True,                      # QLoRA
    torch_dtype=torch.bfloat16,
    device_map="auto",
)
tokenizer = AutoTokenizer.from_pretrained("Qwen/Qwen2.5-7B-Instruct")

lora_cfg = LoraConfig(
    r=16, lora_alpha=32,                    # alpha/r 决定缩放强度
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
    lora_dropout=0.05,
    task_type="CAUSAL_LM",
)
model = get_peft_model(model, lora_cfg)
model.print_trainable_parameters()          # 确认只有 ~0.2% 参数可训练

trainer = SFTTrainer(
    model=model,
    args=SFTConfig(
        output_dir="runs/sft",
        num_train_epochs=3,
        per_device_train_batch_size=4,
        gradient_accumulation_steps=8,      # 等效 batch=32
        learning_rate=1e-4,                 # LoRA 的 lr 比全参数大一个量级
        logging_steps=10,
        save_strategy="epoch",
        bf16=True,
    ),
    train_dataset=sft_dataset,
)
trainer.train()
model.save_pretrained("runs/sft/lora_adapter")   # 只保存 adapter，几十 MB
```

几个参数要点：`lora_alpha/r` 的比值是实际缩放系数（常用 2）；`learning_rate` 用 1e-4 量级（LoRA 参数是随机初始化的小矩阵，可以承受大 lr）；保存下来的只是几十 MB 的 adapter，基座模型不变。

## 评估：别只看 loss

SFT 的 loss 下降不代表效果达标。三层评估：

- **留出集自动评测**：BLEU/ROUGE 有参考价值但有限，生成质量更靠人评。
- **对比测试**：同一批 prompt，基座模型 vs 微调模型盲评——"微调后格式遵循率从 40% 到 95%"这种数字才是结论。
- **能力回退检查**：微调可能在通用能力上退化（灾难性遗忘的微调版），用 MMLU 子集或通用问答抽查。

RAG 还是微调的抉择见 [NLP 综合篇](/posts/nlp-comprehensive-guide/)：知识类需求优先 RAG，风格/格式/行为类需求才微调。

## 踩坑排查

| 症状 | 原因 | 处理 |
|---|---|---|
| OOM 在第一个 step | 序列太长/没梯度累积 | 降 max_length、开梯度检查点 |
| loss 不降 | 数据模板错/lr 太小 | 打印一条训练样本核对 chat template |
| 输出复读机 | 训练数据重复/过拟合 | 去重、降 epoch、早停 |
| 通用能力退化 | 训练数据太窄/lr 太大 | 混入通用数据、降 lr |
| adapter 加载后无效果 | 基座版本不匹配 | 训练推理用同一基座权重 |
| 评估分数和体感不符 | 自动指标局限性 | 盲评 + bad case 库 |

## 练习

1. 用 500 条领域数据 QLoRA 微调 Qwen2.5-7B，对比微调前后的格式遵循率。
2. 扫 r ∈ {8, 16, 64}，对比下游分数、训练耗时与 adapter 大小。
3. 故意用 100 条低质数据训练，观察模型学到了哪些坏毛病。
4. 把 LoRA adapter 合并回基座并导出，用 [vLLM](/posts/vllm-qwen-performance-tuning/) 部署测延迟。

## 面试常问

**Q：LoRA 为什么有效？**
预训练模型的权重已含丰富结构，下游微调所需的变化位于低维子空间，低秩矩阵 BA 足以表达。冻结主干避免了大参数量带来的过拟合与显存开销。

**Q：QLoRA 的精度代价在哪？**
基座 4bit 量化引入的表示误差；但梯度只更新 LoRA 参数，量化误差不累积。实践上 7B 模型下游任务差距通常在 1 个点以内，极端精度敏感场景用 bf16 LoRA。

**Q：SFT 和 RLHF 的分工？**
SFT 教格式、风格、基础知识（模仿示范）；RLHF/DPO 教偏好（哪个回答更好）。流水线是先 SFT 后偏好对齐；小团队只做 SFT 也能拿到大部分收益。

**Q：微调数据怎么造？**
人工撰写（质量天花板）、强模型蒸馏（GPT 生成 + 人工筛）、已有数据改写。关键是覆盖真实使用分布 + 严格去重去错，混入 5% 坏数据的伤害超过多加 50% 好数据的收益。

---

相关阅读：[Prompt 工程实战](/posts/prompt-engineering-practice/)（不动参数的路线）、[强化学习基础](/posts/reinforcement-learning-basics/)（RLHF 的 RL 部分）。
