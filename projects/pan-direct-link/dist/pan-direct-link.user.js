// ==UserScript==
// @name         网盘直链下载助手
// @namespace    https://github.com/bilbilmyc/Greasy
// @version      0.1.0
// @description  百度网盘 / 夸克网盘 网页端直接下载，无需客户端
// @author       bilbilmyc
// @license      MIT
// @match        *://pan.baidu.com/*
// @match        *://pan.quark.cn/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @grant        GM_notification
// @grant        unsafeWindow
// @run-at       document-idle
// ==/UserScript==
(function () {
  'use strict';

  /**
   * 你的油猴插件 — 主入口
   *
   * 启动流程：
   * 1. 检测页面是否匹配
   * 2. 初始化逻辑
   * 3. 注册事件监听
   */
  (function () {

    const NAME = '网盘直链下载助手';
    const log = function () {
      for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }
      return console.log(`[${NAME}]`, ...args);
    };
    const error = function () {
      for (var _len3 = arguments.length, args = new Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
        args[_key3] = arguments[_key3];
      }
      return console.error(`[${NAME}]`, ...args);
    };

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

})();
