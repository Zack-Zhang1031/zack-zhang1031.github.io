---
title: "MindTrip 与 AtlasSplit：11 项改进的工程实践"
date: 2026-08-13T00:00:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "对 MindTrip RAG 系统和 AtlasSplit Agent 各自落地 5 项和 6 项改进的工程实践记录。"
tags: ["RAG", "LLM Agent", "评测框架", "代码生成", "工程优化"]
categories: ["AI应用", "系统架构"]
---

## 开头

上一篇写完 AtlasSplit 的错误类型分布分析后，我在结尾列了 11 条改进建议。

说实话当时只是列了个清单，能不能落地、效果如何，心里没底。

这篇就是把那 11 条全部跑通之后的实践记录——5 条给 MindTrip，6 条给 AtlasSplit。

> 写文章最怕的就是"建议提了一堆，一个没做"。所以这次我逼自己全部实现，然后把真实数据摆出来。

先说一句总结：**11 项全部落地，没有一项是"理论可行但工程做不了"的。** 差别只在于有些效果好得超预期，有些效果一般但方向对。

下面按项目拆开讲。

---

## MindTrip：5 项改进

MindTrip 是我做的海南旅游知识库 RAG 系统，覆盖万宁、陵水、三亚等地的景点、美食、交通数据。上一轮评测跑完，Recall 卡在 0.917，unexpected entity rate 还有 0.069，120 个 case 手动跑一次要半小时。

### 1. 评测自动化：从手动跑到 CI 回归

这是最该先做的一件事。

之前每次改完检索逻辑，我都要手动跑 120 个 case，肉眼对比 baseline。124 个 case（后来扩充的）×4 个指标，手动对比根本不现实。

问题很直接：

```
120 cases × 4 metrics = 480 个数字
人工对比 → 漏看、误判、而且慢
```

所以我写了 `eval_runner.py`，核心逻辑就三步：跑全部 case、和 baseline 对齐、生成 diff 报告。

```python
# eval_runner.py 核心结构
def run_regression(eval_set: str, baseline_path: str) -> DiffReport:
    current = run_all_cases(eval_set)          # 跑当前版本
    baseline = load_baseline(baseline_path)     # 加载基线
    diff = compare(current, baseline)            # 逐 case 逐指标对比
    report = render_diff(diff)                   # 生成可视化报告
    return report
```

diff 报告长这样，重点高亮 pass→fail 的退化：

```
=== MindTrip Eval Regression Report ===
Date: 2026-08-13  Time: 1m 47s

Summary:
  Total cases: 124
  Pass: 118  Fail: 6  New failures: 2  Recovered: 0

Metric changes vs baseline:
  Context Recall:      0.917 → 0.911  (-0.006)
  Entity Precision:    0.931 → 0.931   (0.000)
  Unexpected Entity:    0.031 → 0.043  (+0.012)  ⚠️
  Faithfulness:         0.895 → 0.892  (-0.003)

--- Regressions (pass→fail) ---
[CASE-047] 万宁最适合冲浪的沙滩
  Recall: 0.83 → 0.50  Δ=-0.33
  Cause: RRF weight change dropped "日月湾" doc
  
[CASE-089] 陵水到三亚的交通方式
  Unexpected Entity: 0.04 → 0.25  Δ=+0.21
  Cause: reranker missed "清水湾" as unrelated entity
```

关键是 pass→fail 的 case 会被自动标出来，不用我一个个翻。

接进 CI 之后，每次 push 自动跑，2 分钟内出结果。退化超过阈值直接 block 合并。

```
CI pipeline:
  push → lint → unit test → eval_runner (baseline v1.2)
                                     ↓
                            diff > threshold? → block merge ✅
                            diff ≤ threshold? → update baseline ✅
```

> 结果：从"半小时手动跑+肉眼对比"变成"2 分钟自动出报告"。退化当天就能发现，不用等用户反馈。

---

### 2. Reranker：RRF 之后的精度补刀

