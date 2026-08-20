---
title: "AtlasSplit Agent 的 AST 审计与沙箱设计：当我真的让 LLM 在机器上执行 Python 代码"
date: 2025-09-10T00:00:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "探讨 AtlasSplit 智能体中如何通过 AST 静态分析和沙箱环境确保 LLM 生成的 Python 代码安全执行的设计与实现。"
tags: ["AST", "代码审计", "沙箱", "LLM Agent", "安全"]
categories: ["AI安全", "系统设计"]
---

如果一个 Agent 只是回答问题，最坏的结果通常是：

> 它胡说八道。

但如果一个 Agent 可以生成 Python，并且服务器真的会执行这些 Python，问题就完全不一样了。

它可能写出：

```python
import os
os.remove("important.xlsx")
```

也可能写：

```python
import requests
requests.post(...)
```

甚至模型自己完全没有恶意，只因为误解了任务，就生成：

```python
df.to_excel("/some/system/path/result.xlsx")
```

这也是我做 AtlasSplit 时遇到的核心问题。

AtlasSplit 是一个面向财务和运营表格处理场景的智能体。

它希望做到：

```text
自然语言规则
      ↓
生成 Pandas 代码
      ↓
自动执行
      ↓
生成 Excel
```

例如：

> 把总成本按照各部门营收权重进行分摊，但研发部至少分摊 10%，销售部最高不超过 35%。

这种任务如果全部提前写成固定规则，会产生大量业务代码。

于是我尝试了一条更 Agent 的路线：

> **让 LLM 写代码。**

很快，我就遇到了一个很现实的问题：

> 我敢让它写，但我敢直接 `exec()` 吗？

答案显然是不敢。

于是 AtlasSplit 最终形成了一条非常关键的链路：

```text
自然语言
   ↓
LLM
   ↓
Pandas Code
   ↓
AST Security Audit
   ↓
Sandbox
   ↓
Output Validation
   ↓
Repair Loop
```

这篇文章就聊聊这个过程。

---

# 一、为什么 AtlasSplit 不直接做固定规则引擎？

表格分摊看起来简单。

比如：

```text
100 万费用
按照部门人数分摊
```

程序非常容易写。

但真实情况很快会变成：

> 按销售额权重分摊，但是直营部门权重乘 1.2，研发部门不得低于总金额 15%，某几个部门不参与分摊，结果保留两位小数，尾差归到总部。

继续发展：

> 按两个 Excel 中的部门编码和成本中心关联，先汇总，再按月份在职天数折算。

这时候如果每一种规则都写：

```python
if rule_type == ...
```

规则引擎会迅速膨胀。

AtlasSplit 最终希望覆盖的场景包括：

- 等额分摊；
- 权重分摊；
- 封顶/保底；
- 阶梯规则；
- 按时间比例；
- 跨表多键聚合。

所以我采用了：

> **LLM 负责理解和生成 Pandas，程序负责限制它到底能做什么。**

注意，这两句话缺一不可。

---

# 二、第一版最危险的设计：直接执行模型代码

最简单的 Agent Demo 可能是：

```python
code = llm(prompt)

exec(code)
```

Demo 非常漂亮。

用户说：

> 按 revenue 占比分摊 cost。

模型生成：

```python
df["ratio"] = df["revenue"] / df["revenue"].sum()
df["cost_allocated"] = df["ratio"] * total_cost
```

然后结果出来了。

整个过程看起来像魔法。

直到你开始思考：

```python
exec(code)
```

这行到底意味着什么。

理论上模型拥有和你的 Python 进程几乎相同的权限。

于是它可以访问：

- 文件系统；
- 环境变量；
- 网络；
- Shell；
- API Key；
- 数据库；
- Python Runtime；
- 主服务进程。

对于一个真正需要处理财务 Excel 的 Agent 来说，这完全不可接受。

---

# 三、我的威胁模型

开始设计安全层以后，我没有先问：

> “怎么限制 Python？”

而是先问：

