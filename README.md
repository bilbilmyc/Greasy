# 🎣 Greasy Workspace — 油猴插件工作区

油猴（Tampermonkey）插件开发工作区，统一管理多个用户脚本项目。

## 目录结构

```
├── projects/                      # 所有油猴插件
│   ├── greasy-ad-skipper/         # 插件 1: 视频广告跳过助手
│   ├── _template/                 # 新插件模板
│   └── ...                        # 后续新增插件在此
├── .gitignore
└── README.md
```

## 插件列表

| # | 插件 | 状态 | 描述 |
|---|------|------|------|
| 1 | [greasy-ad-skipper](projects/greasy-ad-skipper/) | ✅ 开发完成 | 多平台视频广告跳过（YouTube/B站/腾讯/爱奇艺/优酷/芒果TV） |

## 新建插件

```bash
# 1. 从模板复制
cp -r projects/_template projects/你的插件名

# 2. 进入目录
cd projects/你的插件名

# 3. 安装依赖
npm install

# 4. 开始开发
# 修改 src/main.js，然后 npm run build
```

## 开发规范

- 每个插件独立目录，独立 `package.json` 和构建配置
- 共享工具函数放在插件各自 `src/utils/` 中（按需复制）
- 插件间不互相依赖，保持独立可发布
- 构建产物输出到各插件的 `dist/` 目录