RRF 混合检索把 Recall 干到 0.917，但 unexpected entity rate 还有 0.069。

什么意思呢？相关文档是召回了，但 top-3 里混进了一些带相似关键词但实际无关的文档。RRF 只管"多路投票"，不管精度。

```
RRF 召回的 top-10:
  ✓ 日月湾冲浪攻略        (高度相关)
  ✓ 万宁海湾冲浪指南       (高度相关)
  ✗ 三亚湾冲浪体验分享      (相似但不相关，用户问的是万宁)
  ✓ 万宁旅游交通地图        (相关上下文)
  ✗ 海南冲浪历史发展        (相似但不相关)
  ...
```

所以我在 RRF 之后加了一层 reranker：`bge-reranker-v2-m3`。

```python
# reranker 模块
from FlagEmbedding import FlagReranker

class RerankStage:
    def __init__(self):
        self.reranker = FlagReranker(
            'BAAI/bge-reranker-v2-m3',
            use_fp16=True
        )
    
    def rerank(self, query: str, candidates: list[Doc], top_k: int = 3):
        # 只对 RRF 的 top-10 做 rerank，控制延迟
        pairs = [[query, doc.text] for doc in candidates[:10]]
        scores = self.reranker.compute_score(pairs, normalize=True)
        ranked = sorted(zip(candidates[:10], scores), 
                        key=lambda x: x[1], reverse=True)
        return [doc for doc, _ in ranked[:top_k]]
```

整个 pipeline 变成：

```
Query → BM25 + Dense + Metadata
              ↓
           RRF Merge (top-10)
              ↓
         bge-reranker-v2-m3
              ↓
           top-3 → LLM
```

reranker 的成本是额外 ~80ms 延迟，但精度收益很值：

```
                    Recall    Unexpected Entity
RRF only:           0.917      0.069
RRF + Reranker:     0.917      0.031   ← 降了一半
```

Recall 没动，因为 reranker 只重排不召回。但 unexpected entity rate 从 0.069 降到 0.031，基本砍半。

> 结论：RRF 负责"找得到"，reranker 负责"排得准"。两段式比单段式更省心。

---

### 3. 否定型查询的 Query Rewriting

这个是被一个 case 刺痛了才做的。

case 是："万宁除了日月湾还有什么冲浪的地方？" 所有检索方法的 unexpected entity rate 都超过 0.22。

为什么？因为"日月湾"出现在 query 里，BM25 和 dense embedding 都会把它当作强信号，拼命召回日月湾相关文档。

```
Query: "万宁除了日月湾还有什么冲浪的地方"

BM25 召回 top-3:
  ✗ 日月湾冲浪详细攻略      ← 被排除的实体反而排第一
  ✗ 日月湾最佳冲浪时段
  ✓ 万宁其他海湾冲浪点
```

根本问题是检索器不懂否定语义。

所以我加了 query rewriting，在检索之前用 LLM 重写 query，提取出排除实体：

```python
# query_rewriter.py
NEGATION_REWRITE_PROMPT = """
分析用户查询中的否定语义，提取需要排除的实体。

用户查询: {query}

输出 JSON:
{{
  "rewritten_query": "去除否定部分后的核心查询",
  "exclude_entities": ["需要排除的实体"],
  "exclude_reason": "为什么排除"
}}

注意：只处理明确的否定（除了、不要、除了X之外），
不要过度推断。
"""

def rewrite_negation(query: str) -> RewriteResult:
    result = llm.extract(NEGATION_REWRITE_PROMPT, query=query)
    # "万宁除了日月湾还有什么冲浪的地方"
    # → rewritten_query: "万宁冲浪的地方"
    # → exclude_entities: ["日月湾"]
    return result
```

然后 rewrite 的结果接到 metadata filter 上：

```
Original Query
     ↓
LLM Rewrite (extract exclude_entities)
     ↓
Rewritten Query + Metadata Filter
     ↓
BM25 + Dense (filtered)
     ↓
RRF + Reranker
     ↓
LLM Answer
```

