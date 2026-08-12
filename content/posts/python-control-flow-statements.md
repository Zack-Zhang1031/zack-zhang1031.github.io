---
title: "Python 控制流语句详解：赋值、条件与循环"
date: 2025-05-10T00:00:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "系统讲解 Python 三大控制流语句：赋值语句（含解包/索引赋值）、条件语句（if-elif-else 与 match-case）、循环语句（for/while 及 break/continue），附完整代码示例。"
tags: ["Python", "控制流", "基础语法"]
categories: ["Python", "编程基础"]
---

控制流是任何程序的骨架——它决定了代码"何时执行、执行多少次、走哪条分支"。这篇笔记把 Python 中最常用的三类语句（赋值、条件、循环）一次梳理清楚，并补充 `match-case`、解包赋值等 Python 3.10+ 的新写法，适合刚入门或想系统复习基础语法的同学。

---

## 目录

* 系列目录
* 引言
* 一、赋值语句

  * 1. 基本形式
* 二、条件语句

  * 1. if-elif-else
  * 2. match-case
* 三、循环语句

  * 1. for 循环
  * 2. while 循环
  * 3. 循环控制语句
* 总结

---

## 引言

本文介绍 Python 中最常用的**语句**（statements）：赋值、条件和循环语句。语句与表达式的区别在于——**语句主要执行动作，不返回值**（例如 for 循环只是"操作"一组数据，而不是返回一个新对象）。理解这些语句是写好 Python 程序的第一步。**函数定义和异常处理**将在后续单独讲解。

---

## 一、赋值语句

赋值语句用于**将一个引用绑定到对象**，即给变量赋值。常见形式包括：

### 1. 基本形式

**变量赋值**

```python
a = 4
b = a + 2
```

**元组或列表解包赋值**

```python
# 元组解包
(a, b) = (1, 2)
print(a, b)   # 输出: 1 2

# 列表解包
[c, d] = [3, 4]
print(c, d)   # 输出: 3 4
```

**属性赋值**

```python
class Dog:
    pass

dog1 = Dog()
dog1.weight = 10
print(dog1.weight)  # 输出: 10
```

**索引赋值**

```python
# 列表
lst = [5, 6, 7]
lst[0] = 4
print(lst)  # [4, 6, 7]

# 字典
d = {'one': 1, 'two': 2}
d['one'] = '一'
print(d)  # {'one': '一', 'two': 2}
```

---

## 二、条件语句

条件语句用于**做决策并执行不同的代码块**。核心语句是 `if-elif-else` 和 `match-case`。

### 1. if-elif-else

#### 1.1 语法形式

```python
if condition1:
    block1
elif condition2:
    block2
else:
    block3
```

#### 1.2 示例

**成绩判定**

```python
score = 85
if score >= 90:
    print("优秀")
elif score >= 60:
    print("及格")
else:
    print("不及格")
```

输出：及格

---

### 2. match-case（Python 3.10+）

适合**多分支选择**的场景，比连续的 `if-elif-else` 更清晰。

#### 2.1 语法形式

```python
match expression:
    case pattern1:
        block1
    case pattern2:
        block2
    case _:
        default block
```

#### 2.2 示例

**命令状态判断**

```python
command = "start"
match command:
    case "start":
        print("启动程序")
    case "stop":
        print("停止程序")
    case _:
        print("未知命令")
```

输出：启动程序

---

## 三、循环语句

循环语句用于**重复执行某些操作**，主要有 `for` 和 `while` 两种。

### 1. for 循环

用于遍历可迭代对象，如 list、str、dict 等。

#### 1.1 语法形式

```python
for variable in iterable:
    block
```

#### 1.2 示例

**统计字符串中每个字符的出现次数**

```python
text = "hello world"
letter_count = {}
for char in text:
    if char.isalpha():
        char = char.lower()
        letter_count[char] = letter_count.get(char, 0) + 1
print(letter_count)
# 输出: {'h': 1, 'e': 1, 'l': 3, 'o': 2, 'w': 1, 'r': 1, 'd': 1}
```

---

### 2. while 循环

用于**循环次数不确定**的场景，只要条件为真就继续执行。

#### 2.1 语法形式

```python
while condition:
    block
```

#### 2.2 示例

**登录验证：最多三次尝试**

```python
correct_username = "admin"
correct_password = "123456"
attempts = 0
max_attempts = 3

while True:
    username = input("请输入用户名: ")
    password = input("请输入密码: ")
    attempts += 1
    if username == correct_username and password == correct_password:
        print("登录成功！")
        break
    else:
        print("用户名或密码错误。")
    if attempts >= max_attempts:
        print("尝试次数过多，账号已锁定。")
        break
```

---

### 3. 循环控制语句

#### break — 终止循环

```python
for i in range(10):
    if i == 3:
        break
    print(i)  # 输出: 0 1 2
```

#### continue — 跳过本次，进入下一次迭代

```python
for i in range(5):
    if i == 2:
        continue
    print(i)  # 输出: 0 1 3 4
```

#### pass — 空操作，仅作占位（了解即可）

```python
for i in range(3):
    if i == 1:
        pass  # 这里什么都不做
    print(i)
# 输出: 0 1 2
```

---

## 总结

* **语句**是 Python 中最基本的动作单元，不直接返回值。注意区分"语句"和"表达式"。
* 掌握**赋值语句**的多种形式，灵活进行变量/对象绑定与解包。
* 熟练使用**条件语句**（`if-elif-else` 和 `match-case`）实现分支逻辑。
* 理解 **for** 和 **while** 循环的区别与适用场景，学会用 `break` 和 `continue` 控制流程。
* 后续将学习函数、异常处理等进阶主题。

---

**推荐阅读：**

* [Python 官方文档：控制流](https://docs.python.org/3/tutorial/controlflow.html)
* [廖雪峰 Python 教程：条件和循环](https://www.liaoxuefeng.com/wiki/1016959663602400/1017261630425888)

---
