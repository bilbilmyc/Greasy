# 发现计划：多平台视频广告跳过油猴插件

**日期**：2026-06-14
**产品阶段**：全新概念
**发现问题**：中文互联网用户能否通过一个统一的油猴插件，优雅地跳过多个视频平台的广告？

---

## 一、市场背景

### 现有方案分析

| 方案 | 覆盖平台 | 优点 | 缺点 |
|------|---------|------|------|
| 威软去广告 | YouTube/B站/优酷/爱奇艺/腾讯等 | 覆盖面广，持续维护 | 界面简陋，容易触发反检测 |
| Bilibili Video Ad Skipper (AI版) | B站 | AI弹幕分析识别"恰饭" | 需 API Key，只限 B站 |
| BilibiliSponsorBlock | B站 | 社区数据 | 只限 B站 |
| YouTube 助手 | YouTube | 功能丰富 | 只限 YouTube |
| 计时器掌控者 | 全平台（通用） | 通用方案 | 体验差，容易被检测 |

### 核心空白

- 没有同时覆盖 **国内外主流视频平台** 的统一解决方案
- 现有脚本对 **平台反检测** 应对不足
- YouTube 有 SponsorBlock，但 **中文平台缺乏类似的众包广告数据库**
- AI 辅助识别弹幕广告的方法已被验证可行，但尚未集成到多平台方案中

---

## 二、创意探索

### 创意清单（来自 PM / 设计师 / 工程师 三视角）

| 排名 | 创意 | 视角 | 简述 | 核心价值主张 |
|------|------|------|------|------------|
| 🥇 | 多平台统一引擎 | PM | 一套规则引擎适配 5+ 平台 | 不用折腾多个脚本 |
| 🥇 | 反检测隐身模式 | PM | 随机化策略规避检测 | 不被平台封杀 |
| 🥉 | 社区驱动广告库 | PM | 众包标记 B站等中文平台的广告段 | 填补 SponsorBlock 空白 |
| 4 | SponsorBlock 集成桥 | ENG | 复用 SponsorBlock 数据 | 快速获得 YouTube 覆盖 |
| 5 | 即装即用配置面板 | DES | 引导式首次配置 | 降低入门门槛 |
| — | AI 弹幕辅助识别 | ENG | 轻量模型分析弹幕判断恰饭 | 提高 B站广告识别率 |
| — | 状态悬浮球 | DES | 视频右上角显示跳过数量 | 让用户感知到价值 |
| — | 广告可视化进度条 | DES | 进度条标注广告段色块 | 透明化操作 |
| — | 白名单创作者支持 | PM | 允许选择支持某些创作者 | 解决道德困境 |
| — | 自动更新规则仓库 | ENG | GitHub 热更新规则 | 免重新安装 |

---

## 三、核心假设矩阵

### Impact × Risk 分析

```
                  高风险 (不确定)
                    │
     A02 规则引擎统一 │  A08 反检测有效
     A13 众包意愿    │  A16 冷启动临界
 高   A03 维护成本   │  A21 SB中文覆盖
 影   A09 接受降级   │  A10 封号风险
 响   A18 恰饭识别   │  A15 数据质量
     A28 极简偏好   │  A14 广告模式适众包
                    │
     ───────────────┼────────────────
                    │
低                  低风险 (较确定)
```

### P0-P2 "信念之跃"假设（决定生死的关键风险）

| ID | 假设 | 类别 | 所属创意 | 不验证就做的风险 |
|----|------|------|---------|----------------|
| **A02** | 不同平台的广告机制可用**同一规则引擎**适配 | 技术可行 | 创意 1 | ⛔ 架构失败，整个产品不成立 |
| **A08** | 随机化策略可有效**规避平台检测** | 技术可行 | 创意 2 | ⛔ 上线即被封，用户流失 |
| **A13** | 中文用户**愿意花时间标记广告段** | 价值 | 创意 3 | ⛔ 众包模式不成立，数据无法积累 |
| A16 | 冷启动阶段能达到众包**临界质量** | 生存力 | 创意 3 | 🟡 有数据但稀疏到无实用价值 |
| A03 | 规则引擎**维护成本不随平台数线性增长** | 技术可行 | 创意 1 | 🟡 长期维护不可持续 |
| A21 | SponsorBlock 对**中文 YouTube** 覆盖充分 | 价值 | 创意 4 | 🟡 集成桥好处有限 |

