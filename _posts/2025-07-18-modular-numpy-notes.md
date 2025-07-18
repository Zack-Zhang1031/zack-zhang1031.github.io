---
layout: default
title: "2025-07-18 模块化编程与NumPy基础"
date: 2025-07-18 10:10:00 +0800
categories: 学习笔记
tags: [Python, NumPy, 模块化, 系统模块, 第三方库]
---


# 今日博文：模块化编程与NumPy基础、常用系统与第三方模块管理全解



---

## 一、模块化编程基础

### 1.1 什么是模块（Module）？

* **模块**就是一个`.py`文件，内部包含变量、函数、类等。模块让代码拆分更清晰、可复用。
* 举例：`math.py`、`my_utils.py`。
* 作用：

  * 功能分组，避免单文件过大
  * 提升代码复用和维护性

### 1.2 什么是包（Package）？

* **包**是包含`__init__.py`的文件夹，里面可以有很多模块和子包。
* 举例：

```
my_package/
  __init__.py
  data_loader.py
  utils.py
  subpkg/
    __init__.py
    preprocess.py
```

* `__init__.py`的作用：

  * 告诉Python这是一个包
  * 可以初始化包内容

### 1.3 导入模块与包

* **导入整个模块**：

  ```python
  import math
  print(math.sqrt(16))
  ```
* **导入部分内容**：

  ```python
  from math import sqrt, pi
  print(sqrt(25), pi)
  ```
* **使用别名**：

  ```python
  import numpy as np
  ```
* **导入包下模块**：

  ```python
  from my_package import utils
  from my_package.subpkg import preprocess
  ```

### 1.4 自定义模块和包的导入技巧

* 自定义模块和包通常放在工程目录下。
* 如果找不到模块，可用`sys.path.append(路径)`临时添加查找路径。
* 导入时注意：

  * 名字冲突：尽量用独特命名或起别名
  * 路径问题：合理规划包结构，养成使用相对导入的习惯

---

## 二、NumPy与ndarray操作详解

### 2.1 多种创建ndarray的方法

* **array**（从已有数据创建）：

  ```python
  a = np.array([1, 2, 3])
  b = np.array([[1, 2], [3, 4]])
  ```
* **全0/全1数组**：

  ```python
  np.zeros((3, 4))   # 3行4列全0
  np.ones((2, 3))    # 2行3列全1
  ```
* **指定值填充**：

  ```python
  np.full((2, 2), 5)  # 2x2全是5
  ```
* **arange**（等差数列）：

  ```python
  np.arange(0, 10, 2)  # [0 2 4 6 8]
  ```
* **linspace**（等分区间）：

  ```python
  np.linspace(0, 1, 5)  # [0.   0.25 0.5  0.75 1.  ]
  ```
* **随机数组**：

  ```python
  np.random.rand(2, 3)        # 2x3, [0,1) 均匀分布
  np.random.randn(2, 3)       # 2x3, 标准正态分布
  np.random.randint(1, 10, (2, 3)) # 2x3, [1,10)整数
  np.random.choice([0, 1], size=(2, 3)) # 随机抽样
  ```

### 2.2 ndarray的常用属性

* `a.shape`：返回数组维度（行数, 列数...）
* `a.dtype`：元素类型（如float64、int32）
* `a.ndim`：几维数组（如1, 2, 3）
* `a.size`：元素总数
* `a.itemsize`：每个元素占多少字节
* `a.nbytes`：总字节数

#### 补充：ndarray的内存与连续性

* **C\_CONTIGUOUS**与**F\_CONTIGUOUS**属性，分别代表按行/按列存储是否连续。
* 判断方式：`a.flags['C_CONTIGUOUS']`

### 2.3 ndarray的各种切片操作

* **按行、列切片**：

  ```python
  a[1, :]       # 第2行所有列
  a[:, 2]       # 所有行第3列
  a[0:2, 1:3]   # 0/1行, 1/2列的子数组
  ```
* **步长切片**：

  ```python
  a[::2, ::-1]  # 行隔1取，列逆序
  ```
* **布尔索引**：

  ```python
  a[a > 5]      # 选出大于5的所有元素
  mask = (a % 2 == 0)
  a[mask]       # 选出所有偶数
  ```
* **花式索引**：

  ```python
  a[[0,2], [1,3]]  # 取(0,1),(2,3)两个元素
  ```
* **注意**：切片产生视图，花式索引产生副本！

### 2.4 维度变换（形状变换/转置/拉平/增加/删除轴）

* **reshape**（常用于改变数组形状，不改变数据内容）：

  ```python
  b = a.reshape(3, 4)   # a原本一维或12元素数组，变3x4
  ```
* **ravel / flatten**（拉平成1维）：

  ```python
  b = a.ravel()   # 返回视图（可能共享内存）
  b = a.flatten() # 返回副本（独立内存）
  ```
* **转置（T属性，transpose函数）**：

  ```python
  a.T                   # 行列转置
  a.transpose(1, 0)     # 自定义轴顺序
  ```
* **expand\_dims / squeeze**（增加/删除维度）：

  ```python
  np.expand_dims(a, axis=0)  # 在前面加一维
  np.squeeze(a)              # 自动去掉长度为1的轴
  ```
* \*\*reshape的坑：\*\*reshape后的总元素数必须等于原数组！

#### 常用维度变换场景举例：

