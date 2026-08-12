---
title: "Cocos Creator 性能优化与资源管理技巧"
date: 2026-05-12T00:00:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "整理 Cocos Creator 休闲小游戏开发中的性能优化经验：DrawCall 合批、资源加载与释放、纹理压缩、对象池，以及 Profiler 的使用方法。"
tags: ["Cocos Creator", "性能优化", "游戏开发", "资源管理"]
categories: ["游戏开发", "技术实践"]
---

休闲小游戏虽然规模小，但性能问题一样会让玩家流失——加载慢、掉帧、闪退，任何一个都足以让好评变差评。这篇笔记整理我在 Cocos Creator 开发中积累的性能优化经验，从 DrawCall 合批到资源释放，再到对象池和纹理压缩，每条都附实际项目中的对比数据。

---

## 一、DrawCall 优化

### 1.1 什么是 DrawCall

DrawCall 就是 CPU 向 GPU 发出的一次绘制命令。每次绘制都要经历"设置材质 → 上传参数 → 调用绘制"的开销，**DrawCall 数量过多时，瓶颈会卡在 CPU 而不是 GPU**——这是 Cocos Creator 休闲小游戏最常见的掉帧原因。

简单说：100 个独立 sprite 各画一次，比 100 个 sprite 合在一个图集里画一次要慢得多。

### 1.2 合批策略对比

Cocos Creator 内置两种合批机制：

| 策略 | 触发条件 | 适用场景 | 开销 |
|------|---------|---------|------|
| 静态合批 | 相同材质、不移动的节点 | 背景贴图、静态 UI | 构建时合并，运行时几乎零开销 |
| 动态合批 | 相同材质、小网格（顶点数 < 阈值） | 大量同类型小物体 | 运行时每帧合并，有 CPU 开销 |
| 图集合批 | 同一图集的 sprite | 通用场景 | 最常用，效果显著 |

### 1.3 图集（Atlas）的制作与使用

图集是把多张小图合并成一张大图，让使用这些小图的 sprite 自动合批。制作方式有两种：

**方式一：Cocos Creator 自带 Auto Atlas**

在 `resources` 或 `assets` 目录右键 → 新建 → Auto Atlas，配置如下：

```text
Max Width: 1024
Max Height: 1024
Padding: 2
Allow Rotation: ✓
Force Squared: ✓
POT (Power of Two): ✓
```

**方式二：TexturePacker**

更专业的工具，能输出更紧凑的图集，支持多分辨率。导出为 JSON + PNG 后在 Cocos Creator 中作为 SpriteAtlas 引入。

### 1.4 图集使用规则

- **同一图集的 sprite 会自动合批**，所以把同屏出现的元素放进一个图集
- **不同图集之间会增加 DrawCall**，所以同屏 sprite 尽量控制在 1-2 个图集
- **图集不要过大**：单图超过 2048×2048 在部分移动端 WebGL 会受限
- **避免穿插**：A 图集的 sprite 夹在 B 图集的两个 sprite 之间会打断合批

### 1.5 实际项目对比

《捡钱》优化前的 DrawCall 是 45，因为金币、红包、炸弹的 sprite 来自不同图集，每个物体都独立绘制。优化后把所有游戏元素合并到一个图集，DrawCall 降到 12：

| 优化点 | 优化前 | 优化后 |
|--------|--------|--------|
| DrawCall 数 | 45 | 12 |
| 图集数量 | 4 个（金币/红包/炸弹/特效） | 1 个（合并所有元素） |
| 单帧 CPU 耗时 | ~8ms | ~3ms |
| 移动端 FPS | 35-40 | 稳定 60 |

代价是图集变得更大（约 1.2MB），但相比 DrawCall 下降带来的帧率提升，这点包体完全值得。

---

## 二、资源加载与释放

### 2.1 resources 目录 vs Asset Bundle

Cocos Creator 有两种资源加载方式，选错会直接影响加载速度和包体：

| 维度 | resources 目录 | Asset Bundle |
|------|--------------|--------------|
| 加载方式 | 启动时全量扫描索引 | 按需下载 |
| 首包大小 | 大（所有资源进首包） | 小（首包只含核心资源） |
| 加载速度 | 首次启动慢 | 首次启动快 |
| 使用复杂度 | 简单（`resources.load()`） | 需要预先下载 Bundle |
| 适用场景 | 小游戏、资源量少 | 中大型游戏、分包加载 |

对于休闲小游戏，资源量不大的情况下 `resources` 完全够用；一旦包体超过 5MB 或有按需加载的场景（比如关卡解锁后才下载素材），就要上 Asset Bundle。

### 2.2 动态加载的释放策略

`resources.load()` 加载的资源**不会自动释放**，需要手动调用 `cc.assetManager.releaseAsset()`：

