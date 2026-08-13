---
title: "AtlasSplit 错误类型分布分析：LLM 生成代码到底会在哪里翻车"
date: 2026-08-13T00:00:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "基于 AtlasSplit Audit Replay 日志，对 LLM 生成的 Pandas 代码进行错误类型分布分析，揭示各类型错误的占比、自愈成功率差异，以及对 Prompt 工程和系统设计的启示。"
tags: ["LLM Agent", "错误分析", "Pandas", "代码生成", "AtlasSplit"]
categories: ["AI安全", "系统设计"]
---

[上一篇](/posts/atlassplit-ast-audit-sandbox/)聊了 AST 审计、沙箱和自愈重试的设计。

那篇文章写完后，有人问我一个问题：

> 你说自愈成功率 94%，那剩下 6% 是怎么失败的？

当时我答不上来。

因为 94% 是一个平均值，我没有拆开看过每个失败 Case 到底错在哪。

这个问题一直记在心里。

后来 AtlasSplit 累积了足够多的 Audit Replay 日志，我终于可以做一件事了：

> **把所有错误拆开分类，看 LLM 生成代码到底在哪里翻车。**

结果出来后，有些发现完全出乎我意料。

---

## 一、数据来源：Audit Replay 日志

之前的设计文章里提到过，AtlasSplit 每次任务都会记录完整链路：

```text
runs/
├── 20260601_001/
│   ├── input_summary.json
│   ├── user_rule.txt
│   ├── generated_code_v1.py
│   ├── ast_audit_v1.json
│   ├── runtime_error_v1.txt
│   ├── generated_code_v2.py    # 修复后的代码
│   ├── ast_audit_v2.json
│   ├── output_validation.json
│   └── final_result.xlsx
├── 20260601_002/
│   └── ...
└── ...
```

这次分析用的是 2026 年 3 月到 7 月的全部日志。

总量：

```text
任务数：1,247
代码生成总次数（含修复）：1,612
首次执行成功：1,053（84.4%）
经修复后成功：536 → 其中成功 124（修复成功率 72.9%）
最终失败：70（总体失败率 5.6%）
```

注意区分两个数字：

- **首次成功率** 84.4%：LLM 第一次生成的代码直接跑通。
- **最终成功率** 94.4%：经过最多两轮修复后跑通。

差值就是 Repair Loop 的贡献。

但这篇文章的重点不是成功率。

而是：

> **那 1,247 次任务里，所有出现过的错误，到底是什么类型？分布如何？哪些能修，哪些修不了？**

---

## 二、错误分类体系

我先跑了所有 `runtime_error_v1.txt` 和 `ast_audit_v1.json`，然后人工逐条分类。

最终形成了 8 个大类：

| 编号 | 错误类型 | 说明 | 典型异常 |
|------|---------|------|---------|
| E1 | 列名/字段不匹配 | LLM 猜错了列名 | `KeyError: '部门名称'` |
| E2 | 数据类型错误 | 对错误类型做运算 | `TypeError` / `ValueError` |
| E3 | 业务逻辑错误 | 公式或聚合方式不对 | 无异常，但结果错误 |
| E4 | API 误用 | 用了错误的 Pandas 方法 | `AttributeError` |
| E5 | 边界条件 | 空表、NaN、除零 | `ZeroDivisionError` / 空DataFrame |
| E6 | 安全策略拦截 | AST 审计拒绝 | `SecurityPolicyViolation` |
| E7 | 资源限制 | 超时或内存溢出 | `TimeoutError` / OOM Kill |
| E8 | 输出验证失败 | 代码跑通但结果不对 | `ValidationFailed` |

其中 E1-E5 是运行时错误，E6 是静态审计错误，E7 是系统层错误，E8 是业务验证错误。

这 8 类几乎覆盖了所有观察到的失败模式。

---

## 三、错误分布全景

1,247 个任务中，首次执行出现错误的有 194 个（15.6%）。

按类型分布：

```text
E1 列名/字段不匹配   ████████████████████  62 (32.0%)
E2 数据类型错误      ████████              26 (13.4%)
E3 业务逻辑错误      ███████               23 (11.9%)
E4 API 误用          ██████                19 ( 9.8%)
E5 边界条件          █████                 17 ( 8.8%)
E6 安全策略拦截      ████                  15 ( 7.7%)
E7 资源限制          ██                     7 ( 3.6%)
E8 输出验证失败      █████████████         25 (12.9%)
```

