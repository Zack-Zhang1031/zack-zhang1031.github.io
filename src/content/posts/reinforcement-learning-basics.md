---
title: "强化学习基础：从 Q-Learning 到 Policy Gradient——智能体怎么学会做决定"
date: 2026-08-29T08:40:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "强化学习入门：MDP 五要素、探索与利用、Q-Learning 表格法实战、DQN 的三板斧，以及 Policy Gradient 的直觉，附 Gymnasium 上手指南。"
tags: ["强化学习", "Q-Learning", "DQN", "Gymnasium"]
categories: ["AI课程", "强化学习"]
math: true
---

监督学习有标准答案，无监督学习找数据结构，强化学习（RL）是第三种范式：**没有答案，只有反馈**——智能体在环境里行动，环境给它奖励，它学着让长期奖励最大。下棋、游戏 AI、机器人控制、推荐系统的长期优化、乃至 LLM 的 RLHF，底层都是这套思想。

> 前置阅读：[机器学习基础](/posts/ml-basics-scikit-learn/)（对比三种学习范式）、[深度学习课程 01](/posts/deep-learning-01-training-loop/)（DQN 部分的神经网络基础）。

## MDP：把问题形式化的五要素

强化学习问题统一建模为马尔可夫决策过程（MDP）：

- **状态 $S$**：智能体看到的局面（棋局、游戏画面）。
- **动作 $A$**：可做的事（上下左右、落子）。
- **奖励 $R$**：环境的即时反馈（吃到金币 +1，撞墙 -1）。
- **转移概率 $P$**：动作如何改变世界。
- **折扣因子 $\gamma$**：未来奖励打几折（0.9-0.99），平衡眼前与长远。

目标是学一个**策略 $\pi(a|s)$**（在状态 s 下选什么动作），最大化折扣累积奖励：

$$G_t = R_{t+1} + \gamma R_{t+2} + \gamma^2 R_{t+3} + \cdots$$

"马尔可夫"的含义：未来只取决于当前状态，与历史无关。建模时如果状态看不全（比如扑克牌看不到对手手牌），就是 POMDP，处理手段是把历史堆进状态。

## 核心矛盾：探索与利用

智能体每步都面临选择：用已知的最好动作（利用），还是试试没试过的（探索）？只利用会困在局部最优（永远点同一家外卖），只探索学不到东西。最简单的策略是 **ε-贪心**：以 ε 的概率随机探索，否则选当前最优——训练初期 ε 大（多探索），随训练衰减到接近 0。

## Q-Learning：从一张表开始

Q 函数 $Q(s,a)$ 表示"在状态 s 做动作 a 的长期价值"。Q-Learning 用一张表存所有 (s,a) 的价值，边试错边更新：

