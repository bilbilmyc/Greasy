# 发现与决策

## 需求
开发一个油猴（Tampermonkey）插件，屏蔽常见视频网站的广告（片头/插播/贴片/植入），覆盖用户日常使用的主要视频平台。

## 目标用户
中文互联网用户，以看剧、二次元、资讯视频为主要场景的人群。

## 研究发现

### 市场现状（2026-06 搜索）
1. **现有方案分散**：威软去广告覆盖面广但界面简陋易触发反检测；BilibiliSponsorBlock 只限 B站；YouTube 助手只限 YouTube
2. **核心空白**：没有体验统一的多平台一站式解决方案
3. **YouTube 反检测升级**：2024-2025 年加强 adblock 检测，已有弹窗警告、视频缓冲、黑屏等反制手段
4. **SponsorBlock 可用**：API 开放，rate limit 友好，但对中文创作者覆盖率未知
5. **弹幕识别法已验证**：Bilibili Video Ad Skipper (AI版) 已有成功实践，用 LLM 分析弹幕/评论判断恰饭段落

### 各平台广告特征

| 平台 | 广告类型 | 技术特征 | 跳过难度 |
|------|---------|---------|---------|
| YouTube | preroll/midroll/banner/overlay | iframe + Shadow DOM | 🟡 中（反检测难）|
| B站 | 贴片广告 + UP主恰饭植入 | DOM 元素 + 弹幕线索 | 🟢 低（贴片）/ 🟠 高（恰饭）|
| 腾讯视频 | 片头广告 + 暂停广告 | DOM 元素 + 计时器 | 🟢 低 |
| 爱奇艺 | 贴片广告 + 暂停浮窗 | DOM 元素 | 🟢 低 |
| 优酷 | 片头广告 + 片中广告 | DOM 元素 | 🟢 低 |

### 技术可行性评估（实验 1 前置分析）
- YouTube 和 B站的广告机制差异大，但可以通过 **适配器模式** 抽象公共接口
- 核心挑战不在广告检测，而在 **YouTube 的反检测绕避**
- B站 的恰饭广告需要弹幕分析辅助，这是纯 DOM 操作解决不了的
- 预期代码复用率（核心逻辑 vs 平台特定逻辑）：约 40-50%

### 反检测策略有效性分析（实验 2 前置）
- YouTube 检测 adblock 的主要方式：CSS 选择器特征 + window 属性检测 + 请求模式分析
- 应对策略：随机化时序 + DOM 操作伪装 + 行为模拟 + 不使用全局标志
- 暂时无法提前预测效果，必须实机测试

## 技术决策
| 决策 | 理由 |
|------|------|
| 适配器模式作为核心架构 | 各平台广告机制不同，需隔离差异 |
| 规则引擎 + 热更新 | 平台 UI 频繁变更，不可硬编码选择器 |
| MVP 弹幕分析用关键词匹配 | 避免 AI API 依赖，降低准入门槛 |
| 反检测三层策略 | 单层策略容易被针对性 bypass |
| Rollup 打包 | 油猴脚本需要单文件输出，Rollup 树摇好 |

## 核心假设（Top 6 按优先级）

| ID | 假设 | 影响面 | 验证方式 |
|----|------|-------|---------|
| A02 | 不同平台广告机制可用统一规则引擎适配 | 架构成败 | 技术 Spike |
| A08 | 随机化策略可有效规避 YouTube 检测 | 产品生存 | 灰测 7 天 |
| A13 | 中文用户愿标记广告段 | 众包模式 | MVP 埋点 |
| A16 | 冷启动能达到临界质量 | 众包模式 | 数据观察 |
| A03 | 维护成本不随平台线性增长 | 长期维护 | 架构评审 |
| A21 | SponsorBlock 对中文 YouTube 覆盖充分 | 功能价值 | 抽样分析 |

## 资源
- [SponsorBlock API 文档](https://wiki.sponsor.ajay.app/index.php/API_Docs)
- [Greasy Fork 脚本发布指南](https://greasyfork.org/zh-CN/help/publishing)
- [油猴 GM API 文档](https://www.tampermonkey.net/documentation.php)
- 项目位置: `projects/greasy-ad-skipper/`
- 竞品参考:
  - 威软去广告: https://github.com/weiruankeji2025/weiruan-ads
  - BilibiliSponsorBlock: https://github.com/MCfengyou/BilibiliSponsorBlock-Tampermonkey
  - YouTube 助手: https://greasyfork.org/zh-CN/scripts/563208

---
*每执行 2 次查看/浏览器/搜索操作后更新此文件*
*防止视觉信息丢失*
