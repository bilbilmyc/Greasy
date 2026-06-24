# link-skipper

油猴脚本 — 跳过微博/贴吧/知乎/掘金/CSDN/淘宝/京东等中间页，直达目标 URL。

## v0.1 范围

**白名单（瞬时跳转）**：微博 t.cn、腾讯 url.cn、百度 dwz.cn、京东 3.cn / u.jd.com、贴吧 jump.bdimg.com、知乎 link.zhihu.com、掘金 link.juejin.cn、CSDN goto-link.csdn.net、淘宝 a.taobao.com / s.click.taobao.com、天猫 s.click.tmall.com。

**启发式（3 秒倒计时 + 可取消）**：不在名单里但页面看起来像跳转页时触发，识别规则：
1. `<meta http-equiv="refresh" content="N;url=...">` 
2. 内联 JS 中 `window.location = ...` / `location.href = ...` / `location.replace(...)`
3. 标题/h1 含"即将跳转"/"页面跳转"/"正在跳转"/"跳转中"/"redirecting" + 唯一外链
4. 页面只有一个"继续访问 / 立即前往"按钮

## 安装

1. 安装 [Tampermonkey](https://www.tampermonkey.net/)
2. 打开仓库根的 `dist/link-skipper.user.js`
3. 点击安装

## 安全约束

永不跳：
- `javascript:` / `data:` / `vbscript:` 协议
- `localhost` / `*.local` / `*.internal`
- IPv4/IPv6 字面量
- 没有 TLD 的裸 hostname

## 开发

```bash
cd projects/link-skipper
npm install   # 或从 sibling 复制 node_modules
npm run build
```

产物：`../../dist/link-skipper.user.js`

## 调试

控制台过滤 `[link-skipper]` 看命中日志。

## License

MIT
