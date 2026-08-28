---
title: "模型压缩与部署实战：量化、剪枝、蒸馏、ONNX——把模型塞进生产环境"
date: 2026-08-29T17:50:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "训练完只是开始。PTQ 与 QAT 量化的区别、结构化剪枝、知识蒸馏的师生框架、ONNX 导出与 TensorRT 加速，一条龙把 PyTorch 模型压小跑快。"
tags: ["模型压缩", "量化", "知识蒸馏", "ONNX", "TensorRT"]
categories: ["AI课程", "深度学习"]
math: false
---

训练营里大家花最多时间的是「把准确率刷上去」，但真实工作里我遇到的第一道坎是另一个方向：模型在 GPU 上准确率 95%，老板问「能不能部署到 CPU 服务器上，延迟低于 50ms，成本一台机器搞定？」——这时候才意识到，**模型压缩与部署是独立的一门手艺**。

这篇把我踩过的坑整理成完整链路：量化（最常用）、剪枝（常被高估）、蒸馏（性价比之王）、ONNX 导出（连接训练与推理的桥梁）、TensorRT/OpenVINO（硬件端最后一公里）。每一步都有可跑的代码。

**前置阅读**：建议先读 [神经网络基础](/posts/deep-learning-02-backprop/)、[CNN 详解](/posts/deep-learning-04-cnn-image-classification/)、[深度学习框架入门](/posts/deep-learning-01-training-loop/)。

## 全景图：四种手段解决什么问题

先建立直觉，别一上来就钻细节：

| 手段 | 压缩比 | 精度损失 | 上手难度 | 什么时候用 |
|------|--------|----------|----------|-----------|
| 量化 | 4x（FP32→INT8） | 小（<1%） | 低 | 永远先试这个 |
| 蒸馏 | 取决于学生模型 | 几乎无损甚至反升 | 中 | 允许重训时 |
| 剪枝 | 2~10x（理论） | 中 | 高 | 结构化剪枝才有实际加速 |
| ONNX+TRT | 不压缩但提速 2~5x | 无 | 低 | 部署标配 |

我的经验公式：**量化 + ONNX 是基线套餐，能 cover 80% 的需求；蒸馏是大模型场景的性价比之王；剪枝只在端侧极端场景值得折腾**。

## 量化：性价比最高的一刀

### 原理一分钟版

FP32 模型里每个权重占 4 字节。INT8 量化就是建立映射 `fp32_value = scale * (int8_value - zero_point)`，把权重和激活都存成 1 字节整数，推理时用整数乘加。模型体积直接 1/4，CPU 上 INT8 指令还有硬件加速，实际推理常常快 2~4 倍。

### PTQ vs QAT：先分清洗牌

- **PTQ（训练后量化）**：训练好的模型直接量化，用一小批校准数据（100~500 张）统计激活分布确定 scale。几分钟搞定，精度掉 0.5~1%。
- **QAT（量化感知训练）**：训练时插入「伪量化」节点，让模型在训练期就感知量化误差并适应。精度几乎不掉，但要重新训练几个 epoch。

我的策略：**永远先 PTQ，掉点超过 1% 再考虑 QAT**。实际项目里 QAT 出场率不到 20%。

### PyTorch 量化实战（CPU 场景）

```python
import torch
import torch.quantization

model = torch.hub.load('pytorch/vision', 'resnet18', weights='DEFAULT')
model.eval()

# 1. 指定量化配置（x86 CPU 用 fbgemm，ARM 用 qnnpack）
model.qconfig = torch.quantization.get_default_qconfig('fbgemm')

# 2. 融合算子（Conv+BN+ReLU 合成一个，减少量化误差）
model_fused = torch.quantization.fuse_modules(
    model, [['conv1', 'bn1', 'relu']])

# 3. 校准：跑几百张代表性数据统计激活范围
torch.quantization.prepare(model_fused, inplace=True)
with torch.no_grad():
    for images, _ in calib_loader:   # 200~500 张就够
        model_fused(images)

# 4. 转换：真正变成 INT8
torch.quantization.convert(model_fused, inplace=True)
torch.jit.save(torch.jit.script(model_fused), "resnet18_int8.pt")
```

