---
layout: default
date: 2025-07-16
tags: ["Python", "基础"]
---
---

## 二、容器类(list、dict)的实现与魔术方法

### 1. list 和 dict 的原理简介

* `list` 本质是**动态数组**，支持快速索引、自动扩容。
* `dict` 本质是**哈希表**，插入、查找速度快，键必须可哈希。

### 2. 自定义 list/dict 基础实现

#### 2.1 自定义 MyList

```python
class MyList:
    def __init__(self, iterable=None):
        self.data = list(iterable) if iterable else []

    def append(self, value):
        self.data.append(value)

    def __getitem__(self, idx):
        return self.data[idx]

    def __setitem__(self, idx, value):
        self.data[idx] = value

    def __len__(self):
        return len(self.data)

    def __iter__(self):
        return iter(self.data)
```

#### 2.2 自定义 MyDict

```python
class MyDict:
    def __init__(self):
        self._keys = []
        self._values = []

    def __setitem__(self, key, value):
        if key in self._keys:
            idx = self._keys.index(key)
            self._values[idx] = value
        else:
            self._keys.append(key)
            self._values.append(value)

    def __getitem__(self, key):
        if key in self._keys:
            idx = self._keys.index(key)
            return self._values[idx]
        raise KeyError(key)

    def __delitem__(self, key):
        if key in self._keys:
            idx = self._keys.index(key)
            self._keys.pop(idx)
            self._values.pop(idx)
        else:
            raise KeyError(key)

    def __contains__(self, key):
        return key in self._keys

    def keys(self):
        return self._keys.copy()

    def values(self):
        return self._values.copy()

    def items(self):
        return list(zip(self._keys, self._values))
```

---

## 三、dict 常用属性与拷贝原理

### 1. dict 常用魔术方法与方法

* `__getitem__`：索引取值 d\[key]
* `__setitem__`：设置 d\[key] = value
* `__delitem__`：删除 del d\[key]
* `__contains__`：判断 key in d
* 其它如 keys(), values(), items() 等

### 2. dict 的 copy() 方法

* `copy()` 返回浅拷贝，新对象但内部可变元素仍共享。

```python
d1 = {'a': [1,2]}
d2 = d1.copy()
d2['a'].append(3)
print(d1)  # {'a': [1,2,3]}  # 因为是浅拷贝，列表是共享的
```

* 深拷贝：用 `copy.deepcopy()`，彻底独立。

---

## 四、字符串格式化方法

### 1. `str.format(*args, **kwargs)`

* 位置参数、关键字参数灵活填充：

```python
s = "Hello {}, your score is {score}".format("Alice", score=95)
print(s)  # Hello Alice, your score is 95
```

### 2. `str.format_map(mapping)`

* 直接用字典映射填充，占位符全部从字典找：

```python
d = {'name': 'Bob', 'score': 100}
s = "Hi {name}, score={score}".format_map(d)
print(s)  # Hi Bob, score=100
```

### 3. 两者实现原理简析

* `format` 是支持多参数/多方式填充的万能方法
* `format_map` 只接受一个“映射类型”（如 dict）参数

---

## 五、正则表达式与 re.sub 实践

### 1. `import re` —— 正则表达式库

* 用于字符串模式匹配、替换、分割、查找等操作。

### 2. `re.sub(pattern, repl, string)`

* 将 string 中所有匹配 pattern 的内容用 repl 替换，返回新字符串。

```python
import re
text = "Phone: 123-4567, 234-5678"
result = re.sub(r'\d{3}-\d{4}', 'XXX-XXXX', text)
print(result)  # Phone: XXX-XXXX, XXX-XXXX
```

* 支持传入函数作为 repl，根据匹配内容动态生成替换内容。

---

## 六、总结与学习建议

* 熟悉 Python 的参数传递、作用域和闭包原理，对理解函数式与面向对象编程都有很大帮助。
* 灵活使用魔术方法，可以让自定义类拥有类似原生类型的操作体验。
* 掌握字符串格式化和正则表达式，有助于写出高效、优雅的数据处理和文本操作代码。
* 推荐多做实验，多用 print、dir、type、help 探索对象和方法行为，加深理解。

---