```typescript
// 加载并缓存
let loadedTexture: cc.Texture2D = null;

resources.load('textures/coin', cc.Texture2D, (err, tex) => {
    if (err) {
        console.error('load failed:', err);
        return;
    }
    loadedTexture = tex;
    // 使用纹理...
});

// 退出场景时释放
function releaseCoinTexture() {
    if (loadedTexture) {
        cc.assetManager.releaseAsset(loadedTexture);
        loadedTexture = null;
    }
}
```

**关键点**：

- 释放前确保没有节点还在引用该资源，否则会变成黑图
- 释放的是 `cc.Asset` 对象本身，不是引用它的 sprite
- 批量释放可以用 `cc.assetManager.release(assetArray)`

### 2.3 内存泄漏排查

内存泄漏在 Web 游戏里表现为"越玩越卡，最终浏览器标签页崩溃"。排查思路：

1. 打开 Chrome DevTools → Memory 面板
2. 玩一局游戏后拍一次快照
3. 再玩一局，再拍快照
4. 对比两次快照，看 `cc.Texture2D` / `cc.SpriteFrame` 数量是否持续增长

如果纹理数量只增不减，基本就是忘记释放了。常见原因：

- 动态加载的纹理没有 `releaseAsset`
- 对象池里的对象引用了旧资源，导致资源无法被 GC
- 切场景时没有调用 `cc.director.getScene().destroy()`

### 2.4 加载进度条的平滑实现

Cocos Creator 的 `preloadDir` / `loadDir` 是异步的，进度回调经常出现"卡 80% 然后突然跳到 100%"的跳变。我用一个简单的平滑算法解决：

```typescript
const { ccclass, property } = cc._decorator;

@ccclass
export default class LoadingBar extends cc.Component {
    @property(cc.ProgressBar)
    progressBar: cc.ProgressBar = null;

    @property(cc.Label)
    percentLabel: cc.Label = null;

    private targetProgress: number = 0;
    private currentProgress: number = 0;

    onLoad() {
        this.progressBar.progress = 0;
        this.startLoading();
    }

    private startLoading() {
        // 模拟真实加载：实际项目里替换成 resources.load / loadDir
        const totalAssets = 100;
        let loadedAssets = 0;

        const loadNext = () => {
            if (loadedAssets >= totalAssets) {
                this.targetProgress = 1.0;
                this.scheduleOnce(() => {
                    cc.director.loadScene('main');
                }, 0.3);
                return;
            }
            loadedAssets += Math.floor(Math.random() * 8) + 1;
            this.targetProgress = Math.min(loadedAssets / totalAssets, 1.0);
            setTimeout(loadNext, 50 + Math.random() * 80);
        };
        loadNext();
    }

    update(dt: number) {
        // 平滑插值，避免进度条跳变
        if (this.currentProgress < this.targetProgress) {
            this.currentProgress += dt * 1.5; // 1.5 = 每秒追上 150% 的差距
            if (this.currentProgress > this.targetProgress) {
                this.currentProgress = this.targetProgress;
            }
            this.progressBar.progress = this.currentProgress;
            this.percentLabel.string = `${Math.floor(this.currentProgress * 100)}%`;
        }
    }
}
```

核心思路：实际加载进度作为 `targetProgress`，UI 显示的 `currentProgress` 用 `update` 每帧线性追上 target，这样即使加载突然完成，进度条也会平滑动画到 100%。

---

## 三、纹理与图集优化

### 3.1 纹理压缩格式

不同平台对纹理压缩格式支持不同，Cocos Creator 在构建时会自动按平台转换：

| 平台 | 推荐格式 | 压缩比 | 质量 |
|------|---------|--------|------|
| iOS | ASTC | 高 | 好 |
| Android | ETC2 | 中 | 中等 |
| Web (PC) | JPEG / PNG | 中 | 取决于原始资源 |
| Web (移动) | PVTR / 无压缩 | - | WebGL 兼容性差 |

### 3.2 Web 游戏的特殊性

WebGL 对纹理压缩格式的兼容性远不如原生平台——ASTC 在多数浏览器不支持，ETC2 也只在部分移动端浏览器可用。**对 Web 游戏来说，最实际的优化是 JPEG/PNG 降分辨率**：

- 照片类背景：用 JPEG，质量 80%，分辨率按设计分辨率 1x 出
- UI 图标：用 PNG，分辨率不超过 256×256
- 序列帧：用 PNG，按帧数压缩分辨率

### 3.3 分辨率适配

设计分辨率建议 **720×1280**（竖屏）或 **1280×720**（横屏），资源按 1x / 2x 出：

```typescript
// 适配策略：竖屏游戏用 Fit Width，横屏用 Fit Height
// 在 Canvas 组件上设置：
//   Fit Width: ✓ (竖屏)
//   Fit Height: ✓ (横屏)
// 这样能保证关键内容不被裁切
```

