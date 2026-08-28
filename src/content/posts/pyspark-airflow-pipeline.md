---
title: "PySpark + Airflow 数据管道：日处理亿条记录的最小架构"
date: 2026-08-30T15:20:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "PySpark DataFrame 实战、惰性求值与 shuffle 直觉、UDF 的正确使用、Airflow DAG 编排、失败重试与回填，搭建生产级数据管道。"
tags: ["PySpark", "Airflow", "数据管道", "大数据", "ETL"]
categories: ["AI课程", "数据工程"]
math: false
---

[大数据管理篇](/posts/big-data-management/)讲了 Hadoop/Spark 的概念版图，这篇往下一层：**每天凌晨把上亿条日志加工成特征表**的真实管道怎么搭。PySpark 负责「算」，Airflow 负责「什么时候算、失败了怎么办」——两者是离线数据管道的经典夫妻档。

**前置阅读**：建议先读 [大数据管理](/posts/big-data-management/)、[SQL 与数据库实战](/posts/sql-database-practice/)、[Kafka 流式处理](/posts/streaming-kafka-basics/)（批流对照）。

## PySpark：和 Pandas 像，但脑子要换

PySpark 的 DataFrame API 和 Pandas 七分像，但底层逻辑完全不同——**惰性求值 + 分布式执行**：

```python
from pyspark.sql import SparkSession, functions as F

spark = SparkSession.builder.appName("daily_etl").getOrCreate()

df = spark.read.parquet("s3://logs/date=2026-08-29/")   # 读：这只是个「计划」
result = (df
    .filter(F.col("event") == "click")                   # 转换：还是计划
    .groupBy("user_id")
    .agg(F.count("*").alias("clicks"),
         F.countDistinct("item_id").alias("items"))
    .filter(F.col("clicks") > 5))
result.write.mode("overwrite").parquet("s3://features/dt=2026-08-29/")  # 行动：真正执行
```

关键理解：**filter/groupBy 这些转换只是往执行计划上挂节点，`write`/`show`/`collect` 等行动才触发计算**。两个推论：

1. `df.count()` 调试时慎用——它是行动，全量扫描。
2. Spark 的 Catalyst 优化器会重排你的计划（谓词下推、列裁剪）——写法上的「先过滤再 select」顺序不决定实际执行顺序，优化器会帮你下推。

### Shuffle：性能的生死线

数据在节点间重新分发（groupBy/join 触发）叫 shuffle——**网络上搬数据，是 Spark 作业的头号成本**。实战对策：

- **大表 join 小表**：小表广播（`F.broadcast(small_df)`），小表复制到每个节点，避免大表 shuffle：
```python
joined = big_df.join(F.broadcast(dim_df), "item_id")
```
- **join 前先过滤**：参与 shuffle 的数据量越小越好。
- **数据倾斜**：某个 key 占 50%（如 null user_id）→ 该 key 的任务卡死全 stage。解法：加盐（key 加随机后缀打散，聚合后去盐再聚合）。

### UDF：能用别用，必须用就用对

Spark 的内置函数（`F.*`）跑在 JVM 优化后的引擎里；Python UDF 要把数据序列化给 Python 进程再拿回来——**性能差 10 倍起步**。优先级：内置函数 > pandas UDF（向量化，Arrow 传输）> 普通 UDF：

```python
from pyspark.sql.functions import pandas_udf

@pandas_udf("double")
def normalize_score(s: pd.Series) -> pd.Series:
    return (s - s.mean()) / s.std()    # 整列进 Pandas，向量计算

df = df.withColumn("score_norm", normalize_score("score"))
```

## Airflow：管道的调度大脑

Spark 作业只是「一个任务」，真实管道是几十个任务的依赖网：先同步业务库 → 再清洗 → 再聚合 → 再导出特征 → 最后质量检查。Airflow 用 DAG（有向无环图）描述这张网：

```python
from airflow import DAG
from airflow.operators.bash import BashOperator
from airflow.operators.python import BranchPythonOperator
from datetime import datetime, timedelta

default_args = {
    "owner": "data-team",
    "retries": 2,                                 # 失败自动重试
    "retry_delay": timedelta(minutes=10),
    "depends_on_past": False,
}

with DAG("daily_feature_pipeline",
         schedule="30 3 * * *",                    # 每天 03:30（避开整点拥堵）
         start_date=datetime(2026, 8, 1),
         catchup=False,
         default_args=default_args) as dag:

    sync_db = BashOperator(task_id="sync_db",
        bash_command="sqoop-import.sh {{ ds }}")   # ds = 逻辑日期

    etl = BashOperator(task_id="spark_etl",
        bash_command="spark-submit etl.py --date {{ ds }}")

    quality_check = BashOperator(task_id="quality_check",
        bash_command="python check_rowcount.py {{ ds }}")

    sync_db >> etl >> quality_check                # 依赖链
```

### `{{ ds }}`：理解 Airflow 的「逻辑日期」

Airflow 最重要的概念：DAG 每天凌晨运行时，`ds` 是**它处理的数据日期**（通常是昨天）——今天凌晨跑昨天的数据。这个设计让**回填（backfill）**成为可能：管道改了个 bug，要重算过去 30 天？

