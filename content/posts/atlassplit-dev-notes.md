---
title: "AtlasSplit 开发笔记：一个实用小工具的设计思路"
date: 2026-04-05T00:00:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "记录 AtlasSplit 这个图集拆分工具的开发思路：需求来源、技术方案选择、核心实现，以及作为小工具项目的通用经验。"
tags: ["工具开发", "Cocos Creator", "图集", "AtlasSplit"]
categories: ["工具建站", "工具开发"]
---

做 Cocos Creator 游戏时经常需要把打包好的图集（Atlas）拆回单张图片，但市面上顺手的工具不多，于是自己写了个 AtlasSplit。这篇笔记记录这个小工具的开发思路——从需求定义到技术方案，再到核心实现，希望能给"想做小工具但不知从何下手"的朋友一个参考。

---

## 一、需求来源

### 1.1 什么场景需要拆图集

做 Cocos Creator 游戏时，设计师给的素材经常是已经打包好的图集，常见两种格式：

- **TexturePacker**：`.plist`（元数据）+ `.png`（大图）
- **Cocos Creator 自动图集**：`.meta`（元数据）+ `.png`（大图）

正常使用没问题，但遇到下面这些场景就需要把图集**拆回单张图片**：

- **重新编辑**：设计师给的图集需要修改其中几帧，但原图丢了
- **迁移项目**：把素材迁到另一个项目，新项目不想用原来的图集结构
- **适配新引擎**：从 Cocos 迁到 Unity 或 Godot，新引擎不认 `.plist` 格式
- **微调单帧**：某一帧需要单独处理（加边、改色），打包在图集里没法单独操作

### 1.2 现有方案的不足

| 方案 | 问题 |
|------|------|
| **TexturePacker** | 只能打包，不能反向拆分 |
| **Cocos Creator 编辑器** | 没有内置"导出图集为单帧"功能 |
| **网上在线工具** | 多数只支持 TexturePacker `.json`，不支持 Cocos `.meta`；上传素材到陌生网站也不放心 |
| **Photoshop 手动裁切** | 每帧都要手动切框 + 另存，几十帧就要半天 |

试了一圈没有顺手的，干脆自己写一个。

### 1.3 工具的核心目标

一句话定义：

> **输入 Cocos / TexturePacker 图集（元数据 + PNG 大图），自动拆分为按帧名命名的单张 PNG 文件。**

不追求花哨功能，能把图集拆成单张 PNG 就算完成任务。

---

## 二、技术方案选择

### 2.1 候选方案对比

| 方案 | 优点 | 缺点 |
|------|------|------|
| **Python + Pillow** | 跨平台、Pillow 库成熟、Python 用户多、开发快 | 性能一般，大批量图集稍慢 |
| **Node.js + sharp** | 高性能（基于 libvips）、异步并发好 | 用户得装 Node 环境，依赖原生模块编译 |
| **Cocos Creator 编辑器插件** | 引擎原生支持、直接读 `.meta` | 只能在 Cocos 编辑器里用，非 Cocos 用户没法用 |
| **Go + imaging** | 单二进制部署、跨平台 | 图像库生态不如 Pillow，开发速度慢 |

### 2.2 为什么选 Python + Pillow

最终选 Python + Pillow，原因：

1. **图像处理生态最成熟**：Pillow 是事实标准，文档齐全，遇到问题搜索容易
2. **目标用户多是有 Python 环境的开发者**：装一个 `pip install pillow` 没门槛
3. **开发速度优先**：小工具不需要极致性能，能跑就行
4. **跨平台无依赖**：Windows / macOS / Linux 都能跑，不像 sharp 还要编译原生模块

性能上 Pillow 裁剪图片很快，单张图集几十帧的拆分都是毫秒级，没必要为了性能上 Node.js。

### 2.3 输入输出格式定义

**输入**：

- 图集元数据文件：`.plist` / `.json` / `.meta`（自动识别后缀）
- 对应的 PNG 大图：与元数据文件同目录、同名 `.png`

**输出**：

- 输出目录下，按帧名命名的单张 PNG 文件
- 帧名直接来自元数据里的 `frame name`，保持原始命名

举例：

```
输入：
  assets/coins.plist
  assets/coins.png

输出：
  output/coins/coin_01.png
  output/coins/coin_02.png
  output/coins/coin_03.png
  ...
```

---

