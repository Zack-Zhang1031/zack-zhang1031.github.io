---
title: "CrazyGames 发布全流程：注册、提审、广告接入与 QA 工具"
date: 2026-07-05T00:00:00+08:00
draft: false
author: "Zack-Zhang1031"
description: "一份面向独立开发者的 CrazyGames 上架指南：开发者注册、游戏构建上传、提审注意事项、广告 SDK 接入，以及 qaTool 的实战用法。"
tags: ["CrazyGames", "游戏发行", "独立游戏", "广告接入", "QA"]
categories: ["游戏开发", "发行运营"]
---

把游戏做完只是第一步，真正让人头疼的往往是"怎么上架"。这篇指南把我发布《数钱》《捡钱》到 CrazyGames 的完整流程整理出来——从开发者注册、构建上传、提审被拒修复，到广告 SDK 接入和 qaTool 的实战技巧，希望能帮你少走弯路。

---

## 一、CrazyGames 开发者注册

### 1.1 CrazyGames 是什么

CrazyGames 是一个主打网页游戏的免费平台，玩家打开浏览器就能玩，不用下载、不用安装。对开发者来说，它最吸引人的地方是：**你不需要自己接入广告联盟，平台帮你搞定广告填充和分成结算**。你只需要专注做游戏，每次玩家观看广告产生的收益会按比例分给你。

我在 CrazyGames 上发布了两款 Cocos Creator 休闲小游戏——《数钱》和《捡钱》，都是点击类的轻量玩法，包体不到 5MB，正好契合平台"打开就玩"的调性。

### 1.2 注册地址与所需资料