---

## 四、验证实验

### 实验 1：技术可行性验证（3 天）

- **验证假设**：A02 + 间接验证 A03
- **方式**：为 YouTube 和 B站编写最小平台适配器（技术 Spike）
- **成功标准**：代码复用率 > 40%，差异成功隔离到适配器层
- **产出**：架构设计 + 可运行原型

### 实验 2：反检测灰测（7 天）

- **验证假设**：A08 + 间接验证 A09、A10
- **方式**：将最小原型发给 5-10 名内测用户使用 1 周
- **成功标准**：1 周内 0 人触发检测警告；如有触发，可调整修复
- **产出**：反检测策略有效性报告

### 实验 3：众包意愿验证（内嵌在实验 2 中）

- **验证假设**：A13 + 间接验证 A16、A18
- **方式**：在灰测原型中加入"标记广告段"按钮 + 简单后端埋点
- **成功标准**：1 周内 10 个用户 ≥ 30 条标记，≥ 2 人活跃标记者
- **产出**：用户标记行为数据分析

### 决策框架

```
实验 1 (技术可行)
   ├─ ✅ 可行 → 进入实验 2
   └─ ❌ 不可行 → 放弃多平台策略，改为单平台深度插件

实验 2 (反检测)
   ├─ ✅ 有效 → 进入实验 3
   ├─ 🟡 部分有效 → 调整策略后重测
   └─ ❌ 无效 → 转为"仅供学习研究"方向，或不做反检测只做增强

实验 3 (众包意愿)
   ├─ ✅ 积极 → 全面开发众包广告库 + 多平台引擎
   ├─ 🟡 一般 → 砍掉众包，做纯广告跳过工具（无社区功能）
   └─ ❌ 无参与 → 做纯技术跳过工具，用弹幕 AI 替代众包
```

---

## 五、MVP 技术方案

> 以下为假设验证通过后，**MVP 直接开发的完整技术方案**。

### 5.1 系统架构

```
┌──────────────────────────────────────────────────────────┐
│                  油猴脚本运行时环境                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │                  核心引擎层                          │  │
│  │  ┌──────────┐  ┌──────────┐  ┌─────────────────┐  │  │
│  │  │ 规则引擎   │  │ 事件管道  │  │ 反检测层         │  │  │
│  │  │ (Rule     │←→│ (Event   │←→│ (Anti-Detection │  │  │
│  │  │ Engine)   │  │ Pipeline)│  │  Engine)        │  │  │
│  │  └──────────┘  └──────────┘  └─────────────────┘  │  │
│  └────────────────────────────────────────────────────┘  │
│                           │                               │
│  ┌────────────────────────────────────────────────────┐  │
│  │                  平台适配器层                        │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐         │  │
│  │  │ YouTube  │  │  B站      │  │  腾讯     │  ...  │  │
│  │  │ Adapter  │  │  Adapter  │  │  Adapter  │         │  │
│  │  └──────────┘  └──────────┘  └──────────┘         │  │
│  └────────────────────────────────────────────────────┘  │
│                           │                               │
│  ┌────────────────────────────────────────────────────┐  │
│  │  功能模块     ┌─────────────┐  ┌──────────────┐   │  │
│  │              │ 广告检测器    │  │ 广告跳过执行器  │   │  │
│  │              └─────────────┘  └──────────────┘   │  │
│  │              ┌─────────────┐  ┌──────────────┐   │  │
│  │              │ 配置面板 UI  │  │ SponsorBlock  │   │  │
│  │              │              │  │ 集成桥        │   │  │
│  │              └─────────────┘  └──────────────┘   │  │
│  └────────────────────────────────────────────────────┘  │
│                           │                               │
│  ┌────────────────────────────────────────────────────┐  │
│  │                  数据层                              │  │
│  │  ┌──────────┐  ┌──────────────┐  ┌─────────────┐  │  │
│  │  │ GM存储    │  │ 远程规则仓库  │  │ 众包数据    │  │  │
│  │  │ (本地)   │  │ (GitHub Raw) │  │ (后端 API)  │  │  │
│  │  └──────────┘  └──────────────┘  └─────────────┘  │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### 5.2 核心模块详细设计

#### 5.2.1 规则引擎（RuleEngine）

```javascript
// 核心接口定义
interface RuleEngine {
  // 注册平台适配器
  registerAdapter(platform: string, adapter: PlatformAdapter): void;

