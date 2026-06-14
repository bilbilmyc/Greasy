# 🎬 Greasy Ad Skipper

多平台视频广告跳过油猴脚本 — **一键跳过 YouTube / B站 / 腾讯视频 / 爱奇艺 / 优酷 / 芒果TV 的视频广告**，同时具备智能反检测能力。

## ✨ 功能特性

| 特性 | 状态 | 说明 |
|------|------|------|
| 🤖 **多平台统一引擎** | ✅ v0.1 (Phase 0) | 一套引擎适配 6 个视频平台 |
| 🛡️ **反检测隐身模式** | ✅ v0.1 (Phase 0) | 时序随机化 + 选择器混淆 + 行为模拟 |
| ⏭️ **广告自动跳过** | ✅ v0.1 (Phase 0 - YT/B站) | 片头/插播/贴片/横幅广告 |
| 📦 **SponsorBlock 集成** | 📅 Phase 1 | 复用社区数据跳过 YouTube 赞助段 |
| 🏷️ **众包广告标记** | 📅 Phase 1 | 社区协作建立中文平台广告时间库 |
| 📊 **进度条可视化** | 📅 Phase 2 | 高亮显示广告段位 |
| 🔄 **规则热更新** | 📅 Phase 2 | 远程规则实时拉取，无需重新安装 |

## 📥 安装

### 前提条件
1. 安装 [Tampermonkey](https://www.tampermonkey.net/)（推荐）或 Greasemonkey
2. 点击下方安装链接

### 安装链接
- **正式版（Greasy Fork）**: *即将上线*
- **内测版**: `dist/greasy-ad-skipper.user.js`（构建产物）

## 🚀 使用方法

安装后打开任意支持的视频页面，脚本会自动运行。

### 默认行为
- **全自动模式**: 检测到广告自动跳过，无需任何操作
- **隐身模式**: 优先防检测，跳过速度可能稍慢
- **手动模式**: 仅标记广告，不自动跳过

### 配置面板
点击浏览器右上角 Tampermonkey 图标 → Greasy Ad Skipper → 配置

## 🛠️ 开发

### 项目结构

```
greasy-ad-skipper/
├── src/
│   ├── main.js                # 主入口（启动引导）
│   ├── core/                  # 核心引擎
│   │   ├── RuleEngine.js      # 规则引擎
│   │   ├── AntiDetection.js   # 反检测引擎
│   │   ├── EventPipeline.js   # 事件管道
│   │   └── ConfigManager.js   # 配置管理
│   ├── adapters/              # 平台适配器
│   │   ├── BaseAdapter.js     # 抽象基类
│   │   ├── YouTubeAdapter.js  # YouTube
│   │   └── BilibiliAdapter.js # B站
│   ├── detectors/             # 广告检测
│   │   ├── AdDetector.js      # 主检测器
│   │   └── strategies/        # 检测策略
│   ├── bridges/               # 外部集成
│   ├── ui/                    # 界面组件
│   └── utils/                 # 工具函数
├── rules/                     # 广告检测规则
├── rollup.config.js           # 构建配置
└── package.json
```

### 本地开发

```bash
# 安装依赖
npm install

# 开发模式（监听文件变化）
npm run watch

# 构建生产版本
npm run build

# 构建完整发布包
npm run release
```

### 构建产物
- `dist/greasy-ad-skipper.user.js` — 完整脚本（可安装到油猴）
- `dist/greasy-ad-skipper.meta.js` — 元数据头（用于版本检查）

## 📋 开发路线

- **Phase 0**: 技术验证 — YouTube + B站 适配器原型 ✅
- **Phase 1**: MVP 核心 — 引擎完善 + SponsorBlock + 配置面板
- **Phase 2**: 平台扩展 — 腾讯/爱奇艺/优酷/芒果 + 众包后端
- **Phase 3**: 优化打磨 — 性能 + 反检测调优 + 多语言
- **Phase 4**: 发布运营 — Greasy Fork 正式版

## ⚠️ 免责声明

本脚本仅供学习研究使用。请尊重各视频平台的服务条款和创作者权益。使用本脚本产生的任何问题由使用者自行承担。

## 📄 License

MIT
