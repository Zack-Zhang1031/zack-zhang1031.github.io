---
title: "深度学习课程 08：TensorFlow/Keras 工程化训练工作流"
date: 2026-08-24T09:00:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "用 tf.data、Keras Functional API、回调、检查点和模型导出组织可恢复的 TensorFlow 训练与推理流程。"
tags: ["深度学习", "TensorFlow", "Keras", "工程化"]
categories: ["AI课程", "AI工程"]
math: false
---

能在 Notebook 里完成一次训练，不等于形成可维护的工程流程。真正麻烦的往往不是再加一层网络，而是数据管线阻塞、训练中断无法恢复、最佳权重被最后一轮覆盖，以及线上预处理和训练时不一致。

本篇不重复 PyTorch 的数学主线，而是用 TensorFlow/Keras 展示一套完整工作流：`tf.data` 输入、Functional API 建模、`compile/fit` 训练、回调保存、`.keras` 模型恢复和独立推理。示例仍可在 Colab 或 Windows CPU 环境运行。

## 1. 先确定工程契约

训练脚本至少要明确五件事：

- 输入张量的形状、类型和取值范围；
- 标签编码与类别映射；
- 训练、验证、测试数据如何隔离；
- 哪个指标决定“最佳模型”；
- 推理端如何复用完全相同的预处理。

把这些约定写在代码边界上，比在模型内部堆条件判断更清楚。下例采用 `32×32×3` 图像和整数标签，网络输出 logits。

## 2. 环境与设备检查

```python
import tensorflow as tf

print(tf.__version__)
print(tf.config.list_physical_devices("GPU"))
```

GPU 列表为空时，代码会自动在 CPU 执行。Windows 环境应依据当前 TensorFlow 官方支持矩阵选择本地或 WSL2，不要只凭安装日志判断 GPU 已启用。若目标只是验证流程，CPU 足够；先减小数据量和批次，不需要维护另一份代码。

为结果可复查，可统一设置随机种子：

```python
tf.keras.utils.set_random_seed(42)
```

随机种子能减少部分波动，但不同硬件、并行内核和版本仍可能产生差异，因此还应记录依赖版本与数据版本。

## 3. 用 tf.data 组织输入

`tf.data.Dataset` 把读取、映射、批处理和预取组成流水线。关键是只对训练集打乱和增强，验证、测试保持确定性。

```python
AUTOTUNE = tf.data.AUTOTUNE

def normalize(image, label):
    image = tf.cast(image, tf.float32) / 255.0
    return image, label

def prepare(dataset, training: bool, batch_size: int = 64):
    dataset = dataset.map(normalize, num_parallel_calls=AUTOTUNE)
    if training:
        dataset = dataset.shuffle(10_000, reshuffle_each_iteration=True)
    dataset = dataset.batch(batch_size)
    return dataset.prefetch(AUTOTUNE)
```

执行顺序会影响语义。若先 `batch` 再 `shuffle`，打乱的是批而不是单个样本；若把随机增强缓存下来，每轮可能看到同一份增强结果。`cache()` 也不是固定加速按钮：数据放不下内存时可能适得其反。

## 4. 把增强放进模型还是数据管线

Keras 预处理层可以直接成为模型的一部分：

```python
augmentation = tf.keras.Sequential(
    [
        tf.keras.layers.RandomFlip("horizontal"),
        tf.keras.layers.RandomRotation(0.05),
    ],
    name="augmentation",
)
```

这样做的优点是增强配置随模型保存，训练与验证模式由 Keras 管理。缺点是某些复杂预处理不适合放进导出图。选择前先确定线上是否需要它：随机增强只用于训练，确定性缩放和归一化必须在推理端保持一致。

## 5. Functional API 建模

`Sequential` 适合单路堆叠，Functional API 更适合多输入、跳连和可复用子模型。即使当前模型简单，显式输入输出也便于检查契约。

```python
def build_model(num_classes: int) -> tf.keras.Model:
    inputs = tf.keras.Input(shape=(32, 32, 3), name="image")
    x = augmentation(inputs)
    x = tf.keras.layers.Conv2D(32, 3, padding="same", activation="relu")(x)
    x = tf.keras.layers.BatchNormalization()(x)
    x = tf.keras.layers.MaxPooling2D()(x)
    x = tf.keras.layers.Conv2D(64, 3, padding="same", activation="relu")(x)
    x = tf.keras.layers.BatchNormalization()(x)
    x = tf.keras.layers.GlobalAveragePooling2D()(x)
    x = tf.keras.layers.Dropout(0.3)(x)
    outputs = tf.keras.layers.Dense(num_classes, name="logits")(x)
    return tf.keras.Model(inputs, outputs, name="image_classifier")
```

`GlobalAveragePooling2D` 相比大尺寸 Flatten 分类头参数更少。最后一层没有 softmax，因为交叉熵可以直接接收 logits，推理显示概率时再调用 softmax。

## 6. compile：让输出、损失和标签对齐

```python
model = build_model(num_classes=10)
model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
    loss=tf.keras.losses.SparseCategoricalCrossentropy(from_logits=True),
    metrics=[tf.keras.metrics.SparseCategoricalAccuracy(name="accuracy")],
)
```

这里的三个 `Sparse` 表示标签是整数类别编号。如果标签是 one-hot，应使用对应的非 Sparse 版本。`from_logits=True` 必须与最后一层无 softmax 保持一致。三者错配时，训练可能不报错，却会产生难以解释的结果。

## 7. 用回调保存最佳状态

