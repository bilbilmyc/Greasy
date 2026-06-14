# 🎬 Greasy Ad Skipper

多平台视频广告跳过油猴脚本 — **一键跳过 YouTube / B站 / 腾讯视频 / 爱奇艺 / 优酷 / 芒果TV 的视频广告**，同时具备智能反检测能力。

## ✨ 功能特性

| 特性 | 状态 | 说明 |
|------|------|------|
| 🤖 **多平台统一引擎** | ✅ v0.1 | 一套引擎适配 6 个视频平台 |
| 🛡️ **反检测隐身模式** | ✅ v0.1 | 时序随机化 + 选择器混淆 + 行为模拟 |
| ⏭️ **广告自动跳过** | ✅ v0.1 | 片头/插播/贴片/横幅/暂停广告 |
| 📦 **SponsorBlock 集成** | ✅ v0.1 | 复用社区数据跳过 YouTube 赞助段 |
| 📊 **进度条可视化** | ✅ v0.1 | 进度条上彩色标记赞助段 |
| 🔄 **规则热更新** | 🚧 开发中 | 远程规则实时拉取，无需重新安装 |
| 🏷️ **众包广告标记** | 📅 待定 | 社区协作建立中文平台广告时间库 |

## 📥 安装

### 前提条件
1. 安装 [Tampermonkey](https://www.tampermonkey.net/)（推荐）或 Greasemonkey
2. 点击下方安装链接

### 安装链接
```
https://raw.githubusercontent.com/bilbilmyc/Greasy/main/projects/greasy-ad-skipper/dist/greasy-ad-skipper.user.js
```
复制上方链接，在浏览器中打开即可触发安装。

## 🚀 使用方法

安装后打开任意支持的视频页面，脚本会自动运行。

### 跳过模式
- **全自动模式**: 检测到广告自动跳过，体验优先
- **隐身模式**: 增加反检测延迟，降低被封风险
- **仅标记模式**: 仅标记广告不自动跳过

### 配置面板
页面右上角的悬浮球显示今日跳过计数，点击打开配置面板：
- 平台开关 / 跳过模式 / SponsorBlock 开关 / 隐身模式
- 今日统计看板

## 🛠️ 开发

### 项目结构

```
├── src/
│   ├── main.js                # 主入口（启动引导）
│   ├── core/                  # 核心引擎（规则引擎/反检测/事件/配置）
│   ├── adapters/              # 平台适配器（6 个平台）
│   ├── bridges/               # 外部集成（SponsorBlock）
│   ├── ui/                    # 界面组件（配置面板/引导/悬浮球）
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
- **Phase 1**: MVP 核心 — SponsorBlock + 配置面板 + 首次引导 ✅
- **Phase 2**: 平台扩展 — 腾讯/爱奇艺/优酷/芒果适配器 ✅
- **Phase 3**: 代码审查 + 缺陷修复 ✅
- **Phase 4**: 发布运营 — Greasy Fork 正式版（待定）

## ⚠️ 免责声明

本脚本仅供学习研究使用。请尊重各视频平台的服务条款和创作者权益。使用本脚本产生的任何问题由使用者自行承担。

## 📄 License

MIT