filter 这步很关键——不是改 query 文本去搜，而是在检索结果里直接过滤掉包含排除实体的文档：

```python
def apply_negation_filter(docs: list[Doc], 
                          exclude_entities: list[str]) -> list[Doc]:
    filtered = []
    for doc in docs:
        if not any(ent in doc.text for ent in exclude_entities):
            filtered.append(doc)
    return filtered if filtered else docs  # 兜底：全过滤完了就不过滤
```

效果：

```
否定型查询 (12 cases):
                    Before    After
Recall:             0.72      0.89   ← +0.17
Unexpected Entity:  0.221     0.067  ← 降了 70%
```

> 这件事让我意识到：不要指望 retrieval 自己理解否定语义，在 query 层就把意图解构掉。

---

### 4. 评测集扩充：用户反馈 → Bad Case 管线

120 个 case 是我手动标的，但用户实际问的问题远不止这些。

最大的问题：评测集是静态的，跑不出来的 failure pattern 我根本不知道。

所以我搭了一个 feedback pipeline，把线上用户的"踩"反馈变成候选评测 case：

```
用户查询 → RAG 回答 → 用户点"踩" 👎
                           ↓
                    feedback_pipeline.py
                           ↓
                    ┌──────┴──────┐
                    ↓             ↓
              存原始 query     触发 LLM 分析
                    ↓             ↓
              对齐 ground truth  生成 draft case
                    ↓             ↓
                    └──────┬──────┘
                           ↓
                    人工 review queue
                           ↓
                    合并进 eval set
```

核心代码：

```python
# feedback_pipeline.py
class FeedbackPipeline:
    def collect(self, query: str, answer: str, thumbs: str):
        if thumbs != "down":
            return
        # 存原始数据
        self.store.save(query, answer, timestamp=now())
    
    def generate_draft_case(self, raw_feedback: RawFeedback):
        # LLM 分析这个 bad case 的问题类型
        analysis = llm.analyze(
            query=raw_feedback.query,
            answer=raw_feedback.answer,
            prompt=DRAFT_CASE_PROMPT
        )
        # 生成标准格式的 eval case
        return EvalCase(
            query=raw_feedback.query,
            expected_entities=analysis.entities,
            expected_context=analysis.context,
            case_type=analysis.failure_type,
            source="user_feedback"
        )
```

第一个月的效果：

```
用户反馈收集：89 条 "踩"
→ LLM 生成 draft case：71 条
→ 人工 review 通过：43 条
→ 合并进 eval set

新发现的 query 类型：
  - 跨城市比较："万宁和陵水哪个更适合带小孩"  (14 cases)
  - 多约束查询："万宁有冲浪又能露营的地方"    (8 cases)
  - 时间限定："下午3点后还能去的景点"         (6 cases)
```

最有价值的是发现了"跨城市比较"这个新类型——之前我的评测集完全没有覆盖。

> 评测集不是一次性的工作，是持续生长的。没有用户反馈管线，就是在自己画的圈里自测。

---

### 5. Judge 模型分层：14B 太贵，3B 太弱

RAGAS 评测需要 LLM 做 judge，我之前用的是 Qwen2.5-14B。

120 个 case × 4 个 metric = 480 次 LLM 调用。14B 跑一次完整评测，GPU 费用不低。

但换成 3B 呢？跑了一次，发现几个边界 case 判断不稳定，准确率和 14B 差了 ~8%。

所以做了分层策略：

```
           所有 case × 4 metrics
                  ↓
           3B 先全部打分 (cheap)
                  ↓
        ┌─────────┴──────────┐
        ↓                    ↓
   分数稳定               分数波动大
   (Δ < threshold          (Δ ≥ threshold
    vs baseline)            vs baseline)
        ↓                    ↓
     直接采用            14B 重新打分 (expensive)
        ↓                    ↓
        └─────────┬──────────┘
                  ↓
            最终分数
```