  // 检测当前页面所属平台
  detectPlatform(url: string): string | null;

  // 获取当前平台的广告检测规则
  getRules(platform: string): AdRule[];

  // 热更新规则
  updateRules(rulesUrl: string): Promise<void>;
}

interface PlatformAdapter {
  platform: string;           // 'youtube' | 'bilibili' | 'tencent' | 'iqiyi' | 'youku'
  matchPatterns: string[];   // URL 匹配模式，如 ['*://*.youtube.com/*']
  
  // 必须实现的方法
  init(): void;               // 初始化适配器
  detectAds(): AdInfo[];      // 检测当前页面中的广告
  skipAd(ad: AdInfo): void;   // 跳过指定广告
  destroy(): void;            // 清理资源
}

interface AdInfo {
  type: 'preroll' | 'midroll' | 'postroll' | 'overlay' | 'banner' | 'embedded' | 'countdown';
  startTime?: number;         // 视频时间戳（秒）
  duration?: number;          // 广告时长（秒）
  element?: HTMLElement;      // DOM 元素引用
  confidence: number;         // 检测置信度 0-1
  platform: string;
}
```

**规则格式**：

```javascript
// rules.json — 从 GitHub Raw 热更新
{
  "version": "1.0.0",
  "rules": {
    "youtube": {
      "adSelectors": [
        ".video-ads ytd-ad-slot-renderer",         // 视频广告
        "ytd-action-companion-ad-renderer",          // 伴随广告
        "#masthead-ad",                              // 顶部横幅广告
        "ytd-search-panel-renderer"                  // 搜索广告
      ],
      "adObservers": ["ytd-watch-flexy"],            // 需要监听 DOM 变化的容器
      "skipStrategies": ["click_skip_button", "fast_forward"],
      "antiDetection": {
        "clickDelay": {"min": 800, "max": 3000},
        "observerDebounce": 500,
        "randomizeSelectors": true
      }
    },
    "bilibili": {
      "adSelectors": [
        ".bilibili-player-video-btn-ad",             // 广告按钮
        ".ad-report",                                // 广告报告元素
        ".bpx-player-video-ad"                       // 播放器广告
      ],
      "adObservers": [".bpx-player-video-wrap"],
      "skipStrategies": ["remove_element", "click_skip"],
      "embeddedAdDetection": {
        "method": "danmaku_analysis",               // 弹幕分析识别恰饭
        "danmakuKeywords": ["广告", "恰饭", "植入", "推广"]
      }
    },
    "tencent": {
      "adSelectors": [
        ".txp_ad",                                   // 腾讯视频广告
        ".tvp_ad_container"
      ],
      "skipStrategies": ["timer_accelerate", "remove_element"]
    }
    // 爱奇艺、优酷... 继续扩展
  }
}
```

#### 5.2.2 反检测引擎（AntiDetectionEngine）

```javascript
interface AntiDetectionConfig {
  // 时序模糊
  clickDelay: { min: number; max: number };          // 点击前随机延迟
  observerDebounce: number;                          // MutationObserver 防抖
  adSkipInterval: { min: number; max: number };      // 跳过执行间隔

