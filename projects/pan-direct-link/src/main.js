/**
 * 你的油猴插件 — 主入口
 *
 * 启动流程：
 * 1. 检测页面是否匹配
 * 2. 初始化逻辑
 * 3. 注册事件监听
 */
(function () {
  'use strict';

  const NAME = '网盘直链下载助手';
  const log = (...args) => console.log(`[${NAME}]`, ...args);
  const warn = (...args) => console.warn(`[${NAME}]`, ...args);
  const error = (...args) => console.error(`[${NAME}]`, ...args);

  // ─── 平台检测 ───────────────────────────────────
  const PLATFORM = (() => {
    const host = location.hostname;
    if (host.includes('pan.baidu.com')) return 'baidu';
    if (host.includes('pan.quark.cn')) return 'quark';
    return null;
  })();

  if (!PLATFORM) {
    log('不支持的平台');
    return;
  }
  log(`平台: ${PLATFORM}`);

  // ─── 核心功能 ───────────────────────────────────
  const APP = {
    baidu: {
      // 百度网盘：在文件列表注入"下载直链"按钮
      // 拦截 download API 响应，提取真实下载地址
      init() {
        log('百度网盘模式');
        // TODO: 监听文件列表 DOM 变化，注入下载按钮
        // TODO: 拦截 /api/download 等请求获取直链
      }
    },
    quark: {
      // 夸克网盘：类似方案
      init() {
        log('夸克网盘模式');
        // TODO: 夸克网盘直链获取逻辑
      }
    }
  };

  // ─── 启动 ───────────────────────────────────────
  function bootstrap() {
    try {
      if (APP[PLATFORM]) {
        APP[PLATFORM].init();
        log('已就绪');
      }
    } catch (e) {
      error('启动失败:', e.message);
    }
  }

  if (document.readyState === 'complete') {
    bootstrap();
  } else {
    window.addEventListener('load', bootstrap);
  }
})();
