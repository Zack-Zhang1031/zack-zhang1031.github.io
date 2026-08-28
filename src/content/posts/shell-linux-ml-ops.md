---
title: "Shell 与 Linux 训练运维：让 GPU 任务跑过整个周末——研究者的生存技能"
date: 2026-08-30T19:00:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "Shell 脚本实战：tmux 保活训练、日志重定向与轮转、nvidia-smi 监控、checkpoint 自动清理、rsync 数据传输，让 GPU 任务稳定跑过整个周末。"
tags: ["Linux", "Shell", "MLOps", "GPU", "运维"]
categories: ["AI课程", "Linux基础"]
math: false
---

实验室的 GPU 服务器是共享资源，一个训练任务跑十几个小时是常态。我经历过最痛的一次：周五晚上提交了一个三天的训练任务，周一回来发现 SSH 在周六凌晨断连，进程被杀，损失两天算力。从那以后我给自己立了规矩：**任何超过十分钟的训练，必须套 tmux、必须落日志、必须有监控**。这篇文章就是我这些年攒下的 Linux 训练运维清单，每一条背后都有一次事故。

**前置阅读**：建议先读 [Linux 与 Python 环境基础](/posts/linux-python-environment-basics/)、[开发环境搭建](/posts/ai-research-eng-01-dev-environment/)。

## 会话保活：tmux 是第一优先级

SSH 断连会向你终端里所有进程发送 SIGHUP，进程默认收到就退出。解决方案是把训练跑在**独立于 SSH 会话**的容器里。tmux 是标准答案：

```bash
# 新建一个名为 train 的会话
tmux new -s train
# 在会话里启动训练
python train.py --epochs 100
# 按下 Ctrl+B 再按 D：脱离会话（detached），训练继续跑
# 重新连上服务器后：
tmux attach -t train    # 回到会话，训练输出原封不动
tmux ls                 # 列出所有会话
tmux kill-session -t train   # 结束会话
```

tmux 之外还有两层保险，按场景叠加：

```bash
# 方案二：nohup + 输出重定向（不需要交互时用）
nohup python train.py --epochs 100 > logs/train_$(date +%m%d_%H%M).log 2>&1 &

# 方案三：setsid 彻底脱离会话组
setsid python train.py > logs/train.log 2>&1 < /dev/null &
```

`2>&1` 把标准错误合并到标准输出一起落盘，末尾的 `&` 放后台。我自己的习惯是：交互式调试用 tmux，批量跑实验用 nohup + 时间戳日志名。

## 日志：出了问题唯一的现场

训练崩了而没有日志，等于事故没有黑匣子。我的日志纪律有三条：

**第一，日志带时间戳，绝不覆盖。** 用 `$(date +%m%d_%H%M)` 生成文件名，每次实验一份。磁盘很便宜，重跑很贵。

**第二，Python 端用 logging 而不是 print。** print 有缓冲，崩溃时最后几行可能丢在缓冲区里。如果一定要用 print，加 `python -u` 强制无缓冲输出。

**第三，定期清理。** 训练日志加上 TensorBoard 的 events 文件，一个月能吃掉几十 GB。我写了一个每周跑的清理脚本：

```bash
#!/bin/bash
# cleanup.sh：删除 30 天前的日志，保留最近 3 个 checkpoint
find ~/logs -name "*.log" -mtime +30 -delete
# checkpoint 按时间排序，只留最新 3 个
ls -t ~/checkpoints/*.pt | tail -n +4 | xargs -r rm -f
echo "$(date): cleanup done" >> ~/logs/cleanup.log
```

## GPU 与进程监控

`nvidia-smi` 只看一眼不够，要持续观察趋势：

```bash
# 每 2 秒刷新一次
watch -n 2 nvidia-smi
# 或者只盯利用率和显存两列，输出更干净
nvidia-smi --query-gpu=index,utilization.gpu,memory.used,memory.total \
           --format=csv -l 5
# 查清楚是谁占了显卡（多人共享服务器必备）
nvidia-smi --query-compute-apps=pid,used_memory --format=csv
ps -fp <PID>   # 根据 PID 查进程主人和启动命令
```

CPU 和内存侧用 `htop`（比 top 直观十倍），磁盘用 `df -h` 看分区、`du -sh */` 找哪个目录在膨胀。有一次训练越来越慢，最后发现是 `/tmp` 被 dataloader 的缓存塞满导致交换分区狂转——`df -h` 十秒就定位了。

## 一个生产级训练启动脚本模板

把上面的纪律固化成一个模板，新项目直接复制：