  // DOM 操作随机化
  randomizeSelectors: boolean;                       // 是否使用随机选择器路径
  addNoiseMutations: boolean;                        // 是否添加噪声 DOM 操作

  // 行为模拟
  simulateUserBehavior: boolean;                     // 是否模拟鼠标移动/滚动
  simulateNetworkDelay: boolean;                     // 是否模拟网络请求延迟

  // 隐身策略
  avoidGlobalFlags: boolean;                         // 是否避免设置全局检测标志
  useNativeAPIsOnly: boolean;                        // 是否仅使用原生 API
}

// 核心策略实现
class AntiDetectionEngine {
  private config: AntiDetectionConfig;
  private rng: SeededRandom;

  // 核心方法：执行跳转前等待随机时间
  async randomDelay(): Promise<void> {
    const delay = this.rng.nextInt(
      this.config.clickDelay.min,
      this.config.clickDelay.max
    );
    await sleep(delay);
  }

  // 生成随机选择器路径
  scrambleSelector(original: string): string {
    if (!this.config.randomizeSelectors) return original;
    // 在原始选择器中插入伪随机属性
    const randomAttr = `[data-${this.rng.nextHex(4)}]`;
    return `${original}${Math.random() > 0.5 ? randomAttr : ''}`;
  }

  // 添加噪声 DOM 元素迷惑检测
  addNoise(): void {
    // 在页面中插入无害的随机元素
    // 使检测脚本难以通过特征定位
  }

  // 检查是否被检测
  checkDetectionStatus(): DetectionStatus {
    // 查询是否有 adblock 检测弹窗
    // YouTube: ytd-enforcement-message-view-model
    // 通用: 文本包含 "ad blocker" 等关键词
  }
}
```

#### 5.2.3 广告检测器（AdDetector）

```javascript
class AdDetector {
  private detectionStrategies: DetectionStrategy[];

  constructor() {
    this.detectionStrategies = [
      new DOMSelectorStrategy(),       // CSS 选择器匹配
      new MutationObserverStrategy(),  // DOM 变化监听
      new TimestampStrategy(),         // 视频时间戳分析
      new NetworkStrategy(),           // 网络请求拦截
      new DanmakuStrategy(),           // 弹幕文本分析（B站专用）
    ];
  }

  // 360° 全方位检测
  async detectAds(platform: string): Promise<AdInfo[]> {
    const results: AdInfo[] = [];

    for (const strategy of this.detectionStrategies) {
      if (strategy.supports(platform)) {
        const ads = await strategy.detect();
        results.push(...ads);
      }
    }

    // 去重合并：同一广告被多个策略检测到时合并
    return this.deduplicateAndMerge(results);
  }
}

// B站弹幕分析策略（检测恰饭植入广告）
class DanmakuStrategy extends DetectionStrategy {
  private keywords = ['广告', '恰饭', '金主', '推广', '植入', '赞助',
                     '合作', '商务', '带货', '广告位', '防不胜防'];

  async detect(): Promise<AdInfo[]> {
    const danmakuElements = document.querySelectorAll('.bilibili-danmaku');
    const timeSegments: Map<number, number> = new Map(); // time -> keyword count

    danmakuElements.forEach(el => {
      const text = el.textContent || '';
      const time = this.getDanmakuTime(el);
      const matched = this.keywords.some(k => text.includes(k));
      if (matched && time > 0) {
        timeSegments.set(time, (timeSegments.get(time) || 0) + 1);
      }
    });

    // 提取弹幕密集提到广告关键词的时间段
    return this.findAdSegments(timeSegments);
  }
}
```

#### 5.2.4 SponsorBlock 集成桥

```javascript
class SponsorBlockBridge {
  private readonly API_BASE = 'https://sponsor.ajay.app';
  private videoID: string;
  private segments: Segment[] = [];