```python
# tiered_judge.py
class TieredJudge:
    def __init__(self):
        self.fast_model = LLM("Qwen2.5-3B")
        self.accurate_model = LLM("Qwen2.5-14B")
        self.baseline = load_baseline_scores()
        self.threshold = 0.15  # 和 baseline 差 0.15 以上才升级
    
    def judge(self, case, metric) -> Score:
        fast_score = self.fast_model.score(case, metric)
        
        if self._needs_rescore(case, metric, fast_score):
            return self.accurate_model.score(case, metric)
        return fast_score
    
    def _needs_rescore(self, case, metric, score):
        baseline_score = self.baseline.get(case.id, metric)
        if baseline_score is None:
            return True  # 新 case，直接升级
        return abs(score - baseline_score) >= self.threshold
```

成本对比：

```
全量 14B:    480 次调用 × $0.012/次 = $5.76
全量 3B:     480 次调用 × $0.002/次 = $0.96  (但准确率差 ~8%)
分层策略:     420 次用 3B + 60 次用 14B
             = $0.84 + $0.72 = $1.56
             成本降 ~73%，准确率差 <2%
```

实际效果：跑了一轮和全量 14B 对比，4 个 metric 的平均差异 <0.02，但成本降了 70% 左右。

> 贵的模型不需要跑全部 case，只跑"拿不准"的那些。这是 LLM 评测里最该做的成本优化。

---

## AtlasSplit：6 项改进

AtlasSplit 是我用 LLM 生成 Pandas 代码处理 Excel 的 Agent，1,247 个任务跑下来，首轮成功率 82.4%，三轮自愈后 94.4%。

上一篇文章分析了 7 种错误类型（E1-E7），这次针对每个高频错误做改进。

### 6. 列名预校验器：在代码执行之前拦住幻觉

E1（列名不匹配）占所有错误的 32%，是第一大杀手。

典型的 E1 长这样：

```python
# LLM 生成的代码
df['总销售额'] = df['销售数量'] * df['单价']
#                   ↑ 实际列名是 "销量"
#                                      ↑ 实际列名是 "商品单价"
```

LLM 根据自然语言描述猜列名，但实际 DataFrame 的列名往往和直觉不一样。

所以在代码执行之前，我加了 `column_precheck.py`：

```
LLM 生成代码
     ↓
column_precheck.py
     ↓
┌──────┴──────┐
↓              ↓
提取列引用     对比实际列名
(解析 AST)     (读取 df.columns)
↓              ↓
└──────┬──────┘
       ↓
   有不匹配的列？
   ├── 没有 → 执行 ✅
   └── 有 → 生成反馈 → 让 LLM 重新生成（不消耗执行轮次）
```

核心代码：

```python
# column_precheck.py
import ast

class ColumnPrecheck:
    def extract_column_refs(self, code: str) -> set[str]:
        """从代码中提取所有 df['xxx'] 和 df["xxx"] 的列引用"""
        tree = ast.parse(code)
        refs = set()
        for node in ast.walk(tree):
            if isinstance(node, ast.Subscript):
                if isinstance(node.slice, ast.Constant):
                    refs.add(node.slice.value)
        return refs
    
    def precheck(self, code: str, df_columns: list[str]) -> CheckResult:
        refs = self.extract_column_refs(code)
        actual = set(df_columns)
        
        missing = refs - actual
        if not missing:
            return CheckResult(ok=True)
        
        # 对每个不匹配的列，找最接近的实际列名
        suggestions = {}
        for col in missing:
            suggestions[col] = self.closest_match(col, actual)
        
        return CheckResult(
            ok=False,
            missing=missing,
            suggestions=suggestions,
            feedback=self._build_feedback(suggestions)
        )
```

反馈格式：

```
[Precheck Feedback]
代码中引用了不存在的列名:
  - '销售数量' → 实际列名可能是: '销量'
  - '单价' → 实际列名可能是: '商品单价'
请修正后重新生成代码。
DataFrame 实际列名: ['日期', '门店', '商品名称', '销量', '商品单价', '销售额']
```

