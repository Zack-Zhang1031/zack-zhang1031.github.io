---
title: "LLM 对齐技术：SFT、RLHF 与 DPO——从「会说话」到「说对话」"
date: 2026-08-30T08:50:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "预训练模型为什么不是助手、SFT 的数据配方、RLHF 的奖励模型与 PPO、DPO 的简化革命，以及小团队该选哪条对齐路线。"
tags: ["RLHF", "DPO", "SFT", "LLM对齐", "大模型"]
categories: ["AI课程", "大模型应用"]
math: false
---

预训练模型本质上是个「续写机器」：你问「怎么做红烧肉」，它可能续写「——这是百度知道上第 3 个回答」而不是直接教你做。**从「会续写」到「像助手」，中间这一步叫对齐（alignment）**——教模型听指令、说人话、有分寸。ChatGPT 和 GPT-3 的差距主要不在底座，而在对齐。

这篇讲清对齐的三代技术：SFT（指令微调）→ RLHF（人类反馈强化学习）→ DPO（直接偏好优化），以及小团队的现实选择。

**前置阅读**：建议先读 [LLM 微调：LoRA](/posts/llm-finetuning-lora/)、[强化学习入门](/posts/reinforcement-learning-basics/)、[Prompt 工程实战](/posts/prompt-engineering-practice/)。

## SFT：对齐的第一课，也是 80% 的收益

预训练模型见过海量文本但没见过「指令 → 回答」的格式。SFT 就是拿指令数据继续训练：

```json
{"instruction": "解释什么是通货膨胀", "input": "",
 "output": "通货膨胀是指货币供应量超过实际需求，导致物价普遍持续上涨的现象……"}
```

数据配方比算法重要——三条经验：

1. **质量 > 数量**：1 万条精心写的指令数据（OpenAI 的 InstructGPT 只用了 1.3 万条）胜过 100 万条脏数据。LIMA 论文甚至证明 1000 条精选数据就能对齐出可用模型。
2. **多样性覆盖**：问答、写作、总结、代码、推理、拒绝（「这个我不能帮你」）都要有——缺哪类哪类就废。
3. **格式统一**：chat template（`<|im_start|>user...`）必须和推理时完全一致，模板错位是指令不服从的头号原因。

```python
# TRL 库的 SFT 标准姿势
from trl import SFTTrainer, SFTConfig

trainer = SFTTrainer(
    model=model,
    args=SFTConfig(learning_rate=1e-5, num_train_epochs=3,
                   per_device_train_batch_size=4),
    train_dataset=instruction_data,
    processing_class=tokenizer,
)
trainer.train()
```

**SFT 之后模型已经「能用」**——会听指令、格式正确。但它不知道两个都「正确」的回答哪个更好：一个啰嗦一个精炼、一个有用一个有微妙错误。偏好层面的对齐需要下一步。

## RLHF：用人类偏好训练裁判，再让裁判训练模型

两个阶段：

**阶段一：训练奖励模型（RM）**。同一个 prompt 让模型生成多个回答，人工排序（A 比 B 好），用这些偏好对训练一个打分模型——它学会「人类喜欢什么样的回答」。

**阶段二：PPO 强化学习**。SFT 模型生成回答 → RM 打分作为奖励 → 用 PPO 更新模型让它拿更高奖励。关键约束：加 KL 惩罚防止模型为了刷分偏离原模型太远（[信息论篇](/posts/information-theory-basics/)讲过 KL 散度），否则会出现「奖励黑客」——模型学会骗 RM（比如无脑说漂亮话）而不是真变好。

RLHF 的工程现实：**贵且难**。要同时加载 4 个模型（actor/critic/RM/参考模型）、PPO 超参极其敏感、奖励模型本身会被钻空子。这套流程只有大厂玩得起，这直接催生了 DPO。

## DPO：跳过强化学习，直接学偏好

DPO（Direct Preference Optimization）的洞见：偏好学习不一定要走「RM + RL」的弯路——**偏好数据本身可以直接变成分类式的损失**：

$$L_{DPO} = -\log \sigma\left(\beta \log \frac{\pi_\theta(y_w|x)}{\pi_{ref}(y_w|x)} - \beta \log \frac{\pi_\theta(y_l|x)}{\pi_{ref}(y_l|x)}\right)$$

翻译成人话：对同一个 prompt 的好回答（y_w）和坏回答（y_l），让模型提高好回答的相对概率、压低坏回答的——就这么简单。**不需要奖励模型、不需要 PPO、训练和普通 SFT 一样稳定**。

```python
from trl import DPOTrainer, DPOConfig

# 数据格式：{"prompt": ..., "chosen": 好回答, "rejected": 坏回答}
trainer = DPOTrainer(
    model=model,
    args=DPOConfig(learning_rate=5e-7, beta=0.1,
                   per_device_train_batch_size=2),
    train_dataset=preference_data,
    processing_class=tokenizer,
)
trainer.train()
```

`beta` 控制偏离参考模型的力度（大 beta 保守小 beta 激进），学习率要比 SFT 低一个量级（5e-7 上下）——DPO 对 lr 敏感是全社区的血泪共识。

后续变体：IPO（修 DPO 的过拟合）、KTO（只要单条好坏标注不用成对）、ORPO（连参考模型都省了）。思想同宗：**把偏好学习变成监督式的目标函数**。

## 对齐的代价与黑暗面

- **对齐税（alignment tax）**：对齐后模型在某些能力上（多样性、部分推理任务）反而下降——「更乖但略呆」。缓解靠数据配比（SFT 混一点预训练数据）。
- **模式坍塌**：DPO/RLHF 后回答风格趋同（都是「首先其次总之」的八股）——偏好数据的单调性被放大。
- **安全与有用的张力**：过度拒绝（「作为一个 AI 我不能……」）是对齐失败的常见形态，解药在拒绝类数据的质量而非数量。

