# PRD: reader-mode — 沉浸式阅读 + 去广告 + 免登录

> 状态：v1.0 已拍板
> 作者：Mavis（基于与用户对话合成 + 用户拍板 7 个决策）
> 创建：2026-06-24

## 决策摘要（v1.0 已确定）

| # | 决策点 | 决议 |
|---|---|---|
| 1 | 插件名 | `reader-mode` |
| 2 | 登录墙策略 | 纯客户端 DOM 移除（关闭 modal + 展开折叠），不做服务端绕过 |
| 3 | 设置面板 | v1 走「0 配置 / 装上就用」，v1.1 再加 GM_setValue 持久化 |
| 4 | 深色模式 | v1 不含，单独 PR（v1.1） |
| 5 | 站点范围 | v1 = CSDN + 知乎 + 掘金 + 简书 + B站专栏（5 站全要） |
| 6 | GM_setValue 命名空间前缀 | `reader-mode:` |
| 7 | 发布渠道 | Greasy Fork + GitHub Release 双发布 |

## Problem Statement

CSDN、知乎、掘金、简书、B站专栏等中文内容站点普遍存在以下问题：

1. **广告泛滥** —— 侧边栏广告、信息流广告、弹窗广告、评论区广告、文中插入广告，挤占正文空间。
2. **登录墙强制** —— 阅读完整文章/查看完整答案需要登录，强制折叠内容、弹出 modal。
3. **布局臃肿** —— 站点为追求点击率塞满了相关推荐、热门回答、悬浮按钮，正文阅读体验差。
4. **跨站点重复** —— 每个站点都要装一个去广告/免登录脚本，零散且维护成本高。

读者想要的是**「打开页面就是干净的文章」**——无干扰、可直接读全文、不被强制登录打断。

## Solution

打造一个 Tampermonkey 用户脚本（项目名 `reader-mode`），按站点分模块处理：

- **去广告** —— 跨站点统一的广告元素选择器 + MutationObserver 监听动态注入
- **免登录** —— 移除登录 modal/遮罩、展开折叠内容（**仅客户端 DOM 操作，不绕过服务端鉴权**）
- **布局优化** —— 加宽正文区、隐藏推荐栏、字体/行高优化
- **架构** —— 每个站点一个独立规则模块（参考 `greasy-ad-skipper` 的 `rules/` 模式），共享 utils

## 站点范围（v1）

| 站点 | @match | 主要痛点 |
|---|---|---|
| CSDN | `*://blog.csdn.net/*` | 登录阅读全文、侧边栏广告、文中推荐卡 |
| 知乎 | `*://*.zhihu.com/*` | 答案折叠登录、首页信息流广告、右侧推荐栏 |
| 掘金 | `*://juejin.cn/post/*`, `*://juejin.cn/*` | 弹窗广告、登录拦截 |
| 简书 | `*://www.jianshu.com/*` | 信息流广告、登录遮罩 |
| B站专栏 | `*://www.bilibili.com/read/*` | 弹窗 + 登录拦截 |

## Milestone 切分

| 版本 | 内容 | Issue 范围 |
|---|---|---|
| **v1.0** | 项目骨架 + 5 站全功能（去广告 + 免登录 + 基础布局）+ Greasy Fork 发布 | #1 ~ #8 |
| **v1.1** | 深色模式 + 设置面板（GM_setValue 持久化） | #9, #10 |
| **v2.x** | [TBD] 站点改版适配、UI 微调、社区反馈迭代 | — |

## User Stories

### 核心场景

1. As a reader, I want CSDN 文章页侧边栏广告消失, so that 我的阅读视野不被广告分散。
2. As a reader, I want CSDN 文章中插入的广告卡片（"推荐"、"专题"）消失, so that 文章是连续的。
3. As a reader, I want CSDN 文末「扫码登录阅读全文」遮罩被关闭, so that 我能直接读完。
4. As a reader, I want CSDN 评论区广告消失, so that 评论是干净的。
5. As a reader, I want 知乎首页信息流广告消失, so that 首页只显示真实回答/文章。
6. As a reader, I want 知乎问题页右侧「相关推荐」栏隐藏, so that 答案区更宽。
7. As a reader, I want 知乎「展开全部」折叠在未登录时自动展开, so that 我不用手动点。
8. As a reader, I want 知乎登录弹窗自动关闭, so that 我不会被打断。
9. As a reader, I want 知乎评论区广告消失, so that 评论是干净的。
10. As a reader, I want 掘金弹窗广告消失、登录拦截绕过, so that 我能直接读文章。
11. As a reader, I want 简书信息流广告和登录遮罩消失, so that 阅读不被中断。
12. As a reader, I want B站专栏弹窗广告消失, so that 文章页是干净的。
13. As a reader, I want 正文区域加宽到视口 70-80%, so that 长行不被切到右边很远。
14. As a reader, I want 站点顶部固定悬浮栏不遮挡滚动后的内容, so that 滚动阅读是连续的。
15. As a reader, I want 字体优化（更细、行高更舒服）, so that 长文阅读不累。

### 架构与可维护性

