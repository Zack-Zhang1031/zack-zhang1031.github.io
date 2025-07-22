---
layout: default
title: "Python + OpenCV 日常小技巧与常见坑整理"
date: 2025-07-16
description: "Python + OpenCV 日常小技巧与常见坑整理"
tags: ["Python", "基础"]
---

## 1. OpenCV 读取与显示图片的正确姿势

### 常见错误

不少初学者写 OpenCV 读取图片时常出现如下写法：

```python
import cv2 as cv
cat = cv.imread('./images/1.jpg')
print(cat.shape)
cv.imshow('cat')
cv.waitKey(0)
cv.destroyAllWindows()
```

问题：

* `cv.imshow('cat')` 参数不全，需给图片数组
* 没有判断图片是否读取成功
* 错误使用 `.shape`，未做 None 检查

### 推荐规范写法

```python
import cv2 as cv
cat = cv.imread('./images/1.jpg')
if cat is None:
    print("图片读取失败，请检查路径！")
else:
    print(cat.shape)
    cv.imshow('cat', cat)
    cv.waitKey(0)
    cv.destroyAllWindows()
```

### 灰度图像读取与转换

两种灰度化方法：

```python
img = cv.imread('./images/1.jpg', cv.IMREAD_GRAYSCALE)
# 或者
img = cv.imread('./images/1.jpg')
gray = cv.cvtColor(img, cv.COLOR_BGR2GRAY)
```

---

## 2. OpenCV 读取和处理 HDR 图像

* 读取 HDR 图片需要用 `cv.IMREAD_UNCHANGED` 保留高动态范围数据。
* 若需可视化或保存，需做 Tonemap 或归一化。

```python
img_hdr = cv.imread('./images/1.hdr', cv.IMREAD_UNCHANGED)
tonemap = cv.createTonemap(gamma=2.2)
ldr = tonemap.process(img_hdr)
ldr_8bit = (ldr * 255).clip(0, 255).astype('uint8')
cv.imshow('LDR', ldr_8bit)
cv.waitKey(0)
cv.destroyAllWindows()
```

---

## 3. 随机生成图像与 reshape/resize 区别

### 随机生成一张彩色/灰度/HDR图像

```python
import numpy as np
import cv2 as cv
img = np.random.randint(0, 256, (480, 640, 3), dtype=np.uint8)  # 彩色
cv.imshow('random', img)
cv.waitKey(0)
cv.destroyAllWindows()
```

### reshape 与 resize 的区别

* `reshape` 只改变数据排列，不改变图像内容，不可用于缩放或显示变化。
* `resize` 用于实际缩放图片（等比例缩放、指定尺寸）。

```python
# 正确缩放
img_resize = cv.resize(img, (100, 100))
```

---

## 4. OpenCV 视频流读取、按键控制及常见陷阱

### 视频读取正确写法

```python
import cv2 as cv
cap = cv.VideoCapture(0)
ret, frame = cap.read()
if ret:
    cv.imshow('ad', frame)
    cv2.waitKey(0)
    cv2.destroyAllWindows()
else:
    print("无法获取摄像头画面！")
cap.release()
```

### 按键检测与 0xFF 的作用

```python
if cv.waitKey(40) & 0xFF == ord('q'):
    break
```

* `0xFF` 代表255，掩码，保证跨平台拿到按键的低8位ASCII码。
* `ord('q')` 为ASCII码值。
* 这样写能避免高字节导致按键判断失效的兼容性问题。

### 按键原理说明

* OpenCV 的 `waitKey` 底层返回的是操作系统的消息编码，可能高位带有特殊信息，所以要 &0xFF。
* 标准按键（a-z, 0-9）一般没问题，特殊键（方向键、功能键）编码更高。

---

## 5. Python 字符串常用校验方法和 any 手撕原理

### 常用字符串校验

```python
s = input()
print(any(c.isalnum() for c in s))
print(any(c.isalpha() for c in s))
print(any(c.isdigit() for c in s))
print(any(c.islower() for c in s))
print(any(c.isupper() for c in s))
```

### `any()` 本质与手写实现

```python
def my_any(iterable):
    for x in iterable:
        if x:
            return True
    return False
```

---

## 6. 颜色代码入门

* `#000000` —— 纯黑色 (RGB(0,0,0))
* `#FFFFFF` —— 纯白色 (RGB(255,255,255))

---

## 7. 常见代码风格建议

* 运算符两侧要加空格（PEP8规范）。
* 变量命名要避免覆盖模块名（如 cap 不要既是模块名又是变量名）。

---

## 总结

今天主要复习了 OpenCV 读图/写图/视频流的各种易错点与底层原理，练习了字符串判断相关的 Python 小技巧，并对按键检测、十六进制、位运算等知识点做了拓展。
代码和原理清晰，建议日常写代码时多做“容错判断”，多看文档和官方规范。

---

**欢迎大家留言讨论，共同进步！**

---