关键点：这个 precheck 不消耗执行轮次。之前是"执行 → 报错 → 反馈 → 重新生成"，现在是"预检 → 反馈 → 重新生成"，省了一整轮。

```
Before:  生成 → 执行 → KeyError → 反馈 → 重新生成 → 执行
                  ↑ 浪费一轮执行

After:   生成 → 预检 → 反馈 → 重新生成 → 执行
                  ↑ 不消耗执行轮次
```

效果：

```
E1 first-attempt success rate:
  Before: 68%
  After:  87%   ← +19pp
```

> 在执行之前拦住错误，比执行报错再修便宜得多。Precheck 本质上是"把 schema 信息提前喂给 LLM"。

---

### 7. 结构化断言：让 E3 的反馈从"结果不对"变成"差额 1500"

E3（业务逻辑错误）的自愈率只有 39.1%，是所有错误类型里最低的。

原因不是 LLM 不会修，是反馈太模糊。

之前的反馈：

```
[E3 Feedback]
计算结果不正确，请检查业务逻辑。
```

LLM 看到这个反馈，只知道"不对"，但不知道哪里不对、差多少。

所以我引入了结构化断言 `structured_assertions.py`，用类型化的 assertion 生成精确反馈：

```python
# structured_assertions.py
from dataclasses import dataclass

@dataclass
class Assertion:
    description: str
    expected: float
    actual: float
    
    @property
    def passed(self) -> bool:
        return abs(self.expected - self.actual) < 0.01
    
    def feedback(self) -> str:
        if self.passed:
            return f"✓ {self.description}"
        diff = self.actual - self.expected
        return (f"✗ {self.description}\n"
                f"  期望值: {self.expected}\n"
                f"  实际值: {self.actual}\n"
                f"  差额: {diff:+.2f}")

class TotalSumMatch(Assertion):
    """总和匹配断言"""
    pass

class MinRatioSatisfied(Assertion):
    """最小占比断言"""
    pass

class GrowthRateCheck(Assertion):
    """增长率断言"""
    pass
```

before/after 的反馈对比：

```
--- Before (模糊反馈) ---
[E3 Feedback]
计算结果不正确，请检查业务逻辑。
Hint: 总销售额可能有误。

--- After (结构化断言) ---
[E3 Feedback]
以下断言未通过:

✗ 总销售额应等于各门店销售额之和
  期望值: 458200.00
  实际值: 456700.00
  差额: -1500.00

✗ 门店A占比应不低于 30%
  期望值: 0.30
  实际值: 0.27
  差额: -0.03

✓ 所有门店销售额非负
```

LLM 拿到"差额 -1500"比拿到"结果不对"能做更多事——它知道往哪个方向查。

效果：

```
E3 self-heal rate:
  Before: 39.1%
  After:  58.3%   ← +19.2pp
```

> 反馈的精确度直接决定自愈率。"差额 1500"比"结果不对"多了一个数量级的信息量。

---

### 8. 错误迁移分析：修复一个 bug 引入另一个 bug

在分析自愈日志时发现一个吓人的数字：11.9% 的修复会引入一个新的错误类型。

比如修好了 E1（列名错误），但改代码时忘了类型转换，引入了 E2。

这不是修复失败，是"修复成功但引入新 bug"。

```
Round 1: E1 (列名错误)
     ↓ 修复
Round 2: E2 (类型错误)  ← 新引入的
     ↓ 修复
Round 3: 通过
```

我写了 `error_migration.py` 从 audit log 里提取迁移路径：

```python
# error_migration.py
class ErrorMigrationAnalyzer:
    def analyze(self, audit_logs: list[AuditLog]):
        transitions = defaultdict(int)
        for log in audit_logs:
            for i in range(len(log.rounds) - 1):
                curr = log.rounds[i].error_type
                next_ = log.rounds[i + 1].error_type
                if curr != next_:
                    transitions[(curr, next_)] += 1
        return self._to_matrix(transitions)
```

迁移矩阵（top 路径）：

