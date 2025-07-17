# Python 基础进阶与底层原理梳理（一）
---
layout: default
date: 2025-07-16
tags: ["Python", "基础"]
---
作者：JensenHY
日期：2025-07-15

---

> 本文系统梳理了 Python 编程中经常困扰初学者和进阶者的底层原理，包括参数传递顺序、作用域、装饰器链、面向对象类与属性、魔术方法、容器实现原理、字符串格式化、正则库使用等。所有内容均以代码实例和详细原理解读为主，帮助读者“知其然，更知其所以然”。

## 1. Python 函数参数传递与作用域

### 1.1 参数传递方式

* **位置传参**：按顺序为形参赋值。
* **关键词传参**：通过参数名赋值，顺序无关。
* **混合传参**：必须先位置后关键词。

**示例：**

```python
# 定义函数
def foo(a, b, c):
    print(a, b, c)

foo(1, 2, 3)              # 位置传参
d = {'b': 20, 'c': 30}
foo(1, **d)               # 位置 + 关键词
foo(a=100, b=200, c=300)  # 关键词传参
```

### 1.2 函数参数定义顺序

* 位置参数 → 默认参数 → \*args → 仅关键词参数 → \*\*kwargs

```python
def bar(a, b=2, *args, c=3, **kwargs):
    pass
```

### 1.3 变量作用域与 LEGB

* **Local**：局部变量（函数体内部）
* **Enclosing**：外层函数的局部变量（嵌套函数）
* **Global**：全局变量（模块级）
* **Builtin**：Python 内置命名空间

**查找顺序：** Local → Enclosing → Global → Builtin

---

## 2. 装饰器链与执行顺序

### 2.1 装饰器链基本原理

* 多个装饰器 @ 叠加时，最靠近函数体的先执行装饰，最外层最后装饰。
* 实际调用时，执行顺序“由外到内”。

**示例：**

```python
def deco1(fn):
    def wrapper(*args, **kwargs):
        print('deco1 before')
        res = fn(*args, **kwargs)
        print('deco1 after')
        return res
    return wrapper

def deco2(fn):
    def wrapper(*args, **kwargs):
        print('deco2 before')
        res = fn(*args, **kwargs)
        print('deco2 after')
        return res
    return wrapper

@deco1
@deco2
def hello():
    print('hello world')

hello()
# 输出：
# deco1 before
# deco2 before
# hello world
# deco2 after
# deco1 after
```

### 2.2 闭包、递归链与作用域

```python
def fun(n=None, o=None):
    print(o)
    return {'fun': lambda m: fun(m, n)}

a = fun(0)          # None
# a['fun'](1)      # 0
# a['fun'](2)      # 0

b = fun(0)['fun'](1)    # None 0
# b['fun'](2)       # 1
# b['fun'](3)       # 1

c = fun(0)['fun'](1)['fun'](2)
# c['fun'](3)       # 2
# c['fun'](6)       # 2
```

* 每一层 lambda 都捕获了“上一次 n”，体现了闭包和递归链的状态传递。

---

## 3. Python 面向对象编程深度剖析

### 3.1 类、对象、属性、方法

* **类**是模板，描述一类事物的特征和行为。
* **对象**是类的实例，具体的“某个东西”。
* **属性**是对象的状态/特征，通常在 **init** 里用 self.xxx 初始化。
* **方法**是类内定义的函数，第一个参数是 self。

```python
class Student:
    def __init__(self, name, age):
        self.name = name
        self.age = age
    def introduce(self):
        print(f"大家好，我叫{self.name}，今年{self.age}岁。")

stu = Student("张三", 18)
stu.introduce()
```

### 3.2 self 语义

* self 代表“谁调用方法，self 就是谁”
* 类属性 vs 实例属性：类属性属于类本身，实例属性属于对象。

---

## 4. 属性查找顺序（MRO）与继承链

* 访问属性时顺序为：对象自身 → 类属性 → 父类属性 → object → AttributeError

```python
class A:
    x = 'A-x'
class B(A):
    pass
class C(B):
    pass
c = C()
print(c.x)   # 查找顺序 C→B→A
print(isinstance(c, A))    # True
print(issubclass(C, B))    # True
```

---

## 5. 魔术方法与 **str**、**repr**

* 魔术方法是以 **xxx** 命名，由 Python 自动调用，赋予类特殊能力。
* **str**：决定 print(obj) 的友好字符串表示。
* **repr**：开发者视角，交互式环境和 repr(obj) 调用，建议可还原。

```python
class Cat:
    def __init__(self, name):
        self.name = name
    def __str__(self):
        return f"Cat({self.name})"
    def __repr__(self):
        return f"Cat(name={self.name!r})"

c = Cat("小白")
print(c)        # Cat(小白)
print(repr(c))  # Cat(name='小白')
```