### 3.4 资源冗余检查

构建后检查 `build/web-mobile` 目录大小，如果比预期大很多，可能是冗余资源：

```powershell
# 列出 build 目录中最大的 20 个文件
Get-ChildItem -Path .\build\web-mobile -Recurse -File |
    Sort-Object Length -Descending |
    Select-Object -First 20 Name, @{Name='Size(KB)';Expression={[math]::Round($_.Length/1KB,1)}}
```

常见冗余来源：

- `assets` 目录里有未引用的图片
- 多份同一资源不同分辨率（只用 1x 也出了 2x/3x）
- 音频文件保留了 WAV 原始文件（应该转 MP3）

---

## 四、对象池（Object Pool）

### 4.1 为什么需要对象池

频繁 `cc.instantiate()` 和 `node.destroy()` 会触发 JavaScript GC，导致周期性卡顿。典型表现：游戏每秒生成 10 个金币，运行 30 秒后突然卡一下，然后又流畅——这就是 GC 在清理垃圾。

对象池的思路是：**预生成一批对象，用的时候从池里取，不用的时候放回池里**，避免频繁创建销毁。

### 4.2 Cocos Creator 对象池实现

Cocos Creator 内置了 `cc.NodePool`，但功能比较基础。更灵活的做法是自己实现一个泛型对象池：

```typescript
const { ccclass } = cc._decorator;

/**
 * 通用对象池
 * 使用：const pool = new ObjectPool<MyComponent>(prefab, 20);
 */
export class ObjectPool<T> {
    private prefab: cc.Prefab = null;
    private pool: T[] = [];
    private getNode: (node: cc.Node) => T;

    constructor(prefab: cc.Prefab, initialSize: number, getNode: (node: cc.Node) => T) {
        this.prefab = prefab;
        this.getNode = getNode;
        for (let i = 0; i < initialSize; i++) {
            const node = cc.instantiate(this.prefab);
            node.active = false;
            this.pool.push(getNode(node));
        }
    }

    /**
     * 从池中获取一个对象，如果池空则新建
     */
    public get(): T {
        let node: cc.Node;
        if (this.pool.length > 0) {
            const item = this.pool.pop();
            node = (item as any).node;
        } else {
            node = cc.instantiate(this.prefab);
        }
        node.active = true;
        return this.getNode(node);
    }

    /**
     * 把对象放回池中
     */
    public put(item: T) {
        const node = (item as any).node as cc.Node;
        node.active = false;
        // 从父节点移除，但不会 destroy
        if (node.parent) {
            node.removeFromParent(false);
        }
        this.pool.push(item);
    }

    /**
     * 清空对象池（场景切换时调用）
     */
    public clear() {
        this.pool.forEach((item) => {
            const node = (item as any).node as cc.Node;
            if (cc.isValid(node)) {
                node.destroy();
            }
        });
        this.pool.length = 0;
    }
}
```

使用示例：

```typescript
const { ccclass, property } = cc._decorator;

@ccclass
export default class CoinSpawner extends cc.Component {
    @property(cc.Prefab)
    coinPrefab: cc.Prefab = null;

    private coinPool: ObjectPool<cc.Node> = null;

    onLoad() {
        // 预生成 30 个金币
        this.coinPool = new ObjectPool<cc.Node>(
            this.coinPrefab,
            30,
            (node) => node
        );
    }

    spawnCoin(position: cc.Vec3) {
        const coin = this.coinPool.get();
        coin.setPosition(position);
        coin.parent = this.node;
    }

    despawnCoin(coin: cc.Node) {
        this.coinPool.put(coin);
    }

    onDestroy() {
        this.coinPool.clear();
    }
}
```

### 4.3 适合池化的对象

- ✓ **金币、子弹、掉落物**：高频生成销毁，必须池化
- ✓ **粒子效果**：特效播放完放回池里
- ✓ **伤害数字、飘字**：UI 飘字频繁出现
- ✗ **UI 弹窗**：频率低，没必要池化
- ✗ **场景**：场景切换用 `cc.director.loadScene`

---

## 五、Profiler 与调试

### 5.1 Cocos Creator Profiler 面板

运行游戏时点击工具栏的 Profiler 按钮，会显示实时性能面板：

| 指标 | 含义 | 健康范围 |
|------|------|---------|
| FPS | 帧率 | 60（Web PC）/ 30+（移动端） |
| DrawCall | 绘制调用次数 | < 50（休闲游戏） |
| Tris | 三角形数量 | < 50K |
| Memory | 当前内存占用 | 看趋势，不持续增长即可 |
| Logic Time | 逻辑帧耗时 | < 8ms |

### 5.2 常见瓶颈定位