还有 4 个是上述分类不清晰的混合错误。

几个关键数字：

> **E1（列名不匹配）一个类型就占了近三分之一。**

> E1 + E2 + E4 合起来超过 55%——都是"代码写出来了但跑不通"的类型。

> E3 + E8 合起来约 25%——代码跑通了但业务结果不对。

> E6（安全拦截）只有 7.7%——说明 LLM 大多数时候不会主动生成危险代码。

---

## 四、各类型错误深度分析

### E1：列名/字段不匹配（32.0%）

这是绝对的 No.1。

典型场景：

用户说：

> "按部门名称汇总销售额。"

Excel 里的列名是：

```text
部门
```

LLM 生成：

```python
df.groupby("部门名称")["销售额"].sum()
```

直接 `KeyError`。

为什么这么频繁？

因为 LLM 根据自然语言"猜"列名。

用户说的"部门名称"在 Excel 里可能叫"部门""部门名""dept_name""科室"——变体太多了。

更麻烦的是，同一个 LLM 在不同 Prompt 下对同一个表头猜测结果还不一样。

**修复策略：**

后来我在 Prompt 里加入了表结构注入：

```text
## 可用列名
- 部门 (str)
- 销售额 (float64)
- 月份 (datetime64)
- 成本中心 (str)
```

E1 的发生率从 32% 降到了 14%。

但还是没法完全消除——因为有时候用户描述的概念和列名确实有语义距离。

---

### E2：数据类型错误（13.4%）

典型场景：

```python
df["ratio"] = df["revenue"] / df["count"]
```

但 `revenue` 列里有字符串 `"N/A"`。

```text
TypeError: unsupported operand type(s) for /: 'str' and 'int'
```

或者日期列被读成字符串，直接做比较：

```python
df[df["日期"] > "2025-01-01"]
```

结果排序完全乱掉。

**这类错误的特点是：LLM "以为"列是数值类型，但实际不是。**

和 E1 类似，根因也是信息不对称——LLM 不知道实际数据长什么样。

**修复策略：**

在表结构注入时增加类型信息和样例值：

```text
## 可用列名
- 部门 (str): ["研发部", "销售部", ...]
- 销售额 (object): [15000.0, "N/A", 23000.0, ...]
- 月份 (object): ["2025-01", "2025-02", ...]
```

注意 `销售额` 的类型是 `object` 而不是 `float64`——因为混入了字符串。

LLM 看到这个信息后，会主动加类型转换：

```python
df["销售额"] = pd.to_numeric(df["销售额"], errors="coerce")
```

---

### E3：业务逻辑错误（11.9%）

这是最隐蔽的一类。

代码跑通了，没有异常。

但结果是错的。

典型场景：

用户说：

> "按销售额权重分摊，但研发部至少 15%。"

LLM 生成：

```python
df["ratio"] = df["sales"] / df["sales"].sum()
df["allocated"] = df["ratio"] * total_cost
# 研发部保底 15%
df.loc[df["dept"] == "研发部", "allocated"] = max(
    df.loc[df["dept"] == "研发部", "allocated"].values[0],
    total_cost * 0.15
)
```

逻辑看起来对。

但问题是：给研发部补到 15% 之后，其他部门的分摊总额超过了 85%。

总额对不上。

**这类错误 AST 审计查不出来，运行时不报错，只有 Output Validator 能抓到。**

如果 Output Validator 只检查"分摊总和 = 原始金额"，而不检查"保底/封顶逻辑是否正确执行"，这类错误甚至能蒙混过关。

**修复策略：**

在 Output Validator 中增加业务规则校验：

```python
# 检查保底
if "min_ratio" in rule:
    actual = result.loc[result["dept"] == "研发部", "allocated"].values[0]
    expected_min = total_cost * rule["min_ratio"]
    assert actual >= expected_min - tolerance
```

同时，在 Prompt 中明确提醒：

```text
注意：保底/封顶调整后，需要重新分配其他部门的金额，确保总和不变。
```

---

### E4：API 误用（9.8%）

典型场景：

```python
# 想要按列求和
df.sum(axis=1)  # 实际是按行求和
```

或者：

```python
# 想要保留两位小数
df.round(2)  # 但忘了 inplace 或没赋值
```

再或者：

```python
# 想要左连接
pd.merge(df1, df2, on="dept")  # 默认 inner join，丢数据
```

这类错误说明 LLM 对 Pandas API 的理解有时候会"差一点"。