  async fetchSegments(videoID: string): Promise<Segment[]> {
    const url = `${this.API_BASE}/api/skipSegments?videoID=${videoID}
      &categories=["sponsor","selfpromo","interaction","exclusive_access"]`;
    
    // SponsorBlock 接口返回格式
    const response = await fetch(url);
    const data = await response.json();
    
    this.segments = data.map(item => ({
      start: item.segment[0],
      end: item.segment[1],
      category: item.category,
      votes: item.votes,
      UUID: item.UUID
    }));

    return this.segments;
  }

  // 在视频进度条上显示广告段
  renderSegmentsOnProgressBar(): void {
    // 在播放器的进度条上叠加半透明色块
    // 绿色 = 赞助，黄色 = 自推，红色 = 交互
  }

  // 自动跳过已识别的广告段
  autoSkip(segment: Segment): void {
    const video = document.querySelector('video');
    if (!video) return;
    
    if (video.currentTime >= segment.start - 0.5 &&
        video.currentTime <= segment.start + 0.5) {
      video.currentTime = segment.end;
    }
  }
}
```

#### 5.2.5 配置面板 UI

```html
<!-- 配置面板 — 在油猴沙箱中使用 shadow DOM 避免样式冲突 -->
<div id="greasy-adblocker-config">
  <div class="config-header">
    <h3>🎬 视频广告跳过助手</h3>
    <span class="version">v0.1.0</span>
  </div>

  <div class="config-section">
    <h4>平台管理</h4>
    <div class="platform-toggle">
      <label><input type="checkbox" checked data-platform="youtube"> YouTube</label>
      <label><input type="checkbox" checked data-platform="bilibili"> Bilibili</label>
      <label><input type="checkbox" checked data-platform="tencent"> 腾讯视频</label>
      <label><input type="checkbox" data-platform="iqiyi"> 爱奇艺</label>
      <label><input type="checkbox" data-platform="youku"> 优酷</label>
    </div>
  </div>

  <div class="config-section">
    <h4>跳过策略</h4>
    <select id="skip-mode">
      <option value="auto">全自动（优先体验）</option>
      <option value="stealth">隐身模式（优先安全）</option>
      <option value="manual">仅标记，不自动跳过</option>
    </select>
  </div>

  <div class="config-section">
    <h4>众包设置</h4>
    <label>
      <input type="checkbox" checked id="enable-crowd">
      参与社区广告标记
    </label>
    <label>
      <input type="checkbox" checked id="enable-sponsorblock">
      使用 SponsorBlock 数据
    </label>
  </div>

  <div class="config-footer">
    <span class="stats">今日已跳过: <strong id="today-count">0</strong> 条广告</span>
    <button id="reset-config">重置为默认</button>
  </div>