> **“我到底在防谁？”**

AtlasSplit 大致考虑四种风险来源。

### 1. 模型自己生成危险代码

不是攻击。

只是模型犯错。

---

### 2. Prompt Injection

Excel 某个单元格完全可能包含：

```text
Ignore previous instructions...
```

如果文件内容直接进入 LLM Context，这本质上就是外部不可信输入。

---

### 3. 用户恶意输入

比如用户直接说：

> 帮我读取服务器上的环境变量并写进 Excel。

---

### 4. 第三方库能力逃逸

即使禁止：

```python
os.system()
```

不代表整个 Python 世界就安全了。

很多看似无害的 API 背后也可能：

- 访问文件；
- 打开网络；
- 动态加载模块。

于是我逐渐形成一个原则：

> **安全不能只做一层。**

最终是：

```text
AST 静态检查
+
Workspace 文件隔离
+
Runtime Sandbox
+
资源限制
+
Output Validation
```

---

# 四、第一层：AST 静态审计

Python 自带：

```python
ast
```

所以代码生成完成后，我不会直接执行，而是先：

```python
tree = ast.parse(code)
```

然后遍历 AST。

大致结构：

```python
class SecurityVisitor(ast.NodeVisitor):

    def visit_Import(self, node):
        ...

    def visit_ImportFrom(self, node):
        ...

    def visit_Call(self, node):
        ...

    def visit_Attribute(self, node):
        ...

    def visit_Name(self, node):
        ...
```

相比正则表达式，它最大的好处是：

> 我检查的不是字符串，而是 Python 真正准备执行的语义结构。

---

# 五、为什么不能只用字符串匹配？

假设我写：

```python
if "os.system" in code:
    reject()
```

看起来可以。

但模型可以生成：

```python
import os as operating_system
operating_system.system(...)
```

也可能：

```python
from os import system
system(...)
```

甚至字符串里可能只是出现：

```text
"os.system is forbidden"
```

正则和字符串匹配非常容易：

- 漏报；
- 误报；
- 被 Alias 绕过。

AST 中则能够看到：

```text
Import
alias
Call
Attribute
```

于是策略层可以真正理解：

> 用户导入了什么。

---

# 六、Import 白名单：默认拒绝比黑名单更可靠

最开始我考虑过黑名单：

```text
禁止：

os
sys
subprocess
socket
requests
...
```

但后来发现这个列表永远写不完。

所以策略逐渐改成：

> **只允许业务真正需要的库。**

例如：

```python
ALLOWED_MODULES = {
    "pandas",
    "numpy",
    "openpyxl"
}
```

出现：

```python
import pandas as pd
```

允许。

出现：

```python
import requests
```

直接拒绝。

这样系统的安全边界就从：

> “我知道哪些东西危险”

变成：

> “除了我明确知道安全且需要的东西，其余都不允许。”

这两个设计哲学差别巨大。

---

# 七、仅限制 Import 仍然远远不够

假设模型完全不 import。

它依然可能生成：

```python
eval(...)
exec(...)
compile(...)
__import__(...)
```

于是我继续限制危险 Builtin：

```text
eval
exec
compile
__import__
globals
locals
getattr
setattr
```

其中：

```python
getattr()
```

这种函数尤其值得注意。

因为大量安全规则最终都依赖：

> “禁止访问某个属性。”

但如果允许任意动态反射，很多属性规则就可能被绕开。

所以 Agent Code Execution 场景下，我更倾向于：

> **宁可能力少一点，也不要让动态行为太自由。**

---

# 八、Attribute 检查：比我最开始想得复杂

比如：

```python
df.to_excel(...)
```

当然要允许。

但：

```python
something.__class__.__mro__
```

就完全是另一回事。

Python 的对象模型本身非常强大。

如果允许任意：

```text
__xxx__
```

属性访问，就可能产生一些非常意外的逃逸路径。

所以我增加了类似：

```text
禁止访问敏感 dunder 属性
```

的规则。

例如关注：