## 小团队的现实路线

99% 的团队不该碰 RLHF。务实的对齐阶梯：

1. **先用 Prompt 工程**：[few-shot 和系统提示](/posts/prompt-engineering-practice/)能解决的风格/格式问题别微调。
2. **SFT（LoRA）**：几千条领域指令数据 + [QLoRA](/posts/llm-finetuning-lora/)，单卡可完成——解决「领域知识 + 输出格式」。
3. **DPO（可选）**：有真实用户偏好数据（点赞/点踩、采纳/重写）时上——几千对就够，llamafactory 一键跑。
4. **RLHF/RLAIF**：没有专门的偏好标注团队和训练基建，别碰。

数据来源的现代答案：**用强模型造**。GPT-4o 生成指令回答对（self-instruct 路线）、强模型排序当偏好标注（RLAIF 思想）——成本从百万级标注费降到几百块 API 费。注意检查蒸馏许可证（多数商业模型禁止用输出训练竞品模型）。

## 踩坑排查

| 现象 | 原因 | 解法 |
|------|------|------|
| SFT 后模型只会复读训练数据风格 | 数据多样性不足/训练过度 | 数据去重、降 epoch 到 1~3 |
| 指令微调后不再服从指令 | chat template 与推理不一致 | 训练推理模板逐字符对齐 |
| DPO 训练后回答变得又臭又长 | chosen 数据普遍偏长，模型学「长=好」 | 控制 chosen/rejected 长度分布 |
| DPO loss 降但效果差 | lr 太大崩了 / beta 不合适 | lr 降到 5e-7，beta 扫 0.05~0.3 |
| 对齐后模型什么请求都拒绝 | 拒绝数据比例过高 | 重新配比，拒绝数据 <5% |
| RLHF 训练 reward 暴涨但输出变废话 | 奖励黑客 | 加大 KL 惩罚；RM 定期用新数据重训 |

## 练习

1. 构造 200 条领域指令数据（可用强模型生成 + 人工筛），用 llamafactory 跑一次 LoRA SFT，对比微调前后的指令服从率。
2. 人工标注 100 对偏好数据（两个模型输出二选一），用 TRL 跑 DPO，观察 beta=0.05/0.1/0.3 下回答风格的变化。
3. 复现「奖励黑客」玩具实验：用一个只喜欢长回答的打分函数当 RM，看模型如何迅速学会灌水。
4. 对比同一模型「SFT 后」与「SFT+DPO 后」在 20 个开放式问题上的输出，人工盲评哪个更好——体会偏好对齐的增量。

## 面试常问

**Q：RLHF 为什么要单独的奖励模型，不能直接用人工打分做 RL？**
人工标注太慢太贵——RL 需要每步奖励（成千上万次迭代），人类标不动。RM 是「人类偏好的廉价近似」：人工标几千对排序，RM 学会后就能无限打分。代价是 RM 不完美，会被优化压力钻空子（Goodhart 定律：指标成为目标就不再是好指标），所以需要 KL 约束和定期用新人工数据重训 RM。

**Q：DPO 相比 RLHF 的优劣？**
优：训练简单稳定（就是监督学习）、不需要 RM 和 RL 基建、小数据可用。劣：没有显式奖励模型所以难以做在线探索；对偏好数据分布敏感（分布外退化）；缺乏 RL 的「从自己的错误中学习」能力。2024 后 DPO 系成为开源社区默认，RLHF 仍是大厂顶配。趋势：GRPO 等在线 RL 方法在推理模型（R1 类）上复兴。

**Q：SFT 的数据质量怎么评估？**
三板斧：① 人工抽检准确率与风格（至少 5% 样本）；② 多样性分析——指令动词分布、长度分布、任务类型分布，防止某类占 80%；③ 污染检查——和评测集去重（n-gram 重叠检测），否则评测分数是作弊。

**Q：什么是指令微调里的「灾难性遗忘」？怎么缓解？**
SFT 在指令数据上学得太狠，预训练的通用能力（知识、推理）被覆盖。缓解：混入 5~10% 通用数据、降低学习率和 epoch、用 LoRA 等参数高效方法（冻结主干本身就是防遗忘的正则，[LoRA 篇](/posts/llm-finetuning-lora/)）、评测时同时跑通用基准（MMLU）和领域指标，两头都要看。

**Q：RLAIF / AI 反馈是什么？可行吗？**
用强模型（宪法 AI 的原则列表、GPT-4 的偏好判断）代替人类标注。实验证明与人类偏好一致率 80%+，成本降 2~3 个数量级——开源社区的主流做法。风险：AI 偏好的系统性偏差被继承（偏爱长答案、八股结构）；混合策略（AI 粗标 + 人抽检）是当前最优性价比。

## 相关阅读

- [LLM 微调实战：LoRA 与 QLoRA](/posts/llm-finetuning-lora/)——SFT 的工程实现
- [强化学习入门](/posts/reinforcement-learning-basics/)——PPO 的算法背景
- [信息论速通](/posts/information-theory-basics/)——KL 惩罚的数学
- [Prompt Engineering 实战](/posts/prompt-engineering-practice/)——对齐之前先试的便宜手段
- [LLM 评测体系](/posts/llm-evaluation-benchmarks/)——对齐效果怎么测

对齐的本质是把「人类说不清的偏好」变成「模型学得会的信号」。三代技术越做越简单——但记住，简单的是算法，难的永远是数据：你到底有没有一份「什么算好回答」的可靠答案。