```bash
airflow dags backfill daily_feature_pipeline -s 2026-08-01 -e 2026-08-30
```

幂等性是回填的前提：**每个任务必须「重跑同日期 = 覆盖同结果」**——写入用 `mode("overwrite")` + 分区目录（`dt=2026-08-29/`），别用 append。这条纪律没守住的管道，重跑一次数据就翻倍一次，是数据团队最常见的事故。

## 最小架构图：把整篇串起来

```
业务库 ──Sqoop/DataX──→ 原始区（Hive/Iceberg 表）
日志 ──Kafka──→ 落盘 ──→ 原始区
                          │ Airflow 调度（每日 03:30）
                          ▼
              PySpark 清洗 → 明细层（DWD）
                          ▼
              PySpark 聚合 → 特征宽表（DWS）
                          ▼
              质量检查（行数/空值率/分布）→ 导出训练/分析
```

质量检查层别省：行数环比突变 >30%、关键字段空值率 >1%、主键重复——任何一个触发就告警并阻断下游（用 Airflow 的 ShortCircuitOperator）。**脏数据流进特征表的成本远高于晚两小时出表**。

## 踩坑排查

| 现象 | 原因 | 解法 |
|------|------|------|
| 作业卡在某个 task 不动 | 数据倾斜 | 看 Spark UI 的 task 时长分布；加盐打散 |
| join 后行数爆炸 | join key 重复（多对多） | join 前双方按 key 去重或聚合 |
| 内存溢出（Executor lost） | 单分区数据过大 | repartition 增加分区；调 executor 内存 |
| UDF 慢得离谱 | 普通 Python UDF 序列化开销 | 改内置函数或 pandas_udf |
| 回填后数据翻倍 | 写入用 append 非 overwrite | 分区覆盖写入，保证幂等 |
| 调度时间到了任务没跑 | worker 资源被占满/上游失败 | 看 scheduler 日志；池化资源隔离 |

## 练习

1. 本地起 Spark（单节点即可），对 1000 万行模拟日志完成「按用户聚合点击数」的 ETL，观察 Spark UI 里的 stage 划分。
2. 制造数据倾斜：让 50% 记录的 user_id 为 null，运行 groupBy，对比加盐前后的 task 时长分布。
3. 用 Airflow（docker-compose 官方镜像）搭一个三任务 DAG：生成数据 → PySpark 聚合 → 质量检查，跑一次后用 backfill 回填 3 天。
4. 实验广播变量：大表（千万）join 小表（千行），对比广播前后的执行时间。

## 面试常问

**Q：Spark 的宽依赖和窄依赖？**
窄依赖：子分区的数据来自固定父分区（map/filter）——可流水线执行无需 shuffle；宽依赖：子分区依赖多个父分区（groupBy/join）——必须 shuffle 且是 stage 边界。宽依赖处失败要重算上游 stage，这也是为什么 checkpoint 常放在宽依赖之后。

**Q：Spark 相比 MapReduce 的核心进步？**
内存计算（中间结果不落盘，MR 每步落 HDFS）+ DAG 执行引擎（MR 只有 map-reduce 两拍，Spark 任意 DAG 优化执行）+ Catalyst 优化器 + 丰富的 API。迭代计算（ML 训练）场景快 10~100 倍。

**Q：pandas UDF 为什么快？**
普通 UDF：每行在 JVM 和 Python 间序列化往返；pandas UDF：Arrow 列式格式批量传输，整列交给 Pandas 向量计算再整列返回——传输批量化和计算向量化双重收益。代价：内存中要有整列数据，超大分区要注意。

**Q：Airflow 和其他调度（cron、DolphinScheduler、Prefect）？**
cron：无依赖管理无重试无回填，只适合单脚本；Airflow：Python 定义 DAG 灵活度最高、生态最大，但调度器自身较重；DolphinScheduler：国内常用，可视化拖拽友好；Prefect/Dagster：现代 API、数据感知调度，新项目值得看。选型看团队：Python 主导选 Airflow/Prefect，平台化多团队选 DolphinScheduler。

**Q：数据管道的幂等性怎么保证？**
分区覆盖写（按日期分区，重跑覆盖同分区）、UPSERT 语义（Iceberg/Hudi 的 merge into）、任务无副作用（不在任务里改全局状态）、外部系统用唯一键去重（事件带 event_id）。验收标准：任意任务重跑任意次，最终数据不变——能过这条的管道才敢开回填。

## 相关阅读

- [大数据管理：Hadoop、Spark 与数据仓库](/posts/big-data-management/)——概念版图
- [Kafka 与实时数据管道](/posts/streaming-kafka-basics/)——流式一侧的对照
- [SQL 与数据库实战](/posts/sql-database-practice/)——Spark SQL 的底子
- [特征工程实战](/posts/feature-engineering-practice/)——特征宽表的消费者
- [MLOps 入门](/posts/ml-experiment-tracking-monitoring/)——数据管道喂给模型的下游

离线管道的工程哲学：**「无聊」是最高赞誉**——每天凌晨安静地跑完、失败自动重试、数据永远对账。把管道做到无聊，你才有时间做有趣的事。
