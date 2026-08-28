---
title: "Linux + Python 环境基础：从零配好一套能干活的 AI 开发环境"
date: 2026-08-27T09:00:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "把 Linux 常用命令和 Python 环境管理放在一起讲透：文件与进程操作、权限、包管理、venv/pip、SSH 远程开发，以及我在配环境时踩过的坑。"
tags: ["Linux", "Python", "开发环境", "venv", "SSH"]
categories: ["Python", "编程基础"]
math: false
---

学 AI 工程，第一道坎往往不是模型，而是环境。我自己的体会是：模型代码写错了，报错信息会告诉你哪一行；环境配错了，报错信息经常是误导性的——`ModuleNotFoundError` 背后可能是装错了 Python 版本，`Permission denied` 背后可能是根本不存在的 sudo 习惯。

这篇把 Linux 和 Python 环境管理合在一起讲，因为在真实的 AI 开发里它们从来分不开：训练在 Linux 服务器上跑，代码用 Git 拉，依赖用 pip 装，数据用命令行搬。Windows 本地写代码、Linux 远程跑任务，是我目前最顺手的组合。

> 前置阅读：[Python 编程从入门到精通全指南](/posts/python-guide-from-beginner-to-advanced/)。本文假设你已经会写基础 Python，重点在"环境"而不是"语法"。

## Linux 先掌握这 20% 的命令

Linux 命令有成百上千个，但日常开发 80% 的场景只用得到一小撮。我按使用频率分组整理，每组都给出我真实在用的写法。

### 文件与目录

```bash
# 看目录：-l 详细信息，-h 人类可读的大小，-t 按时间排序
ls -lht

# 进目录、回上级、回家目录
cd /data/projects && cd .. && cd ~

# 复制整个项目目录（-r 递归），移动/重命名
cp -r myproject myproject.bak
mv old_name new_name

# 删除：先把命令打出来看一眼再执行，是我的肌肉记忆
rm -rf ./build_tmp

# 找文件：按名字找，按内容找
find . -name "*.py" -mtime -7        # 7 天内改过的 py 文件
grep -rn "learning_rate" ./configs/  # 在 configs 里搜内容
```

`find` 和 `grep` 是排查问题的两把刀。模型加载路径不对？`find / -name "*.pt" 2>/dev/null` 直接全盘找。配置里的参数没生效？`grep -rn` 确认到底哪个文件在读。

### 进程与资源

训练挂住、显存爆满、端口被占，是 AI 开发的家常便饭：

```bash
# 看谁占着 GPU 和内存
nvidia-smi
ps aux --sort=-%mem | head -10

# 杀进程：先优雅（TERM），不行再强杀（KILL）
kill <PID>
kill -9 <PID>

# 端口被谁占了（启动 FastAPI 前必查）
lsof -i :8000

# 磁盘还剩多少，哪个目录最胖
df -h
du -sh ./* | sort -rh | head -5
```

有一次训练脚本卡死，界面没任何输出。`ps aux | grep python` 发现进程还在，`nvidia-smi` 显示显存占着但利用率 0%——典型的 DataLoader 死锁，加 `num_workers=0` 验证后果然通了。不会看进程状态，这种问题只能重启碰运气。

### 权限：看懂 drwxr-xr-x

`ls -l` 输出开头那一串 `drwxr-xr-x`，拆成四段看：文件类型（d 目录 / - 文件）、属主权限、属组权限、其他人权限。r=4、w=2、x=1，所以 `chmod 755 script.sh` 就是"属主全权、其他人可读可执行"。

```bash
chmod +x run_train.sh     # 给脚本加执行权限
chmod -R 755 ./scripts/
chown -R $USER:$USER ./data/   # 把目录所有者改回自己
```

一个常见误区：动不动 `sudo pip install`。这会把包装进系统 Python 的 site-packages，污染系统环境，后患无穷。正确做法是下面要讲到的虚拟环境。

