# reader-mode

油猴脚本 — 去除 CSDN 广告与登录墙、知乎登录墙。

## v0.1 范围

- **CSDN** (`blog.csdn.net`)：去除「阅读全文」登录墙 + 主要广告（侧边栏、文中插入）
- **知乎** (`*.zhihu.com`)：关闭登录弹窗 + 展开折叠的答案/文章

仅客户端 DOM 操作，不绕过服务端鉴权。

## 安装

1. 安装 [Tampermonkey](https://www.tampermonkey.net/)
2. 打开仓库根目录的 `dist/reader-mode.user.js`
3. 点击安装

## 开发

```bash
npm install
npm run build
```

产物输出到仓库根 `dist/reader-mode.user.js`（rollup 已配 `../../dist/...`）

## 调试

打开浏览器控制台，过滤 `[reader-mode]` 看日志。

## License

MIT