训练的目标不是保留最后一轮，而是保留按约定指标表现最好的版本，同时在长期无改善时结束。

```python
from pathlib import Path

artifact_dir = Path("artifacts")
artifact_dir.mkdir(parents=True, exist_ok=True)

callbacks = [
    tf.keras.callbacks.ModelCheckpoint(
        filepath=str(artifact_dir / "best.keras"),
        monitor="val_loss",
        mode="min",
        save_best_only=True,
        verbose=1,
    ),
    tf.keras.callbacks.EarlyStopping(
        monitor="val_loss",
        mode="min",
        patience=5,
        restore_best_weights=True,
    ),
    tf.keras.callbacks.CSVLogger(str(artifact_dir / "history.csv")),
    tf.keras.callbacks.TerminateOnNaN(),
]
```

`ModelCheckpoint` 负责产生独立可加载文件，`restore_best_weights=True` 只恢复当前进程内的模型权重。两者作用不同，搭配使用可以同时满足训练后评估和进程中断后的恢复需求。

## 8. fit、evaluate 与测试集边界

```python
history = model.fit(
    train_ds,
    validation_data=val_ds,
    epochs=50,
    callbacks=callbacks,
)

best_model = tf.keras.models.load_model("artifacts/best.keras")
test_metrics = best_model.evaluate(test_ds, return_dict=True)
print(test_metrics)
```

验证集参与早停、模型选择和调参，因此不能再把验证分数当成最终泛化证据。测试集只在方案确定后评估。若不断根据测试结果修改模型，测试集也会被间接过拟合。

训练历史适合画趋势，不要只截取最好的一点：

```python
import pandas as pd

history_frame = pd.DataFrame(history.history)
history_frame[["loss", "val_loss"]].plot(grid=True)
```

## 9. 从单样本推理到批量接口

推理函数应明确输入范围、批次维和类别映射：

```python
CLASS_NAMES = ["class_0", "class_1", "class_2"]

def predict_batch(model: tf.keras.Model, images):
    images = tf.convert_to_tensor(images, dtype=tf.float32)
    if images.shape.rank == 3:
        images = images[None, ...]
    images = images / 255.0
    logits = model(images, training=False)
    probabilities = tf.nn.softmax(logits, axis=-1)
    indices = tf.argmax(probabilities, axis=-1)
    return probabilities.numpy(), indices.numpy()
```

如果训练数据管线已归一化，而模型内部没有归一化层，推理函数就必须做同样处理。更稳妥的方式是将确定性预处理封装成可测试函数，训练和推理共同调用。

## 10. 保存格式和导出边界

`.keras` 格式适合保存 Keras 模型结构、权重和训练配置，是继续训练和 Python 推理的自然选择。面向特定服务或端侧格式时，再增加单独导出步骤，并使用固定样本验证导出前后的输出一致性。

不要用“文件成功生成”代替导出验证。至少检查：

- 能否在新进程加载；
- 输入签名是否符合服务约定；
- 固定样本的类别和分数差异是否在可接受范围；
- 类别映射和预处理配置是否随制品发布；
- 依赖版本是否记录。

## 11. 断点恢复与完整状态

只保存模型权重可以用于推理，但严格恢复训练还涉及优化器状态、当前 epoch、随机状态和数据顺序。Keras 完整模型能保存优化器配置与状态，但自定义对象和外部数据进度仍需显式管理。

在长任务中，可把“最佳模型”和“最近检查点”分开：前者服务最终选择，后者服务意外中断恢复。不要让同一路径承担两个含义。

## 12. 常见故障定位

### 数据管线很慢

先测只迭代数据、不训练模型的吞吐，再比较是否启用并行 map 和 prefetch。若读取大量小文件，存储和解码可能才是瓶颈。

### 验证损失波动大

检查验证集是否错误启用了随机增强或 shuffle，样本量是否太小，以及 BatchNormalization 的训练/推理模式是否正确。

### 加载时报自定义层未知

优先使用可序列化配置；确需自定义层时实现配置方法，并在加载端注册自定义对象。不要依赖 Notebook 中尚未保存的临时定义。

### CPU 内存不断增长

检查是否把每批 Tensor 保存进 Python 列表、反复创建模型，或在循环中累积无法释放的图对象。指标应在线聚合，不要保存全部中间输出。

## 13. 如何替换为个人数据

1. 写清原始文件到 `(input, label)` 的解析函数；
2. 固定类别名称和编号映射，并作为制品保存；
3. 按实体或来源划分集合，避免近重复泄漏；
4. 只在训练集拟合词表、归一化统计或采样策略；
5. 用少量样本执行 `model.fit`，先验证端到端契约；
6. 在独立进程加载 `best.keras`，执行相同预处理与推理测试。

数据更换不应要求修改模型主体。若每换一次数据都要进入网络内部改形状，说明输入契约还不够清晰。

## 14. 练习与面试表达

1. 增加 TensorBoard 回调，并把日志目录绑定到一次运行标识。
2. 将归一化改为模型内确定性预处理层，简化推理接口。
3. 模拟中断后加载检查点，验证能否继续训练。
4. 为固定样本编写导出前后输出一致性测试。

面试表达时，可以从“可恢复、可比较、可部署”三个词展开：`tf.data` 保证输入契约，回调保留最佳模型和历史，独立加载测试确保制品可用，预处理与类别映射随制品发布。这样比罗列 Keras API 更像工程经验。

## 下一篇

下一篇把序列模型和工程流程合在一个完整案例中：[PaddlePaddle 中文文本分类项目](/posts/deep-learning-09-paddle-chinese-text-classification/)。