### 软件安装与包管理

Ubuntu/Debian 系用 apt，CentOS 系用 yum/dnf。装系统级工具：

```bash
sudo apt update && sudo apt install -y git curl htop tmux build-essential
```

`build-essential` 容易被忽略，但很多 Python 包（比如某些需要编译的依赖）没有它就装不上，报错信息还常常指向八竿子打不着的地方。

## Python 环境：一个项目一个 venv

Python 环境管理的核心原则只有一条：**永远不要把项目依赖装进全局 Python**。我现在的固定动作：

```bash
# 在项目目录里创建虚拟环境
python3 -m venv .venv

# 激活（Linux/macOS）
source .venv/bin/activate

# 激活后，pip 装的包都只存在于 .venv 里
pip install torch pandas scikit-learn

# 冻结依赖，别人（或服务器）一键复现
pip freeze > requirements.txt

# 退出
deactivate
```

`.venv` 要加进 `.gitignore`——它是本地产物，进仓库只会让仓库膨胀。该进仓库的是 `requirements.txt`。

### 多 Python 版本怎么办

系统自带的 Python 往往是旧版本（比如 Ubuntu 22.04 自带 3.10），而新项目想要 3.12。两条路：

- **pyenv**：编译安装多版本 Python，用 `pyenv local 3.12` 给项目钉死版本。适合长期折腾环境的机器。
- **uv / 直接装 python3.12 包**：`sudo apt install python3.12 python3.12-venv`，然后 `python3.12 -m venv .venv`。简单直接，服务器上我通常走这条路。

### pip 的实战细节

```bash
# 国内装包慢，临时换镜像
pip install pandas -i https://pypi.tuna.tsinghua.edu.cn/simple

# 装指定版本（复现实验时版本对齐很重要）
pip install torch==2.3.1

# 查看某个包到底装了什么版本、依赖谁
pip show pandas
pipdeptree -p pandas    # 需要 pip install pipdeptree
```

版本冲突是常态。比如 `pip install A` 之后 `pip install B`，B 悄悄把 A 依赖的 numpy 升级了，A 就炸了。我的习惯是：建环境时把所有要装的包写在同一条 `pip install` 命令里，让解析器一次性解出版本组合，比一次次追加安装稳定得多。

## SSH 远程开发：本地写、远程跑

AI 开发的常态是 GPU 在远程服务器上。我的远程工作流：

```bash
# 登录
ssh user@server-ip

# 传文件：本地到服务器
scp -r ./dataset user@server-ip:/data/

# 大目录同步用 rsync：断点续传，只传差异，-z 压缩
rsync -avz --progress ./project/ user@server-ip:/data/project/
```

两个让远程体验质变的东西：

**SSH config 免记 IP。** 在本地 `~/.ssh/config` 写：

```
Host gpu-server
    HostName 192.168.1.100
    User zhang
    IdentityFile ~/.ssh/id_ed25519
```

之后 `ssh gpu-server` 直连，VS Code Remote-SSH 也能认出这个别名。

**tmux 防断线。** SSH 一断，前台跑的训练进程跟着死。tmux 让任务跑在服务器端的会话里：

```bash
tmux new -s train      # 新建会话跑训练
# 按 Ctrl+B 再按 D 脱离会话，本地关机都不影响
tmux attach -t train   # 下次回来接上
tmux ls                # 看有哪些会话
```

我吃过亏：一次 6 小时的训练跑到第 5 小时，笔记本合盖断网，进程被杀，重来。从此所有长任务先开 tmux。

## 环境检查脚本：一分钟体检

新机器到手，我会先跑一遍这个脚本确认环境状态：

```bash
#!/bin/bash
echo "== OS ==";    uname -a
echo "== Python =="; python3 --version; which python3
echo "== pip ==";   pip --version 2>/dev/null
echo "== GPU ==";   nvidia-smi --query-gpu=name,memory.total --format=csv 2>/dev/null || echo "无 NVIDIA GPU"
echo "== 磁盘 ==";  df -h / | tail -1
echo "== 内存 ==";  free -h | head -2
```