```
=== Error Migration Matrix (top paths) ===
From → To      Count    Description
─────────────────────────────────────────
E1 → E2        7/23    修列名，忘类型转换
E2 → E4        5/23    改类型，引发索引越界
E3 → E1        4/23    改逻辑，引入新列引用
E4 → E2        3/23    修索引，引发类型问题
E1 → E4        2/23    修列名，引入索引问题
E2 → E1        2/23    改类型时误改列名
─────────────────────────────────────────
Total:         23/193  (11.9% 引入新错误)
```

最有价值的发现：**E1→E2 是最常见路径（7/23）。**

这意味着修列名错误时，LLM 经常会顺手改类型相关的代码，结果改出问题。

知道这个规律后，我在 E1 修复的 prompt 里加了一条约束：

```python
E1_REPAIR_CONSTRAINT = """
注意：你正在修复列名错误。
请不要修改与列名无关的代码行，特别是类型转换逻辑。
只改列名引用，不要动 dtype、astype() 等操作。
"""
```

加上这条约束后，E1→E2 的迁移率从 30% 降到 9%。

> 修复不是孤立的，每次修复都可能引入新问题。迁移矩阵让我看到了"修复的副作用"。

---

### 9. 错误分类数据集：脱敏开源

1,247 个任务的错误数据，对 LLM 代码生成社区有价值。但原始数据里有用户业务数据，不能直接开源。

所以写了 `prepare_release.py` 做脱敏：

```python
# prepare_release.py
class ReleasePreparer:
    def prepare(self, raw_tasks: list[Task]) -> list[ReleaseRecord]:
        records = []
        for task in raw_tasks:
            record = ReleaseRecord(
                task_id=hash_id(task.id),           # 哈希化 ID
                error_type=task.error_type,
                error_pattern=self._extract_pattern(task),  # 只留模式
                code_snippet=self._sanitize_code(task.code), # 脱敏代码
                repair_path=task.repair_path,
                success_rate=task.success_rate,
                # 不包含: 原始数据、用户名、文件路径、业务数值
            )
            records.append(record)
        return records
    
    def _sanitize_code(self, code: str) -> str:
        # 替换具体数值为占位符
        code = re.sub(r'[\d,]+\.?\d*', 'NUM', code)
        # 替换字符串字面量
        code = re.sub(r"'[^']+'", 'STR', code)
        # 替换列名
        code = re.sub(r"df\['[^']+'\]", "df['COL']", code)
        return code
```

数据集 schema：

```json
{
  "task_id": "a3f8c1...",
  "error_type": "E1",
  "error_pattern": "column_name_mismatch",
  "error_description": "Generated code references non-existent column",
  "code_snippet": "df['COL'] = df['COL'] * NUM  # actual: '销量'",
  "repair_path": ["E1", "pass"],
  "repair_attempts": 1,
  "success_rate": 0.87,
  "metadata": {
    "df_shape": [156, 8],
    "dtypes": ["object", "int64", "float64"]
  }
}
```

脱敏验证流程：

```
原始数据 (1,247 tasks)
    ↓
值替换 (数值→NUM, 字符串→STR, 列名→COL)
    ↓
业务关键词扫描 (正则匹配 50+ 业务术语)
    ↓
人工抽检 (随机 100 条)
    ↓
MIT License JSONL 发布
```

最终以 MIT 协议发布了 JSONL 格式数据集，1,247 条记录，每条包含错误类型、模式、修复路径、成功率。

> 数据脱敏不是"删掉敏感字段"就够了，要保证错误 pattern 的信息量不损失。值替换比直接删列更有用——LLM 看的是代码结构，不是具体数值。

---

### 10. Schema Card：把表结构喂够，让 LLM 少猜

E1+E2+E4 加起来占 55% 的错误，根因都是信息不对称——LLM 不知道表长什么样。

之前的 prompt 里只有一句"这是一个 Excel 文件，包含销售数据"。LLM 只能猜。

`schema_card.py` 生成结构化的 schema 信息注入 prompt：