注册入口在 [developer.crazygames.com](https://developer.crazygames.com)，流程很简单：

- **邮箱**：建议用长期使用的邮箱，后续收益结算、平台通知都走这里
- **开发者名称**：会显示在游戏页面，个人开发者可以直接用 ID 或笔名
- **地区信息**：用于税务表格判定

注册后需要邮箱验证，然后提交开发者申请。平台会人工审核你的资料，**审核周期大约 1-3 个工作日**。我提交后第二天就收到了通过邮件，速度比预期快。

### 1.3 个人主体 vs 公司主体

CrazyGames 接受个人开发者，不强制要求公司主体。两者的核心区别在税务表格，而不是分成比例。

| 维度 | 个人主体 | 公司主体 |
|------|---------|---------|
| 税务表格 | W-8BEN（非美国个人） / W-9（美国个人） | W-8BEN-E（非美国公司） / W-9（美国公司） |
| 分成比例 | 相同 | 相同 |
| 注册门槛 | 身份证明即可 | 需要公司营业执照等材料 |
| 收款方式 | PayPal / Payoneer 等个人账户 | 公司对公账户 |
| 适合人群 | 独立开发者、业余开发者 | 工作室、注册公司的小团队 |

我是以个人主体注册的，填 W-8BEN 表格时主要难点是"美国纳税人身份声明"——只要不是美国公民/绿卡/在美有收入来源，正常勾选即可，不需要特意去申请 ITIN。

---

## 二、游戏构建上传

### 2.1 Cocos Creator 导出设置

Cocos Creator 发布到 CrazyGames 选择 **Web Mobile** 平台即可，关键设置如下：

```text
Platform: Web Mobile
Main Package Compression Type: merge_all_json
Compress Texture: ✓ 勾选
MD5 Cache: ✓ 勾选（避免缓存问题）
Device Orientation: 按游戏方向选 Portrait / Landscape
```

纹理压缩一定要勾上，能显著减小包体。导出后整个 `build/web-mobile` 目录就是可上传的游戏包。

### 2.2 打包上传

CrazyGames Developer Portal 上传的是 **zip 压缩包**，把 `build/web-mobile` 目录整体打包即可：

```powershell
# 进入 build 目录
cd build
# 压缩 web-mobile 目录为 zip
Compress-Archive -Path .\web-mobile\* -DestinationPath .\web-mobile.zip
```

注意：zip 包内应该是 `index.html` 在根目录，而不是嵌套一层 `web-mobile/` 文件夹，否则平台加载会找不到入口。

### 2.3 封面、截图与描述

| 资源 | 要求 | 备注 |
|------|------|------|
| 游戏封面 | 512×512 PNG | 必须有，平台列表展示用 |
| 游戏截图 | 至少 3 张，1280×720 | 建议传 5-6 张，覆盖核心玩法 |
| 游戏标题 | 英文为主 | 简短好记，避免堆关键词 |
| 游戏描述 | 英文 | 必须包含玩法说明和操作方式 |

游戏描述的英文不需要写得多花哨，重点是让玩家和审核员**一秒看懂怎么玩**。我的写法是固定三段式：

1. 一句话核心玩法（"Tap the money to pick it up before time runs out!"）
2. 操作说明（"Mouse / Touch to play"）
3. 特色亮点（2-3 个 bullet）

### 2.4 gameBuildId 的作用

每次上传一个 zip 包，CrazyGames 会生成一个独立的 `gameBuildId`，对应一个可预览的版本。这样的好处是：

- **版本隔离**：新 build 上传后，旧 build 仍然可预览，方便对比
- **回滚方便**：如果新版本有问题，可以在 Portal 切回上一个 build
- **提审锁定**：提审时绑定的是某个具体 buildId，审核期间上传新 build 不会影响正在审核的版本

例如《捡钱》当前线上版本的预览链接长这样：

```text
https://www.crazygames.com/preview/e072a216-66f6-45da-92e1-5462cc4a1309
?gameBuildId=30f942ad-72fc-4858-b812-95dfa984c8f0
&qaTool=true
&disableSubmitQA=true
&role=developer
```

URL 里 `e072a216-...` 是游戏 ID，`gameBuildId=30f942ad-...` 就是当前 build 的版本号。

---

## 三、提审流程与常见被拒原因

### 3.1 提审 checklist

提交审核前，我自己跑一遍这份 checklist，能挡掉 80% 的低级问题：

- [ ] 游戏能正常加载完成（白屏时间 < 5 秒）
- [ ] 浏览器控制台无 error 级别报错
- [ ] 广告 SDK 已接入且能正常触发
- [ ] 移动端浏览器可玩（触控、横竖屏适配）
- [ ] 没有外部跳转链接（不要引导玩家去其他网站）
- [ ] 游戏内有"再玩一次"或返回主菜单的入口
- [ ] 分辨率自适应正常（720p / 1080p 都不破图）

### 3.2 常见被拒原因

CrazyGames 的审核相对宽松，但下面这几条踩中任何一条都会被打回：

| 被拒原因 | 具体表现 | 修复建议 |
|---------|---------|---------|
| 加载超时 | 首屏白屏 > 10 秒 | 拆分 Asset Bundle，首包只含核心资源 |
| 广告未接入 | 游戏内无广告调用 | 至少接入激励视频或插屏 |
| 含外部链接 | 点击按钮跳转外部域名 | 移除所有 `window.open` 外链 |
| 分辨率不适配 | 不同尺寸屏幕出现黑边或裁切 | 用 Canvas 的 `Fit Width` / `Fit Height` 适配 |
| 内容违规 | 暴力、成人、版权素材 | 替换素材，参考平台内容政策 |
| 操作不明确 | 玩家不知道怎么玩 | 首屏加 1-2 句操作提示 |

### 3.3 修复后重新提审

被拒后不需要慌，CrazyGames 的审核反馈邮件会列出具体问题。修复流程：

1. 在 Developer Portal 修改游戏（更新 build、补齐描述等）
2. 上传新 build 后，到 "Submit for Review" 页面重新提交
3. **重新审核周期约 2-5 天**，比首次审核略快

我第一次提交《捡钱》时因为广告调用时机太靠前被拒，把激励视频挪到"复活"场景后第二次提交就过了，整体往返一周左右。

---

## 四、广告接入

### 4.1 CrazyGames 广告机制

CrazyGames 的广告是**平台全权代理**的——你不需要自己去对接 AdSense、Unity Ads 这些广告联盟，平台已经聚合好。开发者只需要在代码里调用 SDK 触发广告，剩下的填充、展示、计费都由平台处理，收益按月结算分成。

这种模式对独立开发者非常友好：省去了接入多家广告 SDK 的麻烦，也避免了广告填充率不足的问题。

### 4.2 SDK 接入步骤

在 Cocos Creator 中接入 CrazyGames SDK：

1. 下载 SDK 脚本（CrazyGames 提供的 `CrazyGames.js`），放到 `build/web-mobile/` 目录或通过外链引入
2. 在 `index.html` 中加载 SDK：

```html
<!-- build/web-mobile/index.html -->
<script src="https://sdk.crazygames.com/crazygames-sdk-v3.js"></script>
```

3. 在游戏脚本中初始化：

```typescript
// CrazyGamesAd.ts
declare const window: any;
declare const CrazyGames: any;

const { ccclass, property } = cc._decorator;

@ccclass
export default class CrazyGamesAd extends cc.Component {
    private sdkReady: boolean = false;

    onLoad() {
        if (typeof CrazyGames === 'undefined') {
            console.warn('[CrazyGames] SDK not loaded, running in local mode');
            return;
        }
        CrazyGames.SDK.init().then(() => {
            this.sdkReady = true;
            console.log('[CrazyGames] SDK initialized');
        }).catch((err: any) => {
            console.error('[CrazyGames] SDK init failed:', err);
        });
    }

    private ensureReady(): boolean {
        if (!this.sdkReady) {
            console.warn('[CrazyGames] SDK not ready, skip ad');
            return false;
        }
        return true;
    }
}
```

### 4.3 广告类型与调用

CrazyGames 支持两种主要广告类型，调用方式都是 `requestAd()`：

```typescript
// 激励视频（Rewarded Video）：玩家观看后获得奖励
public showRewardedAd(onReward: () => void, onError?: (err: any) => void) {
    if (!this.ensureReady()) {
        // 本地环境直接给奖励，方便测试
        onReward();
        return;
    }
    CrazyGames.SDK.ad.requestAd('rewarded', {
        adFinished: () => onReward(),
        adError: (err: any) => {
            console.error('[CrazyGames] ad error:', err);
            if (onError) onError(err);
        },
    });
}

// 插屏广告（Interstitial）：关卡间自动播放
public showInterstitialAd() {
    if (!this.ensureReady()) return;
    CrazyGames.SDK.ad.requestAd('midgame', {
        adFinished: () => console.log('[CrazyGames] interstitial finished'),
        adError: (err: any) => console.error('[CrazyGames] interstitial error:', err),
    });
}
```

### 4.4 广告类型对比

| 广告类型 | 触发时机 | 玩家体验 | 收益 |
|---------|---------|---------|------|
| 插屏 | 关卡结束、场景切换 | 被动观看，略打扰 | 单价较低 |
| 激励视频 | 复活、双倍奖励、解锁内容 | 主动观看，体验好 | 单价较高 |

### 4.5 广告频率建议

广告太频繁会让玩家直接关页面，太少又损失收益。我自己的经验值：

- **激励视频**：由玩家主动触发，频率不限，但奖励要有价值
- **插屏广告**：每局结束才弹一次，或每 2 分钟一次，取较宽松者
- **避免连续弹**：插屏和激励视频之间至少间隔 30 秒

《捡钱》的策略是"每局结束自动插屏 + 死亡时可选激励视频复活"，整体观感比较克制，eCPM 也还行。

---

## 五、qaTool 实战用法

### 5.1 qaTool 是什么

CrazyGames 的 preview URL 支持几个查询参数，组合起来就是开发者专属的 QA 调试工具。在游戏发布前，我几乎所有的真机测试都是用 QA 预览链接完成的，而不是本地 `localhost`。

### 5.2 关键参数说明

| 参数 | 作用 | 使用场景 |
|------|------|---------|
| `qaTool=true` | 启用 QA 工具栏，显示 FPS、内存、加载状态等 | 性能调优、验证广告 |
| `disableSubmitQA=true` | 禁用 QA 提交按钮 | 开发预览时避免误触发 QA 报告 |
| `role=developer` | 以开发者身份预览，可看到普通玩家看不到的调试信息 | 上线前自测 |
| `gameBuildId=xxx` | 指定要预览的 build 版本 | 对比不同版本 |

完整 URL 示例（我的《数钱》QA 预览链接）：

```text
https://www.crazygames.com/preview/d1b4d9b3-f1e7-419c-8336-c65c37fa3419
?gameBuildId=10c47402-f440-40f9-a940-448fa1466cd3
&qaTool=true
&disableSubmitQA=true
&role=developer
```

### 5.3 本地预览 vs QA 预览

| 维度 | 本地预览（localhost / Cocos 预览） | QA 预览（preview URL） |
|------|----------------------------------|----------------------|
| 运行环境 | 自己的电脑 | CrazyGames 服务器实际部署环境 |
| 广告加载 | SDK 未初始化，广告调用空跑 | 真实广告填充，能看到广告调用是否成功 |
| 资源加载 | 本地无延迟 | 真实网络条件，能发现加载瓶颈 |
| 跨域/CSP | 不会触发 | 完整触发，能验证 iframe 限制 |
| 设备覆盖 | 仅本机 | 任何设备扫码即测，覆盖手机/平板 |

### 5.4 常见调试场景

**场景一：验证广告是否正常触发**

在 QA 预览中打开浏览器控制台，触发广告调用后查看 `[CrazyGames]` 开头的日志。如果 `adError` 回调被调用，根据错误信息排查——常见原因是 SDK 未初始化完成就调用了广告，或者广告频率过高被平台限流。

**场景二：检查加载顺序**

CrazyGames 的游戏是在 iframe 内运行的，资源加载顺序和本地不同。QA 预览能看到真实加载瀑布图，建议把 `index.html` 里 SDK 脚本放到游戏主脚本之前加载，避免 `CrazyGames is not defined` 报错。

**场景三：测试不同分辨率**

QA 预览链接可以在任何设备打开——手机扫码、平板访问、桌面浏览器调整窗口。我每次发布前都会在 iPhone、Android 手机、iPad 三个设备上各跑一遍，确认横竖屏切换和分辨率适配都没问题。

---

## 六、上线后的运营

### 6.1 Developer Portal 数据面板

游戏上线后，Developer Portal 的 Dashboard 会展示核心运营数据：

- **播放量（Plays）**：每日/累计游戏启动次数
- **平均时长**：玩家平均游戏时长，反映留存
- **收益（Revenue）**：广告收益按日统计，可下载明细
- **地理分布**：玩家所在国家/地区分布

建议每周看一次趋势，发现异常（比如某天播放量突降）及时排查是不是新 build 引入了 bug。

### 6.2 版本更新流程

上传新 build 后**不会自动上线**，需要手动设为 Active：

1. Developer Portal → Game → Builds
2. 找到新上传的 build，点击 "Set as Active"
3. 玩家下次打开游戏就会加载新版本

如果新版本引入了严重 bug，可以快速切回上一个 Active build——这就是前面说的 `gameBuildId` 版本隔离的价值。

### 6.3 玩家反馈收集

CrazyGames 游戏页面有玩家评论区，建议每周看一次。Web 游戏玩家反馈通常比较直接，能快速暴露：

- 加载慢、卡顿
- 操作不适配（比如某些机型触控不灵敏）
- 玩法吐槽（"太难""太简单"）

除了平台评论，我也会在自己博客和社交媒体同步更新游戏链接，多一个反馈渠道。独立游戏的运营是长期活，上线只是开始，持续根据反馈迭代才能让游戏活下来。

---

## 写在最后

CrazyGames 对独立开发者来说是个相对友好的平台：注册门槛低、广告变现省心、Web 形式免下载。但坑也不少——尤其是广告接入时机和加载性能，往往要踩过一次才能记住。

如果你也在做 Cocos Creator 休闲小游戏，建议先把游戏跑通本地预览，再用 qaTool 在真实环境验证一遍广告和加载，最后按 checklist 提审。流程顺了，从开发到上线一周内就能搞定。

之后我会继续整理 Cocos Creator 性能优化相关的笔记，欢迎一起交流。