存成 `env_check.sh`，`chmod +x` 之后随手一跑，机器底细一目了然。排查"为什么在我机器上能跑"这类问题，第一步就是对比两边这个脚本的输出。

## 踩坑排查清单

| 症状 | 常见原因 | 处理 |
|---|---|---|
| `ModuleNotFoundError` 但明明 pip install 过 | 装到了别的 Python 环境 | `which python` 和 `pip -V` 对比路径 |
| `Permission denied` 跑脚本 | 没有执行权限 | `chmod +x`，或 `bash script.sh` |
| `pip install` 编译报错 | 缺系统编译工具 | `sudo apt install build-essential python3-dev` |
| 服务器上训练中途消失 | SSH 断连杀了前台进程 | 用 tmux 或 `nohup ... &` |
| `CUDA out of memory` 但 nvidia-smi 看着有空 | 有僵尸进程占显存 | `nvidia-smi` 找 PID 后 `kill` |
| 明明改了代码却没生效 | 运行的是另一个目录的同名脚本 | `which`/`find` 确认实际执行路径 |
| requirements.txt 装上还是报错 | 锁了版本但没锁 Python 版本 | 记录 Python 版本，必要时换 pyenv 管理 |

## 练习

1. 在你自己的机器（或 WSL）上创建 `env-lab` 目录，建 venv，装 `pandas`，`pip freeze` 生成 requirements.txt，然后删掉 venv 用 requirements.txt 完整复现一次。
2. 用 `find` + `grep` 组合，找出 home 目录下所有包含字符串 `TODO` 且 7 天内修改过的 `.md` 文件。
3. 写一个 tmux 会话，里面跑 `python -c "import time; [time.sleep(60) for _ in range(10)]"`，脱离会话、退出 SSH、重新登录并接回，确认进程还活着。
4. 用 rsync 把本地一个包含 100 个小文件的目录同步到另一台机器（或本机另一个目录），改动其中 2 个文件再同步一次，观察只传了哪几个文件。

## 面试常问

**Q：虚拟环境解决了什么问题？**
隔离项目依赖。不同项目对同一个包的版本要求可能冲突（A 要 numpy 1.x，B 要 2.x），全局环境只能装一个版本；venv 给每个项目一份独立的 site-packages 和独立的解释器入口，互不干扰，配合 requirements.txt 还能精确复现。

**Q：`pip freeze > requirements.txt` 有什么坑？**
它会冻结当前环境里所有包（包括间接依赖），但锁不住 Python 版本和系统级依赖；而且如果环境里混着手工装的无关包，也会一并写进去。更干净的做法是手工维护顶层依赖 + 用 `pip-compile` 或 uv 生成锁定文件。

**Q：SSH 断开后如何让任务继续跑？**
tmux/screen 开服务端会话，或 `nohup cmd > out.log 2>&1 &` 后台运行并脱离终端；生产环境更推荐用 systemd 或任务队列管理，而不是裸 nohup。

**Q：chmod 755 和 644 分别什么含义？**
755 = 属主 rwx、组 rx、其他 rx，常用于可执行文件和目录；644 = 属主 rw、组 r、其他 r，是普通文本文件的常规权限。

**Q：怎么看一个 Python 进程到底在用哪个解释器、加载哪个包？**
`ps aux | grep python` 看命令行；进 `/proc/<PID>/` 看 `exe` 软链指向的解释器；程序内 `import sys; print(sys.executable)` 最直接。

---

环境这块的内容看起来琐碎，但它是所有上层工作的地基。地基建歪一次，后面每个项目都要为它还债。下一篇我们进入数据分析的主战场：[Pandas 数据分析与可视化：从读表到出图的一条龙实战](/posts/pandas-data-analysis-visualization/)。
