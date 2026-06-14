# 网盘直链下载助手 — 设计文档

## 框架结构

```
main.js
├── PlatformDetector       # 平台检测（pan.baidu.com / pan.quark.cn）
├── NetworkInterceptor     # 网络拦截（fetch + XHR 包装）
├── LinkExtractor          # 直链提取（各平台 API 响应解析）
├── LinkPresenter          # 直链展示（浮层弹窗 + 复制/下载）
├── FileListWatcher        # 文件列表监听（MutationObserver → 注入"直链"按钮）
└── Adapters               # 平台适配逻辑
    ├── baidu              # 百度网盘（选择器 + API 路径）
    └── quark              # 夸克网盘（选择器 + API 路径）
```

## 工作流程

```
页面加载
  → PlatformDetector.detect() 判断平台
  → NetworkInterceptor.start() 启动 fetch/XHR 拦截
  → Adapters['xxx'].setupInterceptors() 注册 API 钩子
  → FileListWatcher.start() 监听文件列表，注入"🔗 直链"按钮

用户点击"🔗 直链"按钮
  → 调用 _fetchDirectLink(platform, fileId)
  → TODO: 需要实现具体的 API 调用逻辑

或者网络请求自动捕获
  → 用户正常点击"下载"
  → NetworkInterceptor 拦截到匹配的 API 响应
  → LinkExtractor.extract() 提取直链
  → LinkPresenter.showLink() 展示链接
```

## 待完善（需要实际页面抓包）

### 1. 文件行 CSS 选择器

| 平台 | 当前猜测 | 待确认 |
|------|---------|-------|
| 百度 | `.file-list-item`, `.file-row` | 需要打开页面 F12 确认 |
| 夸克 | `[class*="file-item"]` | 需要打开页面 F12 确认 |

### 2. 文件 ID 提取

| 平台 | 当前猜测 |
|------|---------|
| 百度 | `data-fs_id` 属性 |
| 夸克 | `data-id` 属性 |

### 3. 下载 API 路径

| 平台 | 需要抓包的 API |
|------|--------------|
| 百度 | 打开 F12 → Network → 点击下载 → 看请求了哪个 API → 把路径填入 `Adapters.baidu.setupInterceptors()` |
| 夸克 | 同样操作 |

### 4. 直链获取 API 调用

`FileListWatcher._fetchDirectLink()` 需要根据实际平台的 API 实现，一般流程：

```
百度网盘:
  POST /api/download?fs_id=xxx&sign=xxx
  → 返回 { errno: 0, dlink: "https://..." }

夸克网盘:
  POST /api/download/file?fid=xxx
  → 返回 { code: 0, data: { download_url: "https://..." } }
```

## 如何调试

1. 安装脚本后打开百度/夸克网盘
2. F12 → Console，看 `[网盘直链下载助手]` 日志
3. F12 → Network，看文件下载时发了哪些请求
4. 把请求路径和响应格式告诉我，我更新适配器逻辑