</div>
```

### 5.3 目录结构

```
greasy-ad-skipper/
├── index.user.js              # 油猴入口脚本（@match 规则在此）
├── README.md
├── package.json               # 仅用于构建/打包（非 npm 发布）
├── rollup.config.js           # 构建配置
│
├── src/
│   ├── main.js                # 启动入口 — 平台检测 + 初始化
│   │
│   ├── core/
│   │   ├── RuleEngine.js      # 规则引擎 — 规则加载/匹配/更新
│   │   ├── EventPipeline.js   # 事件管道 — 广告检测事件的发布/订阅
│   │   ├── AntiDetection.js   # 反检测引擎 — 时序模糊/随机化
│   │   └── ConfigManager.js   # 配置管理 — GM_setValue/GM_getValue 封装
│   │
│   ├── adapters/
│   │   ├── BaseAdapter.js     # 适配器基类
│   │   ├── YouTubeAdapter.js  # YouTube 适配器
│   │   ├── BilibiliAdapter.js # B站适配器
│   │   ├── TencentAdapter.js  # 腾讯视频适配器
│   │   ├── IqiyiAdapter.js    # 爱奇艺适配器
│   │   └── YoukuAdapter.js    # 优酷适配器
│   │
│   ├── detectors/
│   │   ├── AdDetector.js      # 主检测器 — 编排所有检测策略
│   │   ├── strategies/
│   │   │   ├── DOMSelector.js       # CSS 选择器匹配
│   │   │   ├── MutationObserver.js  # DOM 变化监听
│   │   │   ├── TimestampAnalysis.js # 时间戳分析
│   │   │   ├── NetworkMonitor.js    # 网络请求拦截
│   │   │   └── DanmakuAnalysis.js   # 弹幕分析（B站）
│   │   └── skip/
│   │       ├── AutoSkipper.js       # 广告跳过执行器
│   │       ├── TimerAccelerator.js  # 计时器加速
│   │       └── ElementRemover.js    # DOM 元素移除
│   │
│   ├── bridges/
│   │   ├── SponsorBlockBridge.js    # SponsorBlock API 集成
│   │   └── CrowdSourceBridge.js     # 自建众包后端通信
│   │
│   ├── ui/
│   │   ├── ConfigPanel.js           # 配置面板
│   │   ├── StatusFloatingBall.js    # 状态悬浮球
│   │   ├── ProgressBarOverlay.js    # 进度条广告标记覆盖层
│   │   └── OnboardingGuide.js       # 首次安装引导
│   │
│   └── utils/
│       ├── DomUtils.js      # DOM 操作工具集
│       ├── UrlUtils.js      # URL 解析
│       ├── StorageUtils.js  # GM API 封装
│       └── Logger.js        # 日志（开发模式输出）
│
├── rules/
│   ├── rules.json            # 默认广告规则
│   └── rules.schema.json     # 规则 JSON Schema
│
├── webpack.config.js         # 构建配置
└── dist/
    ├── greasy-ad-skipper.user.js  # 构建产物（可直接安装）
    └── rules.latest.json          # 最新规则
```

### 5.4 油猴脚本入口格式

```javascript
// ==UserScript==
// @name         视频广告跳过助手
// @namespace    https://github.com/yourname/greasy-ad-skipper
// @version      0.1.0
// @description  一键跳过 YouTube / B站 / 腾讯视频 / 爱奇艺 / 优酷 的视频广告，智能规避检测
// @author       YourName
// @match        *://*.youtube.com/*
// @match        *://*.bilibili.com/*
// @match        *://*.v.qq.com/*
// @match        *://*.iqiyi.com/*
// @match        *://*.youku.com/*
// @match        *://*.mgtv.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_notification
// @grant        unsafeWindow
// @license      MIT
// @downloadURL  https://github.com/yourname/greasy-ad-skipper/raw/main/dist/greasy-ad-skipper.user.js
// @updateURL    https://github.com/yourname/greasy-ad-skipper/raw/main/dist/greasy-ad-skipper.meta.js
// ==/UserScript==

(function() {
    'use strict';

    // 核心代码在这里
    // 注意：油猴脚本环境无法使用 ES module，需要用 IIFE 打包
    // 推荐用 rollup 或 webpack 将多个文件打包到单个 .user.js 中
})();
```

### 5.5 技术决策清单

| 决策 | 选择 | 理由 |
|------|------|------|
| **语言** | ES2020+ (通过 Babel 转译) | 广泛兼容，油猴支持较新语法 |
| **打包** | Rollup + Babel | 树摇优化，单文件输出 |
| **样式隔离** | Shadow DOM | 避免与页面样式冲突 |
| **本地存储** | GM_setValue/GM_getValue | 油猴官方 API，无需额外权限 |
| **规则分发** | GitHub Raw + 带版本号的 JSON | 免费、可靠、可回滚 |
| **众包后端** | Cloudflare Workers + D1/Supabase | 免费层够用，边缘计算低延迟 |
| **SponsorBlock 通信** | 直接 fetch API | 无需后端代理，公开接口 |
| **弹幕分析** | 纯本地关键词匹配（MVP） | 无需 AI API，降低准入门槛 |
| **反检测策略** | 随机延迟 + 选择器随机化 + 用户行为模拟 | 三层叠加提高成功率 |
| **代码发布** | GitHub → Greasy Fork 自动同步 | 油猴脚本的标准分发方式 |

### 5.6 开发路线图

```
Phase 0: 技术验证（第 1-3 天）
  └─ 完成 实验 1（YouTube + B站 适配器原型）