```bash
#!/bin/bash
set -euo pipefail   # 任何命令失败立即退出；未定义变量报错；管道错误不吞

EXP_NAME=${1:-baseline}
LOG_DIR=logs/$(date +%Y%m%d)
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/${EXP_NAME}_$(date +%H%M).log"

echo "[$(date)] 启动实验: $EXP_NAME" | tee -a "$LOG_FILE"

python -u train.py \
    --exp_name "$EXP_NAME" \
    --epochs 100 \
    2>&1 | tee -a "$LOG_FILE"

echo "[$(date)] 实验结束: $EXP_NAME" | tee -a "$LOG_FILE"
```

`set -euo pipefail` 是 Shell 脚本最重要的第一行：没有它，数据预处理失败后训练脚本会拿着空数据继续跑，几小时后才发现输出全是 NaN。`tee` 让日志同时到屏幕和文件，调试体验和留档两不误。

## 定时任务与数据传输

**cron 定时任务**：`crontab -e` 添加一行，比如每天凌晨 4 点跑清理：

```bash
0 4 * * * /home/zack/cleanup.sh >> /home/zack/logs/cron.log 2>&1
```

注意 cron 的环境变量和你登录的 shell 完全不同，脚本里**所有路径必须写绝对路径**，conda 环境也要在脚本里显式 activate，这是新手踩坑率最高的地方。

**rsync 传数据**：scp 传大文件夹中断后要从头再来，rsync 支持断点续传和增量同步：

```bash
# 把本地数据集推到服务器，-a 保持属性，-v 显示过程，-z 压缩，-P 断点续传+进度
rsync -avzP ./dataset/ zack@server:~/datasets/mydataset/
# 反向把训练结果拉回本地
rsync -avzP zack@server:~/checkpoints/ ./checkpoints/
```

## 踩坑与排查

| 症状 | 可能原因 | 排查方法 |
| --- | --- | --- |
| SSH 断了训练就停 | 进程挂在 SSH 会话下 | 改用 tmux 或 nohup，检查 `ps -ef` 的 TTY 列 |
| 日志文件是空的 | print 缓冲未刷新 | `python -u` 或 logging；`tail -f` 实时观察 |
| 训练半夜被杀 | OOM 或管理员清理 | `dmesg \| grep -i oom` 查 OOM killer 记录 |
| cron 脚本不执行 | 环境变量缺失/相对路径 | 全部改绝对路径，先手动 `bash script.sh` 验证 |
| 磁盘突然满了 | checkpoint 不删/日志膨胀 | `du -sh */` 定位，部署自动清理脚本 |
| 显存占用 100% 但利用率 0% | 进程僵死没释放显存 | `nvidia-smi` 找到 PID 后 `kill -9` |

## 动手练习

1. 写一个 `gpu_guard.sh`：每分钟检查 GPU 利用率，连续 10 分钟为 0 就把训练 PID 和现场信息追加到报警日志。
2. 用 tmux 跑一个故意写死循环的脚本，detach、退出 SSH、重连 attach，验证输出无损。
3. 给你的训练脚本加上 `set -euo pipefail` 和时间戳日志，人为制造一个预处理错误，观察脚本是否立即退出且日志完整。

## 面试常问

**Q：nohup、&、tmux、setsid 有什么区别？**
`&` 只放后台，进程仍属于当前会话；nohup 让进程忽略 SIGHUP，但还在会话里；setsid 让进程成为新会话的 leader，彻底脱离终端；tmux 则是造了一个持久的伪终端，支持随时 attach 交互，功能最全。生产训练首选 tmux，批量无人值守任务用 nohup 或 setsid。

**Q：怎么查一个训练任务为什么变慢？**
自顶向下四层：`nvidia-smi` 看 GPU 利用率（低则瓶颈在数据加载），`htop` 看 CPU 和内存（dataloader worker 是否够），`iostat` 或 `df -h` 看磁盘 IO 和空间，最后看日志里每个 step 的时间分布。绝大多数「变慢」是数据管线或磁盘问题，不是模型问题。

运维不是 AI 研究的主角，但它决定了你的实验是「跑完」还是「跑了个寂寞」。把这些脚本沉淀下来，是每个研究者从手工时代进入工业化时代的标志。

**相关阅读**：[Linux 与 Python 环境基础](/posts/linux-python-environment-basics/)、[Git 版本控制](/posts/ai-research-eng-02-git-version-control/)、[Docker 与 CI/CD](/posts/research-data-mgmt-04-docker-cicd/)。