我实测 ResNet-18 在 Xeon 服务器 CPU 上：FP32 单张 45ms → INT8 单张 12ms，体积 45MB → 11.6MB，ImageNet 精度掉 0.4 个点。这个 trade-off 几乎没有理由拒绝。

### ONNX Runtime 量化（更省事的路）

如果部署走 ONNX，可以直接用 onnxruntime 的量化工具，不用在 PyTorch 里折腾：

```python
from onnxruntime.quantization import quantize_dynamic, QuantType

quantize_dynamic(
    model_input="model.onnx",
    model_output="model_int8.onnx",
    weight_type=QuantType.QInt8,   # 权重 INT8
)
```

`quantize_dynamic` 是动态量化——权重离线量化，激活运行时量化，不需要校准数据，NLP 模型（BERT 系）效果尤其好。我在 BERT-base 上测过：体积 418MB → 105MB，CPU 延迟降 62%，GLUE 分数几乎没动。

## 知识蒸馏：让小模型偷师大模型

### 思想

大模型（教师）输出不只是 hard label，还有 soft probability——猫的图片输出 `[猫: 0.9, 狗: 0.08, 车: 0.02]`，这里「狗比车更像猫」的信息量是 hard label 没有的。小模型（学生）同时学两样：真实标签的交叉熵 + 模仿教师 soft 分布的 KL 散度。

```python
import torch.nn.functional as F

def distill_loss(student_logits, teacher_logits, labels, T=4.0, alpha=0.7):
    # 软目标：温度 T 拉平分布，暴露类别间相似性
    soft_loss = F.kl_div(
        F.log_softmax(student_logits / T, dim=1),
        F.softmax(teacher_logits / T, dim=1),
        reduction='batchmean'
    ) * T * T   # 梯度量级校正，论文里的关键细节
    # 硬目标：真实标签
    hard_loss = F.cross_entropy(student_logits, labels)
    return alpha * soft_loss + (1 - alpha) * hard_loss
```

两个参数：温度 T（通常 2~8，越大分布越平、暗知识越多）和 alpha（软硬损失的配比，通常 0.5~0.9 偏向软目标）。

### 我的一次真实蒸馏经历

线上文本分类服务：教师是 BERT-base（110M 参数，CPU 延迟 180ms），蒸馏到一个 4 层小 BERT（15M 参数）。纯训练小模型准确率 87.3%，蒸馏后 90.1%——**比教师只低 1.2 个点，但延迟 28ms，快 6.4 倍**。蒸馏真正神奇的地方就在这：学生能超过「自己直接学」的上限，因为教师的 soft label 提供了正则化和类别结构信息。

LLM 时代蒸馏焕发了第二春：Qwen、Llama 的小尺寸版本很多是蒸馏自同门大模型；DeepSeek-R1 蒸馏出的一系列 1.5B~70B 小模型把「推理能力蒸馏」玩出了花。配合 [LoRA 微调](/posts/llm-finetuning-lora/)，蒸馏是低成本做垂直小模型的核心手段。

## 剪枝：听起来很美，坑最多

剪枝的思路直观：神经网络里大量权重接近零，剪掉不影响输出。但分两种：

- **非结构化剪枝**：单个权重置零。压缩率高（可剪 90%），但得到的是稀疏矩阵——普通硬件和 cuDNN 根本不加速，需要专用稀疏推理库。**学术刷榜神器，工程价值有限**。
- **结构化剪枝**：整条通道/整个 filter 剪掉。剪完模型真的变窄了，任何硬件都加速。代价是精度掉得多，通常要边剪边微调。