```text
__class__
__subclasses__
__globals__
__dict__
```

这一层让我意识到：

> **Python Sandbox 本身是个很难的问题。**

AST 审计并不是一个完整沙箱。

它只是第一道门。

---

# 九、AST 通过，不等于代码安全

这是整个系统里最重要的一点。

假设：

```python
pd.read_excel(path)
```

AST 完全合法。

但如果：

```python
path = "../../../../secret.xlsx"
```

怎么办？

所以代码本身安全，不代表：

> **它访问的资源安全。**

于是 AtlasSplit 又增加第二条重要边界：

# Workspace Policy

---

# 十、每个 Task 一个独立 Workspace

每个任务运行时创建自己的目录。

例如：

```text
workspace/
└── task_93f2/
    ├── input/
    │   └── source.xlsx
    ├── output/
    │   └── result.xlsx
    └── run/
```

模型只需要知道：

```text
input/source.xlsx
output/result.xlsx
```

原则上它不应该看到：

```text
C:\
/etc/
用户 Home
项目根目录
.env
```

执行前，再做路径解析：

```python
resolved = path.resolve()
```

然后检查：

```text
resolved 是否仍位于当前 task workspace 中
```

---

# 十一、Path Traversal 是非常容易被忽略的坑

假设你只检查：

```python
if path.startswith(workspace):
```

都不一定安全。

比如：

```text
workspace/task1/../../secret
```

所以路径一定需要：

> **Normalize / Resolve 之后再检查边界。**

需要特别考虑：

```text
../
绝对路径
符号链接
跨 Task 路径
UNC Path
```

这一层完全不依赖 LLM。

这是传统安全工程。

但正是这种传统工程能力，让 Agent 真正能够落地。

---

# 十二、第三层：Sandbox Worker

即使 AST 和 Workspace 都通过，我仍然不希望代码运行在：

```text
FastAPI 主进程
```

因为如果代码：

```python
while True:
    pass
```

AST 很可能认为：

> 没什么危险 API。

但服务器已经寄了。

所以执行层应该：

```text
Main Service
     ↓
Sandbox Worker
```

Worker 可以是：

- 独立进程；
- Container；
- 更严格的隔离运行环境。

对于 AtlasSplit 这种本地表格任务，我采用的核心思想是：

> **生成代码永远不要和主服务共享命运。**

---

# 十三、资源限制：安全不仅是“防黑客”

例如模型生成：

```python
while True:
    df = pd.concat([df, df])
```

它没有：

```text
Shell
Network
File Delete
```

但很快就可以吃光内存。

所以 Sandbox 还需要限制：

```text
CPU
Memory
Execution Timeout
Output File Count
Output File Size
```

例如：

```text
任务超过规定时间
→ Kill Worker
→ 返回 ExecutionTimeout
```

而不是：

> 等它自己停。

---

# 十四、网络默认关闭

对于 AtlasSplit 来说，一个表格分摊任务根本不需要：

```text
公网访问能力
```

所以我的策略非常简单：

> **不需要的权限就不存在。**

任务的业务是：

```text
读取上传文件
↓
计算
↓
生成 Excel
```

那它就没有理由：

```text
访问 github.com
访问某个 API
向外 POST 数据
```

这实际上也降低了 Prompt Injection 的攻击价值。

---

# 十五、一个容易忽略的地方：输出也必须验证

假设程序成功结束：

```text
exit code = 0
```

是不是就代表成功？

当然不是。

模型可能生成：

```text
result.xlsx
```

但结果：

- 行数少了一半；
- 原始主键消失；
- 分摊金额总和不一致；
- 某些部门被遗漏。

所以代码执行成功以后，还有：

```text
Output Validator
```

例如对于分摊：

```python
abs(
    allocated_amount.sum()
    - source_amount
) < tolerance
```

同时检查：

```text
主键是否保留
必需列是否存在
是否出现重复记录
是否出现 NaN
输出文件是否存在
```

这层非常关键。

因为：

