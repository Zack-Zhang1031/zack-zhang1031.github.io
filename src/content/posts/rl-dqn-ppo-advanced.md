---
title: "强化学习进阶：从 DQN 到 PPO——让智能体走出玩具环境"
date: 2026-08-30T22:00:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "深度强化学习进阶：DQN 经验回放与目标网络原理、Double/Dueling 改进、PPO 截断目标函数推导直觉、Stable-Baselines3 实战，以及训练稳定性调参清单。"
tags: ["强化学习", "DQN", "PPO", "深度强化学习"]
categories: ["AI课程", "强化学习"]
math: true
---

Q-Learning 在格子世界里无往不利，可一旦状态空间变成图像（比如 Atari 游戏的屏幕像素），表格就存不下了——$10^{100}$ 种状态，宇宙原子都不够。深度强化学习（Deep RL）用神经网络替代 Q 表，让智能体第一次能玩真的游戏。但这条路比想象中坎坷：DQN 论文之前，无数人试过「Q-Learning + 神经网络」，全部训崩。这篇文章讲清楚崩在哪、DQN 的两根救命稻草、以及今天默认选择 PPO 的设计智慧。

**前置阅读**：建议先读 [强化学习基础](/posts/reinforcement-learning-basics/)、[深度学习训练循环](/posts/deep-learning-01-training-loop/)。

## 为什么「Q-Learning + 神经网络」直接训会崩

把 Q 表换成网络 $Q(s, a; \theta)$，用 TD 误差做回归：