* 将批量图片数据(B, H, W, C)转为(B, C, H, W)适合深度学习输入：`a.transpose(0, 3, 1, 2)`
* 单列数据二维变一维：`a.reshape(-1)`
* 新增“批次”维：`a[np.newaxis, ...]`

### 2.5 广播机制（broadcasting）

* \*\*概念：\*\*小尺寸数组自动“扩展”成大尺寸，使运算合法，节省内存、提升速度。

* **规则一览：**

  1. 比较两个数组的**shape**，从末尾对齐，逐维比较。
  2. 如果某一维shape不同，但其中一个是1，则该维会被“拉伸”。
  3. 有不兼容维度则报错。

* **例子：**

  ```python
  a = np.ones((2,3))
  b = np.arange(3)
  c = a + b  # b会自动扩展为(2,3)
  ```

  ![广播机制示意图](https://numpy.org/doc/stable/_images/broadcasting.png)

* **实际应用：**

  * 标量加法、列或行归一化
  * 图像每个像素加减一组颜色

* **广播机制的优点：**

  * 节省内存
  * 高速批量运算

* **易错点：**

  * 广播的不是复制数据，只是“虚拟扩展”
  * 广播仅支持自动扩展为兼容shape，不支持所有随意shape

### 2.6 ndarray的内存机制与“视图/副本”

* **切片、reshape、转置**：一般不拷贝数据，而是返回原数组的“视图”

  * 改视图会影响原数组（数据共享内存）
* **花式索引、flatten**等操作：返回“副本”，数据独立
* **判断方法：**

  ```python
  b = a[::2]  # 视图
  b.base is a  # True说明b和a共享数据
  ```
* \*\*性能优化：\*\*避免不必要的副本，提高效率；必要时用copy()

#### 内存机制小结表

| 操作          | 是否拷贝数据     |
| ----------- | ---------- |
| 切片slice     | 否（视图）      |
| reshape     | 否（视图，部分情况） |
| transpose/T | 否（视图）      |
| ravel       | 否（视图）      |
| flatten     | 是（副本）      |
| 花式索引        | 是（副本）      |
| copy        | 是（副本）      |

---

## 三、系统模块与第三方模块管理

### 3.1 常用系统模块一览

* `os`：路径、文件夹、进程
* `sys`：解释器、命令行参数、路径
* `re`：正则表达式
* `datetime`：日期时间处理
* `json`：JSON序列化与反序列化
* `random`：随机数生成
* `math`：数学运算
* `collections`：特殊容器（如Counter、defaultdict）
* `shutil`：文件操作
* `glob`：文件通配符查找
* `logging`：日志
* `subprocess`：子进程
* 更多详见[官方文档](https://docs.python.org/3/library/)

#### 常见用法举例：

```python
import os
os.makedirs('test_dir', exist_ok=True)
print(os.listdir('.'))

import sys
print(sys.argv)

import re
re.findall(r'\d+', '123abc456')  # ['123', '456']
```

### 3.2 第三方模块的安装与管理

* **安装/卸载**：

  ```sh
  pip install requests
  pip uninstall requests
  ```
* **导出依赖包**：

  ```sh
  pip freeze > requirements.txt
  ```
* **指定国内镜像**：

  ```sh
  pip install numpy -i https://pypi.tuna.tsinghua.edu.cn/simple
  ```
* **查询包信息**：

  ```sh
  pip show numpy
  pip list  # 已安装所有包
  ```

### 3.3 实用第三方包简述

* `numpy`：科学计算
* `pandas`：数据分析
* `requests`：网络爬虫
* `matplotlib`：绘图
* `beautifulsoup4`：网页解析
* `scikit-learn`：机器学习
* `torch`/`tensorflow`：深度学习

### 3.4 学习和管理建议

* 多看官方文档+社区教程
* pip安装时遇到问题，先查镜像/包名拼写/版本依赖
* 团队项目请养成`requirements.txt`同步习惯
* 尽量用虚拟环境（venv/conda）避免环境污染

---

## 四、业务技术结合与AI辅助编程

### 4.1 用AI助手高效学习与开发

* 善用AI（通义、Cursor、ChatGPT等）

  * 代码生成/优化/查文档/调错
  * 工作流：遇到不会的系统模块、正则表达式、numpy操作，直接问AI

### 4.2 综合实践：爬虫+数据处理
---
layout: default
title: "2025-07-14 模块化编程与NumPy基础"
date: 2025-07-14 22:10:00 +0800
categories: 学习笔记
tags: [Python, NumPy, 模块化, 系统模块, 第三方库]
---

* 业务与技术结合：用爬虫采集训练用图片/数据（requests/bs4/pillow等）
* 示例：

  ```python
  import requests
  from bs4 import BeautifulSoup

  resp = requests.get('https://www.example.com')
  soup = BeautifulSoup(resp.text, 'html.parser')
  for img in soup.find_all('img'):
      print(img['src'])
  ```
* 练习将图片批量下载/重命名/本地保存、数据批量处理

---

## 五、拓展与互动

* 试着写一个自己的模块（.py），把常用函数收集起来
* 用pip list/ show / freeze管理你的包
* 用numpy写几个ndarray切片例子，贴到群里比比谁更花式
* 利用AI助手查查os、sys的冷门用法，分享小技巧

---

> **学习总结**：
>
> 模块化编程是Python高级能力的基石，NumPy和系统模块是科研和工程的“力气活”，第三方模块管理关乎团队协作。会用AI加速成长，技术与业务才能形成正循环！