```python
# schema_card.py
class SchemaCard:
    def generate(self, df: pd.DataFrame) -> str:
        card = []
        card.append("=== Schema Card ===\n")
        card.append(f"Shape: {df.shape[0]} rows × {df.shape[1]} cols\n")
        
        card.append("Columns:")
        for col in df.columns:
            dtype = str(df[col].dtype)
            samples = df[col].dropna().head(3).tolist()
            null_rate = df[col].isna().mean()
            warning = self._check_warnings(df[col], dtype)
            
            card.append(f"  - {col}")
            card.append(f"    type: {dtype}")
            card.append(f"    samples: {samples}")
            card.append(f"    null_rate: {null_rate:.1%}")
            if warning:
                card.append(f"    ⚠️ {warning}")
        
        return "\n".join(card)
    
    def _check_warnings(self, series, dtype):
        warnings = []
        if dtype == 'object':
            # 检查是不是数字被存成字符串
            numeric_ratio = series.astype(str).str.match(r'^[\d,.]+$').mean()
            if numeric_ratio > 0.8:
                warnings.append("looks numeric but stored as string")
        if series.nunique() == 1:
            warnings.append("constant column")
        if series.isna().mean() > 0.5:
            warnings.append("high null rate")
        return "; ".join(warnings) if warnings else None
```

Schema Card 输出示例：

```
=== Schema Card ===
Shape: 156 rows × 8 cols

Columns:
  - 日期
    type: object
    samples: ['2025-01-01', '2025-01-02', '2025-01-03']
    null_rate: 0.0%
  - 门店
    type: object
    samples: ['总店', '分店A', '分店B']
    null_rate: 0.0%
  - 销量
    type: object
    samples: ['120', '85', '203']
    null_rate: 0.0%
    ⚠️ looks numeric but stored as string
  - 商品单价
    type: float64
    samples: [29.9, 45.0, 12.5]
    null_rate: 0.0%
  - 销售额
    type: float64
    samples: [3588.0, 3825.0, 2537.5]
    null_rate: 2.6%
  - 备注
    type: object
    samples: [nan, nan, '促销']
    null_rate: 87.2%
    ⚠️ high null rate
```

注入 prompt 后：

```
[System Prompt]
你是一个 Pandas 代码生成专家。

{schema_card}

根据以上表结构，生成 Pandas 代码完成用户需求。
注意 ⚠️ 标记的列。
```

LLM 看到"销量 stored as string"就不会直接做数值运算，而是先 `astype(int)`。

效果：

```
E1 + E2 + E4 合计错误率:
  Before: 55%
  After:  28%   ← 降了一半

E2 (类型错误) 改善最大:
  21% → 9%   ← Schema Card 的 warning 直接预判了类型问题
```

> LLM 猜列名、猜类型，本质上是因为信息不够。把 schema 喂够了，一半的错误根本不会发生。

---

### 11. 降级策略：两轮修不好就换思路

统计了修复轮次的成功率递减：

```
Round 1 success: 82.4%
Round 2 success: 53.1%   (对 Round 1 失败的)
Round 3 success: 31.4%   (对 Round 2 失败的)
```

Round 2 还行，Round 3 成功率已经很低了。再修下去边际收益很差。

原因：Round 1 和 Round 2 修不好，往往是 LLM 的思路本身就是错的，继续在同一方向 patch 没用。

所以 `alternative_strategy.py` 的核心思路是：**两轮修不好，不 patch 了，换一个完全不同的方案。**

```python
# alternative_strategy.py
class StrategySelector:
    def select(self, error_type: str, round_num: int) -> str:
        if round_num < 2:
            return "standard_repair"
        
        # 两轮修不好，根据错误类型选策略
        strategy_map = {
            "E1": "standard_repair",      # 列名问题，继续修
            "E2": "standard_repair",       # 类型问题，继续修
            "E4": "standard_repair",       # 索引问题，继续修
            "E3": "alternative",           # 业务逻辑，换方案
            "E5": "alternative",           # 逻辑缺失，换方案
            "E6": "stop",                  # 依赖缺失，停止
            "E7": "optimization",          # 性能问题，优化模式
        }
        return strategy_map.get(error_type, "alternative")
```