尤其是 `axis` 参数、`inplace` 参数、`how` 参数这种"默认值不对就会出错"的地方。

**修复策略：**

两个办法：

1. **Repair Loop 天然适合修这类错误。** 因为报错信息通常很明确（`AttributeError: 'DataFrame' object has no property ...`），LLM 第二次基本能改对。E4 的自愈成功率是所有类型里最高的。

2. **在 Prompt 里加入常见 API 陷阱提醒：**

```text
## Pandas 注意事项
- merge 默认是 inner join，如需保留全部数据请指定 how="left"
- round() 不修改原对象，需要赋值
- sum(axis=0) 是列求和，sum(axis=1) 是行求和
```

---

### E5：边界条件（8.8%）

典型场景：

```python
df["ratio"] = df["sales"] / df["sales"].sum()
```

当 `df["sales"].sum() == 0` 时：

```text
ZeroDivisionError
```

或者：

```python
result = df.groupby("dept").agg({"amount": "sum"})
```

当某个部门不在数据里时，`groupby` 不会报错，但结果缺少该部门——后续 `Output Validator` 发现行数不对。

再或者：

```python
df.fillna(0, inplace=True)
```

看起来没问题。但如果 `NaN` 出在主键列，`fillna(0)` 会导致主键变成 `0`，后续 `merge` 时主键冲突。

**这类错误很难在 Prompt 层面预防，因为边界情况千变万化。**

**修复策略：**

主要依赖 Output Validator + Repair Loop。

自愈成功率中等——LLM 看到 `ZeroDivisionError` 后通常知道加 `if total == 0: return ...`，但如果是"主键变 0"这种隐蔽问题，LLM 不一定能从 Validator 的报错信息里推断出来。

---

### E6：安全策略拦截（7.7%）

这类错误不是"代码写错了"，而是"代码写了不该写的东西"。

典型场景：

```python
# LLM 想读取额外文件
df2 = pd.read_excel("/data/config.xlsx")
```

AST 审计直接拒绝：访问了 workspace 外的路径。

或者：

```python
# LLM 想用 openpyxl 做格式美化
from openpyxl.styles import PatternFill
```

如果 `openpyxl.styles` 不在白名单里，审计拒绝。

**有意思的是，E6 里大约 40% 是"LLM 没有恶意，只是想完成任务但用了不允许的方式"。**

比如它想给 Excel 加格式 → 用了 `openpyxl.styles` → 被拦。

这说明：

> **安全策略的粒度需要根据实际业务需求持续调整。**

不是所有被拦截的代码都"危险"，有些只是"超出当前白名单"。

**修复策略：**

区分"危险"和"超范围"：

```python
class SecurityPolicyViolation(Exception):
    def __init__(self, code, reason, severity):
        self.severity = severity  # "dangerous" vs "out_of_scope"
```

对于 `out_of_scope`，走 Repair Loop，告诉 LLM "不允许使用 xxx，请用允许的库实现"。

对于 `dangerous`，直接终止任务，不修复。

---

### E7：资源限制（3.6%）

典型场景：

```python
# LLM 生成了 O(n²) 的操作
for i in range(len(df)):
    for j in range(len(df)):
        if df.iloc[i]["dept"] == df.iloc[j]["dept"]:
            ...
```

5000 行的表，`O(n²)` 就是 2500 万次循环 → 超时。

或者：

```python
# LLM 不断 concat
result = pd.DataFrame()
for chunk in chunks:
    result = pd.concat([result, chunk])
```

`pd.concat` 在循环里调用会产生大量临时对象 → 内存溢出。

**这类错误占比不高，但一旦发生影响很大——直接 Kill Worker，用户看到的是"任务异常终止"。**

**修复策略：**

超时后 Repair Loop 的提示要非常具体：

```text
ExecutionTimeout: 代码执行超过 30 秒限制。
请检查是否存在低效操作：
- 避免在循环中逐行操作 DataFrame
- 避免在循环中 pd.concat
- 优先使用向量化操作
```

LLM 看到这个提示后，通常能把循环改成 `groupby` 或 `merge`。

---

### E8：输出验证失败（12.9%）

代码跑通了，`exit code = 0`。

但 Output Validator 发现：

- 分摊总额和原始金额不一致；
- 某些部门被遗漏；
- 结果列数不对；
- 出现了 NaN；
- 主键重复。

**E8 是第二大的错误类型。**

这说明：

> **"代码能跑"和"结果正确"之间有巨大的鸿沟。**

E8 和 E3 的区别在于：