```python
import torch.nn.utils.prune as prune

# 结构化剪枝：按 L1 范数剪掉 30% 输出通道
prune.ln_structured(
    model.conv1, name="weight", amount=0.3, n=1, dim=0)
prune.remove(model.conv1, 'weight')  # 永久生效
```

我的结论可能有点扫兴：**除非端侧极限场景（手机 NPU、MCU），否则优先量化和蒸馏**。我花两周做过一轮 ResNet 通道剪枝，最终加速比被「直接换一个更小的架构（ResNet18→MobileNetV3）」吊打——架构搜索比剪枝香。

## ONNX：训练框架和推理引擎之间的世界语

### 为什么需要它

模型在 PyTorch 里训练，但生产环境可能是 C++ 服务、Java 服务、边缘盒子。ONNX 定义了一套统一的计算图格式，训练框架导出 `.onnx`，推理引擎（ONNX Runtime、TensorRT、OpenVINO、NCNN）各自实现高效执行。

```python
import torch

model.eval()
dummy = torch.randn(1, 3, 224, 224)
torch.onnx.export(
    model, dummy, "model.onnx",
    input_names=["input"], output_names=["output"],
    opset_version=17,
    dynamic_axes={"input": {0: "batch"}, "output": {0: "batch"}},  # 动态 batch
)
```

验证导出正确性，这步**千万别省**：

```python
import onnxruntime as ort
import numpy as np

sess = ort.InferenceSession("model.onnx")
onnx_out = sess.run(None, {"input": dummy.numpy()})[0]
torch_out = model(dummy).detach().numpy()
np.testing.assert_allclose(onnx_out, torch_out, rtol=1e-3, atol=1e-5)
print("导出一致 ✓")
```

### TensorRT：NVIDIA 端的终极加速

ONNX 到 TensorRT 只需要一条命令（或几行 Python）：

```bash
trtexec --onnx=model.onnx --saveEngine=model.trt --fp16
```

TRT 做的事：算子融合（Conv+BN+ReLU 合成一个 kernel）、精度校准（FP16/INT8）、kernel 自动调优。我实测 YOLOv5s 在 T4 卡上：PyTorch 直跑 11ms → ONNX Runtime 7ms → TensorRT FP16 4.2ms。CPU 端对应物是 OpenVINO（Intel）和 NCNN（移动端 ARM）。

## 完整的部署决策树

我在项目里的决策流程，供参考：

1. **能不能换更小的架构？** 能就换（ResNet→MobileNet，BERT→DistilBERT/MiniLM），收益最大。
2. **量化了吗？** CPU 上 INT8 动态量化，GPU 上 FP16 起步。基本免费。
3. **导出 ONNX 了吗？** 脱离训练框架，推理提速 + 部署解耦。
4. **精度还差？** 上蒸馏，用大模型带小模型。
5. **还不够快？** TensorRT/OpenVINO，或者回头审视 batch 策略和服务框架（比如 [vLLM 对 LLM 的连续批处理](/posts/vllm-qwen-performance-tuning/)）。
6. **端侧极限场景？** 这时候才轮到结构化剪枝和硬件专用方案（TFLite、CoreML）。

## 踩坑排查

| 现象 | 原因 | 解法 |
|------|------|------|
| 量化后精度暴跌（>5%） | 校准数据没有代表性 | 校准集要覆盖真实输入分布，300~1000 张 |
| ONNX 导出报「unsupported op」 | 用了 ONNX 不支持的操作（如某些索引、Python 控制流） | 改写模型代码，用 aten 支持的算子；或升 opset 版本 |
| 导出后输出对不上 | 模型里有 `model.training` 分支或随机性 | 确保 `model.eval()` + `torch.no_grad()` |
| 动态维度输出错乱 | dynamic_axes 只配了 input 没配 output | 输入输出的 batch 维都要声明 |
| TRT 引擎换机器不能跑 | 引擎与 GPU 架构/TRT 版本绑定 | 每台目标机本地构建，或版本对齐 |
| 蒸馏效果不如直接训练 | T 太大 + alpha 太偏软目标 | T=4、alpha=0.7 起步网格搜 |
| 剪枝后模型反而变慢 | 非结构化剪枝产生稀疏权重 | 只有结构化剪枝有实际加速，别被压缩率迷惑 |