策略选择器逻辑：

```
Round 2 仍失败?
    ↓
┌───────┴──────────────────────────┐
│            Error Type             │
├──────┬──────┬──────┬──────┬───────┤
│ E1   │ E2   │ E4   │ E3   │ E5    │
│  ↓   │  ↓   │  ↓   │  ↓   │  ↓    │
│ 标准 │ 标准 │ 标准 │ 换方 │ 换方  │
│ 修复 │ 修复 │ 修复 │ 案   │ 案   │
├──────┴──────┴──────┴──────┴───────┤
│ E6 → 停止 (依赖缺失，修不了)      │
│ E7 → 优化模式 (性能问题)          │
└───────────────────────────────────┘
```

alternative 模式的 prompt 变化：

```python
STANDARD_REPAIR_PROMPT = """
之前的代码有错误：{error}
请修复这个错误，保持原有逻辑不变。
"""

ALTERNATIVE_PROMPT = """
之前的方案尝试了 2 轮仍未通过。
请完全放弃之前的思路，用不同的方法实现相同需求。

之前失败的方案概要：
{failed_approaches}

约束：
- 不要使用和之前相同的实现思路
- 如果之前用了 groupby，这次试试 merge 或 pivot
- 如果之前用了 iterrows，这次试试向量化操作
- 明确说明你的新方案和旧方案的区别
"""
```

一个实际例子：

```
需求: 计算每个门店月度销售额环比增长率

Round 1 (E3): 用 pct_change() 但忽略了分组 → 报错
Round 2 (E3): 修了分组，但计算逻辑仍不对 → 报错
Round 3 (alternative): 放弃 pct_change，改用 shift + 除法
  → df.groupby(['门店','月'])['销售额'].sum()
  → .pct_change() 换成 (curr - prev) / prev
  → 通过 ✅
```

最终效果：

```
Final success rate (3 rounds):
  Before: 94.4%
  After:  96.1%   ← +1.7pp

其中 alternative 策略贡献:
  Round 3 success: 31.4% → 52.8%   ← +21.4pp
```

> 方向错了的时候，继续修补不如推倒重来。知道什么时候该换思路，比会修 bug 更重要。

---

## 总结

11 项改进，两个项目，全部落地。

```
MindTrip (5项):
  1. 评测自动化        → 2分钟出回归报告
  2. Reranker          → unexpected entity 0.069→0.031
  3. Query Rewriting   → 否定型查询 Recall 0.72→0.89
  4. 评测集扩充        → +43 cases, 发现新 query 类型
  5. Judge 分层        → 成本降 70%, 精度差 <2%

AtlasSplit (6项):
  6. 列名预校验器      → E1 首轮成功率 68%→87%
  7. 结构化断言        → E3 自愈率 39.1%→58.3%
  8. 错误迁移分析      → E1→E2 迁移率 30%→9%
  9. 错误分类数据集    → MIT 开源, 1,247 条
  10. Schema Card      → E1+E2+E4 合计 55%→28%
  11. 降级策略         → 最终成功率 94.4%→96.1%
```

做完之后回头看，11 项改进其实围绕两个主题：

> **主动防御 > 被动修复。** Schema Card、列名预校验、断言结构化，都是在错误发生之前或之时主动拦住。比等错误报出来再修效率高一个量级。

> **信息充分 > 反馈精确。** 把表结构喂够、把差额数字给清楚、把错误迁移路径标出来。LLM 不是不会做，是信息不够才做不好。

所有代码在项目仓库里，文章在博客上。这两条原则我会带到下一个项目里去。

> 相关文章：
> - [MindTrip RAG 评测框架与混合检索对比实验](/posts/mindtrip-rag-eval-hybrid-retrieval/)
> - [AtlasSplit 错误类型分布分析](/posts/atlassplit-llm-code-error-analysis/)