- E3 是业务逻辑错误，需要人工或更复杂的 Validator 才能发现。
- E8 是结构性错误，Validator 用规则就能抓到。

**修复策略：**

E8 的自愈成功率比较高（68%），因为 Validator 的报错信息很具体：

```text
ValidationFailed: 分摊总额 (98,500) 不等于原始金额 (100,000)，差额 1,500。
请检查是否有部门被遗漏或计算错误。
```

LLM 看到"差额 1,500"后，通常能定位到是哪个部门的计算出了问题。

---

## 五、自愈成功率：哪些错能修，哪些修不了

这是我最感兴趣的分析。

1,247 个任务中，首次失败后进入 Repair Loop 的有 194 个。

按错误类型的自愈成功率：

| 错误类型 | 进入修复数 | 修复成功数 | 自愈成功率 |
|---------|-----------|-----------|-----------|
| E1 列名不匹配 | 62 | 51 | **82.3%** |
| E2 数据类型错误 | 26 | 19 | 73.1% |
| E3 业务逻辑错误 | 23 | 9 | **39.1%** |
| E4 API 误用 | 19 | 16 | **84.2%** |
| E5 边界条件 | 17 | 11 | 64.7% |
| E6 安全策略拦截 | 15 | 10 | 66.7% |
| E7 资源限制 | 7 | 4 | 57.1% |
| E8 输出验证失败 | 25 | 17 | 68.0% |

几个关键发现：

**1. E4（API 误用）自愈成功率最高（84.2%）。**

这不意外。API 误用的报错信息通常最明确——`AttributeError` 直接告诉 LLM 哪个方法不存在，LLM 改对方法的概率很高。

**2. E3（业务逻辑错误）自愈成功率最低（39.1%）。**

这也不意外。业务逻辑错误往往不报运行时异常，LLM 收到的反馈是"结果不对"——但这种反馈太模糊了。

LLM 不知道"哪里不对"，只能重新猜一遍，猜对的概率自然不高。

**3. E1（列名不匹配）自愈成功率 82.3%——比我想的高。**

原因是修复时我在反馈中加入了实际的列名列表：

```text
KeyError: '部门名称'
可用列名: ['部门', '销售额', '月份', '成本中心']
最接近的列名: '部门'
```

LLM 看到"最接近的列名"后，几乎都能改对。

**4. E7（资源限制）自愈成功率 57.1%——比我想的高。**

超时类错误我以为 LLM 很难修——毕竟"代码太慢"不像"列名错了"那么直观。

但实际上，Repair Loop 的提示里包含了具体的性能建议（避免循环、避免 concat），LLM 照着改就行。

---

## 六、一个意外的发现：错误会"迁移"

分析修复后的代码时，我发现一个有趣的模式：

> **修复一种错误时，LLM 有时候会引入另一种错误。**

具体来说，在 194 个修复案例中：

```text
修复后引入了新类型错误：23 个（11.9%）
```

其中最常见的"错误迁移"路径：

| 原始错误 | 迁移到 | 次数 | 示例 |
|---------|--------|------|------|
| E1 → E2 | 列名修对了，但忘了处理类型 | 7 | 改对了列名，但没做 `to_numeric` |
| E5 → E4 | 修了边界条件，但用错了 API | 5 | 加了 `if total == 0` 检查，但用了 `df.where` 而不是 `df.mask` |
| E8 → E3 | 通过了结构验证，但业务逻辑变差 | 4 | 补齐了缺失部门，但保底逻辑被改坏 |
| E6 → E5 | 换了允许的库，但引入了空值问题 | 4 | 从 `openpyxl` 换到 `pandas`，但处理 NaN 的方式变了 |
| 其他迁移 | — | 3 | — |

这说明：

> **Repair Loop 的"改了再验"机制是必要的——不能只修一轮就信任。**

尤其是 E8 → E3 这种迁移最危险：结构验证过了，但业务逻辑更差了。如果 Validator 不够细致，这种"修出新 bug"的情况可能蒙混过关。

---

## 七、对 Prompt 工程的启示

错误分布出来后，我回头改了 Prompt。

改法完全数据驱动——哪类错误最多，就在 Prompt 里补哪类信息。

### 改进 1：注入表结构（针对 E1 + E2）

改前：

```text
以下是用户的需求：...
请生成 Pandas 代码。
```

改后：