## 练习

1. 把一个 ResNet-18 分别做 FP32 / INT8 PTQ / 蒸馏到 ResNet-18 一半通道的小模型，在 CIFAR-10 上对比「精度-体积-延迟」三角，画散点图。
2. 用 ONNX Runtime 加载 BERT-base 做动态量化，在 SST-2 上测精度差，在 CPU 上测吞吐提升。
3. 写训练循环实现完整蒸馏：教师 ResNet-34、学生 ResNet-18，网格搜 T ∈ {2,4,8}、alpha ∈ {0.5,0.7,0.9}。
4. 把一个含 `torch.where` 和 Python for 循环的模型改写到能干净导出 ONNX，记录你做的每处修改。

## 面试常问

**Q：PTQ 和 QAT 的区别？什么时候必须用 QAT？**
PTQ 训练后量化，只校准不训练；QAT 训练时模拟量化噪声，模型学着适应。低比特（INT4 及以下）、模型对量化敏感（如 MobileNet 的 depthwise 卷积）、精度要求高时必须 QAT。INT8 场景 PTQ 通常够。

**Q：蒸馏为什么有效？soft label 比 hard label 多了什么？**
类别间的相似结构（dark knowledge）：教师说「这张猫图有 8% 像狗」，这个相对关系是硬标签「猫」丢失的信息。soft label 还起到标签平滑的正则效果。温度 T 放大了小概率类的相对差异，让这些结构可见。

**Q：INT8 量化为什么能加速？只是体积变小吗？**
不只是。三个层面：① 内存带宽降 4 倍，推理常是访存 bound；② INT8 乘加有 SIMD 指令（AVX-512 VNNI、ARM dot product）单指令吞吐更高；③ cache 命中率提升。所以实际加速经常超过理论 4 倍的一半以上。

**Q：ONNX 是什么角色？为什么不能直接部署 PyTorch？**
可以直部署 PyTorch（TorchServe/TorchScript），但 PyTorch 是为训练设计的，推理开销大、依赖重（整个 Python 生态）。ONNX 是中间表示，推理引擎针对纯推理做图优化和 kernel 调优，C++ 部署无 Python 依赖，还能对接 TRT/OpenVINO 拿硬件加速。

**Q：模型部署时 batch 怎么设？**
分场景：离线批处理拉满（GPU 打满）；在线低延迟场景 batch=1 或小 batch + 动态合批（攒 10ms 窗口内的请求凑批）。LLM 场景用连续批处理（continuous batching），vLLM 的 PagedAttention 就是为这个设计。核心矛盾永远是延迟 vs 吞吐，没有万能值。

## 相关阅读

- [LLM 微调实战：LoRA 与 QLoRA](/posts/llm-finetuning-lora/)——QLoRA 的 4bit NF4 就是量化思想在训练端的应用
- [vLLM 部署 Qwen 性能调优实录](/posts/vllm-qwen-performance-tuning/)——LLM 推理侧的完整优化链路
- [目标检测实战：YOLO 系列](/posts/object-detection-yolo/)——检测模型的导出部署有额外坑（NMS 算子）
- [深度学习框架入门：PyTorch](/posts/deep-learning-01-training-loop/)——本文代码的框架基础
- [Linux + Python 环境基础](/posts/linux-python-environment-basics/)——部署服务器的先修课

部署这门手艺，书上学不到百分之一，全是「跑一遍、炸了、查、再跑」攒出来的。希望这篇能让你少炸几次。