16. As a developer, I want 每个站点的处理逻辑在独立模块文件, so that 我能单独维护某一站点而不影响其他。
17. As a developer, I want 共享 DOM 工具（选择器、MutationObserver 封装、storage 封装）放在 `src/utils/`, so that 各站点规则不重复实现基础设施。
18. As a developer, I want 站点选择器集中维护并附带注释/原 HTML 片段, so that 站点改版时能快速定位失效选择器。
19. As a developer, I want 新增一个站点只需写一个 `src/sites/<name>.js` 模块并注册, so that 扩展成本低。
20. As a developer, I want 构建产物（dist）独立可发布, so that 我能直接推到 Greasy Fork。

### 用户控制（v1.1）

21. As a power user, I want 一个简单的开关面板（Tampermonkey 菜单项或独立弹窗）, so that 我能临时禁用某站点规则。
22. As a power user, I want 设置通过 `GM_setValue('reader-mode:*', ...)` 持久化, so that 我的偏好跨页面保留。

### 鲁棒性

23. As a reader, I want 脚本在站点改版后只失效对应站点、不影响其他站点, so that 单点失败不波及其他。
24. As a reader, I want 脚本在出错时 console 提示但不破坏页面, so that 即使脚本挂了页面仍可用。

## Implementation Decisions

### 项目结构

```
projects/reader-mode/
├── src/
│   ├── main.js                 # 入口，registry + bootstrap
│   ├── sites/
│   │   ├── csdn.js             # CSDN 规则模块
│   │   ├── zhihu.js            # 知乎 规则模块
│   │   ├── juejin.js           # 掘金 规则模块
│   │   ├── jianshu.js          # 简书 规则模块
│   │   ├── bilibili-read.js    # B站专栏 规则模块
│   │   └── _template.js        # 新站点规则模板
│   ├── utils/
│   │   ├── dom.js              # 选择器、MutationObserver 封装
│   │   ├── storage.js          # GM_setValue/getValue 封装
│   │   └── logger.js           # 带 [reader-mode] 前缀的 console
│   └── styles/
│       └── reader.css          # 注入的布局优化样式（不含深色模式，v1.1）
├── dist/
│   └── reader-mode.user.js     # 构建产物（IIFE + UserScript 头）
├── docs/
│   ├── PRD.md                  # 本文档副本
│   └── selectors.md            # 各站点选择器原始记录（便于维护）
├── package.json
├── rollup.config.js
└── README.md
```

### 技术栈

- **构建**：复用 `_template/` 的 rollup + babel 配置
- **包格式**：IIFE 输出（`dist/reader-mode.user.js`），头部加 `// ==UserScript==` 块
- **GM 命名空间**：所有 `GM_setValue/getValue` key 加 `reader-mode:` 前缀

### 跨站点模式

- **广告移除**：每个站点规则模块导出一个 `apply()` 函数，调用共享的 `removeOnMatch(root, selector, label)`，内部用 MutationObserver 监听 `root` 子树。
- **登录墙**：同上模式 + 自动调用 `.click()` 关闭按钮、移除遮罩元素、展开折叠内容。
- **布局优化**：注入 `<style>` 标签到 `<head>`，按站点 class scope 化（避免影响其他站点）。
- **配置存储**：`reader-mode:disabled-sites`、`reader-mode:dark-mode`（v1.1）等。

### 复用现有项目

- `_template/` 直接复制为 `reader-mode/`
- `greasy-ad-skipper/src/rules/` 的多平台规则组织方式可参考
- `pan-direct-link` 的 `DESIGN.md` 风格可借鉴到 `reader-mode/docs/`

## Testing Decisions

- **手工冒烟测试**：每个站点至少测 3 类页（首页 / 详情页 / 搜索结果页），确认：
  - 主要广告元素消失
  - 登录墙不出现 / 自动关闭
  - 布局优化生效且未破坏页面
  - 关闭脚本后页面能正常浏览
- **选择器失效检测**：每个站点规则模块加载时检测 1-2 个关键选择器是否命中，未命中时 `console.warn` 提示（用于站点改版后快速发现失效）
- **不写单测** —— 油猴脚本本质上是端到端用户场景，单测 ROI 低；靠手工冒烟 + 选择器文档。

## Out of Scope

- 服务端鉴权绕过（cookie/token 注入、UA 伪装等）—— 仅为客户端 DOM 操作。
- 移动端浏览器（脚本 `match` 不覆盖 mobile web，且 Greasy Fork 移动端兼容差）。
- 自动更新脚本 —— 依赖 Tampermonkey 自带的 `@version` + `@updateURL`。
- 站点改版自动适配 —— 需要人工维护选择器；可未来引入社区贡献。
- 内容抓取 / 离线保存 —— 偏离「阅读体验」目标。
- **v1 不含**：深色模式、设置面板、字体切换（v1.1 再加）。

## Further Notes

- **优先级**：v1.0 = 5 站点全功能 + Greasy Fork 发布。
- **复用度**：`_template/` 已经够用，主要新增工作集中在 `src/sites/*.js`、`src/utils/`。
- **与现有插件互补**：`greasy-ad-skipper` 专注视频广告跳过，本插件专注内容站点「沉浸阅读」，两者 `@match` 不重叠，可同时安装。
- **Greasy Fork 提交**：v1.0 发布时同步提交 Greasy Fork 审核（首次审核可能需要 1-3 天）。