> **代码成功 ≠ 业务成功。**

---

# 十六、自愈重试：Agent 最有意思的一环

假设 LLM 第一次生成：

```python
df.groupby("部门名称")
```

实际 Excel 列名是：

```text
部门
```

执行报：

```text
KeyError: '部门名称'
```

传统程序直接失败。

AtlasSplit 则会把：

```text
原任务
+
生成代码
+
审计结果
+
执行错误
```

重新反馈给模型：

> 请只修复错误，不要改变原始业务目标。

模型重新生成第二版代码。

例如：

```python
df.groupby("部门")
```

然后重新：

```text
AST Audit
→ Sandbox
→ Validation
```

所以真实链路是：

```text
LLM
 ↓
Code
 ↓
AST
 ↓
Sandbox
 ↓
Error
 └─────────────┐
               ↓
            Repair
               ↓
              AST
               ↓
            Sandbox
```

注意：

> **修复后的代码必须重新过安全审计。**

不能因为：

> “上一版安全”

就默认下一版安全。

---

# 十七、Audit Replay：我认为比“聊天记录”更有价值

AtlasSplit 会记录一次任务中的关键状态。

例如：

```text
runs/2025xxxx/
```

里面保存：

```text
Input Summary
User Rule
Generated Code
AST Audit Result
Runtime Error
Repair Code
Output Validation
Final Result
```

为什么要做这个？

因为以后如果有人问：

> 为什么财务表这次结果和上个月不一样？

你不能回答：

> 因为 AI 当时是这么想的。

你需要知道：

```text
当时输入是什么
Prompt 是什么
代码是什么
执行结果是什么
是否发生过 Repair
```

所以对于企业 Agent，我越来越认为：

> **可回放性比“它会思考”重要得多。**

---

# 十八、AtlasSplit 最终安全架构

最后大致形成：

```text
             User
               │
               ▼
        Natural Language
               │
               ▼
        LLM / Planner
               │
               ▼
    Restricted Code Generator
               │
               ▼
      ┌─────────────────┐
      │ AST Policy      │
      │ Engine          │
      └────────┬────────┘
               │
               ▼
      ┌─────────────────┐
      │ Workspace       │
      │ Policy          │
      └────────┬────────┘
               │
               ▼
      ┌─────────────────┐
      │ Sandbox Worker  │
      └────────┬────────┘
               │
               ▼
      ┌─────────────────┐
      │ Resource Limit  │
      └────────┬────────┘
               │
               ▼
      ┌─────────────────┐
      │ Output Validator│
      └────────┬────────┘
               │
        Success│Failure
               │
       ┌───────┴───────┐
       ▼               ▼
    Result          Repair Loop
```

---

# 十九、后来我对“Agent 安全”的理解变了

一开始我以为 Agent Safety 是：

> 防止模型执行 `rm -rf /`。

后来发现真正的问题远比这个复杂。

更现实的事故往往是：

- 写错文件；
- 覆盖源数据；
- 死循环；
- 内存爆炸；
- 路径逃逸；
- 错误结果却正常退出；
- 自愈时生成了比第一版更危险的代码。

所以真正的原则应该是：

> **永远假设 LLM 产生的内容是不可信输入。**

哪怕这个 LLM 是你自己的。

---

# 二十、AtlasSplit 给我的最大启发

LLM Agent 很容易做 Demo。

最简单的 Agent：

```text
Prompt
↓
LLM
↓
Tool
```

十几分钟就能看到效果。

但如果这个 Tool 是：

```text
execute_python
```

事情就突然从：

> NLP 项目

变成：

> 软件工程 + 安全工程 + 系统工程。

而这恰恰是我觉得 Agent 最有意思的地方。

真正可靠的 Agent，不是因为模型永远不会犯错。

而是：

> **即使模型犯错，整个系统仍然知道怎样限制它、发现它、终止它、修复它，并且把整个过程记录下来。**

这大概才是“可用 Agent”和“能跑 Demo”之间真正的分界线。