## 三、核心实现

### 3.1 图集元数据解析

三种格式的元数据结构差别挺大，需要分别写解析器。

#### .plist 格式（Cocos 旧版 / TexturePacker）

`.plist` 是 XML，关键信息在 `frames` 字典里：

```xml
<key>frames</key>
<dict>
  <key>coin_01.png</key>
  <dict>
    <key>frame</key>
    <string>{{0,0},{32,32}}</string>     <!-- {x,y}_{w,h} -->
    <key>offset</key>
    <string>{{0,0}}</string>
    <key>rotated</key>
    <false/>
    <key>sourceColorRect</key>
    <string>{{0,0},{32,32}}</string>
    <key>sourceSize</key>
    <string>{32,32}</string>
  </dict>
</dict>
```

用 Python 标准库 `plistlib` 直接读：

```python
import plistlib

def parse_plist(path):
    with open(path, 'rb') as f:
        data = plistlib.load(f)
    frames = {}
    for name, info in data['frames'].items():
        frames[name] = {
            'frame': parse_rect(info['frame']),       # {x, y, w, h}
            'offset': parse_point(info['offset']),     # {x, y}
            'rotated': info.get('rotated', False),
            'source_size': parse_size(info['sourceSize']),
        }
    return frames
```

`parse_rect` 之类的工具函数负责把 `"{{0,0},{32,32}}"` 这种字符串解析成字典。

#### .json 格式（TexturePacker）

```json
{
  "frames": [
    {
      "filename": "coin_01.png",
      "frame": {"x":0, "y":0, "w":32, "h":32},
      "rotated": false,
      "sourceSize": {"w":32, "h":32},
      "spriteSourceSize": {"x":0, "y":0, "w":32, "h":32}
    }
  ]
}
```

直接用 `json.load` 解析，字段已经是结构化数据，比 plist 友好得多。

#### .meta 格式（Cocos Creator）

Cocos Creator 的 `.meta` 是 JSON，但结构嵌套很深：

```json
{
  "subMetas": {
    "coin_01": {
      "frame": {"x":0, "y":0, "w":32, "h":32},
      "rawTextureUuid": "...",
      "rotated": false,
      "offsetX": 0,
      "offsetY": 0,
      "originalSourceSize": {"width":32, "height":32}
    }
  }
}
```

注意 Cocos 的 `originalSourceSize` 用的是 `width/height`，TexturePacker 用的是 `w/h`，解析时要做字段适配。

### 3.2 区域裁剪算法

裁剪本身不难，难点在三个地方：**旋转、offset、透明边距**。

#### 旋转处理

如果 `rotated = true`，图集里这帧是顺时针旋转 90° 存的，frame 里的 `w` 和 `h` 是**旋转后**的尺寸。裁剪时：

```python
if rotated:
    # frame 里 w/h 是旋转后的，实际原图宽高要对调
    real_w, real_h = rect['h'], rect['w']
    crop_box = (rect['x'], rect['y'],
                rect['x'] + rect['h'],    # 注意用 h
                rect['y'] + rect['w'])    # 注意用 w
else:
    real_w, real_h = rect['w'], rect['h']
    crop_box = (rect['x'], rect['y'],
                rect['x'] + rect['w'],
                rect['y'] + rect['h'])

frame_img = atlas_img.crop(crop_box)
if rotated:
    frame_img = frame_img.rotate(-90, expand=True)
```

Pillow 的 `crop` 接受 `(left, upper, right, lower)` 元组，`rotate(-90, expand=True)` 把顺时针旋转 90° 的图转回来。

#### offset 计算

图集里的 offset 是相对**中心点**的偏移，不是相对左上角。要把 frame 渲染到 sourceSize 大小的画布上，需要算出左上角坐标：

```python
canvas = Image.new('RGBA',
                   (source_size['w'], source_size['h']),
                   (0, 0, 0, 0))

# offset 是中心点偏移，转换为左上角坐标
paste_x = (source_size['w'] - real_w) // 2 + offset['x']
paste_y = (source_size['h'] - real_h) // 2 - offset['y']  # Y 轴方向相反

canvas.paste(frame_img, (paste_x, paste_y))
```

注意 Cocos / TexturePacker 的 Y 轴方向有时是向上的（数学坐标系），裁剪时要按 `sourceSize.h - y` 翻转一次。

#### 透明边距

