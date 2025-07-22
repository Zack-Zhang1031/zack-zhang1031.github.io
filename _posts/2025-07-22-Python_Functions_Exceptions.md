---
layout: default
title: " Python 入门进阶笔记：函数、异常处理与高阶函数全掌握！"
date: 2025-07-16
description: "Python 入门进阶笔记：函数、异常处理与高阶函数全掌握！"
tags: ["Python", "基础"]
---
## 前言

在 Python 学习的第 5 天，我系统学习了函数的定义与使用、高阶函数的运用技巧，以及异常处理机制。本文将总结我对这些核心语法的理解与实战感悟，帮助初学者快速构建稳健的程序框架。

---

## 一、函数基础：从定义到递归

### ✅ 函数的定义与调用

Python 使用 `def` 定义函数，推荐命名具有语义性：

```python
def greet(name):
    print(f"Hello, {name}!")
greet("Alice")  # 输出：Hello, Alice!
```

### ✅ 参数传递方式

| 类型    | 示例                                 | 说明         |
| ----- | ---------------------------------- | ---------- |
| 位置参数  | `greet("Bob", 25)`                 | 按顺序传值      |
| 关键字参数 | `greet(age=25, name="Bob")`        | 指定参数名传值    |
| 默认参数  | `def greet(name="朋友"):`            | 调用时可不传     |
| 可变参数  | `*args`、`**kwargs`                 | 接收多个实参或键值对 |
| 解包调用  | `greet(*info)`、`show_info(**dict)` | 元组/字典快速传参  |

### ✅ 递归与边界墙思维

```python
def factorial(n):
    if n == 0:
        return 1  # 边界墙
    return n * factorial(n - 1)  # 递归步骤
```

---

## 二、匿名函数与高阶函数

### ✅ Lambda 表达式

适用于只使用一次、逻辑较简单的函数：

```python
square = lambda x: x ** 2
print(square(3))  # 输出：9
```

### ✅ 高阶函数

Python 的一大特色：函数可以作为参数传递！

```python
from functools import reduce

nums = [1, 2, 3, 4]
print(list(map(lambda x: x * 2, nums)))      # [2, 4, 6, 8]
print(list(filter(lambda x: x % 2 == 0, nums)))  # [2, 4]
print(reduce(lambda x, y: x + y, nums))      # 10
```

配合 `sorted`, `zip`, `any`, `all` 等内置函数，可以实现强大的一行数据处理逻辑。

---

## 三、异常处理机制详解

### ✅ try-except-finally 结构

```python
try:
    result = 10 / 0
except ZeroDivisionError:
    print("除数不能为 0！")
finally:
    print("程序结束")
```

* `try`: 包裹可能出错的代码
* `except`: 捕获指定异常
* `else`: 未出错时执行
* `finally`: 无论是否异常都执行（如关闭文件）

### ✅ raise 主动抛出异常

```python
if not isinstance(data, list):
    raise TypeError("数据必须为列表")
```

用于输入检查、业务流程控制。

### ✅ assert 调试利器

```python
assert len(password) >= 8, "密码长度过短"
```

用于开发期间强制验证条件，生产环境可被 `-O` 忽略。

---

## 四、实战案例：自定义排序函数

```python
from collections.abc import Iterable

def insert_sorted(iterable, *, key=None, reverse=False):
    if not isinstance(iterable, Iterable):
        raise TypeError("参数不是可迭代对象")
    if key is not None and not callable(key):
        raise TypeError("key 参数必须是可调用的")
    ...
```

通过 `raise` 抛出类型错误，通过 `try-except` 捕获异常提示用户，构建了一个更健壮的排序函数。

---

## 五、总结

| 特性                 | 应用场景         |
| ------------------ | ------------ |
| 函数定义               | 模块化封装、重复调用   |
| Lambda 表达式         | 快捷定义一次性逻辑    |
| 高阶函数               | 数据管道式编程、函数组合 |
| try-except-finally | 程序稳定性与容错处理   |
| raise/assert       | 输入校验、调试断言    |

掌握这些内容，是从 Python 新手走向项目实践者的重要一步。下一步，我将继续深入学习模块组织、类与对象、文件读写等内容，构建更大的项目逻辑！

---

**📌 你也可以留言交流：你最常用的高阶函数或异常处理技巧是什么？欢迎一起探讨！**

---