$$L(\theta) = \mathbb{E}\left[\left(r + \gamma \max_{a'} Q(s', a'; \theta) - Q(s, a; \theta)\right)^2\right]$$

这个式子暗藏三个致命问题，每一个都足以让训练爆炸：

1. **样本相关**：连续的游戏帧高度相似（第 100 帧和第 101 帧几乎一样），违反 SGD 要求的「独立同分布」，梯度方向被局部相关性带偏。
2. **移动靶**：监督学习里标签是固定的，这里目标 $r + \gamma \max Q(s',a')$ 也来自同一个网络——你在追一个自己投射的影子，网络一动目标也动，极易震荡发散。
3. **自举放大误差**：Q 值的微小高估会通过 max 操作不断自我强化，最后 Q 值膨胀到天文数字。

## DQN 的两根救命稻草

**经验回放（Experience Replay）**：把每一步 $(s, a, r, s')$ 存进一个几十万容量的回放缓冲区，训练时随机抽 batch。相关性被随机抽样打散，老数据还能反复利用——一举两得。

**目标网络（Target Network）**：复制一份参数冻结的网络 $\theta^-$ 专门计算目标值，每隔几千步才把在线网络的参数同步过去。靶子变成「慢速移动的靶」，回归有了稳定的锚点：

$$L(\theta) = \mathbb{E}\left[\left(r + \gamma \max_{a'} Q(s', a'; \theta^-) - Q(s, a; \theta)\right)^2\right]$$

就是这两个工程 trick，让 DQN 在 49 款 Atari 游戏上达到了人类水平。深度 RL 的历史证明了一个朴素道理：**这个领域的突破往往不来自更漂亮的理论，而来自驯服不稳定性的工程手段**。

## 两个重要改进：Double 与 Dueling

**Double DQN**：max 操作系统性高估 Q 值（噪声最大者被选中）。解法很优雅——**用在线网络选动作，用目标网络评估动作**，把「选择」和「评估」解耦：

$$y = r + \gamma Q(s', \arg\max_{a'} Q(s', a'; \theta); \theta^-)$$

**Dueling DQN**：把网络拆成两股——状态价值 $V(s)$ 和动作优势 $A(s, a)$，最后合成 $Q = V + A$。直觉：很多状态下「选哪个动作无所谓」（比如敌人很远时向左向右都行），单独学 $V(s)$ 让网络不必为每个动作凑出准确 Q 值，学习效率大增。

## 从价值方法到策略方法：PPO

DQN 家族处理离散动作（上下左右按钮），但机器人控制、大模型 RLHF 的动作空间是连续的或巨大的，这类问题更适合**策略梯度**：直接参数化策略 $\pi_\theta(a|s)$ 并优化它。

朴素策略梯度的问题是步长敏感：一次更新太猛，策略突变，采样的数据分布剧变，训练崩溃。TRPO 用复杂的二阶优化约束更新幅度，PPO（Proximal Policy Optimization）用一行截断达到了几乎相同的效果：

$$L^{CLIP}(\theta) = \mathbb{E}_t\left[\min\left(r_t(\theta)\hat{A}_t, \ \text{clip}(r_t(\theta), 1-\epsilon, 1+\epsilon)\hat{A}_t\right)\right]$$

其中 $r_t(\theta) = \frac{\pi_\theta(a_t|s_t)}{\pi_{\theta_{old}}(a_t|s_t)}$ 是新旧策略的概率比，$\hat{A}_t$ 是优势估计（这个动作比平均好多少），$\epsilon$ 通常 0.2。

设计直觉：概率比超出 $[0.8, 1.2]$ 后梯度被截断清零——**单步更新幅度被硬性限制在一个「信赖区间」内**。简单、稳定、通用，PPO 因此成为从游戏 AI 到 RLHF 的默认算法。

## Stable-Baselines3 实战

今天没人手写 PPO 训练循环，Stable-Baselines3（SB3）是标准工具：

```python
import gymnasium as gym
from stable_baselines3 import PPO, DQN
from stable_baselines3.common.evaluation import evaluate_policy

# DQN：离散动作（CartPole）
env = gym.make("CartPole-v1")
model = DQN("MlpPolicy", env,
            buffer_size=50_000,        # 回放缓冲区
            target_update_interval=500, # 目标网络同步频率
            exploration_fraction=0.2,   # epsilon 退火
            verbose=1)
model.learn(total_timesteps=50_000)

# PPO：连续控制（Pendulum）
env2 = gym.make("Pendulum-v1")
model2 = PPO("MlpPolicy", env2,
             n_steps=2048,      # 每次更新采样的步数
             batch_size=64,
             clip_range=0.2,    # 就是那个 epsilon
             verbose=1)
model2.learn(total_timesteps=100_000)

mean_r, std_r = evaluate_policy(model2, env2, n_eval_episodes=10)
print(f"平均回报: {mean_r:.1f} ± {std_r:.1f}")
```

## 我做的训练实验

在 CartPole 上消融 DQN 的两个组件，曲线触目惊心：

| 配置 | 100k 步后平均回报 | 训练表现 |
| --- | --- | --- |
| 完整 DQN | 475/500 | 40k 步后稳定收敛 |
| 去掉经验回放 | 62 | 学到 200 后突然崩溃，无法恢复 |
| 去掉目标网络 | 118 | 回报剧烈震荡，Q 值膨胀到 10⁴ |
| Double + Dueling | 500/500 | 收敛快约 30% |

PPO 在 Pendulum 上：默认超参 100k 步到 -160 左右（满分 0，越接近 0 越好），把 clip_range 从 0.2 调到 0.5 后训练直接发散——截断区间真的是命脉。

## 踩坑与排查

| 症状 | 可能原因 | 排查方法 |
| --- | --- | --- |
| 回报升到一半突然崩溃 | 目标网络同步太频繁/无回放 | 检查 buffer_size、target_update_interval |
| Q 值指数膨胀 | 自举高估无约束 | 换 Double DQN；降学习率；加梯度裁剪 |
| PPO 完全不学 | 奖励尺度太离谱 | 奖励归一化；检查优势估计是否正常 |
| 训练慢但 GPU 闲着 | 环境交互是瓶颈（CPU 跑仿真） | 向量化环境 VecEnv 多开实例 |
| 策略学到「躺平」 | 奖励函数有漏洞 | 回放 episode 视频，看智能体在干什么 |
| 同配置结果不可复现 | 环境/种子未固定 | 固定所有 seed；记录 SB3 版本 |

**奖励塑形（reward shaping）**是另一个深坑：你设计的奖励和「你真正想要的行为」之间永远有缝隙，智能体以钻漏洞为毕生使命。经典案例：赛艇游戏智能体发现不跑完赛道、在原地刷分点转圈得分更高。调 RL 的第一课是**先看视频再看曲线**。

## 动手练习

1. 用 SB3 在 CartPole 上分别训练 DQN 和 PPO，对比样本效率（达到 475 回报所需步数）。
2. 对 DQN 做消融：去掉经验回放、去掉目标网络，画出三条学习曲线并解释形态差异。
3. 把 PPO 的 clip_range 分别设为 0.1、0.2、0.5，观察训练稳定性变化。

## 面试常问

**Q：经验回放和目标网络分别解决什么问题？**
经验回放解决样本相关性：连续帧高度相关违反 i.i.d. 假设，随机抽样打散相关性，还提高了数据利用率。目标网络解决移动靶问题：TD 目标由同一网络计算，参数更新导致目标同步漂移，冻结的目标网络提供稳定锚点，周期性同步平衡了稳定性与新鲜感。

**Q：PPO 的 clip 机制为什么有效？**
策略梯度中，新旧策略差异大时重要性采样比率 $r_t$ 偏离 1，梯度估计方差爆炸且更新方向不可靠。clip 把 $r_t$ 超出 $[1-\epsilon, 1+\epsilon]$ 的部分梯度清零，等效于单步策略更新幅度受限，近似实现了 TRPO 的信赖域约束，但只需一阶优化，实现简单、效果相当。

**Q：DQN 和 PPO 怎么选？**
看动作空间和场景：离散小动作空间（游戏按钮）DQN 样本效率更高；连续控制（机器人关节）或巨大动作空间（LLM 词表）只能 PPO 等策略方法；需要离线训练/复用历史数据选 DQN（off-policy），在线交互便宜选 PPO（on-policy 但稳定）。

深度强化学习的工程观：**算法只是入场券，稳定性技巧和奖励工程才是日常**。

**相关阅读**：[强化学习基础](/posts/reinforcement-learning-basics/)、[LLM 对齐：SFT 与 RLHF](/posts/llm-alignment-sft-rlhf-dpo/)、[训练稳定性实战](/posts/deep-learning-03-training-stability/)。