`sourceSize` 是这一帧在原图（打包前）的实际尺寸，`frame` 是图集中存放的实际像素区域。如果原图比 frame 大（比如原本 64×64，打包时四周裁掉了透明像素，只剩 32×32 的有效区域），就需要把 frame 渲染到 sourceSize 大小的透明画布上，恢复原图尺寸。

这就是上面 `canvas` 的作用——`sourceSize` 和 `frame` 的尺寸差就是透明边距。

### 3.3 批量处理

遍历所有帧，逐个裁剪并保存：

```python
from PIL import Image
from pathlib import Path
from tqdm import tqdm

def split_atlas(meta_path, png_path, output_dir):
    atlas_img = Image.open(png_path).convert('RGBA')
    frames = parse_metadata(meta_path)  # 自动识别 plist/json/meta

    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    success, failed = 0, 0
    for name, info in tqdm(frames.items(), desc='Splitting'):
        try:
            frame_img = crop_frame(atlas_img, info)
            out_path = output_dir / Path(name).name
            frame_img.save(out_path, 'PNG')
            success += 1
        except Exception as e:
            print(f'[FAIL] {name}: {e}')
            failed += 1

    print(f'\nDone. Success: {success}, Failed: {failed}')
    return success, failed
```

用 `tqdm` 加进度条，让用户在拆大批量图集时知道还剩多少，不至于以为程序卡死。

### 3.4 错误处理

需要处理的几种异常情况：

| 错误 | 处理方式 |
|------|----------|
| 元数据文件不存在 | 直接报错退出，提示路径 |
| 对应的 PNG 大图不存在 | 报错，提示用户检查文件名是否一致 |
| PNG 文件损坏（Pillow 抛 OSError） | 跳过当前图集，继续处理下一个 |
| 帧名重复 | 自动加 `_1`、`_2` 后缀，避免覆盖 |
| 裁剪区域超出大图边界 | 警告，按实际可用区域裁剪 |

帧名重复这个一定要处理——Cocos 自动图集偶尔会生成同名帧，不处理就会互相覆盖，最后输出文件比预期少。

### 3.5 完整裁剪函数

把上面的逻辑合在一起：

```python
from PIL import Image

def crop_frame(atlas_img, info):
    """根据帧信息从大图裁出单帧，返回 RGBA Image"""
    rect = info['frame']
    rotated = info['rotated']
    source_size = info['source_size']
    offset = info['offset']

    # 1. 计算裁剪框
    if rotated:
        # 旋转后 w/h 互换
        crop_box = (rect['x'], rect['y'],
                    rect['x'] + rect['h'],
                    rect['y'] + rect['w'])
        real_w, real_h = rect['h'], rect['w']
    else:
        crop_box = (rect['x'], rect['y'],
                    rect['x'] + rect['w'],
                    rect['y'] + rect['h'])
        real_w, real_h = rect['w'], rect['h']

    frame_img = atlas_img.crop(crop_box)
    if rotated:
        frame_img = frame_img.rotate(-90, expand=True)

    # 2. 创建 sourceSize 大小的画布，把 frame 贴到正确位置
    canvas = Image.new('RGBA',
                       (source_size['w'], source_size['h']),
                       (0, 0, 0, 0))
    paste_x = (source_size['w'] - real_w) // 2 + offset['x']
    paste_y = (source_size['h'] - real_h) // 2 - offset['y']
    canvas.paste(frame_img, (paste_x, paste_y))

    return canvas
```

这个函数大概 30 行，是整个工具的核心。剩下的都是 IO 和参数解析。

---

## 四、用户体验设计

### 4.1 命令行 vs GUI

| 维度 | CLI | GUI |
|------|-----|-----|
| 开发成本 | 低（argparse 就够） | 高（Tkinter / PyQt） |
| 适合自动化 | 是（可串进 build pipeline） | 否 |
| 目标用户 | 开发者 | 非技术用户 |
| 跨平台 | 一致 | 难（GUI 框架各有问题） |

AtlasSplit 的目标用户是游戏开发者，本身就在用命令行工具，选 CLI 是显而易见的。如果将来想给设计师用，再考虑包个 Web UI（用 Flask 起本地服务）。

### 4.2 参数设计

最终 CLI 接口：

```bash
python atlassplit.py \
  --input assets/coins.plist \
  --output output/coins \
  --format auto          # 可选：auto/plist/json/meta
```

