# link-skipper — Design

> Date: 2026-06-24
> Status: approved
> Author: Mavis (brainstorming session with bilbilmyc)

## Goal

跳过"警告 / 倒计时 / 点击继续"中间页，直接跳到目标 URL。日常浏览减少 5-10 次/天的无意义点击。

## Approach: Hybrid (hardcoded + heuristic)

- **硬编码名单**：已知安全的中文站点中间页 host → 瞬时重定向，零 UI
- **启发式识别**：不在名单里但看起来像跳转页 → 3 秒倒计时 banner，用户可取消

## Hardcoded whitelist (v0.1)

| Domain | 用途 |
|---|---|
| `t.cn` | 微博短链 |
| `url.cn` | 腾讯短链 |
| `dwz.cn` | 百度短链 |
| `jump.bdimg.com` | 百度贴吧跳转 |
| `link.zhihu.com` | 知乎外链 |
| `link.juejin.cn` | 掘金外链 |
| `goto-link.csdn.net` | CSDN 外链 |
| `a.taobao.com`, `s.click.taobao.com`, `s.click.tmall.com` | 淘宝/天猫跳转 |
| `u.jd.com`, `3.cn` | 京东短链 |

行为：**瞬时重定向**，不显示任何 UI。

## Heuristic detection (triggered when not in whitelist)

按优先级匹配，第一个命中即返回 target URL：

1. `<meta http-equiv="refresh" content="N;url=...">` → 提取 url
2. 内联 JS 中 `window.location = ...` / `location.href = ...` 赋值 → 提取
3. 标题/h1 含"即将跳转"/"页面跳转"/"redirecting" 等关键词，且页面有指向外部域名的 `<a>` 链接 → 该链接为目标
4. 页面只有 "继续访问 / 立即前往" 类按钮 → 按钮 href 为目标

行为：**3 秒倒计时 banner**（右上角小条，显示「正在跳转到 <host>... 取消」），用户点取消停止跳转，否则 3 秒后自动跳转。

## Safety constraints

适用于全部路径（硬编码 + 启发式）：

- 永不跳 `javascript:` / `data:` / `vbscript:` 协议
- 目标 URL 必须是 http(s)
- 启发式要求目标 host ≠ 当前 host（避免站内循环）
- 启发式要求目标 host 是 http(s)，且顶级域在公共后缀列表中（防内网钓鱼）
- 名单内的 host 永远走硬编码，不走启发式（避免被同 host 钓鱼页利用启发式绕过名单）

## File structure

```
projects/link-skipper/
├── src/
│   ├── main.js        # 入口：先查名单 → 否则启发式
│   ├── sites.js       # 名单（纯数据 + 说明）
│   ├── heuristic.js   # 4 种启发式检测
│   └── overlay.js     # 倒计时 banner UI
├── package.json
├── rollup.config.js
├── babel.config.js
└── README.md
```

rollup 输出到 `../../dist/link-skipper.user.js`（沿用 reader-mode 约定）。

## Build & Test

- 复用 `_template/` 复制
- `node_modules` 从 greasy-ad-skipper 或 reader-mode 复用
- `npm run build` 产物到 `../../dist/link-skipper.user.js`
- 手工冒烟测试：分别构造一个硬编码命中页面 + 一个启发式命中页面（可以是真实跳转页或本地 HTML mock）

## Out of scope (v0.1)

- 设置面板 / 用户自定义名单
- 黑名单（已知有问题的中间页）
- 移动端
- 站内跳转（如登录后跳回）

## Future (post v0.1, 如果需要)

- v0.2：用户可在油猴菜单添加自定义白名单
- v0.3：黑名单模式（遇到特定 host 不跳）
- v0.4：跳前显示目标 URL 预览（加强反钓鱼）