```text
## 输入表结构
Sheet1 (df):
  - 部门 (str): ["研发部", "销售部", "市场部", ...]
  - 销售额 (object): [15000.0, "N/A", 23000.0, ...]
  - 月份 (object): ["2025-01", "2025-02", ...]

## 用户需求
...

## 注意事项
- 列名必须与上方完全一致
- "销售额"列包含非数值数据，使用前请转换类型
```

效果：E1 + E2 合计占比从 45.4% 降到 22.1%。

### 改进 2：注入 API 陷阱提醒（针对 E4）

```text
## Pandas 常见陷阱
- merge 默认 inner join，需要保留全部数据时用 how="left" 或 "outer"
- round() 返回新对象，不修改原对象
- fillna() 同理，需要赋值或 inplace=True
- sum(axis=0) 按列求和，sum(axis=1) 按行求和
- iloc 按位置索引，loc 按标签索引
```

效果：E4 占比从 9.8% 降到 5.2%。

### 改进 3：明确输出约束（针对 E8）

```text
## 输出要求
- 结果必须包含所有原始部门，不得遗漏
- 分摊总额必须等于原始金额（允许 0.01 容差）
- 主键列不得出现 NaN 或重复值
- 数值列保留两位小数
```

效果：E8 占比从 12.9% 降到 7.8%。

### 改进 4：安全白名单透明化（针对 E6）

```text
## 允许使用的库
- pandas (as pd)
- numpy (as np)
- openpyxl（仅 Workbook / load_workbook）

## 不允许
- 读写 workspace 以外的文件
- 访问网络
- 调用系统命令

如需功能超出以上范围，请在注释中说明，系统会评估是否放宽限制。
```

效果：E6 从 7.7% 降到 3.1%。

LLM 知道边界后，就不会去碰那些"看起来能做但实际被禁止"的操作了。

---

## 八、对系统设计的启示

### 1. Output Validator 比 AST 审计更重要

从数据看：

- AST 审计拦截了 7.7% 的错误。
- Output Validator 拦截了 12.9% 的错误。

如果把 E3（业务逻辑错误）也算上——那些"跑通但逻辑不对"的案例——Validator 能抓到的问题远多于 AST。

不是说 AST 不重要。

而是说：

> **AST 防的是"不能跑的危险代码"，Validator 防的是"能跑但结果不对的代码"。**

后者在真实业务中更常见。

### 2. Repair Loop 的反馈信息质量决定自愈成功率

对比自愈成功率最高（E4: 84.2%）和最低（E3: 39.1%）的两种错误：

- E4 的报错信息：`AttributeError: 'DataFrame' object has no attribute 'to_excle'` → 非常具体。
- E3 的报错信息：`ValidationFailed: 结果不正确` → 非常模糊。

这说明：

> **自愈成功率与反馈信息的具体程度高度正相关。**

后来我改了 Validator 的报错格式，从"结果不对"改成：

```text
ValidationFailed:
  - 检查项: 分摊总额一致性
  - 期望值: 100,000.00
  - 实际值: 98,500.00
  - 差额: 1,500.00
  - 可能原因: 某些部门被遗漏或计算公式有误
```

E3 的自愈成功率从 39.1% 升到了 52%。

虽然还是最低，但至少好了一些。

### 3. 两轮修复上限是合理的

数据显示，第二轮修复的成功率骤降：

```text
第一轮修复成功率：72.9%
第二轮修复成功率：31.4%
```

说明如果 LLM 改了两轮还没改对，第三轮大概率也改不对。

这时候应该：

> **放弃自动修复，转人工处理。**

而不是无限重试。

---

## 九、最后：分布分析改变了我的设计哲学

做完这次分析后，我对 AtlasSplit 的设计优先级有了新的认识。

以前我认为优先级是：

```text
AST 审计 > 沙箱 > Repair Loop > Output Validator
```

现在我认为是：

```text
Output Validator > Repair Loop > 表结构注入 > AST 审计 > 沙箱
```

不是说安全不重要。

而是在真实业务中：

> **"代码结果不对"比"代码有安全风险"出现得频繁十倍。**

安全是底线——它保证了系统不会被搞垮。

但 Validator 和 Repair Loop 是上限——它们决定了系统到底有多好用。

两个都要。

但如果资源有限，先做哪个，数据已经给了答案。

---

> 相关文章：
> - [AtlasSplit Agent 的 AST 审计与沙箱设计](/posts/atlassplit-ast-audit-sandbox/)
> - [AtlasSplit 开发笔记：一个实用小工具的设计思路](/posts/atlassplit-dev-notes/)