参数说明：

- `--input`：图集元数据文件路径（必填）
- `--output`：输出目录（可选，默认 `./output/<input 文件名>`）
- `--format`：强制指定格式；默认 `auto` 按文件后缀自动识别

`auto` 模式的识别逻辑：

```python
def detect_format(path):
    ext = Path(path).suffix.lower()
    if ext == '.plist':
        return 'plist'
    elif ext == '.json':
        return 'json'
    elif ext == '.meta':
        return 'meta'
    else:
        raise ValueError(f'Unknown atlas format: {ext}')
```

设计原则：**让用户少打字**。默认行为覆盖 90% 场景，特殊需求才需要显式指定。

### 4.3 进度反馈

```python
from tqdm import tqdm

for name, info in tqdm(frames.items(),
                       desc='Splitting',
                       unit='frame'):
    ...
```

终端输出长这样：

```
Splitting: 100%|██████████| 48/48 [00:00<00:00, 1200.34frame/s]

Done. Success: 47, Failed: 1
[FAIL] coin_24.png: crop box out of bounds
```

成功 / 失败计数让用户一眼看到结果，失败帧的具体原因也打出来方便排查。

### 4.4 日志

日志输出同时打到 stdout 和文件：

```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('atlassplit.log', encoding='utf-8'),
    ]
)
```

文件日志保留每次运行记录，方便事后排查。开发者用工具出了问题，把 `atlassplit.log` 发给我，比让他们截屏终端友好得多。

---

## 五、小工具项目的通用经验

### 5.1 怎么判断工具值不值得做

我自己的判断标准：

> **同一个操作重复做了 3 次以上，就值得自动化。**

AtlasSplit 的契机是做《捡钱》和《数钱》两个游戏时，反复需要把设计师给的图集拆开调整。前两次手动用 PS 切，第三次受不了了，直接开写工具。

判断"值不值得做"不要看市场规模、不要看 GitHub star 潜力，就看一个指标：**自己会不会反复用**。会就用，不会就别浪费时间。

### 5.2 MVP 与功能蔓延

AtlasSplit 的版本演进：

| 版本 | 功能 | 动机 |
|------|------|------|
| **v0.1** | 只支持 `.plist` | 当时只用了这种格式 |
| **v0.2** | 加 `.json` 支持 | TexturePacker 用户提需求 |
| **v0.3** | 加 `.meta` 支持 | 切到 Cocos Creator 后自己要用了 |
| **v0.4** | 加进度条 + 日志 | 拆大批量图集时体验差 |

每个版本都是**实际遇到需求才加**，不是一开始就规划"完整功能集"。如果一开始就想着"我要支持所有图集格式 + GUI + 在线版"，大概率写不完。

小工具的 MVP 原则：**先解决自己的一个问题**，验证有用后再扩展。

### 5.3 开源后维护心态

开源 AtlasSplit 后我学到几件事：

- **小工具不需要持续迭代**：解决了自己的问题，顺手开源，有人 fork 是 bonus，没人用也不亏
- **Issue 不必秒回**：业余项目，按自己节奏处理就好
- **PR 比赞美更有价值**：收到一个修 bug 的 PR 比收到十个 star 实在
- **写清楚 README**：用户能不能用起来 80% 取决于 README 写得好不好

### 5.4 AtlasSplit 的实际使用

AtlasSplit 在我自己的项目里用过几次：

- **《捡钱》**：把设计师给的角色动画图集拆开，单独调整某一帧的发光效果
- **《数钱》**：把 Cocos 自动图集拆出来，迁移到另一个 Unity 小项目里用
- **教学场景**：给新手演示"图集是怎么打包的"，反着拆一遍最直观

工具本身没多少人 star，但每次我自己用它省下来的时间，就值回开发成本了。这才是小工具的真正价值——**不在于多火，而在于让重复劳动消失**。

---

## 小结

AtlasSplit 是个不大的工具，开发时间也就一两个周末，但写完之后多次救场，让我意识到"小工具"被严重低估了。很多开发者一上来就想做"大项目"，结果大项目没做完，日常的重复劳动却一直在忍受。

如果你手头也有"已经做了 3 次以上"的重复操作，强烈建议花个周末写个小工具——不一定要开源，不一定精致，能解决自己的问题就够。这种小工具积累多了，工作效率会肉眼可见地提升。
