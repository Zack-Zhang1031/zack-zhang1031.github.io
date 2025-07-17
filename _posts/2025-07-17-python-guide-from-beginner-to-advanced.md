---
layout: default
title: "Python编程从入门到精通全指南"
date: 2025-07-17
author: "Zack-Zhang1031"
tags: ["Python", "开发语言"]
draft: false
---

# 目录

* [1. 认识Python](#认识python)

  * [1.1 Python的优点](#python的优点)
  * [1.2 Python的缺点](#python的缺点)
  * [1.3 Python的第一个程序](#python的第一个程序)
* [2. Python基础语法](#python基础语法)
* [3. Python基础变量](#python基础变量)
* [4. 复合类型初识](#复合类型初识)
* [5. 运算符](#运算符)
* [6. 语句](#语句)
* [7. 表达式](#表达式)
* [8. 练习与拓展](#练习与拓展)
* [总结](#总结)
* [参考文献与原文链接](#参考文献与原文链接)

---

## 1. 认识Python

Python是一门**高级通用编程语言**，由荷兰人 Guido van Rossum 于1989年发明，1991年正式发布。它强调代码的简洁和可读性，是全世界最流行的开发语言之一。主流实现为 **CPython**（标准版），也有 Jython（Java平台）、IronPython（.NET平台）、PyPy（高性能）。

### 1.1 Python的优点

* 语法简单、易学，开发效率极高
* 解释型语言，跨平台可移植性好
* 支持面向对象、函数式等多种编程范式
* 拥有丰富的标准库和第三方生态
* 自动内存管理，开发者无需关心底层细节

### 1.2 Python的缺点

* 执行速度较慢，不适合对性能极致要求的场景
* 不能做高精度、高实时性的系统开发
* 内存消耗大，不适合高并发场景
* 代码易读易改，商业闭源安全性较弱

### 1.3 Python的第一个程序

在 `PyCharm`、`VSCode` 或 `Jupyter Notebook` 中，新建 `hello.py` 文件，输入：

```python
print("Hello, Python!")
```

运行即可看到输出结果。注意：**Python区分大小写，语句必须用英文标点和符号。**

---

## 2. Python基础语法

### 2.1 行与缩进

* 每行一条语句，无需分号结尾
* 缩进表示代码块结构（如 if、for、def），**缩进必须统一**

```python
if True:
    print("正确缩进")
```

### 2.2 注释

* 单行注释：`# 注释内容`
* 多行注释：用三引号包裹，如 `''' 注释 '''` 或 `""" 注释 """`

### 2.3 输入与输出

* 输出：`print()`
* 输入：`input()`，输入内容默认是字符串，可用 `int()`、`float()` 强制类型转换

```python
name = input("请输入姓名：")
print("Hello,", name)
```

### 2.4 变量与类型

* 变量声明无需类型，可动态绑定
* 变量命名：只含字母、数字、下划线，不能以数字开头，区分大小写
* 常用类型：int（整数）、float（小数）、str（字符串）、bool（布尔）、list、tuple、dict、set、bytes、NoneType

```python
a = 10
b = 3.14
c = "Python"
d = True
```

---

## 3. Python基础变量

### 3.1 字符串（str）

* 用单引号、双引号或三引号包裹
* 支持转义、原始字符串（前缀 r）、多行字符串
* 常用操作：拼接（+）、重复（\*）、索引、切片、查找、替换、格式化（% / .format / f-string）

```python
s = "hello"
print(s[1:4])  # ell
print(f"你好, {s}")
```

### 3.2 数字类型

* int：整数，支持任意精度
* float：浮点数，科学计数法
* bool：True / False（本质上是1和0的子类）
* complex：复数

```python
a = 10
b = 3.14
c = 1 + 2j
```

类型转换：`int()`, `float()`, `str()`, `bool()`, `complex()`

### 3.3 字节串（bytes）

* 前缀 `b` 表示字节串，常用于二进制处理

```python
bs = b'abc'
```

### 3.4 空值

* `None` 表示空值/无值，类型为 NoneType

---

## 4. 复合类型初识

### 4.1 列表（list）

* 用 \[] 表示，可存储不同类型元素，支持增删改查

```python
L = [1, 2, "abc"]
L.append(4)
L[1] = 100
del L[0]
```

### 4.2 元组（tuple）

* 用 () 表示，元素不可变，常用于不可变数据组合

```python
t = (1, 2, 3)
```

### 4.3 字典（dict）

* 用 {} 表示，key-value 键值对，key唯一且不可变

```python
d = {'name': 'Alice', 'age': 20}
d['age'] = 21
```

### 4.4 集合（set / frozenset）

* 元素唯一、无序、不可重复，set可变，frozenset不可变

```python
s = {1, 2, 3}
s.add(4)
```

### 4.5 可变与不可变

* int、float、str、tuple、frozenset、bytes、None为不可变类型
* list、dict、set为可变类型
* 可变对象内容可变，不可变对象内容不可变，但变量名总是可以重新赋值

---

## 5. 运算符

### 5.1 算术运算符

`+`, `-`, `*`, `/`, `//`（整除）, `%`（取余）, `**`（幂）

### 5.2 比较运算符

`==`, `!=`, `<`, `>`, `<=`, `>=`

### 5.3 逻辑运算符

* `and`（与）
* `or`（或）
* `not`（非）

### 5.4 赋值运算符

`=`, `+=`, `-=`, `*=`, `/=`, `//=`, `**=`, `%=`, `:=`（海象运算符，Python3.8+）

### 5.5 位运算符

`&`（与）, `|`（或）, `^`（异或）, `~`（取反）, `<<`（左移）, `>>`（右移）

### 5.6 身份与成员运算符

* `is`, `is not`
* `in`, `not in`

### 5.7 三目运算符

`a if 条件 else b`

---

## 6. 语句

### 6.1 条件语句

```python
if x > 0:
    print("正数")
elif x == 0:
    print("零")
else:
    print("负数")
```

#### match-case (Python 3.10+)

```python
match x:
    case 1:
        print("一")
    case _:
        print("其他")
```

### 6.2 循环语句

* `for` 遍历序列、字典等
* `while` 重复执行直到条件不成立
* `break` 跳出循环，`continue` 跳过本次，`pass` 占位

```python
for i in range(5):
    if i == 3:
        break
    print(i)
```

---

## 7. 表达式

### 7.1 算术、比较、赋值表达式

```python
a = 5
b = 3
result = a + b
```

### 7.2 推导式

* 列表推导式：\[x for x in range(5) if x % 2 == 0]
* 字典推导式：{x: x\*x for x in range(5)}
* 集合推导式：{x for x in range(5)}
* 生成器表达式：(x\*x for x in range(5))

### 7.3 Lambda表达式

```python
f = lambda x, y: x + y
print(f(2, 3))
```

---

## 8. 练习与拓展

**1. 水仙花数**

```python
for x in range(100, 1000):
    bai = x // 100
    shi = x % 100 // 10
    ge = x % 10
    if bai ** 3 + shi ** 3 + ge ** 3 == x:
        print(x)
```

**2. 九九乘法表**

```python
for row in range(1, 10):
    for col in range(1, row+1):
        print(f'{col}x{row}={col*row}', end=' ')
    print()
```

**3. 简单用户登录**

```python
USERNAME = 'root'
PASSWORD = '123456'
times = 1
while True:
    user = input('请输入用户名: ')
    passwd = input('请输入密码: ')
    if user == USERNAME and passwd == PASSWORD:
        print('登陆成功')
        break
    if times == 3:
        print('登陆失败')
        break
    times +=1
```

---

## 总结

本文系统梳理了 Python 从环境、语法、基础变量到复合类型、运算符、语句、表达式与实用代码练习。**建议大家多练多写，多看文档，结合项目实战，逐步提升Python编程能力。**

### 进阶与实用补充

1. **变量与作用域**

```python
x = 10
def foo():
    global x
    x = 20
foo()
print(x)  # 20
```

2. **深拷贝与浅拷贝**

```python
import copy
a = [1, 2, [3, 4]]
b = copy.copy(a)
c = copy.deepcopy(a)
```

3. **字典进阶用法**

```python
d1 = {'a': 1}
d2 = {'b': 2}
d3 = d1 | d2  # Python 3.9+ 合并字典 {'a':1, 'b':2}
```

4. **异常处理**

```python
try:
    result = 1 / 0
except ZeroDivisionError:
    print("不能除以0")
finally:
    print("执行结束")
```

5. **文件操作**

```python
with open("test.txt", "w") as f:
    f.write("Hello")
```

6. **函数进阶**

```python
def foo(a, b=2, *args, **kwargs):
    pass
```

7. **模块与包**

* 如何导入模块和包
* `__name__ == '__main__'` 的作用
* 常用标准库：os、sys、datetime、random、math、collections

8. **列表/字典常见高级操作**

* 排序（sort/sorted）、反转（reverse/reversed）、查找最大/最小（max/min）、enumerate、zip、map、filter、嵌套推导式

9. **面向对象基础（OOP）**

* 类与对象、属性与方法、继承、多态、魔术方法（如 `__init__`, `__str__`）、self关键字

10. **虚拟环境和依赖管理**

```shell
python -m venv venv
source venv/bin/activate  # Linux/macOS
venv\Scripts\activate  # Windows
pip install requests
```

---

## 参考文献与原文链接

* [Python官方文档](https://docs.python.org/zh-cn/3/)
* 原文：[https://blog.csdn.net/xw3373409564/article/details/149205289](https://blog.csdn.net/xw3373409564/article/details/149205289)
* 推荐阅读：[Python3标准库官方文档](https://docs.python.org/zh-cn/3/library/stdtypes.html)