| 现象 | 可能原因 | 优化方向 |
|------|---------|---------|
| DrawCall 高（>50） | 没合批，图集混乱 | 合并图集，启用合批 |
| Memory 持续增长 | 资源未释放 | 检查 `releaseAsset` 调用 |
| FPS 低，但 DrawCall 不高 | 逻辑卡顿（每帧计算过多） | 检查 `update` 里的循环、避免每帧 `find` |
| Tris 高 | 模型/粒子过多 | 减少粒子数，简化模型 |
| 间歇性卡顿 | GC 触发 | 用对象池，减少 `instantiate` |

### 5.3 真机调试技巧

Web 游戏真机调试用 Chrome DevTools 远程调试：

1. 手机和电脑连同一 WiFi
2. 手机 Chrome 浏览器打开 `chrome://inspect`
3. 电脑 Chrome 打开 `chrome://inspect/#devices`
4. 找到手机上的标签页，点击 "Inspect"

这样能在电脑上看到手机游戏的 Console、Network、Performance 等面板，调试体验和本地一致。

### 5.4 性能基准

给自己定的性能门槛，低于这个标准就要优化：

| 平台 | 目标 FPS | DrawCall 上限 | 包体上限 |
|------|---------|--------------|---------|
| Web PC | 60 | 60 | 10MB |
| Web Mobile | 30+ | 40 | 5MB |
| iOS Safari | 60 | 50 | 8MB |
| Android Chrome | 30+ | 40 | 5MB |

---

## 六、包体优化

### 6.1 代码裁剪

Cocos Creator 构建时支持按需勾选引擎模块，**只勾选游戏实际用到的功能**能显著减小包体：

```text
Build → Project → Module Config:
  ✓ Base Modules (必选)
  ✓ 2D Rendering (2D 游戏必选)
  ✓ UI (有 UI 必选)
  ✓ Physics (2D: Box2D / 3D: builtin)
  ✗ 3D Rendering (2D 游戏不勾)
  ✗ Particle3D (不用就不勾)
  ✗ DragonBones (没用就不勾)
```

裁剪前后对比：Cocos Creator 默认全模块约 1.5MB，按需勾选能压到 800KB 左右。

### 6.2 资源压缩

| 资源类型 | 推荐格式 | 不推荐 | 备注 |
|---------|---------|--------|------|
| 音频 | MP3 / OGG | WAV | WAV 文件大 10 倍以上 |
| 照片背景 | JPEG (质量 80%) | PNG | 照片类 PNG 没有优势 |
| UI 图标 | PNG | JPEG | PNG 支持 alpha 通道 |
| 序列帧 | PNG + 图集 | 单独 PNG | 图集压缩率更高 |

### 6.3 首包加载优化

用 Asset Bundle 把非首屏资源分到子包，首包只含核心资源（主菜单 + 加载场景）：

```typescript
// 进入主菜单时预加载游戏场景 Bundle
cc.assetManager.loadBundle('game-scene', (err, bundle) => {
    if (err) {
        console.error('load bundle failed:', err);
        return;
    }
    // Bundle 加载完成，可以预加载场景
    bundle.preloadScene('game');
});

// 玩家点击"开始游戏"时再加载
function enterGame() {
    const bundle = cc.assetManager.getBundle('game-scene');
    bundle.loadScene('game', (err) => {
        if (err) {
            console.error('load scene failed:', err);
            return;
        }
        cc.director.runScene('game');
    });
}
```

### 6.4 《捡钱》包体优化实例

| 优化阶段 | 包体大小 | 主要优化点 |
|---------|---------|----------|
| 初版 | 8.2 MB | 全模块、未压缩纹理、WAV 音频 |
| 优化后 | 3.1 MB | 裁剪模块 + JPEG 压缩 + MP3 音频 + 图集合并 |

具体改动：

1. **引擎模块裁剪**：去掉 3D Rendering、Particle3D、DragonBones（约 -700KB）
2. **音频转 MP3**：3 个 WAV 音效转 MP3（约 -2MB）
3. **背景图 JPEG 压缩**：从 PNG 转 JPEG 质量 80%（约 -1.5MB）
4. **图集合并**：4 个图集合并为 1 个，去除重复资源（约 -900KB）

3.1MB 的包体在 Web 上能保证秒开，移动端 4G 网络下也能在 2 秒内加载完成。

---

## 写在最后

性能优化没有银弹，核心是**用数据驱动决策**——先看 Profiler 找到瓶颈，再针对性优化，避免凭感觉改代码。休闲小游戏的优化目标其实很朴素：**包体小、加载快、不掉帧**。把 DrawCall 压到 50 以下、用对象池避免 GC、按需加载资源，这三板斧下去，大多数性能问题都能解决。

后续我会继续整理 Cocos Creator 开发中的其他坑，欢迎一起交流。