$$Q(s,a) \leftarrow Q(s,a) + \alpha \big[ r + \gamma \max_{a'} Q(s',a') - Q(s,a) \big]$$

更新的含义：让当前估值向"即时奖励 + 下一步最优估值"靠拢（TD 目标）。用 Gymnasium 的 FrozenLake 环境完整跑一遍：

```python
# pip install gymnasium
import gymnasium as gym
import numpy as np

env = gym.make("FrozenLake-v1", is_slippery=False)
Q = np.zeros((env.observation_space.n, env.action_space.n))

alpha, gamma, eps = 0.8, 0.95, 1.0
for episode in range(5000):
    state, _ = env.reset()
    done = False
    while not done:
        if np.random.random() < eps:
            action = env.action_space.sample()       # 探索
        else:
            action = np.argmax(Q[state])             # 利用
        next_state, reward, done, truncated, _ = env.step(action)
        Q[state, action] += alpha * (reward + gamma * Q[next_state].max()
                                     - Q[state, action])
        state = next_state
    eps = max(0.01, eps * 0.995)                     # 探索率衰减

# 学完后：每个状态选 Q 最大的动作，就是通关策略
print(np.argmax(Q, axis=1))
```

表格法只在状态空间小时可行——FrozenLake 只有 16 个状态。状态空间爆炸（图像输入、连续状态）时表格存不下，这是 DQN 登场的动机。

## DQN：用神经网络逼近 Q 函数

DQN 用神经网络 $Q(s, a; \theta)$ 代替表格，三个关键技巧（"三板斧"）：

1. **经验回放**：把交互样本 $(s,a,r,s')$ 存进回放缓冲区，训练时随机抽批——打破样本间的时间相关性（连续帧高度相关，直接顺序学就学歪了）。
2. **目标网络**：TD 目标里的 $\max Q(s',a')$ 用另一个慢更新的网络算，避免"自己追自己"的不稳定。
3. **奖励裁剪与帧堆叠**：工程细节，稳定训练。

DQN 在 Atari 游戏上首次达到人类水平，是深度强化学习的起点。今天的 DQN 家族（Double、Dueling、Rainbow）都是对这三板斧的改进。

## Policy Gradient：另一条路线

Q-Learning 系学"价值"再从中导出动作；策略梯度直接学"策略"本身：用神经网络输出动作概率，按"这个动作带来的长期回报"调整概率——回报好的动作概率调高：

$$\nabla_\theta J = \mathbb{E}\big[ \nabla_\theta \log \pi_\theta(a|s) \cdot G_t \big]$$

优势：天然处理连续动作（机器人关节角度）、能学随机策略。REINFORCE 是最简形式，PPO 是它的稳定工业版本，LLM 的 RLHF 用的就是 PPO 系。

## 学习路径建议

RL 的坑比监督学习深得多：奖励稀疏、训练方差大、对超参敏感、复现困难。入门路径建议：表格 Q-Learning（本文）→ 用 stable-baselines3 跑通 DQN/PPO（别一上来手写）→ 再回头读原理。环境统一用 Gymnasium，算法实现用 stable-baselines3，别重复造轮子。

## 踩坑排查

| 症状 | 原因 | 处理 |
|---|---|---|
| 训练完全不收敛 | 奖励太稀疏 | 奖励塑形/课程学习/降环境难度 |
| 学到一个奇怪策略 | 奖励设计有漏洞 | 智能体会钻奖励的一切空子，先审奖励函数 |
| 性能忽上忽下 | 策略评估局数太少 | 评估跑几十局取均值 |
| DQN 发散 | 目标网络缺失/学习率大 | 三板斧配齐；降 lr |
| ε 衰减后表现崩 | 衰减太快，没探索够 | 放缓衰减或提高下限 |
| 同样的代码结果不同 | 环境/种子随机性 | 固定所有种子，报告多种子均值 |

## 练习

1. 在 FrozenLake 上实现 Q-Learning，画出滑动平均奖励曲线，验证收敛。
2. 打开 `is_slippery=True`（随机环境），观察收敛难度变化并解释。
3. 用 stable-baselines3 的 DQN 跑 CartPole，对比表格 Q-Learning 的表现。
4. 消融经验回放或目标网络，观察训练稳定性的变化。

## 面试常问

**Q：强化学习和监督学习的本质区别？**
监督学习从标注的输入-输出对学映射；RL 没有正确动作标注，只有延迟的奖励信号，且数据分布受自身策略影响（学得好才去得了好状态）——这带来探索-利用矛盾和信用分配难题（哪一步动作导致了最终胜负）。

**Q：Q-Learning 是 on-policy 还是 off-policy？**
Off-policy：更新用的 TD 目标是 $\max_{a'} Q(s',a')$（贪心策略），而实际行为用 ε-贪心（探索策略）——学习的策略和执行数据的策略不同。SARSA 把目标换成实际执行的下一个动作，是 on-policy。

**Q：经验回放为什么有效？**
打破连续样本的时间相关性（近似 i.i.d. 让梯度稳定）、样本复用提高数据效率、缓冲区平滑了数据分布的突变。

**Q：价值方法（DQN）和策略方法（PG）怎么选？**
离散动作、样本效率优先——价值方法；连续动作、需要随机策略、大规模并行——策略方法（PPO 是工业默认）。Actor-Critic 结合两者：Critic 估价值降低 PG 的方差，Actor 更新策略。

---

相关阅读：[K-Means 聚类](/posts/ml-kmeans-clustering/)（无监督篇）、[大模型微调实战](/posts/llm-finetuning-lora/)（RLHF 的前一站是 SFT）。