Phase 1: MVP（第 4-14 天）
  ├─ 核心引擎（规则引擎 + 反检测 + 事件管道）
  ├─ YouTube 适配器 + SponsorBlock 集成
  ├─ B站 适配器 + 弹幕关键词广告识别
  ├─ 配置面板（首次安装引导 + 基础配置）
  └─ 灰测发布 → 完成 实验 2+3

Phase 2: 扩展（第 15-30 天）
  ├─ 腾讯视频 / 爱奇艺 / 优酷 适配器
  ├─ 众包标记功能 + 后端
  ├─ 进度条广告段可视化
  ├─ 状态悬浮球
  └─ 规则热更新机制

Phase 3: 优化（第 31-45 天）
  ├─ 反检测策略持续调优
  ├─ 社区反馈整理 + Bug 修复
  ├─ 性能优化（减少内存占用）
  └─ 多语言支持（英文配置面板）

Phase 4: 运营（长期）
  ├─ Greasy Fork 发布 + 更新维护
  ├─ 规则库社区化（PR 审核流程）
  ├─ 数据看板
  └─ 根据用户反馈迭代
```

### 5.7 关键技术细节注意事项

#### 5.7.1 YouTube 反检测要点

1. **避免定时轮询** — 不要用 `setInterval` 每 500ms 查询广告，改用 `MutationObserver` 被动监听
2. **模拟真实行为** — 广告跳过前先模拟鼠标移动到跳过按钮位置
3. **请求伪装** — 不要用明显的 `fetch` 频率模式，混合使用 `GM_xmlhttpRequest` 和 `fetch`
4. **存储分离** — 不要在 `window` 对象上设置任何标志变量
5. **版本感知** — 检测 YouTube UI 版本（新/旧播放器），不同版本用不同策略

#### 5.7.2 B站特有处理

1. B站的"会员专属"内容不是广告，不要误跳过
2. B站的"恰饭广告"在视频时间线正片中，需要弹幕分析辅助
3. B站有时在视频中间插入短视频广告（已贴片），不同于 YouTube 的 midroll
4. 弹幕 API: `unsafeWindow.__INITIAL_STATE__` 可能包含视频元信息

#### 5.7.3 油猴脚本性能优化

1. **懒加载**：只在视频页面加载核心逻辑，首页/搜索页只注册轻量监听
2. **内存管理**：离开视频页面时调用 `destroy()` 释放所有 MutationObserver
3. **避免 CSS 全局泄漏**：用 Shadow DOM 或命名空间前缀

---

## 六、实验 Timeline

```
Week 1:
  周一-周三 ── 实验 1：技术 Spike（YouTube + B站最小适配器）
  周四-周五 ── 打包 MVP + 内部审查

Week 2:
  周一-周日 ── 实验 2+3：内测灰测（反检测 + 标记意愿）

Week 3:
  周一 ── 分析实验数据，决策会议
  周二起 ── 根据决策结果进入 Phase 1 持续开发

决策节点（第 15 天）：
  ┌──────────────────────────────────┐
  │  三个实验都 ✅ → 全线推进 Phase 2  │
  │  部分通过 → 调整范围，继续迭代       │
  │  核心失败 → 转向/缩小范围            │
  └──────────────────────────────────┘
```

---

## 七、后续步骤

- [x] ~~产品发现完成~~ ← 当前进度
- [ ] 实验 1 技术 Spike（第 1-3 天）
- [ ] 实验 2 反检测灰测（第 5-12 天）
- [ ] 实验 3 众包意愿验证（内嵌在实验 2 中）
- [ ] 决策会议 + MVP Phase 1 启动
- [ ] 上线 Greasy Fork
- [ ] 迭代运营

---

*本文档是发现计划 + 技术方案，作为开发参考的"活文档"，随迭代持续更新。*
