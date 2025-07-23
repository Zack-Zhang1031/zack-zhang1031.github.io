---
layout: default
title: "Python + OpenCV 日常小技巧与常见坑整理"
date: 2025-07-22
description: "Python + OpenCV 日常小技巧与常见坑整理"
tags: ["Python", "基础"]
---

# Python + OpenCV 日常小技巧与常见坑整理

## 前言

本篇博客系统梳理了图像处理中常见的几何变换，包括仿射变换、旋转矩阵、剪切、平移、缩放等基础理论与 OpenCV 实战应用，并对常见问题做了详细解答和矩阵推导。适合视觉、AI、Python 图像处理爱好者查阅与积累！

---

## 1. NumPy 与 OpenCV 加法的区别

### 1.1 NumPy 加法是取模吗？

- 普通加法是逐元素相加。
- 对于 `uint8` 等定长整型，结果溢出时会“取模”，即 $260 \mod 256 = 4$。

```python
import numpy as np
a = np.array([250], dtype=np.uint8)
b = np.array([10], dtype=np.uint8)
print(a + b)  # [4]
````

### 1.2 OpenCV 加法是饱和加法

* `cv2.add(a, b)` 超过 255 自动截断为 255。

```python
import cv2
print(cv2.add(a, b))  # [255]
```

---

## 2. 图像灰度化最大值法案例

```python
import cv2
pig = cv2.imread("../images/pig.png")
img = pig.max(axis=2)  # BGR 三通道最大分量法
cv2.imshow("gray", img)
cv2.waitKey(0)
cv2.destroyAllWindows()
```

* 这种灰度会更亮，区别于标准加权灰度。

---

---

## 3. 常见二维变换矩阵的推导

### 3.1 平移（Translation）

* 不能用2x2方阵实现，需齐次坐标：

  $$
  \begin{bmatrix}
  $$

# x' \ y' \ 1 \end{bmatrix}

\begin{bmatrix} 1 & 0 & t\_x \ 0 & 1 & t\_y \ 0 & 0 & 1 \end{bmatrix} \begin{bmatrix} x \ y \ 1 \end{bmatrix} ]

### 3.2 缩放（Scaling）

* 2x2线性变换： $\begin{bmatrix}s_x & 0 \\ 0 & s_y\end{bmatrix}$
* 也可齐次表达。

### 3.3 旋转（Rotation）

* 推导过程：极坐标→三角恒等式展开

  $$
  x = x_0 \cos\theta + y_0 \sin\theta \\
  y = -x_0 \sin\theta + y_0 \cos\theta
  $$
* 矩阵写法：

  $$
  \begin{bmatrix}
  $$

# x \ y\end{bmatrix}

\begin{bmatrix} \cos\theta & \sin\theta \ -\sin\theta & \cos\theta \end{bmatrix} \begin{bmatrix} x\_0 \ y\_0 \end{bmatrix} ]

### 3.4 剪切（Shear）

* x方向剪切：

  $$
  \begin{bmatrix}x' \\ y'\end{bmatrix} = \begin{bmatrix}1 & k \\ 0 & 1\end{bmatrix} \begin{bmatrix}x \\ y\end{bmatrix}
  $$
* y方向剪切：

  $$
  \begin{bmatrix}x' \\ y'\end{bmatrix} = \begin{bmatrix}1 & 0 \\ k & 1\end{bmatrix} \begin{bmatrix}x \\ y\end{bmatrix}
  $$

### 3.5 综合仿射变换（Affine）

* 齐次坐标统一表示：

  $$
  \begin{bmatrix}x' \\ y' \\ 1\end{bmatrix} = \begin{bmatrix}a_{11} & a_{12} & t_x \\ a_{21} & a_{22} & t_y \\ 0 & 0 & 1\end{bmatrix}\begin{bmatrix}x \\ y \\ 1\end{bmatrix}
  $$

---

## 4. 各类变换矩阵对比速查表

| 变换    | 2×2部分                                                                       | 平移         | 3×3齐次矩阵                                                                                |
| ----- | --------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------- |
| 平移    | 单位阵                                                                         | t\_x, t\_y | $\begin{bmatrix}1&0&t_x\\0&1&t_y\\0&0&1\end{bmatrix}$                                  |
| 缩放    | $\begin{bmatrix}s_x&0\\0&s_y\end{bmatrix}$                                  | 0          | $\begin{bmatrix}s_x&0&0\\0&s_y&0\\0&0&1\end{bmatrix}$                                  |
| 旋转    | $\begin{bmatrix}\cos\theta&\sin\theta\\-\sin\theta&\cos\theta\end{bmatrix}$ | 0          | $\begin{bmatrix}\cos\theta&\sin\theta&0\\-\sin\theta&\cos\theta&0\\0&0&1\end{bmatrix}$ |
| 剪切(x) | $\begin{bmatrix}1&k\\0&1\end{bmatrix}$                                      | 0          | $\begin{bmatrix}1&k&0\\0&1&0\\0&0&1\end{bmatrix}$                                      |
| 剪切(y) | $\begin{bmatrix}1&0\\k&1\end{bmatrix}$                                      | 0          | $\begin{bmatrix}1&0&0\\k&1&0\\0&0&1\end{bmatrix}$                                      |

---

## 5. OpenCV 仿射变换实战与问题解析

### 5.1 warpAffine 的参数

```python
dst = cv2.warpAffine(img, M, (w, h))
```

* `img`：原图
* `M`：2×3 仿射矩阵（手动写，或三点法 `cv2.getAffineTransform(pts1, pts2)` 自动求）
* `(w, h)`：输出图像宽高（宽在前！）

### 5.2 如何定义 M？

* 平移：`M = np.float32([[1, 0, tx], [0, 1, ty]])`
* 缩放：`M = np.float32([[sx, 0, 0], [0, sy, 0]])`
* 旋转：`M = cv2.getRotationMatrix2D(center, angle, scale)`
* 剪切：`M = np.float32([[1, k, 0], [0, 1, 0]])`
* 任意仿射：三对点法

```python
M = cv2.getAffineTransform(pts1, pts2)
```

### 5.3 综合仿射变换实例

```python
import cv2
import numpy as np
img = cv2.imread('test.jpg')
rows, cols = img.shape[:2]
pts1 = np.float32([[0,0],[cols-1,0],[0,rows-1]])
pts2 = np.float32([[50,50],[cols-100,100],[100,rows-100]])
M = cv2.getAffineTransform(pts1, pts2)
dst = cv2.warpAffine(img, M, (cols, rows))
```

---

## 6. 旋转与角度正负方向

* 数学约定：逆时针为正角度，顺时针为负角度（与单位圆、三角函数方向一致）。
* 三角恒等式推导：
  \$\cos(A-B) = \cos A \cos B + \sin A \sin B\$
  \$\sin(A-B) = \sin A \cos B - \cos A \sin B\$

---

## 7. 插值方法小结

| 方法      | OpenCV 常量            | 特点       |
| ------- | -------------------- | -------- |
| 最近邻     | `cv2.INTER_NEAREST`  | 快，马赛克感强  |
| 双线性     | `cv2.INTER_LINEAR`   | 默认，平滑度好  |
| 双三次     | `cv2.INTER_CUBIC`    | 更平滑，速度较慢 |
| Lanczos | `cv2.INTER_LANCZOS4` | 超平滑，最慢   |

---

## 8. 常见问题与答疑总结

### 8.1 仿射变换与旋转矩阵的区别

* 仿射变换：包含旋转、缩放、剪切、平移，线性部分 + 平移部分。
* 旋转矩阵：仿射的一种，只旋转，无平移、缩放、剪切。

### 8.2 warpAffine 命名含义

* "warp" = 扭曲、映射
* "Affine" = 仿射
* 合起来就是“仿射变换映射”

### 8.3 为什么逆时针为正、顺时针为负？

* 因为数学单位圆和三角函数约定如此。

### 8.4 剪切（Shear）怎么实现？

* x 剪切：`M = [[1, k, 0], [0, 1, 0]]`
* y 剪切：`M = [[1, 0, 0], [k, 1, 0]]`
* 用 `cv2.warpAffine()` 即可实现图像斜拉变形。

---

## 9. 旋转与仿射变换的方阵推导过程

### 9.1 二维旋转矩阵推导

假设有平面上的点 \$P\_0(x\_0, y\_0)\$，以原点 O(0, 0) 为中心，逆时针旋转 \$\theta\$ 角度，新点 \$P(x, y)\$ 如何表示？

极坐标法：

$$
x_0 = r \cos\alpha \\
y_0 = r \sin\alpha
$$

旋转后，新极角变为 \$\alpha - \theta\$：

$$
x = r \cos(\alpha - \theta) \\
y = r \sin(\alpha - \theta)
$$

利用三角恒等式展开：

$$
\cos(A - B) = \cos A \cos B + \sin A \sin B \\
\sin(A - B) = \sin A \cos B - \cos A \sin B
$$

代入得：

$$
x = x_0 \cos\theta + y_0 \sin\theta \\
y = y_0 \cos\theta - x_0 \sin\theta
$$

矩阵表达：

$$
\begin{bmatrix}
x \\
y
\end{bmatrix}
=
\begin{bmatrix}
\cos\theta & \sin\theta \\
-\sin\theta & \cos\theta
\end{bmatrix}
\begin{bmatrix}
x_0 \\
y_0
\end{bmatrix}
$$

---

### 9.2 齐次坐标下的方阵推导（仿射变换）

齐次坐标下，仿射变换可以用 3×3 方阵统一表达：

$$
\begin{bmatrix}
x' \\
y' \\
1
\end{bmatrix}
=
\begin{bmatrix}
a_{11} & a_{12} & t_x \\
a_{21} & a_{22} & t_y \\
0 & 0 & 1
\end{bmatrix}
\begin{bmatrix}
x \\
y \\
1
\end{bmatrix}
$$

其中前 2 行 2 列是线性变换（旋转、缩放、剪切），第 3 列是平移，最后一行保证矩阵可乘。

---

## 10. 参考与进阶

* [OpenCV官方文档-几何变换](https://docs.opencv.org/4.x/da/d6e/tutorial_py_geometric_transformations.html)
* [NumPy 数据类型与溢出规则](https://numpy.org/doc/stable/user/basics.types.html)
* 线性代数、矩阵变换相关教材

---

```
