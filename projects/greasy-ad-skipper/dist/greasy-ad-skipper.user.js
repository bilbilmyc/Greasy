// ==UserScript==
// @name         视频广告跳过助手
// @namespace    https://github.com/bilbilmyc/Greasy
// @version      0.1.0
// @description  一键跳过 YouTube / B站 / 腾讯视频 / 爱奇艺 / 优酷 / 芒果TV 的视频广告，智能规避检测
// @author       bilbilmyc
// @license      MIT
// @match        *://*.youtube.com/*
// @match        *://*.bilibili.com/*
// @match        *://*.v.qq.com/*
// @match        *://*.iqiyi.com/*
// @match        *://*.youku.com/*
// @match        *://*.mgtv.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_notification
// @grant        unsafeWindow
// @run-at       document-end
// @downloadURL  https://raw.githubusercontent.com/bilbilmyc/Greasy/main/projects/greasy-ad-skipper/dist/greasy-ad-skipper.user.js
// @updateURL    https://raw.githubusercontent.com/bilbilmyc/Greasy/main/projects/greasy-ad-skipper/dist/greasy-ad-skipper.meta.js
// @supportURL   https://github.com/bilbilmyc/Greasy/issues
// ==/UserScript==

/*!
 * Greasy Ad Skipper v0.1.0
 * https://github.com/bilbilmyc/Greasy
 * MIT License
 */
(function () {
  'use strict';

  /**
   * 日志工具 — 开发模式下输出详细日志，生产模式只输出警告/错误
   */
  const Logger = {
    prefix: '[GreasyAdSkipper]',
    /**
     * 设置日志等级
     * 0=生产（仅 error）, 1=warn+, 2=info+, 3=debug+
     */
    level: typeof GM_getValue === 'function' && GM_getValue('log_level') || 1,
    debug() {
      if (this.level >= 3) {
        for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
          args[_key] = arguments[_key];
        }
        console.debug(this.prefix, '[DEBUG]', ...args);
      }
    },
    info() {
      if (this.level >= 2) {
        for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
          args[_key2] = arguments[_key2];
        }
        console.log(this.prefix, '[INFO]', ...args);
      }
    },
    warn() {
      if (this.level >= 1) {
        for (var _len3 = arguments.length, args = new Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
          args[_key3] = arguments[_key3];
        }
        console.warn(this.prefix, '[WARN]', ...args);
      }
    },
    error() {
      for (var _len4 = arguments.length, args = new Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
        args[_key4] = arguments[_key4];
      }
      console.error(this.prefix, '[ERROR]', ...args);
    },
    /**
     * 广告事件专用日志（仅 debug 模式）
     */
    adEvent(platform, action, detail) {
      this.debug(`[AdEvent][${platform}] ${action}`, detail);
    }
  };

  /**
   * URL 解析与平台检测工具
   */
  const PLATFORM_CONFIG = [{
    name: 'youtube',
    patterns: [{
      host: 'www.youtube.com',
      path: /^\/watch/
    }, {
      host: 'm.youtube.com',
      path: /^\/watch/
    }, {
      host: 'youtube.com',
      path: /^\/watch/
    }, {
      host: 'www.youtube.com',
      path: /^\/shorts\//
    }],
    videoIdRegex: /[?&]v=([^&]+)/
  }, {
    name: 'bilibili',
    patterns: [{
      host: 'www.bilibili.com',
      path: /^\/video\//
    }, {
      host: 'www.bilibili.com',
      path: /^\/bangumi\//
    }, {
      host: 'm.bilibili.com',
      path: /^\/video\//
    }, {
      host: 'm.bilibili.com',
      path: /^\/bangumi\//
    }],
    videoIdRegex: /\/video\/(BV[a-zA-Z0-9]+)/,
    epIdRegex: /\/bangumi\/play\/(ep\d+)/
  }, {
    name: 'tencent',
    patterns: [{
      host: 'v.qq.com',
      path: /^\/x\//
    }, {
      host: 'v.qq.com',
      path: /^\/\w+\/\w+\//
    }]
  }, {
    name: 'iqiyi',
    patterns: [{
      host: 'www.iqiyi.com',
      path: /^\/v_/
    }, {
      host: 'www.iqiyi.com',
      path: /^\/a_/
    }, {
      host: 'www.iqiyi.com',
      path: /^\/play_\d+\//
    }]
  }, {
    name: 'youku',
    patterns: [{
      host: 'v.youku.com',
      path: /^\/v_show\//
    }]
  }, {
    name: 'mgtv',
    patterns: [{
      host: 'www.mgtv.com',
      path: /^\/b\//
    }, {
      host: 'www.mgtv.com',
      path: /^\/[a-z]\/\d+\//
    }]
  }];
  const UrlUtils = {
    /**
     * 检测当前 URL 属于哪个平台
     * @returns {string|null} 平台名称或 null
     */
    detectPlatform(url) {
      if (url === void 0) {
        url = window.location.href;
      }
      try {
        const urlObj = new URL(url);
        for (const platform of PLATFORM_CONFIG) {
          for (const pattern of platform.patterns) {
            if (urlObj.host === pattern.host && pattern.path.test(urlObj.pathname)) {
              return platform.name;
            }
          }
        }
        return null;
      } catch (e) {
        return null;
      }
    },
    /**
     * 判断当前页面是否是视频播放页
     */
    isVideoPage(url) {
      if (url === void 0) {
        url = window.location.href;
      }
      return this.detectPlatform(url) !== null;
    },
    /**
     * 提取 YouTube 视频 ID
     */
    extractYouTubeVideoId(url) {
      if (url === void 0) {
        url = window.location.href;
      }
      const match = url.match(/[?&]v=([^&]+)/);
      return match ? match[1] : null;
    },
    /**
     * 提取 B站 视频 ID (BV号)
     */
    extractBilibiliVideoId(url) {
      if (url === void 0) {
        url = window.location.href;
      }
      const match = url.match(/\/video\/(BV[a-zA-Z0-9]+)/);
      return match ? match[1] : null;
    },
    /**
     * 获取平台名称的中文显示
     */
    getPlatformDisplayName(platform) {
      const names = {
        youtube: 'YouTube',
        bilibili: 'B站',
        tencent: '腾讯视频',
        iqiyi: '爱奇艺',
        youku: '优酷',
        mgtv: '芒果TV'
      };
      return names[platform] || platform;
    },
    /**
     * 获取支持的平台列表
     */
    getSupportedPlatforms() {
      return PLATFORM_CONFIG.map(p => p.name);
    }
  };

  /**
   * GM 存储 API 封装
   * 提供带默认值和命名空间的键值存储
   */

  const STORAGE_NAMESPACE = 'greasy_skipper_';
  const StorageUtils = {
    /**
     * 获取存储值，支持默认值
     */
    get(key, defaultValue) {
      if (defaultValue === void 0) {
        defaultValue = null;
      }
      const fullKey = STORAGE_NAMESPACE + key;
      try {
        if (typeof GM_getValue === 'function') {
          const value = GM_getValue(fullKey);
          return value !== undefined ? value : defaultValue;
        }
        // fallback: localStorage
        const raw = localStorage.getItem(fullKey);
        return raw !== null ? JSON.parse(raw) : defaultValue;
      } catch (e) {
        return defaultValue;
      }
    },
    /**
     * 设置存储值
     */
    set(key, value) {
      const fullKey = STORAGE_NAMESPACE + key;
      try {
        if (typeof GM_setValue === 'function') {
          GM_setValue(fullKey, value);
        } else {
          localStorage.setItem(fullKey, JSON.stringify(value));
        }
        return true;
      } catch (e) {
        return false;
      }
    },
    /**
     * 删除存储值
     */
    delete(key) {
      const fullKey = STORAGE_NAMESPACE + key;
      try {
        if (typeof GM_deleteValue === 'function') {
          GM_deleteValue(fullKey);
        } else {
          localStorage.removeItem(fullKey);
        }
        return true;
      } catch (e) {
        return false;
      }
    },
    /**
     * 列出所有存储键
     */
    list() {
      try {
        if (typeof GM_listValues === 'function') {
          return GM_listValues().filter(k => k.startsWith(STORAGE_NAMESPACE)).map(k => k.slice(STORAGE_NAMESPACE.length));
        }
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(STORAGE_NAMESPACE)) {
            keys.push(key.slice(STORAGE_NAMESPACE.length));
          }
        }
        return keys;
      } catch (e) {
        return [];
      }
    },
    /**
     * 批量获取配置
     */
    getConfig(defaults) {
      if (defaults === void 0) {
        defaults = {};
      }
      const config = {};
      for (const _ref of Object.entries(defaults)) {
        const key = _ref[0];
        const defaultValue = _ref[1];
        config[key] = this.get(`config_${key}`, defaultValue);
      }
      return config;
    },
    /**
     * 批量保存配置
     */
    setConfig(config) {
      for (const _ref2 of Object.entries(config)) {
        const key = _ref2[0];
        const value = _ref2[1];
        this.set(`config_${key}`, value);
      }
    },
    /**
     * 获取今日统计数据
     */
    getTodayStats() {
      const today = new Date().toISOString().split('T')[0];
      return this.get(`stats_${today}`, {
        adsSkipped: 0,
        adsMarked: 0,
        activeTime: 0
      });
    },
    /**
     * 增加今日跳过计数
     */
    incrementSkipped() {
      const today = new Date().toISOString().split('T')[0];
      const stats = this.get(`stats_${today}`, {
        adsSkipped: 0,
        adsMarked: 0,
        activeTime: 0
      });
      stats.adsSkipped = (stats.adsSkipped || 0) + 1;
      this.set(`stats_${today}`, stats);
      return stats.adsSkipped;
    }
  };

  /**
   * DOM 操作工具集
   * 封装底层的 DOM 查询/操作，方便统一管理和替换
   */

  const DomUtils = {
    /**
     * 安全地查询单个元素（支持 Shadow DOM 穿透）
     */
    querySelector(selector, root) {
      if (root === void 0) {
        root = document;
      }
      try {
        // 检查是否在 Shadow DOM 内
        if (root instanceof ShadowRoot || root.shadowRoot) {
          const shadow = root.shadowRoot || root;
          return shadow.querySelector(selector);
        }
        return root.querySelector(selector);
      } catch (e) {
        return null;
      }
    },
    /**
     * 安全地查询多个元素
     */
    querySelectorAll(selector, root) {
      if (root === void 0) {
        root = document;
      }
      try {
        if (root instanceof ShadowRoot || root.shadowRoot) {
          const shadow = root.shadowRoot || root;
          return Array.from(shadow.querySelectorAll(selector));
        }
        return Array.from(root.querySelectorAll(selector));
      } catch (e) {
        return [];
      }
    },
    /**
     * 按选择器列表依次查询，返回第一个匹配的元素
     */
    querySelectorAny(selectors, root) {
      if (root === void 0) {
        root = document;
      }
      for (const selector of selectors) {
        const el = this.querySelector(selector, root);
        if (el) return el;
      }
      return null;
    },
    /**
     * 查找包含指定文本的元素（支持模糊匹配）
     */
    findElementByText(parent, text, tag) {
      if (tag === void 0) {
        tag = '*';
      }
      const elements = parent.querySelectorAll(tag);
      for (const el of elements) {
        if (el.textContent && el.textContent.includes(text)) {
          return el;
        }
      }
      return null;
    },
    /**
     * 创建 Shadow DOM 隔离容器
     */
    createShadowHost(id) {
      let host = document.getElementById(id);
      if (!host) {
        host = document.createElement('div');
        host.id = id;
        host.style.cssText = 'all: initial; position: fixed; z-index: 999999;';
        document.body.appendChild(host);
      }
      if (!host.shadowRoot) {
        host.attachShadow({
          mode: 'closed'
        });
      }
      return host;
    },
    /**
     * 模拟真实鼠标移动到目标元素
     */
    simulateMouseMove(element) {
      if (!element) return;
      try {
        const rect = element.getBoundingClientRect();
        const x = rect.left + rect.width / 2 + (Math.random() - 0.5) * 10;
        const y = rect.top + rect.height / 2 + (Math.random() - 0.5) * 10;

        // 分步移动（更接近真实用户）
        const steps = 3 + Math.floor(Math.random() * 3);
        for (let i = 1; i <= steps; i++) {
          const progress = i / steps;
          const cx = rect.left + rect.width * progress + (Math.random() - 0.5) * 20;
          const cy = rect.top + rect.height * 0.5 + (Math.random() - 0.5) * 20;
          element.dispatchEvent(new MouseEvent('mousemove', {
            clientX: cx,
            clientY: cy,
            bubbles: true,
            cancelable: true
          }));
        }
        element.dispatchEvent(new MouseEvent('mouseover', {
          clientX: x,
          clientY: y,
          bubbles: true,
          cancelable: true
        }));
      } catch (e) {
        // 静默失败，不影响核心功能
      }
    },
    /**
     * 安全地点击元素
     */
    safeClick(element) {
      if (!element) return false;
      try {
        element.click();
        return true;
      } catch (e) {
        try {
          element.dispatchEvent(new MouseEvent('click', {
            bubbles: true,
            cancelable: true
          }));
          return true;
        } catch (e2) {
          return false;
        }
      }
    },
    /**
     * 移除 DOM 元素（安全）
     */
    safeRemove(element) {
      if (!element || !element.parentNode) return false;
      try {
        element.style.display = 'none';
        // 延迟移除，给浏览器时间处理
        setTimeout(() => {
          if (element.parentNode) {
            element.parentNode.removeChild(element);
          }
        }, 100);
        return true;
      } catch (e) {
        return false;
      }
    },
    /**
     * 等待元素出现在 DOM 中
     */
    waitForElement(selector, timeout, root) {
      if (timeout === void 0) {
        timeout = 10000;
      }
      if (root === void 0) {
        root = document;
      }
      return new Promise(resolve => {
        if (root.querySelector(selector)) {
          return resolve(root.querySelector(selector));
        }
        const observer = new MutationObserver(() => {
          const el = root.querySelector(selector);
          if (el) {
            observer.disconnect();
            resolve(el);
          }
        });
        observer.observe(root.body || root, {
          childList: true,
          subtree: true
        });
        setTimeout(() => {
          observer.disconnect();
          resolve(null);
        }, timeout);
      });
    }
  };

  /**
   * 规则引擎 — 规则加载、匹配、热更新
   *
   * 职责：
   * 1. 加载内建规则（rules.json）
   * 2. 支持从远程 URL 热更新规则
   * 3. 按平台返回适用的规则
   * 4. 管理平台适配器注册
   */
  class RuleEngine {
    constructor() {
      this._adapters = new Map(); // platform -> Adapter instance
      this._rules = null; // parsed rules object
      this._rulesUrl = null; // remote rules URL
      this._initialized = false;
    }

    /**
     * 初始化规则引擎
     * @param {Object} builtinRules - 内建规则对象
     * @param {string} [remoteUrl] - 远程规则 URL（可选）
     */
    async init(builtinRules, remoteUrl) {
      var _this$_rules;
      this._rules = builtinRules;
      this._rulesUrl = remoteUrl || null;

      // 尝试加载远程规则（静默失败，回退到内建规则）
      if (this._rulesUrl) {
        try {
          await this._fetchRemoteRules();
          Logger.info(`规则已从远程更新: ${this._rulesUrl}`);
        } catch (e) {
          Logger.warn('远程规则加载失败，使用内建规则', e.message);
        }
      }
      this._initialized = true;
      Logger.info(`规则引擎已初始化，版本: ${((_this$_rules = this._rules) == null ? void 0 : _this$_rules.version) || 'unknown'}`);
    }

    /**
     * 注册平台适配器
     */
    registerAdapter(platform, adapter) {
      this._adapters.set(platform, adapter);
      Logger.debug(`适配器已注册: ${platform}`);
    }

    /**
     * 获取已注册的适配器
     */
    getAdapter(platform) {
      return this._adapters.get(platform) || null;
    }

    /**
     * 获取所有已注册的适配器
     */
    getAllAdapters() {
      return Array.from(this._adapters.entries());
    }

    /**
     * 获取指定平台的规则
     */
    getRules(platform) {
      if (!this._rules || !this._rules.rules) return null;
      return this._rules.rules[platform] || null;
    }

    /**
     * 获取平台的广告选择器列表
     */
    getAdSelectors(platform) {
      const rules = this.getRules(platform);
      if (!rules || !rules.selectors) return [];
      return [...(rules.selectors.adContainer || []), ...(rules.selectors.adBadge || [])];
    }

    /**
     * 获取平台的跳过按钮选择器列表
     */
    getSkipButtonSelectors(platform) {
      const rules = this.getRules(platform);
      if (!rules || !rules.selectors) return [];
      return rules.selectors.skipButton || [];
    }

    /**
     * 获取平台的 Observer 配置
     */
    getObserverConfig(platform) {
      const rules = this.getRules(platform);
      return rules ? rules.observers || null : null;
    }

    /**
     * 获取平台的跳过策略列表
     */
    getSkipStrategies(platform) {
      const rules = this.getRules(platform);
      return rules ? rules.skipStrategies || [] : [];
    }

    /**
     * 获取平台的反检测配置
     */
    getAntiDetectionConfig(platform) {
      const rules = this.getRules(platform);
      return rules ? rules.antiDetection || null : null;
    }

    /**
     * 获取平台的植入广告检测配置
     */
    getEmbeddedAdDetection(platform) {
      const rules = this.getRules(platform);
      return rules ? rules.embeddedAdDetection || null : null;
    }

    /**
     * 获取默认设置
     */
    getDefaultSettings() {
      return this._rules ? this._rules.defaultSettings || {} : {};
    }

    /**
     * 强制刷新远程规则
     */
    async refreshRules() {
      if (!this._rulesUrl) return false;
      try {
        await this._fetchRemoteRules();
        Logger.info('规则远程刷新成功');
        return true;
      } catch (e) {
        Logger.error('规则远程刷新失败', e.message);
        return false;
      }
    }

    /**
     * 设置新的远程规则 URL
     */
    setRulesUrl(url) {
      this._rulesUrl = url;
    }

    /**
     * 从远程获取规则
     */
    async _fetchRemoteRules() {
      return new Promise((resolve, reject) => {
        if (typeof GM_xmlhttpRequest === 'function') {
          GM_xmlhttpRequest({
            method: 'GET',
            url: this._rulesUrl,
            onload: res => {
              if (res.status >= 200 && res.status < 300) {
                try {
                  const parsed = JSON.parse(res.responseText);
                  if (parsed && parsed.version && parsed.rules) {
                    this._rules = parsed;
                    resolve();
                  } else {
                    reject(new Error('远程规则格式无效'));
                  }
                } catch (e) {
                  reject(new Error('远程规则 JSON 解析失败'));
                }
              } else {
                reject(new Error(`HTTP ${res.status}`));
              }
            },
            onerror: () => reject(new Error('网络请求失败')),
            ontimeout: () => reject(new Error('请求超时'))
          });
        } else {
          // fallback: 使用 fetch
          fetch(this._rulesUrl).then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
          }).then(data => {
            if (data && data.version && data.rules) {
              this._rules = data;
              resolve();
            } else {
              reject(new Error('远程规则格式无效'));
            }
          }).catch(reject);
        }
      });
    }
  }

  // 单例导出
  const ruleEngine = new RuleEngine();

  /**
   * 事件管道 — 广告检测事件的发布/订阅系统
   *
   * 解耦「广告检测」和「广告跳过」之间的直接依赖。
   * 任何检测器发现广告 → 发布事件 → 任意执行器收到事件后处理
   */
  let EventPipeline$1 = class EventPipeline {
    constructor() {
      this._handlers = new Map();
      this._history = [];
      this._maxHistory = 100;
    }

    /**
     * 注册事件处理器
     * @param {string} event - 事件名
     * @param {Function} handler - (data) => void
     * @param {number} [priority=0] - 优先级，越高越先执行
     */
    on(event, handler, priority) {
      if (priority === void 0) {
        priority = 0;
      }
      if (!this._handlers.has(event)) {
        this._handlers.set(event, []);
      }
      this._handlers.get(event).push({
        handler,
        priority
      });
      // 按优先级降序排列
      this._handlers.get(event).sort((a, b) => b.priority - a.priority);
    }

    /**
     * 移除事件处理器
     */
    off(event, handler) {
      const handlers = this._handlers.get(event);
      if (!handlers) return;
      if (handler) {
        const idx = handlers.findIndex(h => h.handler === handler);
        if (idx >= 0) handlers.splice(idx, 1);
      } else {
        this._handlers.delete(event);
      }
    }

    /**
     * 发布事件
     * @param {string} event - 事件名
     * @param {*} data - 事件数据
     */
    async emit(event, data) {
      const handlers = this._handlers.get(event);
      if (!handlers || handlers.length === 0) return;

      // 记录事件历史
      this._recordHistory(event, data);
      Logger.debug(`事件发布: ${event}`, data);

      // 依次执行处理器
      for (const _ref of handlers) {
        const handler = _ref.handler;
        try {
          await handler(data);
        } catch (e) {
          Logger.error(`事件处理器错误 [${event}]:`, e.message);
        }
      }
    }

    /**
     * 同步版本的事件发布
     */
    emitSync(event, data) {
      const handlers = this._handlers.get(event);
      if (!handlers || handlers.length === 0) return;
      this._recordHistory(event, data);
      for (const _ref2 of handlers) {
        const handler = _ref2.handler;
        try {
          handler(data);
        } catch (e) {
          Logger.error(`事件处理器错误 [${event}]:`, e.message);
        }
      }
    }

    /**
     * 获取所有已注册的事件类型
     */
    getEvents() {
      return Array.from(this._handlers.keys());
    }

    /**
     * 获取事件历史
     */
    getHistory(event, limit) {
      if (limit === void 0) {
        limit = 10;
      }
      const events = event ? this._history.filter(h => h.event === event) : this._history;
      return events.slice(-limit);
    }

    /**
     * 清除所有处理器
     */
    clear() {
      this._handlers.clear();
      this._history = [];
    }
    _recordHistory(event, data) {
      this._history.push({
        event,
        data: this._sanitizeData(data),
        timestamp: Date.now()
      });
      if (this._history.length > this._maxHistory) {
        this._history.shift();
      }
    }
    _sanitizeData(data) {
      // 只保存关键信息，避免保存 DOM 元素引用
      if (data && typeof data === 'object') {
        const sanitized = {};
        for (const _ref3 of Object.entries(data)) {
          const key = _ref3[0];
          const value = _ref3[1];
          if (value instanceof HTMLElement) {
            sanitized[key] = `<${value.tagName}>`;
          } else if (typeof value !== 'function') {
            sanitized[key] = value;
          }
        }
        return sanitized;
      }
      return data;
    }
  };

  // 预定义事件类型
  EventPipeline$1.EVENTS = {
    AD_DETECTED: 'ad:detected',
    // 检测到广告
    AD_SKIPPED: 'ad:skipped',
    // 广告已跳过
    AD_SKIP_FAILED: 'ad:skip_failed',
    // 广告跳过失败
    AD_MARKED: 'ad:marked',
    // 用户标记了广告
    PLATFORM_CHANGED: 'platform:changed',
    // 页面平台变更
    CONFIG_CHANGED: 'config:changed',
    // 配置变更
    DETECTION_WARNING: 'detection:warning' // 检测到平台警告
  };
  const eventPipeline = new EventPipeline$1();

  /**
   * 配置管理器 — 用户设置的读取/保存/监听
   */
  class ConfigManager {
    constructor() {
      this._settings = {};
      this._defaults = {};
      this._initialized = false;
    }

    /**
     * 初始化配置管理器
     * @param {Object} defaults - 默认配置
     */
    init(defaults) {
      if (defaults === void 0) {
        defaults = {};
      }
      this._defaults = {
        skipMode: 'auto',
        // auto | stealth | manual
        enableSponsorBlock: true,
        enableCrowdSource: false,
        showStatusBall: true,
        showProgressOverlay: false,
        stealthMode: true,
        logLevel: 1,
        ...defaults
      };
      this._settings = StorageUtils.getConfig(this._defaults);
      this._initialized = true;
      Logger.info('配置管理器已初始化', this._settings);
    }

    /**
     * 获取所有设置
     */
    getAll() {
      return {
        ...this._settings
      };
    }

    /**
     * 获取单个设置
     */
    get(key) {
      if (!this._initialized) return this._defaults[key];
      return this._settings.hasOwnProperty(key) ? this._settings[key] : this._defaults[key];
    }

    /**
     * 更新设置
     */
    set(key, value) {
      const oldValue = this._settings[key];
      if (oldValue === value) return;
      this._settings[key] = value;
      StorageUtils.setConfig({
        [key]: value
      });
      Logger.debug(`配置变更: ${key} = ${value}`);
      eventPipeline.emitSync(EventPipeline.EVENTS.CONFIG_CHANGED, {
        key,
        value,
        oldValue
      });
    }

    /**
     * 批量更新设置
     */
    setMultiple(updates) {
      const changed = {};
      for (const _ref of Object.entries(updates)) {
        const key = _ref[0];
        const value = _ref[1];
        if (this._settings[key] !== value) {
          this._settings[key] = value;
          changed[key] = value;
        }
      }
      if (Object.keys(changed).length > 0) {
        StorageUtils.setConfig(changed);
        Logger.debug('批量配置变更', changed);
        eventPipeline.emitSync(EventPipeline.EVENTS.CONFIG_CHANGED, changed);
      }
    }

    /**
     * 重置为默认值
     */
    reset() {
      this._settings = {
        ...this._defaults
      };
      StorageUtils.setConfig(this._defaults);
      Logger.info('配置已重置为默认值');
      eventPipeline.emitSync(EventPipeline.EVENTS.CONFIG_CHANGED, this._defaults);
    }

    /**
     * 获取默认值
     */
    getDefaults() {
      return {
        ...this._defaults
      };
    }

    /**
     * 跳过模式判断
     */
    isAutoMode() {
      return this.get('skipMode') === 'auto';
    }
    isStealthMode() {
      return this.get('skipMode') === 'stealth';
    }
    isManualMode() {
      return this.get('skipMode') === 'manual';
    }
  }
  const configManager = new ConfigManager();

  /**
   * 反检测引擎 — 规避平台的 adblock 检测
   *
   * 三层策略：
   * 1. 时序随机化：操作前随机等待，观察者防抖
   * 2. 选择器随机化：在 DOM 查询时加入噪声属性
   * 3. 用户行为模拟：模拟鼠标移动、自然的操作时序
   */
  class SeededRandom {
    constructor(seed) {
      this.seed = seed || Date.now();
    }

    /** 生成 [0, 1) 伪随机数 */
    next() {
      this.seed = this.seed * 1664525 + 1013904223 & 0x7fffffff;
      return this.seed / 0x7fffffff;
    }

    /** 生成 [min, max] 整数 */
    nextInt(min, max) {
      return Math.floor(this.next() * (max - min + 1)) + min;
    }

    /** 生成随机十六进制字符串 */
    nextHex(length) {
      let result = '';
      const chars = 'abcdef0123456789';
      for (let i = 0; i < length; i++) {
        result += chars[Math.floor(this.next() * chars.length)];
      }
      return result;
    }
  }
  class AntiDetectionEngine {
    constructor() {
      this._config = {
        clickDelay: {
          min: 500,
          max: 2000
        },
        observerDebounceMs: 300,
        randomizeSelectors: false,
        simulateMouseMove: false,
        addNoiseMutations: false,
        simulateNetworkDelay: false,
        avoidGlobalFlags: true,
        useNativeAPIsOnly: false
      };
      this._rng = new SeededRandom();
      this._timers = [];
      this._observers = [];
      this._applied = false;
    }

    /**
     * 为指定平台配置反检测策略
     */
    configure(config) {
      if (!config) return;
      Object.assign(this._config, config);
      Logger.debug('反检测引擎已配置', this._config);
    }

    /**
     * 应用反检测策略
     */
    apply() {
      if (this._applied) return;
      this._applied = true;
      if (this._config.avoidGlobalFlags) {
        this._patchGlobalFlags();
      }
      Logger.info('反检测引擎已激活');
    }

    /**
     * 等待随机延迟（核心反检测策略 1：时序随机化）
     */
    async randomDelay(action) {
      if (action === void 0) {
        action = 'generic';
      }
      const jitter = this._rng.nextInt(-100, 100);
      const baseDelay = this._rng.nextInt(this._config.clickDelay.min, this._config.clickDelay.max);
      const totalDelay = Math.max(50, baseDelay + jitter);
      Logger.debug(`反检测延迟 [${action}]: ${totalDelay}ms`);
      return new Promise(resolve => {
        const timer = setTimeout(resolve, totalDelay);
        this._timers.push(timer);
      });
    }

    /**
     * 生成随机选择器路径（核心反检测策略 2：选择器随机化）
     * 在原选择器中插入伪随机属性，使检测脚本难以通过固定特征定位
     */
    scrambleSelector(original) {
      if (!this._config.randomizeSelectors) return original;

      // 以一定概率对选择器进行变换
      if (this._rng.next() < 0.3) {
        // 方法1: 添加随机属性选择器
        const randomAttr = `[data-${this._rng.nextHex(4)}]`;
        return `${original}${randomAttr}`;
      }
      if (this._rng.next() < 0.2) {
        // 方法2: 使用 :nth-of-type 变换
        const nth = this._rng.nextInt(1, 3);
        return `${original}:nth-of-type(${nth})`;
      }
      return original;
    }

    /**
     * 添加噪声 DOM 元素（迷惑基于特征扫描的检测）
     */
    addNoise() {
      if (!this._config.addNoiseMutations) return;
      try {
        const noise = document.createElement('div');
        noise.style.cssText = 'display:none';
        noise.setAttribute('data-' + this._rng.nextHex(6), 'true');
        noise.className = 'ytp-ad-' + this._rng.nextHex(4);
        document.body.appendChild(noise);

        // 短暂存在后移除
        setTimeout(() => {
          if (noise.parentNode) noise.parentNode.removeChild(noise);
        }, 1000 + this._rng.nextInt(0, 5000));
      } catch (e) {
        // 静默
      }
    }

    /**
     * 模拟用户鼠标移动到目标元素（核心反检测策略 3：行为模拟）
     */
    async simulateUserInteraction(element) {
      if (!this._config.simulateMouseMove || !element) return;
      try {
        const rect = element.getBoundingClientRect();
        const startX = this._rng.nextInt(0, window.innerWidth);
        const startY = this._rng.nextInt(0, window.innerHeight);
        const endX = rect.left + rect.width * this._rng.next();
        const endY = rect.top + rect.height * this._rng.next();
        const steps = this._rng.nextInt(3, 8);
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const cx = startX + (endX - startX) * t + (this._rng.next() - 0.5) * 30;
          const cy = startY + (endY - startY) * t + (this._rng.next() - 0.5) * 30;
          document.dispatchEvent(new MouseEvent('mousemove', {
            clientX: cx,
            clientY: cy,
            bubbles: true,
            cancelable: true
          }));
          if (i < steps) {
            await new Promise(r => setTimeout(r, this._rng.nextInt(20, 80)));
          }
        }

        // 悬停
        element.dispatchEvent(new MouseEvent('mouseover', {
          clientX: endX,
          clientY: endY,
          bubbles: true,
          cancelable: true
        }));
      } catch (e) {
        // 静默
      }
    }

    /**
     * 检查平台是否显示 adblock 检测警告
     */
    checkDetectionStatus(platform) {
      try {
        if (platform === 'youtube') {
          // YouTube 的 adblock 检测警告
          const warning = document.querySelector('ytd-enforcement-message-view-model, ' + '#ad-blocker-detected, ' + '#enforcement-message');
          if (warning && warning.offsetParent !== null) {
            return {
              detected: true,
              type: 'warning',
              element: warning
            };
          }

          // 视频被静音也可能是检测信号
          const video = document.querySelector('video');
          if (video && video.muted && !video.dataset._greasyUserMuted) {
            return {
              detected: true,
              type: 'muted',
              element: video
            };
          }
        }
        if (platform === 'bilibili') {
          // B站是否有特殊的检测（目前较少）
        }
        return {
          detected: false
        };
      } catch (e) {
        return {
          detected: false
        };
      }
    }

    /**
     * 避免设置全局检测标志
     */
    _patchGlobalFlags() {
    }

    /**
     * 清理资源
     */
    destroy() {
      this._timers.forEach(t => clearTimeout(t));
      this._timers = [];
      this._observers.forEach(o => {
        try {
          o.disconnect();
        } catch (e) {}
      });
      this._observers = [];
      this._applied = false;
      Logger.debug('反检测引擎已清理');
    }
  }
  const antiDetection = new AntiDetectionEngine();

  /**
   * BaseAdapter — 平台适配器基类
   *
   * 所有平台适配器必须继承此类，实现以下接口：
   * - init():      初始化适配器
   * - detectAds(): 检测当前页面的广告
   * - skipAd():    跳过指定广告
   * - destroy():   清理资源
   *
   * 适配器模式的核心：差异隔离到适配器层，核心逻辑在引擎层复用。
   */


  /**
   * @typedef {Object} AdInfo
   * @property {string} type - 广告类型
   *   'preroll' | 'midroll' | 'postroll' | 'overlay' | 'banner' | 'embedded' | 'countdown'
   * @property {number} [startTime] - 视频时间戳（秒）
   * @property {number} [duration] - 广告时长（秒）
   * @property {HTMLElement} [element] - DOM 元素引用
   * @property {number} confidence - 检测置信度 0-1
   * @property {string} platform - 平台名称
   * @property {string} [skipStrategy] - 建议的跳过策略
   */

  class BaseAdapter {
    /**
     * @param {string} platform - 平台标识符
     */
    constructor(platform) {
      if (new.target === BaseAdapter) {
        throw new TypeError('BaseAdapter 是抽象类，不能直接实例化');
      }
      this.platform = platform;
      this._observers = [];
      this._timers = [];
      this._initialized = false;
      this._active = false;
      this._rules = null;
    }

    /**
     * 初始化适配器（子类必须调用 super._initBase()）
     */
    async init() {
      this._rules = ruleEngine.getRules(this.platform);
      if (!this._rules) {
        Logger.warn(`[${this.platform}] 未找到平台规则，适配器可能无法正常工作`);
      }

      // 配置反检测
      const adConfig = ruleEngine.getAntiDetectionConfig(this.platform);
      if (adConfig) {
        antiDetection.configure(adConfig);
      }
      this._initialized = true;
      Logger.info(`[${this.platform}] 适配器已初始化`);
    }

    /**
     * 检测当前页面中的广告（子类必须实现）
     * @returns {Promise<AdInfo[]>} 检测到的广告列表
     */
    async detectAds() {
      throw new Error(`[${this.platform}] detectAds() 必须在子类中实现`);
    }

    /**
     * 跳过指定广告（子类必须实现）
     * @param {AdInfo} ad - 要跳过的广告
     * @returns {Promise<boolean>} 是否成功跳过
     */
    async skipAd(ad) {
      throw new Error(`[${this.platform}] skipAd() 必须在子类中实现`);
    }

    /**
     * 运行一次完整的检测→跳过周期
     * 子类可 override 实现自定义逻辑，否则使用此默认实现
     */
    async runAdCycle() {
      if (!this._active) return;
      const now = Date.now();

      // 限频：默认 2 秒内不重复检测
      if (now - (this._lastAdCheck || 0) < (this._adCycleInterval || 2000)) return;
      this._lastAdCheck = now;
      try {
        const ads = await this.detectAds();
        for (const ad of ads) {
          this._emitAdDetected(ad);
          const skipped = await this.skipAd(ad);
          if (skipped) {
            this._emitAdSkipped(ad);
            StorageUtils.incrementSkipped();
          } else if (ad.type === 'preroll' || ad.type === 'midroll') {
            // 视频广告没跳过，1 秒后重试
            this._scheduleNextCycle(1000);
          }
        }
      } catch (e) {
        Logger.error(`[${this.platform}] 检测周期出错:`, e.message);
      }
    }

    /**
     * 安排下一次检测周期
     */
    _scheduleNextCycle(delay) {
      if (!this._active) return;
      clearTimeout(this._cycleTimer);
      this._cycleTimer = setTimeout(() => this.runAdCycle(), delay);
    }

    /**
     * 销毁适配器，清理资源（子类可覆盖扩展）
     */
    destroy() {
      this._active = false;
      this._observers.forEach(o => {
        try {
          o.disconnect();
        } catch (e) {}
      });
      this._timers.forEach(t => clearTimeout(t));
      clearTimeout(this._cycleTimer);
      this._observers = [];
      this._timers = [];
      this._initialized = false;
      Logger.debug(`[${this.platform}] 适配器已销毁`);
    }

    /**
     * 发布广告检测事件
     */
    _emitAdDetected(ad) {
      eventPipeline.emitSync(EventPipeline.EVENTS.AD_DETECTED, {
        ...ad,
        platform: this.platform
      });
    }

    /**
     * 发布广告跳过事件
     */
    _emitAdSkipped(ad) {
      eventPipeline.emitSync(EventPipeline.EVENTS.AD_SKIPPED, {
        ...ad,
        platform: this.platform
      });
      Logger.adEvent(this.platform, 'skipped', ad.type);
    }

    /**
     * 通过 CSS 选择器列表检测广告元素
     * @param {string[]} selectors - CSS 选择器列表
     * @param {number} [confidence=0.7] - 默认置信度
     * @returns {AdInfo[]}
     */
    _detectBySelectors(selectors, confidence) {
      if (confidence === void 0) {
        confidence = 0.7;
      }
      const ads = [];
      for (const selector of selectors) {
        // 反检测：如果启用选择器随机化，使用 scrambled 版本
        const actualSelector = antiDetection.scrambleSelector(selector);
        const elements = DomUtils.querySelectorAll(actualSelector);
        for (const el of elements) {
          if (el.offsetParent !== null || el.style.display !== 'none') {
            ads.push({
              type: this._classifyAdElement(el),
              element: el,
              confidence,
              platform: this.platform,
              skipStrategy: this._determineSkipStrategy(el)
            });
          }
        }
      }
      return ads;
    }

    /**
     * 根据元素特征判断广告类型
     */
    _classifyAdElement(element) {
      element.tagName || '';
      const className = (element.className || '').toLowerCase();
      const rect = element.getBoundingClientRect();

      // 全屏覆盖 → 可能是 preroll
      if (rect.width > window.innerWidth * 0.8 && rect.height > window.innerHeight * 0.8) {
        return 'preroll';
      }
      // 横幅/窄条 → overlay 或 banner
      if (rect.height < 100 && rect.width > window.innerWidth * 0.5) {
        return 'overlay';
      }
      // 小浮窗
      if (rect.width < 400 && rect.height < 300) {
        return 'overlay';
      }
      // 包含倒计时文本
      if (className.includes('countdown') || element.querySelector('[class*="countdown"]')) {
        return 'countdown';
      }
      return 'banner';
    }

    /**
     * 判断最合适的跳过策略
     */
    _determineSkipStrategy(element) {
      // 检查是否有可点击的跳过按钮
      const skipBtnSelectors = ruleEngine.getSkipButtonSelectors(this.platform);
      for (const selector of skipBtnSelectors) {
        if (DomUtils.querySelector(selector)) {
          return 'click_skip_button';
        }
      }
      // 检查是否有倒计时
      if (element.textContent && /\d/.test(element.textContent)) {
        return 'timer_accelerate';
      }
      return 'remove_element';
    }

    /**
     * 尝试通过点击跳过按钮来跳过广告
     */
    async _skipByClickButton() {
      const selectors = ruleEngine.getSkipButtonSelectors(this.platform);
      if (!selectors || selectors.length === 0) return false;
      for (const selector of selectors) {
        const button = DomUtils.querySelectorAny([selector]);
        if (button) {
          // 反检测：模拟用户交互
          await antiDetection.simulateUserInteraction(button);
          await antiDetection.randomDelay('click_skip');

          // 尝试点击
          if (DomUtils.safeClick(button)) {
            Logger.adEvent(this.platform, 'click_skip', selector);
            return true;
          }
        }
      }
      return false;
    }

    /**
     * 通过直接移除元素来跳过广告
     */
    async _skipByRemoveElement(element) {
      await antiDetection.randomDelay('remove');
      return DomUtils.safeRemove(element);
    }

    /**
     * 通过加速计时器来跳过广告（对倒计时广告有效）
     *
     * 策略：
     * 1. 找到倒计时元素，直接将其文本设为"0"或"00:00"
     * 2. 触发 DOM 变化事件，让播放器认为倒计时已结束
     * 3. 如果仍有遮挡，移除倒计时容器
     */
    async _skipByTimerAccelerate() {
      var _this$_rules;
      const countdownSelectors = ((_this$_rules = this._rules) == null || (_this$_rules = _this$_rules.selectors) == null ? void 0 : _this$_rules.countdown) || [];
      let found = false;
      for (const sel of countdownSelectors) {
        const elements = DomUtils.querySelectorAll(sel);
        for (const el of elements) {
          if (el.offsetParent === null && el.style.display === 'none') continue;
          found = true;

          // 方法 1: 直接将倒计时文本归零
          try {
            el.textContent = '0';
            el.innerText = '0';
          } catch (e) {}

          // 方法 2: 设置 value（对 input 类型元素）
          try {
            if (typeof el.value !== 'undefined') {
              el.value = '0';
            }
          } catch (e) {}

          // 方法 3: 修改 style 隐藏倒计时（触发播放器的完成检测）
          try {
            el.style.display = 'none';
          } catch (e) {}

          // 方法 4: 触发 DOM 事件模拟倒计时结束
          try {
            el.dispatchEvent(new Event('change', {
              bubbles: true
            }));
            el.dispatchEvent(new Event('input', {
              bubbles: true
            }));
          } catch (e) {}
          Logger.adEvent(this.platform, 'timer_accelerate', '倒计时已归零');
        }
      }

      // 如果没有找到倒计时元素，尝试通用方法：移除所有带倒计时特征的容器
      if (!found) {
        const adContainers = DomUtils.querySelectorAll('[class*="countdown"], [class*="ad-count"], [class*="ad_time"]');
        for (const el of adContainers) {
          if (el.offsetParent !== null) {
            DomUtils.safeRemove(el);
            found = true;
          }
        }
      }
      return found;
    }

    /**
     * 创建 MutationObserver 监听容器变化
     */
    _createObserver(containerSelector, callback, config) {
      if (config === void 0) {
        config = {};
      }
      const container = containerSelector ? DomUtils.querySelector(containerSelector) : document.body;
      if (!container) return null;
      const observer = new MutationObserver(mutations => {
        var _antiDetection$_confi;
        // 反检测防抖
        clearTimeout(observer._debounce);
        observer._debounce = setTimeout(() => {
          try {
            callback(mutations);
          } catch (e) {
            Logger.error(`[${this.platform}] Observer callback error:`, e.message);
          }
        }, ((_antiDetection$_confi = antiDetection._config) == null ? void 0 : _antiDetection$_confi.observerDebounceMs) || 300);
      });
      observer.observe(container, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: config.attributeFilter || ['class', 'style', 'display'],
        ...config
      });
      this._observers.push(observer);
      return observer;
    }

    /**
     * 验证适配器是否已正确初始化
     */
    _ensureInitialized() {
      if (!this._initialized) {
        throw new Error(`[${this.platform}] 适配器未初始化，请先调用 init()`);
      }
    }
  }

  /**
   * SponsorBlock 集成桥
   *
   * 复用 SponsorBlock 的社区数据，自动跳过 YouTube 视频中的赞助/自推/交互段落。
   *
   * API 文档：https://wiki.sponsor.ajay.app/index.php/API_Docs
   *
   * SponsorBlock 分类说明：
   * - sponsor:    视频赞助商广告段
   * - selfpromo:  UP主自推销段
   * - interaction: 点赞/订阅/评论提醒段
   * - exclusive_access: 会员专属内容预告
   * - preview:    下期预告
   * - music_offtopic: 非音乐内容（音乐视频中）
   *
   * 实现:
   * 1. 检测到视频 ID 时请求 SponsorBlock API
   * 2. 在视频进度条上以彩色标记广告段
   * 3. 接近广告段时自动跳过
   */
  class SponsorBlockBridge {
    constructor() {
      this._API_BASE = 'https://sponsor.ajay.app';
      this._cache = new Map(); // videoID → segments[]
      this._cacheTTL = 30 * 60 * 1000; // 缓存 30 分钟
      this._abortController = null;
      this._skipTimer = null;
      this._enabled = true;
      this._activeVideoId = null;
      this._overlayAdded = false;
    }

    /**
     * 启停 SponsorBlock
     */
    setEnabled(enabled) {
      this._enabled = enabled;
      if (!enabled) {
        this._clearSkipTimer();
        this._removeOverlay();
      }
    }

    /**
     * 为指定视频加载 SponsorBlock 段
     * @param {string} videoID - YouTube 视频 ID
     * @returns {Promise<Segment[]>} 广告段列表
     */
    async loadSegments(videoID) {
      if (!this._enabled || !videoID) return [];
      if (videoID === this._activeVideoId && this._cache.has(videoID)) {
        return this._cache.get(videoID);
      }

      // 取消之前的请求
      if (this._abortController) {
        this._abortController.abort();
      }
      this._abortController = new AbortController();
      this._activeVideoId = videoID;
      try {
        const categories = ['sponsor', 'selfpromo', 'interaction', 'exclusive_access', 'preview'];
        const url = `${this._API_BASE}/api/skipSegments` + `?videoID=${encodeURIComponent(videoID)}` + `&categories=${encodeURIComponent(JSON.stringify(categories))}`;
        const response = await fetch(url, {
          signal: this._abortController.signal,
          headers: {
            'Accept': 'application/json'
          }
        });
        if (!response.ok) {
          if (response.status === 404) {
            // 404 = 此视频没有被标记的段 (正常情况)
            this._cache.set(videoID, []);
            return [];
          }
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();

        // 解析返回数据（SponsorBlock 返回数组或对象）
        const rawSegments = Array.isArray(data) ? data : data.segments || [];
        const segments = rawSegments.filter(item => item && item.segment && item.segment.length === 2).map(item => ({
          start: item.segment[0],
          end: item.segment[1],
          category: item.category || 'sponsor',
          votes: item.votes || 0,
          UUID: item.UUID || '',
          description: item.description || '',
          videoID: videoID,
          userAgent: item.userAgent || ''
        })).filter(s => s.end - s.start > 1) // 过滤少于 1 秒的段
        .sort((a, b) => a.start - b.start);

        // 缓存
        this._cache.set(videoID, segments);
        setTimeout(() => this._cache.delete(videoID), this._cacheTTL);
        Logger.info(`[SponsorBlock] 加载 ${segments.length} 个段: ${videoID}`);

        // 渲染进度条标记
        this._renderSegmentMarkers(videoID, segments);
        return segments;
      } catch (e) {
        if (e.name === 'AbortError') return [];
        Logger.warn(`[SponsorBlock] 加载失败: ${e.message}`);
        return [];
      }
    }

    /**
     * 检查当前视频时间是否在某个广告段中
     * @param {number} currentTime - 当前视频时间（秒）
     * @param {Segment[]} segments - 广告段列表
     * @returns {Segment|null} 当前所在的广告段，或 null
     */
    findCurrentSegment(currentTime, segments) {
      if (!segments || segments.length === 0) return null;
      for (const seg of segments) {
        // 给一点缓冲（±0.3 秒）
        if (currentTime >= seg.start - 0.3 && currentTime <= seg.end + 0.3) {
          return seg;
        }
        // 如果已经过了这个段，继续
        if (currentTime < seg.start) break;
      }
      return null;
    }

    /**
     * 计算下一个即将到来的广告段
     */
    findNextSegment(currentTime, segments) {
      if (!segments || segments.length === 0) return null;
      for (const seg of segments) {
        if (seg.start > currentTime) {
          return seg;
        }
      }
      return null;
    }

    /**
     * 获取第一段广告段
     */
    getFirstSegment(segments) {
      return segments && segments.length > 0 ? segments[0] : null;
    }

    /**
     * 检查是否需要在当前时间跳过
     * @param {number} currentTime - 当前视频时间
     * @param {Segment[]} segments - 广告段列表
     * @returns {{ shouldSkip: boolean, segment: Segment|null }}
     */
    checkShouldSkip(currentTime, segments) {
      const segment = this.findCurrentSegment(currentTime, segments);
      if (!segment) return {
        shouldSkip: false,
        segment: null
      };

      // 确保不是误判：只在段的开始 1.5 秒内触发跳过
      const timeIntoSegment = currentTime - segment.start;
      if (timeIntoSegment >= 0 && timeIntoSegment <= 1.5) {
        return {
          shouldSkip: true,
          segment
        };
      }
      return {
        shouldSkip: false,
        segment
      };
    }

    /**
     * 在视频进度条上渲染赞助段标记
     * 使用覆盖层（overlay）方式，避免破坏 YouTube 本身的 UI
     */
    _renderSegmentMarkers(videoID, segments) {
      if (!segments || segments.length === 0 || this._overlayAdded) return;
      try {
        // 等待进度条加载
        const waitForProgressBar = setInterval(() => {
          const progressBar = document.querySelector('.ytp-progress-bar') || document.querySelector('.ytp-play-progress');
          if (!progressBar) return;
          clearInterval(waitForProgressBar);

          // 检查是否已有覆盖层
          if (document.querySelector('.greasy-sb-markers')) return;
          const overlay = document.createElement('div');
          overlay.className = 'greasy-sb-markers';
          overlay.style.cssText = `
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          z-index: 10;
        `;

          // 获取视频总时长
          const duration = this._getVideoDuration();
          if (!duration || duration <= 0) return;
          for (const seg of segments) {
            const leftPercent = seg.start / duration * 100;
            const widthPercent = (seg.end - seg.start) / duration * 100;
            const marker = document.createElement('div');
            marker.className = `greasy-sb-marker greasy-sb-${seg.category}`;
            marker.style.cssText = `
            position: absolute;
            top: 0;
            height: 100%;
            left: ${leftPercent}%;
            width: ${Math.max(widthPercent, 0.3)}%;
            opacity: 0.5;
            pointer-events: none;
          `;

            // 不同类别使用不同颜色
            const colors = {
              sponsor: '#00d400',
              // 赞助商 - 绿色
              selfpromo: '#cc00ff',
              // 自推销 - 紫色
              interaction: '#00ffcc',
              // 交互提醒 - 青色
              exclusive_access: '#ff9900',
              // 会员专属 - 橙色
              preview: '#ff0066',
              // 预告 - 粉色
              default: '#ffcc00' // 其他 - 黄色
            };
            marker.style.backgroundColor = colors[seg.category] || colors.default;

            // tooltip
            marker.title = `[SponsorBlock] ${this._getCategoryLabel(seg.category)}: ${this._formatTime(seg.start)} - ${this._formatTime(seg.end)}`;
            overlay.appendChild(marker);
          }

          // 将覆盖层插入到进度条容器中
          const container = progressBar.closest('.ytp-progress-bar-container') || progressBar.parentElement;
          if (container) {
            container.style.position = 'relative';
            container.appendChild(overlay);
            this._overlayAdded = true;
          }
        }, 500);

        // 10 秒后停止等待
        setTimeout(() => clearInterval(waitForProgressBar), 10000);
      } catch (e) {
        Logger.debug('[SponsorBlock] 进度条渲染失败（非关键错误）:', e.message);
      }
    }

    /**
     * 移除进度条覆盖层
     */
    _removeOverlay() {
      const overlay = document.querySelector('.greasy-sb-markers');
      if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
      this._overlayAdded = false;
    }

    /**
     * 清理资源
     */
    clear() {
      this._clearSkipTimer();
      this._removeOverlay();
      if (this._abortController) {
        this._abortController.abort();
      }
      this._activeVideoId = null;
    }

    /**
     * 清除当前 skip 计时器
     */
    _clearSkipTimer() {
      if (this._skipTimer) {
        clearTimeout(this._skipTimer);
        this._skipTimer = null;
      }
    }

    /**
     * 获取视频时长
     */
    _getVideoDuration() {
      const video = document.querySelector('video');
      return video ? video.duration : 0;
    }

    /**
     * 格式化时间 (秒 → MM:SS)
     */
    _formatTime(seconds) {
      const m = Math.floor(seconds / 60);
      const s = Math.floor(seconds % 60);
      return `${m}:${s.toString().padStart(2, '0')}`;
    }

    /**
     * 获取分类中文名
     */
    _getCategoryLabel(category) {
      const labels = {
        sponsor: '赞助',
        selfpromo: '自推销',
        interaction: '互动',
        exclusive_access: '专属',
        preview: '预告',
        music_offtopic: '无关内容'
      };
      return labels[category] || category;
    }

    /**
     * 下载缓存的统计数据
     */
    getStats() {
      return {
        cachedVideos: this._cache.size,
        activeVideo: this._activeVideoId,
        overlayAdded: this._overlayAdded
      };
    }
  }

  // SponsorBlock 段数据格式
  /**
   * @typedef {Object} Segment
   * @property {number} start - 开始时间（秒）
   * @property {number} end - 结束时间（秒）
   * @property {string} category - 段类型
   * @property {number} votes - 投票数
   * @property {string} UUID - 唯一标识
   * @property {string} videoID - 视频 ID
   */

  const sponsorBlockBridge = new SponsorBlockBridge();

  /**
   * YouTube 适配器
   *
   * 处理广告类型：
   * - preroll: 视频播放前的广告
   * - midroll: 视频播放中的广告
   * - overlay: 播放器上的横幅/文字广告
   * - banner: 搜索结果/推荐列表中的广告
   * - embedded: 创作者在视频中植入的赞助段落（依赖 SponsorBlock）
   *
   * 注意事项：
   * 1. YouTube 使用 Shadow DOM，需穿透查询
   * 2. YouTube 有强力的 adblock 检测，反检测策略必须到位
   * 3. YouTube UI 经常 A/B 测试，选择器可能变化
   */
  class YouTubeAdapter extends BaseAdapter {
    constructor() {
      super('youtube');
      this._adObserver = null;
      this._playerObserver = null;
      this._timeUpdateHandler = null;
      this._videoElement = null;
      this._skipAttempts = 0;
      this._maxSkipAttempts = 3;
      this._sbSegments = [];
      this._lastVideoId = null;
      this._sbEnabled = false;
    }

    /**
     * 初始化 YouTube 适配器
     */
    async init() {
      await super.init();
      this._videoElement = DomUtils.querySelector('video') || DomUtils.querySelector('#movie_player video');

      // 如果反检测配置了模拟用户行为，全局启用
      antiDetection.apply();

      // SponsorBlock 集成
      this._sbEnabled = configManager.get('enableSponsorBlock');
      sponsorBlockBridge.setEnabled(this._sbEnabled);
      this._loadSponsorBlockSegments();

      // 监听播放器 DOM 变化
      this._setupObservers();

      // 监听 URL 变化（YouTube 是 SPA，页面不刷新切换视频）
      this._setupUrlChangeDetection();

      // 监听视频时间更新（用于 SponsorBlock 段跳过）
      this._setupTimeUpdateListener();

      // 初始广告检测
      this._adCycleInterval = 2000;
      setTimeout(() => this.runAdCycle(), 1500);
      this._active = true;
      Logger.info('[YouTube] 适配器已启动');
    }

    /**
     * 检测 YouTube 页面上的广告
     */
    async detectAds() {
      this._ensureInitialized();
      const ads = [];
      const rules = this._rules;
      if (!rules) return ads;

      // 1. 检测视频广告（preroll/midroll）
      const videoAds = this._detectVideoAds();
      ads.push(...videoAds);

      // 2. 检测横幅/覆盖广告
      const overlayAds = this._detectOverlayAds();
      ads.push(...overlayAds);

      // 3. 检测搜索结果/推荐中的广告
      const bannerAds = this._detectBannerAds();
      ads.push(...bannerAds);

      // 4. 检查是否被检测到 adblock
      const detectionStatus = antiDetection.checkDetectionStatus('youtube');
      if (detectionStatus.detected) {
        ads.push({
          type: 'detection_warning',
          element: detectionStatus.element,
          confidence: 0.9,
          platform: 'youtube',
          skipStrategy: 'none'
        });
      }

      // 去重
      return this._deduplicateAds(ads);
    }

    /**
     * 跳过 YouTube 广告
     */
    async skipAd(ad) {
      this._ensureInitialized();
      if (this._skipAttempts >= this._maxSkipAttempts) {
        Logger.warn('[YouTube] 跳过尝试次数已达上限，等待下次检测');
        return false;
      }
      this._skipAttempts++;
      switch (ad.type) {
        case 'preroll':
        case 'midroll':
          return await this._skipVideoAd(ad);
        case 'overlay':
        case 'banner':
          return await this._skipByRemoveElement(ad.element);
        case 'detection_warning':
          Logger.warn('[YouTube] 检测到 adblock 警告');
          // 尝试关闭警告
          return await this._handleDetectionWarning(ad.element);
        case 'embedded':
          // 嵌入广告通过 SponsorBlock 集成处理（Phase 1）
          return await this._skipEmbeddedSponsor(ad);
        default:
          return false;
      }
    }

    /**
     * 销毁适配器
     */
    destroy() {
      if (this._adObserver) {
        this._adObserver.disconnect();
        this._adObserver = null;
      }
      if (this._playerObserver) {
        this._playerObserver.disconnect();
        this._playerObserver = null;
      }
      if (this._timeUpdateHandler) {
        const video = this._getVideoElement();
        if (video) {
          video.removeEventListener('timeupdate', this._timeUpdateHandler);
        }
        this._timeUpdateHandler = null;
      }
      sponsorBlockBridge.clear();
      antiDetection.destroy();
      super.destroy();
    }

    // ─── 私有方法 ─────────────────────────────────────────

    /**
     * 检测视频广告（preroll/midroll）
     * YouTube 视频广告的特征：
     * - 播放器 UI 出现 '.ytp-ad-badge-label' 或 '.ytp-ad-text'
     * - 进度条上出现橙色/红色区域
     * - 视频元素 duration 异常变化
     */
    _detectVideoAds() {
      var _this$_rules, _this$_rules2;
      const ads = [];

      // 方法 1: 检测广告标记 UI
      const adBadge = DomUtils.querySelectorAny(((_this$_rules = this._rules) == null || (_this$_rules = _this$_rules.selectors) == null ? void 0 : _this$_rules.adBadge) || []);
      if (adBadge && adBadge.offsetParent !== null) {
        const video = this._getVideoElement();
        const adInfo = {
          type: this._classifyVideoAd(video),
          element: adBadge,
          confidence: 0.8,
          platform: 'youtube',
          startTime: video ? video.currentTime : 0,
          duration: video ? video.duration - video.currentTime : 0,
          skipStrategy: 'click_skip_button'
        };
        ads.push(adInfo);
      }

      // 方法 2: 检测广告容器
      const adContainer = DomUtils.querySelectorAny(((_this$_rules2 = this._rules) == null || (_this$_rules2 = _this$_rules2.selectors) == null ? void 0 : _this$_rules2.adContainer) || []);
      if (adContainer && adContainer.offsetParent !== null) {
        ads.push({
          type: 'preroll',
          element: adContainer,
          confidence: 0.75,
          platform: 'youtube',
          skipStrategy: 'click_skip_button'
        });
      }

      // 方法 3: 检测视频元素是否进入广告模式
      const video = this._getVideoElement();
      if (video && !video.dataset._greasyChecked) {
        video.dataset._greasyChecked = 'true';
        // 检测视频的播放状态变化
        if (video.duration < 30 && video.currentTime > 0) {
          // 短视频广告
          ads.push({
            type: 'preroll',
            element: video,
            confidence: 0.6,
            platform: 'youtube',
            startTime: video.currentTime,
            duration: video.duration,
            skipStrategy: 'seek_to_end'
          });
        }
      }
      return ads;
    }

    /**
     * 检测覆盖广告（播放器上的半透明横幅）
     */
    _detectOverlayAds() {
      const ads = [];

      // YouTube 小横幅广告（播放器底部）
      const companionAd = DomUtils.querySelector('.ytp-ad-action-companion-renderer, ' + '.ytp-ad-overlay-container, ' + '.ytp-ad-image-overlay');
      if (companionAd && companionAd.offsetParent !== null) {
        ads.push({
          type: 'overlay',
          element: companionAd,
          confidence: 0.85,
          platform: 'youtube',
          skipStrategy: 'remove_element'
        });
      }
      return ads;
    }

    /**
     * 检测页面其他位置的广告（搜索列表、推荐栏等）
     */
    _detectBannerAds() {
      var _this$_rules3;
      const ads = [];
      const bannerSelectors = ((_this$_rules3 = this._rules) == null || (_this$_rules3 = _this$_rules3.selectors) == null ? void 0 : _this$_rules3.adContainer) || [];
      for (const selector of bannerSelectors) {
        // 跳过已经检测过的视频广告选择器
        if (selector.includes('ytp-ad')) continue;
        const elements = DomUtils.querySelectorAll(selector);
        for (const el of elements) {
          if (el.offsetParent !== null) {
            ads.push({
              type: 'banner',
              element: el,
              confidence: 0.7,
              platform: 'youtube',
              skipStrategy: 'remove_element'
            });
          }
        }
      }
      return ads;
    }

    /**
     * 跳过视频广告（preroll/midroll）
     */
    async _skipVideoAd(ad) {
      // 策略 1: 点击跳过按钮（优先）
      if (await this._skipByClickButton()) {
        this._resetSkipAttempts();
        return true;
      }

      // 策略 2: 快进到广告结束（仅对短视频广告有效）
      if (ad.duration && ad.duration < 30) {
        const video = this._getVideoElement();
        if (video) {
          await antiDetection.randomDelay('seek');
          try {
            video.currentTime = video.duration - 0.5;
            Logger.adEvent('youtube', 'seek_to_end', `${ad.duration}s`);
            this._resetSkipAttempts();
            return true;
          } catch (e) {
            Logger.warn('[YouTube] 快进失败', e.message);
          }
        }
      }

      // 策略 3: 等待并移除广告元素
      if (ad.element) {
        await antiDetection.randomDelay('wait_remove');
        if (DomUtils.safeRemove(ad.element)) {
          this._resetSkipAttempts();
          return true;
        }
      }
      return false;
    }

    /**
     * 处理 adblock 检测警告
     */
    async _handleDetectionWarning(warningEl) {
      if (!warningEl) return false;

      // 尝试关闭弹窗
      const closeButton = DomUtils.querySelector('#dismiss-button, ' + 'ytd-button-renderer#dismiss-button, ' + 'tp-yt-paper-button#dismiss-button, ' + 'button[aria-label*="Close"]');
      if (closeButton) {
        await antiDetection.randomDelay('dismiss_warning');
        DomUtils.safeClick(closeButton);
        Logger.warn('[YouTube] 已尝试关闭 adblock 警告弹窗');
        return true;
      }
      return false;
    }

    /**
     * 跳过嵌入的赞助段（通过 SponsorBlock 数据）
     * 完整实现在 Phase 1 的 SponsorBlockBridge 中
     */
    async _skipEmbeddedSponsor(ad) {
      if (ad.startTime !== undefined && ad.endTime !== undefined) {
        const video = this._getVideoElement();
        if (video && video.currentTime >= ad.startTime - 0.5 && video.currentTime <= ad.startTime + 0.5) {
          video.currentTime = ad.endTime;
          return true;
        }
      }
      return false;
    }

    /**
     * 加载 SponsorBlock 段
     */
    async _loadSponsorBlockSegments() {
      if (!this._sbEnabled) return;
      const videoId = UrlUtils.extractYouTubeVideoId();
      if (!videoId || videoId === this._lastVideoId) return;
      this._lastVideoId = videoId;
      Logger.debug(`[YouTube] 加载 SponsorBlock 段: ${videoId}`);
      this._sbSegments = await sponsorBlockBridge.loadSegments(videoId);
    }

    /**
     * 设置视频 timeupdate 监听（用于 SponsorBlock 段自动跳过）
     */
    _setupTimeUpdateListener() {
      this._timeUpdateHandler = () => {
        if (!this._sbEnabled || !this._sbSegments || this._sbSegments.length === 0) return;
        const video = this._getVideoElement();
        if (!video) return;
        const currentTime = video.currentTime;

        // 检查是否进入了 SponsorBlock 段
        const check = sponsorBlockBridge.checkShouldSkip(currentTime, this._sbSegments);
        if (check.shouldSkip && check.segment) {
          video.currentTime = check.segment.end;
          this._emitAdSkipped({
            type: 'embedded',
            platform: 'youtube',
            source: 'sponsorblock',
            startTime: check.segment.start,
            endTime: check.segment.end,
            category: check.segment.category,
            confidence: 0.95
          });
          Logger.adEvent('youtube', 'sponsorblock_skip', `${check.segment.category} ${check.segment.start}s→${check.segment.end}s`);
        }
      };

      // 监听视频元素的 timeupdate 事件
      const attachListener = () => {
        const video = this._getVideoElement();
        if (video) {
          video.addEventListener('timeupdate', this._timeUpdateHandler);
          Logger.debug('[YouTube] timeupdate 监听已注册');
        } else {
          // 视频元素可能还没加载，重试
          setTimeout(attachListener, 1000);
        }
      };
      attachListener();
    }

    /**
     * 设置 DOM 观察者
     */
    _setupObservers() {
      this._adObserver = this._createObserver('#movie_player', () => this.runAdCycle());
    }

    /**
     * 监听 URL 变化（YouTube SPA）
     */
    _setupUrlChangeDetection() {
      let lastUrl = location.href;
      const urlObserver = new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
          lastUrl = url;
          Logger.debug('[YouTube] URL 变化，重新检测');
          this._resetSkipAttempts();
          this._videoElement = null; // 清除缓存的 video 引用
          // 重新加载 SponsorBlock 段
          this._sbSegments = [];
          setTimeout(() => {
            this._loadSponsorBlockSegments();
            this.runAdCycle();
          }, 2000);
        }
      });
      urlObserver.observe(document.querySelector('title'), {
        childList: true,
        subtree: true,
        characterData: true
      });
    }

    /**
     * 获取视频元素
     */
    _getVideoElement() {
      if (!this._videoElement || !this._videoElement.parentNode) {
        this._videoElement = DomUtils.querySelector('video') || DomUtils.querySelector('#movie_player video');
      }
      return this._videoElement;
    }

    /**
     * 分类视频广告类型
     */
    _classifyVideoAd(video) {
      if (!video) return 'preroll';
      // 如果视频进度接近开头 → preroll
      // 如果在中段 → midroll
      const progress = video.currentTime / video.duration;
      if (progress < 0.1) return 'preroll';
      if (progress > 0.9) return 'postroll';
      return 'midroll';
    }

    /**
     * 重置跳过计数
     */
    _resetSkipAttempts() {
      this._skipAttempts = 0;
    }

    /**
     * 广告去重
     */
    _deduplicateAds(ads) {
      const seen = new Set();
      return ads.filter(ad => {
        var _ad$element;
        const key = ad.type + '_' + (((_ad$element = ad.element) == null ? void 0 : _ad$element.className) || '') + '_' + (ad.startTime || 0);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }
  }

  /**
   * Bilibili 适配器
   *
   * 处理广告类型：
   * - 贴片广告：视频播放前/后的贴片广告（DOM 可检测）
   * - 暂停广告：暂停时出现的广告浮窗
   * - 嵌入式广告：UP主在视频中植入的恰饭广告（通过弹幕关键词检测）
   *
   * 特殊处理：
   * - B站"会员专属"内容不是广告，不要误跳过
   * - 弹幕 API: unsafeWindow.__INITIAL_STATE__ 包含视频元信息
   * - B站采用了动态加载（SPA），需要监听页面变化
   */
  class BilibiliAdapter extends BaseAdapter {
    constructor() {
      super('bilibili');
      this._danmakuObserver = null;
      this._adObserver = null;
      this._videoInfo = null;
    }

    /**
     * 初始化 B站 适配器
     */
    async init() {
      await super.init();

      // 获取视频元信息
      this._extractVideoInfo();

      // 监听播放器变化
      this._setupObservers();
      this._adCycleInterval = 1500;

      // 初始检测
      setTimeout(() => this.runAdCycle(), 1500);
      this._active = true;
      Logger.info('[B站] 适配器已启动');
    }

    /**
     * 检测 B站 页面上的广告
     */
    async detectAds() {
      this._ensureInitialized();
      const ads = [];

      // 1. 检测贴片广告（播放器内）
      const clipAds = this._detectClipAds();
      ads.push(...clipAds);

      // 2. 检测暂停广告
      const pauseAds = this._detectPauseAds();
      ads.push(...pauseAds);

      // 3. 检测嵌入的恰饭广告（通过弹幕分析）
      const embeddedAds = await this._detectEmbeddedAds();
      ads.push(...embeddedAds);
      return this._deduplicateAds(ads);
    }

    /**
     * 跳过 B站 广告
     */
    async skipAd(ad) {
      this._ensureInitialized();
      switch (ad.type) {
        case 'preroll':
        case 'postroll':
          // B站贴片广告：先点跳过按钮，如果不行则移除元素
          if (await this._skipByClickButton()) return true;
          if (ad.element && (await this._skipByRemoveElement(ad.element))) return true;
          return false;
        case 'overlay':
          // 暂停广告：移除元素
          if (ad.element) {
            return await this._skipByRemoveElement(ad.element);
          }
          return false;
        case 'embedded':
          // 恰饭广告：快进到广告段结束
          return await this._skipEmbeddedAd(ad);
        default:
          return false;
      }
    }

    /**
     * 销毁适配器
     */
    destroy() {
      if (this._danmakuObserver) {
        this._danmakuObserver.disconnect();
        this._danmakuObserver = null;
      }
      if (this._adObserver) {
        this._adObserver.disconnect();
        this._adObserver = null;
      }
      super.destroy();
    }

    // ─── 私有方法 ─────────────────────────────────────────

    /**
     * 检测贴片广告（播放器内）
     * B站贴片广告特征：
     * - 播放器内出现 .bpx-player-video-ad
     * - 出现跳过按钮 .bpx-player-ad-skip
     * - 封面显示"广告"标记
     */
    _detectClipAds() {
      const ads = [];

      // 方法 1: 检测广告容器
      const adContainer = DomUtils.querySelectorAny(['.bpx-player-video-ad', '.bilibili-player-video-btn-ad', '.ad-report']);
      if (adContainer && adContainer.offsetParent !== null) {
        const hasSkipBtn = !!DomUtils.querySelector('.bpx-player-ad-skip, .bpx-player-ad-countdown');
        ads.push({
          type: hasSkipBtn ? 'preroll' : 'postroll',
          element: adContainer,
          confidence: 0.85,
          platform: 'bilibili',
          skipStrategy: hasSkipBtn ? 'click_skip_button' : 'remove_element'
        });
      }

      // 方法 2: 检测倒计时标签
      const countdown = DomUtils.querySelector('.bpx-player-ad-countdown, ' + '.bilibili-player-video-btn-ad .bpx-player-ad-countdown');
      if (countdown && countdown.offsetParent !== null) {
        ads.push({
          type: 'countdown',
          element: countdown,
          confidence: 0.7,
          platform: 'bilibili',
          skipStrategy: 'timer_accelerate'
        });
      }
      return ads;
    }

    /**
     * 检测暂停广告
     */
    _detectPauseAds() {
      const ads = [];
      const pauseAd = DomUtils.querySelector('.bpx-player-video-pause-ad, ' + '.bpx-player-pause-ad-container, ' + '.bilibili-player-video-pause-ad');
      if (pauseAd && pauseAd.offsetParent !== null) {
        ads.push({
          type: 'overlay',
          element: pauseAd,
          confidence: 0.8,
          platform: 'bilibili',
          skipStrategy: 'remove_element'
        });
      }
      return ads;
    }

    /**
     * 通过弹幕关键词检测嵌入的恰饭广告
     *
     * 原理：
     * 当 UP主 在视频中恰饭时，弹幕会集中出现
     * "广告"、"恰饭"、"金主" 等关键词。
     * 我们收集弹幕中出现这些关键词的时间点，
     * 如果某个时间段密度超过阈值，则判断为恰饭段。
     */
    async _detectEmbeddedAds() {
      const emConfig = ruleEngine.getEmbeddedAdDetection('bilibili');
      if (!emConfig || !emConfig.enabled) return [];
      const ads = [];
      const keywords = emConfig.danmakuKeywords || [];
      const windowMs = emConfig.detectionWindowMs || 10000;

      // 获取 B站 弹幕元素
      // B站弹幕在播放器层上以绝对定位的文本元素渲染
      const danmakuElements = DomUtils.querySelectorAll('.bilibili-danmaku, ' + '.bpx-player-danmaku-item, ' + '[class*="danmaku"]');
      if (danmakuElements.length === 0) return ads;

      // 按时间窗口统计关键词出现频率
      const timeStats = this._analyzeDanmakuKeywords(danmakuElements, keywords, windowMs);

      // 找出超过阈值的广告段
      for (const _ref of Object.entries(timeStats)) {
        const timeKey = _ref[0];
        const count = _ref[1];
        const _timeKey$split = timeKey.split('-'),
          startStr = _timeKey$split[0],
          endStr = _timeKey$split[1];
        const start = parseFloat(startStr);
        const end = parseFloat(endStr);
        const video = this._getVideoElement();
        if (count >= 3 && video) {
          ads.push({
            type: 'embedded',
            startTime: start,
            endTime: end,
            confidence: Math.min(0.5 + count * 0.1, 0.95),
            platform: 'bilibili',
            skipStrategy: 'seek_forward',
            meta: {
              danmakuHits: count,
              keywords: keywords
            }
          });
        }
      }
      return ads;
    }

    /**
     * 分析弹幕关键词出现频率
     */
    _analyzeDanmakuKeywords(elements, keywords, windowMs) {
      var _unsafeWindow;
      if (window.danmakuAnalyzed) return window.danmakuAnalyzed;
      const timeStats = {};

      // 尝试从 B站 的弹幕数据接口获取结构化弹幕数据
      const danmakuData = (_unsafeWindow = unsafeWindow) == null || (_unsafeWindow = _unsafeWindow.__INITIAL_STATE__) == null ? void 0 : _unsafeWindow.danmaku;
      let danmakuList = [];
      if (Array.isArray(danmakuData)) {
        danmakuList = danmakuData;
      } else if (elements.length > 0) {
        // 从 DOM 元素中提取弹幕文本和时间
        elements.forEach(el => {
          const text = el.textContent || '';
          const time = parseFloat(el.getAttribute('data-time') || el.getAttribute('data-progress') || '0');
          if (text && time > 0) {
            danmakuList.push({
              text,
              progress: time
            });
          }
        });
      }

      // 分析关键词
      for (const danmaku of danmakuList) {
        const matched = keywords.some(k => danmaku.text.includes(k));
        if (!matched) continue;
        const timeSec = danmaku.progress;
        const windowStart = Math.max(0, timeSec - windowMs / 2000);
        const windowEnd = timeSec + windowMs / 2000;
        const timeKey = `${windowStart.toFixed(1)}-${windowEnd.toFixed(1)}`;
        timeStats[timeKey] = (timeStats[timeKey] || 0) + 1;
      }

      // 缓存结果
      window.danmakuAnalyzed = timeStats;
      // 10 秒后清除缓存
      setTimeout(() => {
        window.danmakuAnalyzed = null;
      }, 10000);
      return timeStats;
    }

    /**
     * 跳过嵌入的恰饭广告段
     */
    async _skipEmbeddedAd(ad) {
      if (ad.startTime === undefined || ad.endTime === undefined) return false;
      const video = this._getVideoElement();
      if (!video) return false;
      const current = video.currentTime;
      if (current >= ad.startTime - 0.5 && current <= ad.startTime + 0.5) {
        await antiDetection.randomDelay('skip_embedded');
        video.currentTime = ad.endTime;
        Logger.adEvent('bilibili', 'skip_embedded', `${ad.startTime.toFixed(1)}s → ${ad.endTime.toFixed(1)}s`);
        return true;
      }
      return false;
    }

    /**
     * 设置 DOM 观察者
     */
    _setupObservers() {
      // 监听播放器变化（检测贴片广告）
      this._adObserver = this._createObserver('.bpx-player-video-wrap', () => this.runAdCycle());
    }

    /**
     * 提取视频元信息
     */
    _extractVideoInfo() {
      try {
        var _unsafeWindow2;
        const initState = (_unsafeWindow2 = unsafeWindow) == null ? void 0 : _unsafeWindow2.__INITIAL_STATE__;
        if (initState) {
          var _initState$videoData, _initState$upData;
          this._videoInfo = {
            aid: initState.aid,
            bvid: initState.bvid,
            title: ((_initState$videoData = initState.videoData) == null ? void 0 : _initState$videoData.title) || '',
            upName: ((_initState$upData = initState.upData) == null ? void 0 : _initState$upData.name) || '',
            isBangumi: !!initState.bangumi,
            isPGC: !!initState.pgc
          };
          Logger.debug('[B站] 视频信息:', this._videoInfo);
        }
      } catch (e) {
        // 静默
      }
    }

    /**
     * 获取视频元素
     */
    _getVideoElement() {
      return DomUtils.querySelector('video') || DomUtils.querySelector('.bpx-player-video-wrap video') || DomUtils.querySelector('.bilibili-player-video video');
    }

    /**
     * 广告去重
     */
    _deduplicateAds(ads) {
      const seen = new Set();
      return ads.filter(ad => {
        var _ad$element;
        const key = ad.type + '_' + (((_ad$element = ad.element) == null ? void 0 : _ad$element.className) || '') + '_' + (ad.startTime || 0) + '_' + (ad.endTime || 0);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }
  }

  /**
   * 腾讯视频适配器
   *
   * 广告类型：
   * - 片头广告：视频播放前 60-120 秒广告（倒计时 + 可跳过）
   * - 片中广告：视频中段插入的广告
   * - 暂停广告：暂停时出现的覆盖浮窗
   * - 会员推荐：非会员观看时的引导浮窗（非广告但不相关）
   *
   * 策略：
   * - 倒计时广告：加速计时器 + DOM 移除
   * - 贴片广告：移除广告容器
   * - 暂停广告：点击关闭按钮
   */
  class TencentAdapter extends BaseAdapter {
    constructor() {
      super('tencent');
      this._adObserver = null;
      this._videoElement = null;
    }
    async init() {
      await super.init();
      this._videoElement = DomUtils.querySelector('video') || DomUtils.querySelector('#tenvideo_player video');
      this._setupObservers();
      this._adCycleInterval = 1500;
      setTimeout(() => this.runAdCycle(), 1500);
      this._active = true;
      Logger.info('[腾讯视频] 适配器已启动');
    }
    async detectAds() {
      var _this$_rules, _this$_rules3;
      this._ensureInitialized();
      const ads = [];

      // 1. 片头/片中广告容器
      const adContainer = DomUtils.querySelectorAny(((_this$_rules = this._rules) == null || (_this$_rules = _this$_rules.selectors) == null ? void 0 : _this$_rules.adContainer) || []);
      if (adContainer && adContainer.offsetParent !== null) {
        var _this$_rules2;
        const hasCountdown = !!DomUtils.querySelectorAny(((_this$_rules2 = this._rules) == null || (_this$_rules2 = _this$_rules2.selectors) == null ? void 0 : _this$_rules2.countdown) || []);
        ads.push({
          type: hasCountdown ? 'countdown' : 'preroll',
          element: adContainer,
          confidence: 0.85,
          platform: 'tencent',
          skipStrategy: hasCountdown ? 'timer_accelerate' : 'remove_element'
        });
      }

      // 2. 跳过按钮出现 → 立即点击
      const skipBtn = DomUtils.querySelectorAny(((_this$_rules3 = this._rules) == null || (_this$_rules3 = _this$_rules3.selectors) == null ? void 0 : _this$_rules3.skipButton) || []);
      if (skipBtn && skipBtn.offsetParent !== null) {
        ads.push({
          type: 'preroll',
          element: skipBtn,
          confidence: 0.9,
          platform: 'tencent',
          skipStrategy: 'click_skip_button'
        });
      }

      // 3. 检测暂停广告
      this._detectPauseAds(ads);
      return ads;
    }
    async skipAd(ad) {
      this._ensureInitialized();
      switch (ad.skipStrategy) {
        case 'click_skip_button':
          if (await this._skipByClickButton()) return true;
          break;
        case 'timer_accelerate':
          if (await this._skipByTimerAccelerate()) return true;
          // 加速失败回退到移除元素
          if (ad.element && (await this._skipByRemoveElement(ad.element))) return true;
          break;
        case 'remove_element':
          if (ad.element && (await this._skipByRemoveElement(ad.element))) return true;
          break;
      }
      return false;
    }
    destroy() {
      if (this._adObserver) {
        this._adObserver.disconnect();
        this._adObserver = null;
      }
      super.destroy();
    }
    _detectPauseAds(ads) {
      // 腾讯视频暂停时出现的广告覆盖层
      const pauseAd = DomUtils.querySelector('.txp_ad_pause, ' + '.tvp_ad_pause, ' + '.ad_pause_content, ' + '.mod_ad_pause');
      if (pauseAd && pauseAd.offsetParent !== null) {
        ads.push({
          type: 'overlay',
          element: pauseAd,
          confidence: 0.8,
          platform: 'tencent',
          skipStrategy: 'remove_element'
        });
      }
    }
    _setupObservers() {
      this._adObserver = this._createObserver('#tenvideo_player', () => this.runAdCycle(), {
        attributeFilter: ['class', 'style', 'display']
      });
    }
  }

  /**
   * 爱奇艺适配器
   *
   * 广告类型：
   * - 贴片广告：视频播放前的 15-120 秒广告（.adUIBox + .countdown-topright）
   * - 暂停广告：暂停时右下角出现的浮窗广告
   * - 横幅广告：页面中的嵌入广告条
   *
   * 注意：爱奇艺使用 CSS Modules（带 hash 的类名），
   * 稳定选择器为 .adUIBox 和 .countdown-topright，
   * 带 hash 的用属性包含选择器 [class*="xxx"] 匹配。
   */
  class IqiyiAdapter extends BaseAdapter {
    constructor() {
      super('iqiyi');
      this._adObserver = null;
    }
    async init() {
      await super.init();
      this._setupObservers();
      this._adCycleInterval = 1500;
      setTimeout(() => this.runAdCycle(), 1500);
      this._active = true;
      Logger.info('[爱奇艺] 适配器已启动');
    }
    async detectAds() {
      var _this$_rules2;
      this._ensureInitialized();
      const ads = [];

      // 1. 主广告检测：查找 .adUIBox 容器
      const adUIContainer = DomUtils.querySelector('.adUIBox');
      if (adUIContainer && adUIContainer.offsetParent !== null) {
        var _this$_rules;
        const skipBtn = DomUtils.querySelectorAny(((_this$_rules = this._rules) == null || (_this$_rules = _this$_rules.selectors) == null ? void 0 : _this$_rules.skipButton) || []);
        // 查找倒计时
        const countdown = DomUtils.querySelector('.countdown-topright');
        let remaining = 999;
        if (countdown) {
          var _countdown$textConten;
          const m = (_countdown$textConten = countdown.textContent) == null ? void 0 : _countdown$textConten.match(/(\d+)/);
          if (m) remaining = parseInt(m[1], 10);
        }
        ads.push({
          type: countdown && remaining < 120 ? 'countdown' : 'preroll',
          element: countdown || adUIContainer,
          confidence: 0.9,
          platform: 'iqiyi',
          skipStrategy: skipBtn ? 'click_skip_button' : 'remove_element',
          duration: remaining
        });
      }

      // 2. 广告层检测（hash 类名）
      if (ads.length === 0) {
        const adLayer = DomUtils.querySelector('[class*="adLayer"]');
        if (adLayer && adLayer.offsetParent !== null) {
          ads.push({
            type: 'overlay',
            element: adLayer,
            confidence: 0.7,
            platform: 'iqiyi',
            skipStrategy: 'remove_element'
          });
        }
      }

      // 3. 横幅广告
      const bannerSelectors = ((_this$_rules2 = this._rules) == null || (_this$_rules2 = _this$_rules2.selectors) == null ? void 0 : _this$_rules2.banner) || [];
      for (const sel of bannerSelectors) {
        const banners = DomUtils.querySelectorAll(sel);
        for (const el of banners) {
          if (el.offsetParent !== null) {
            ads.push({
              type: 'banner',
              element: el,
              confidence: 0.6,
              platform: 'iqiyi',
              skipStrategy: 'remove_element'
            });
          }
        }
      }
      return ads;
    }
    async skipAd(ad) {
      this._ensureInitialized();
      switch (ad.skipStrategy) {
        case 'click_skip_button':
          // 优先点击关闭按钮
          if (await this._skipByClickButton()) return true;
          // 尝试找关闭按钮
          const closeBtn = DomUtils.querySelector('[class*="closeAdBtn"], #btn_auto_13');
          if (closeBtn && closeBtn.offsetParent !== null) {
            DomUtils.safeClick(closeBtn);
            return true;
          }
          break;
        case 'remove_element':
          if (ad.element && (await this._skipByRemoveElement(ad.element))) return true;
          break;
        case 'timer_accelerate':
          if (await this._skipByTimerAccelerate()) return true;
          if (ad.element && (await this._skipByRemoveElement(ad.element))) return true;
          break;
      }
      return false;
    }
    destroy() {
      if (this._adObserver) {
        this._adObserver.disconnect();
        this._adObserver = null;
      }
      super.destroy();
    }
    _setupObservers() {
      // 观察整个播放器区域
      this._adObserver = this._createObserver('#flash_container, .XPlayer, .adUIBox', () => this.runAdCycle(), {
        attributeFilter: ['class', 'style', 'display']
      });
    }
  }

  /**
   * 优酷适配器
   *
   * 广告类型：
   * - 片头广告：15-120 秒不等，部分可跳过
   * - 片中广告：视频中段插入
   * - 暂停广告：暂停时的覆盖浮窗
   * - 会员推广：非会员提示
   *
   * 策略：
   * - 广告容器直接移除
   * - 跳过按钮点击
   * - 倒计时加速
   */
  class YoukuAdapter extends BaseAdapter {
    constructor() {
      super('youku');
      this._adObserver = null;
    }
    async init() {
      await super.init();
      this._setupObservers();
      this._adCycleInterval = 1500;
      setTimeout(() => this.runAdCycle(), 1500);
      this._active = true;
      Logger.info('[优酷] 适配器已启动');
    }
    async detectAds() {
      var _this$_rules;
      this._ensureInitialized();
      const ads = [];

      // 1. 广告容器检测
      const adContainer = DomUtils.querySelectorAny(((_this$_rules = this._rules) == null || (_this$_rules = _this$_rules.selectors) == null ? void 0 : _this$_rules.adContainer) || []);
      if (adContainer && adContainer.offsetParent !== null) {
        var _this$_rules2;
        // 检查是否有倒计时
        const countdownEl = DomUtils.querySelector('.adtopright_container');
        const hasCountdown = countdownEl && countdownEl.offsetParent !== null;
        const skipBtn = DomUtils.querySelectorAny(((_this$_rules2 = this._rules) == null || (_this$_rules2 = _this$_rules2.selectors) == null ? void 0 : _this$_rules2.skipButton) || []);
        ads.push({
          type: hasCountdown ? 'countdown' : 'preroll',
          element: adContainer,
          confidence: 0.9,
          platform: 'youku',
          skipStrategy: hasCountdown ? 'timer_accelerate' : skipBtn ? 'click_skip_button' : 'remove_element'
        });
      }

      // 2. 仅跳过按钮可见（无广告容器）
      if (ads.length === 0) {
        var _this$_rules3;
        const skipBtn = DomUtils.querySelectorAny(((_this$_rules3 = this._rules) == null || (_this$_rules3 = _this$_rules3.selectors) == null ? void 0 : _this$_rules3.skipButton) || []);
        if (skipBtn && skipBtn.offsetParent !== null) {
          ads.push({
            type: 'preroll',
            element: skipBtn,
            confidence: 0.8,
            platform: 'youku',
            skipStrategy: 'click_skip_button'
          });
        }
      }
      return ads;
    }
    async skipAd(ad) {
      this._ensureInitialized();
      switch (ad.skipStrategy) {
        case 'click_skip_button':
          // 先找关闭按钮 .ad-colse-btn
          const closeBtn = DomUtils.querySelector('.ad-colse-btn');
          if (closeBtn && closeBtn.offsetParent !== null) {
            await antiDetection.randomDelay('click_close');
            DomUtils.safeClick(closeBtn);
            return true;
          }
          if (await this._skipByClickButton()) return true;
          break;
        case 'remove_element':
          if (ad.element && (await this._skipByRemoveElement(ad.element))) return true;
          break;
        case 'timer_accelerate':
          // 加速倒计时 + 移出广告层
          await this._skipByTimerAccelerate();
          const adLayer = DomUtils.querySelector('.advertise-layer');
          if (adLayer) DomUtils.safeRemove(adLayer);
          return true;
      }
      return false;
    }
    destroy() {
      if (this._adObserver) {
        this._adObserver.disconnect();
        this._adObserver = null;
      }
      super.destroy();
    }
    _setupObservers() {
      this._adObserver = this._createObserver('#youku-player, .advertise-layer, preloading-layer', () => this.runAdCycle(), {
        attributeFilter: ['class', 'style', 'display']
      });
    }
  }

  /**
   * 芒果 TV 适配器
   *
   * 广告类型：
   * - 片头广告：15-90 秒广告
   * - 暂停广告：暂停时覆盖浮窗
   * - 片尾广告：视频结束后
   *
   * 策略：
   * - DOM 元素移除
   * - 跳过按钮点击
   * - 计时器加速
   */
  class MgtvAdapter extends BaseAdapter {
    constructor() {
      super('mgtv');
      this._adObserver = null;
    }
    async init() {
      await super.init();
      this._setupObservers();
      this._adCycleInterval = 1500;
      setTimeout(() => this.runAdCycle(), 1500);
      this._active = true;
      Logger.info('[芒果TV] 适配器已启动');
    }
    async detectAds() {
      var _this$_rules;
      this._ensureInitialized();
      const ads = [];

      // 1. 广告容器检测
      const adContainer = DomUtils.querySelectorAny(((_this$_rules = this._rules) == null || (_this$_rules = _this$_rules.selectors) == null ? void 0 : _this$_rules.adContainer) || []);
      if (adContainer && adContainer.offsetParent !== null) {
        var _this$_rules2;
        const skipBtn = DomUtils.querySelectorAny(((_this$_rules2 = this._rules) == null || (_this$_rules2 = _this$_rules2.selectors) == null ? void 0 : _this$_rules2.skipButton) || []);
        ads.push({
          type: 'preroll',
          element: adContainer,
          confidence: 0.85,
          platform: 'mgtv',
          skipStrategy: skipBtn ? 'click_skip_button' : 'remove_element'
        });
      }

      // 2. 跳过按钮（独立检测）
      if (ads.length === 0) {
        var _this$_rules3;
        const skipBtn = DomUtils.querySelectorAny(((_this$_rules3 = this._rules) == null || (_this$_rules3 = _this$_rules3.selectors) == null ? void 0 : _this$_rules3.skipButton) || []);
        if (skipBtn && skipBtn.offsetParent !== null) {
          ads.push({
            type: 'preroll',
            element: skipBtn,
            confidence: 0.9,
            platform: 'mgtv',
            skipStrategy: 'click_skip_button'
          });
        }
      }
      return ads;
    }
    async skipAd(ad) {
      this._ensureInitialized();
      switch (ad.skipStrategy) {
        case 'click_skip_button':
          if (await this._skipByClickButton()) return true;
          break;
        case 'remove_element':
          if (ad.element && (await this._skipByRemoveElement(ad.element))) return true;
          break;
      }
      return false;
    }
    destroy() {
      if (this._adObserver) {
        this._adObserver.disconnect();
        this._adObserver = null;
      }
      super.destroy();
    }
    _setupObservers() {
      this._adObserver = this._createObserver('#mgtv-player, .mgtv-player-wrap', () => this.runAdCycle(), {
        attributeFilter: ['class', 'style', 'display']
      });
    }
  }

  /**
   * 配置面板 — Shadow DOM 隔离的 UI 组件
   *
   * 提供：
   * - 平台开关（YouTube/B站/腾讯/爱奇艺/优酷）
   * - 跳过策略选择（全自动/隐身/手动）
   * - SponsorBlock 开关
   * - 众包参与开关
   * - 今日统计展示
   *
   * 使用 Shadow DOM 避免与页面样式冲突。
   * 通过 EventPipeline 与核心引擎通信。
   */
  const CONFIG_STYLES = `
:host {
  all: initial;
  display: block;
  position: fixed;
  top: 60px;
  right: 20px;
  width: 340px;
  max-height: 80vh;
  overflow-y: auto;
  background: #1a1a2e;
  color: #e0e0e0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  z-index: 2147483647;
  padding: 0;
  user-select: none;
  border: 1px solid rgba(255,255,255,0.08);
}

/* 隐藏状态 */
:host(.hidden) {
  display: none !important;
}

/* 头部 */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.03);
}
.header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
}
.header .version {
  font-size: 11px;
  color: #888;
  background: rgba(255,255,255,0.06);
  padding: 2px 8px;
  border-radius: 10px;
}
.header .close-btn {
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  font-size: 18px;
  padding: 4px;
  line-height: 1;
}
.header .close-btn:hover { color: #fff; }

/* 面板内容 */
.body {
  padding: 16px 20px;
}

/* 区域 */
.section {
  margin-bottom: 20px;
}
.section-title {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #888;
  margin-bottom: 10px;
}

/* 开关项 */
.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255,255,255,0.04);
}
.setting-row:last-child { border-bottom: none; }
.setting-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  flex: 1;
}
.setting-label .platform-icon {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}
.setting-label .platform-icon.youtube { background: #ff0000; color: #fff; }
.setting-label .platform-icon.bilibili { background: #00a1d6; color: #fff; }
.setting-label .platform-icon.tencent { background: #006eff; color: #fff; }
.setting-label .platform-icon.iqiyi { background: #06be04; color: #fff; }
.setting-label .platform-icon.youku { background: #0079ff; color: #fff; }
.setting-label .platform-icon.mgtv { background: #ff6600; color: #fff; }

/* 开关 */
.toggle {
  position: relative;
  width: 40px;
  height: 22px;
  flex-shrink: 0;
}
.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}
.toggle .slider {
  position: absolute;
  cursor: pointer;
  top: 0; left: 0; right: 0; bottom: 0;
  background: #333;
  border-radius: 22px;
  transition: 0.3s;
}
.toggle .slider::before {
  content: '';
  position: absolute;
  height: 16px;
  width: 16px;
  left: 3px;
  bottom: 3px;
  background: #fff;
  border-radius: 50%;
  transition: 0.3s;
}
.toggle input:checked + .slider { background: #4caf50; }
.toggle input:checked + .slider::before { transform: translateX(18px); }

/* 选择框 */
.select-mode {
  width: 100%;
  padding: 8px 12px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  color: #e0e0e0;
  font-size: 14px;
  outline: none;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
}
.select-mode:focus { border-color: #4caf50; }
.select-mode option { background: #1a1a2e; color: #e0e0e0; }

/* 统计面板 */
.stats-panel {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 8px;
}
.stat-card {
  background: rgba(255,255,255,0.04);
  border-radius: 8px;
  padding: 12px;
  text-align: center;
}
.stat-card .number {
  font-size: 20px;
  font-weight: 700;
  color: #4caf50;
}
.stat-card .label {
  font-size: 11px;
  color: #888;
  margin-top: 2px;
}

/* 底部操作区 */
.footer {
  padding: 12px 20px;
  border-top: 1px solid rgba(255,255,255,0.08);
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
.footer button {
  padding: 6px 16px;
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 6px;
  background: rgba(255,255,255,0.06);
  color: #ccc;
  cursor: pointer;
  font-size: 12px;
  transition: 0.2s;
}
.footer button:hover {
  background: rgba(255,255,255,0.12);
  color: #fff;
}
.footer button.primary {
  background: #4caf50;
  border-color: #4caf50;
  color: #fff;
}
.footer button.primary:hover {
  background: #43a047;
}

.description {
  font-size: 12px;
  color: #888;
  margin-top: 4px;
}

/* 滚动条 */
:host::-webkit-scrollbar { width: 4px; }
:host::-webkit-scrollbar-track { background: transparent; }
:host::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 2px; }
`;
  class ConfigPanel {
    constructor() {
      this._host = null;
      this._shadow = null;
      this._visible = false;
      this._timer = null;
    }

    /**
     * 创建并挂载配置面板
     */
    mount() {
      if (this._host) return;
      this._host = document.createElement('div');
      this._host.id = 'greasy-adjump-config';
      this._shadow = this._host.attachShadow({
        mode: 'closed'
      });

      // 注入样式
      const style = document.createElement('style');
      style.textContent = CONFIG_STYLES;
      this._shadow.appendChild(style);

      // 注入 HTML
      this._shadow.appendChild(this._createPanelHTML());
      document.body.appendChild(this._host);

      // 绑定事件
      this._bindEvents();

      // 初始隐藏
      this.hide();
      Logger.debug('配置面板已挂载');
    }

    /**
     * 显示面板
     */
    show() {
      if (this._host) {
        this._host.classList.remove('hidden');
        this._visible = true;
        this._refreshStats();
      }
    }

    /**
     * 隐藏面板
     */
    hide() {
      if (this._host) {
        this._host.classList.add('hidden');
        this._visible = false;
      }
    }

    /**
     * 切换显示状态
     */
    toggle() {
      if (this._visible) {
        this.hide();
      } else {
        this.show();
      }
    }

    /**
     * 销毁面板
     */
    destroy() {
      if (this._host && this._host.parentNode) {
        this._host.parentNode.removeChild(this._host);
      }
      this._host = null;
      this._shadow = null;
      if (this._timer) {
        clearInterval(this._timer);
        this._timer = null;
      }
    }

    // ─── 私有方法 ─────────────────────────

    _createPanelHTML() {
      const container = document.createElement('div');

      // 从配置读取当前值
      const settings = configManager.getAll();
      const skipMode = settings.skipMode || 'auto';
      const enableSponsorBlock = settings.enableSponsorBlock !== false;
      const enableCrowdSource = settings.enableCrowdSource || false;
      const showStatusBall = settings.showStatusBall !== false;
      const stealthMode = settings.stealthMode !== false;
      container.innerHTML = `
      <div class="header">
        <h3>🎬 广告跳过助手</h3>
        <span class="version">v0.1.0</span>
        <button class="close-btn" data-action="close">✕</button>
      </div>

      <div class="body">
        <!-- 跳过模式 -->
        <div class="section">
          <div class="section-title">跳过模式</div>
          <select class="select-mode" data-setting="skipMode">
            <option value="auto" ${skipMode === 'auto' ? 'selected' : ''}>全自动 — 优先体验</option>
            <option value="stealth" ${skipMode === 'stealth' ? 'selected' : ''}>隐身 — 优先安全</option>
            <option value="manual" ${skipMode === 'manual' ? 'selected' : ''}>仅标记 — 不自动跳过</option>
          </select>
          <div class="description">隐身模式增加反检测延迟，降低被封风险</div>
        </div>

        <!-- 平台管理 -->
        <div class="section">
          <div class="section-title">平台管理</div>
          ${this._renderPlatformToggles()}
        </div>

        <!-- 功能开关 -->
        <div class="section">
          <div class="section-title">功能</div>
          <div class="setting-row">
            <label class="setting-label">
              <span>📦 SponsorBlock 集成</span>
            </label>
            <label class="toggle">
              <input type="checkbox" data-setting="enableSponsorBlock" ${enableSponsorBlock ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </div>
          <div class="setting-row">
            <label class="setting-label">
              <span>🏷️ 参与众包标记</span>
            </label>
            <label class="toggle">
              <input type="checkbox" data-setting="enableCrowdSource" ${enableCrowdSource ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </div>
          <div class="setting-row">
            <label class="setting-label">
              <span>🔵 状态悬浮球</span>
            </label>
            <label class="toggle">
              <input type="checkbox" data-setting="showStatusBall" ${showStatusBall ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </div>
          <div class="setting-row">
            <label class="setting-label">
              <span>🛡️ 隐身模式</span>
            </label>
            <label class="toggle">
              <input type="checkbox" data-setting="stealthMode" ${stealthMode ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </div>
        </div>

        <!-- 今日统计 -->
        <div class="section">
          <div class="section-title">今日统计</div>
          <div class="stats-panel" id="stats-panel">
            <div class="stat-card">
              <div class="number" id="stat-skipped">0</div>
              <div class="label">已跳过</div>
            </div>
            <div class="stat-card">
              <div class="number" id="stat-marked">0</div>
              <div class="label">已标记</div>
            </div>
          </div>
        </div>
      </div>

      <div class="footer">
        <button data-action="reset">重置默认</button>
        <button class="primary" data-action="close">关闭</button>
      </div>
    `;
      return container;
    }
    _renderPlatformToggles() {
      const allPlatforms = UrlUtils.getSupportedPlatforms();
      const platformNames = {
        youtube: 'YouTube',
        bilibili: 'B站',
        tencent: '腾讯视频',
        iqiyi: '爱奇艺',
        youku: '优酷',
        mgtv: '芒果TV'
      };

      // 目前支持的平台（所有 6 个都已实现适配器）
      const implemented = ['youtube', 'bilibili', 'tencent', 'iqiyi', 'youku', 'mgtv'];
      return allPlatforms.map(p => {
        const name = platformNames[p] || p;
        const icon = name[0];
        const checked = implemented.includes(p) ? 'checked' : '';
        const disabled = !implemented.includes(p) ? 'disabled' : '';
        return `
        <div class="setting-row">
          <label class="setting-label">
            <span class="platform-icon ${p}">${icon}</span>
            <span>${name}</span>
            ${disabled ? '<span style="color:#555;font-size:11px">(未启用)</span>' : ''}
          </label>
          <label class="toggle">
            <input type="checkbox" data-platform="${p}" ${checked} ${disabled}>
            <span class="slider"></span>
          </label>
        </div>
      `;
      }).join('');
    }
    _bindEvents() {
      if (!this._shadow) return;

      // 关闭按钮
      this._shadow.querySelectorAll('[data-action="close"]').forEach(btn => {
        btn.addEventListener('click', () => this.hide());
      });

      // 重置按钮
      this._shadow.querySelector('[data-action="reset"]').addEventListener('click', () => {
        configManager.reset();
        // 刷新界面
        this.destroy();
        this.mount();
        this.show();
      });

      // 设置变更 — 选择框
      this._shadow.querySelector('[data-setting="skipMode"]').addEventListener('change', e => {
        configManager.set('skipMode', e.target.value);
      });

      // 设置变更 — 复选框
      this._shadow.querySelectorAll('[data-setting]').forEach(el => {
        if (el.type === 'checkbox') {
          el.addEventListener('change', e => {
            const key = e.target.dataset.setting;
            configManager.set(key, e.target.checked);
          });
        }
      });

      // 点击外部关闭
      document.addEventListener('click', e => {
        if (this._visible && this._host && !this._host.contains(e.target)) {
          // 检查是否点击了悬浮球（稍后实现）
          const floatingBall = document.getElementById('greasy-status-ball');
          if (floatingBall && floatingBall.contains(e.target)) return;
          this.hide();
        }
      });

      // 监听配置变更，同步 UI
      eventPipeline.on(eventPipeline.constructor.EVENTS.CONFIG_CHANGED, () => {
        this._refreshStats();
      });

      // 定时刷新统计
      this._timer = setInterval(() => this._refreshStats(), 10000);
    }
    _refreshStats() {
      if (!this._shadow || !this._visible) return;
      const stats = StorageUtils.getTodayStats();
      const skippedEl = this._shadow.getElementById('stat-skipped');
      const markedEl = this._shadow.getElementById('stat-marked');
      if (skippedEl) skippedEl.textContent = stats.adsSkipped || 0;
      if (markedEl) markedEl.textContent = stats.adsMarked || 0;
    }
  }
  const configPanel = new ConfigPanel();

  /**
   * 首次安装引导面板 — 3 步快速配置
   *
   * 新用户安装脚本后第一次打开视频页面时自动弹出。
   * 3 步走完后标记为"已引导"，不再弹出。
   */
  const ONBOARDING_STYLES = `
:host {
  all: initial;
  display: flex;
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.6);
  z-index: 2147483647;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
}
.modal {
  background: #1a1a2e;
  color: #e0e0e0;
  border-radius: 16px;
  padding: 32px;
  max-width: 460px;
  width: 90%;
  box-shadow: 0 16px 48px rgba(0,0,0,0.5);
  border: 1px solid rgba(255,255,255,0.08);
}
.modal h2 {
  margin: 0 0 8px 0;
  font-size: 20px;
  color: #fff;
}
.modal p {
  margin: 0 0 24px 0;
  color: #aaa;
  font-size: 14px;
  line-height: 1.6;
}
.steps {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
}
.step-dot {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: rgba(255,255,255,0.1);
  transition: 0.3s;
}
.step-dot.active { background: #4caf50; }
.step-dot.done { background: #2e7d32; }

.step-content {
  min-height: 160px;
  margin-bottom: 24px;
}
.step-content h3 {
  font-size: 16px;
  margin: 0 0 12px 0;
  color: #fff;
}
.step-content .option-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.step-content .option-btn {
  padding: 10px 16px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  color: #e0e0e0;
  cursor: pointer;
  text-align: left;
  font-size: 14px;
  transition: 0.2s;
}
.step-content .option-btn:hover {
  background: rgba(255,255,255,0.12);
  border-color: #4caf50;
}
.step-content .option-btn.selected {
  background: rgba(76,175,80,0.15);
  border-color: #4caf50;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.actions button {
  padding: 8px 20px;
  border-radius: 8px;
  border: none;
  font-size: 14px;
  cursor: pointer;
  transition: 0.2s;
}
.actions .skip-btn {
  background: transparent;
  color: #888;
}
.actions .skip-btn:hover { color: #ccc; }
.actions .next-btn {
  background: #4caf50;
  color: #fff;
}
.actions .next-btn:hover { background: #43a047; }
.actions .next-btn:disabled { opacity: 0.4; cursor: default; }
`;
  class OnboardingGuide {
    constructor() {
      this._host = null;
      this._shadow = null;
      this._step = 0;
      this._totalSteps = 3;
      this._selections = {};
    }

    /**
     * 检查是否需要显示引导
     */
    shouldShow() {
      return !StorageUtils.get('onboarding_done', false);
    }

    /**
     * 显示引导面板
     */
    show() {
      if (this._host) return;
      if (!this.shouldShow()) return;
      this._step = 0;
      this._host = document.createElement('div');
      this._host.id = 'greasy-onboarding';
      this._shadow = this._host.attachShadow({
        mode: 'closed'
      });
      const style = document.createElement('style');
      style.textContent = ONBOARDING_STYLES;
      this._shadow.appendChild(style);
      this._render();
      document.body.appendChild(this._host);
      this._bindEvents();
      Logger.debug('首次引导面板已显示');
    }

    /**
     * 销毁引导面板
     */
    destroy() {
      if (this._host && this._host.parentNode) {
        this._host.parentNode.removeChild(this._host);
      }
      this._host = null;
      this._shadow = null;
    }

    // ─── 私有方法 ─────────────────────────

    _render() {
      if (!this._shadow) return;
      const container = document.createElement('div');
      container.className = 'modal';
      const stepsHTML = Array.from({
        length: this._totalSteps
      }, (_, i) => `<div class="step-dot ${i < this._step ? 'done' : ''} ${i === this._step ? 'active' : ''}"></div>`).join('');
      container.innerHTML = `
      <h2>🎬 欢迎使用广告跳过助手</h2>
      <p>3 步完成初始配置，你也可以随时在面板中调整。</p>

      <div class="steps">${stepsHTML}</div>

      <div class="step-content" id="step-content"></div>

      <div class="actions">
        <button class="skip-btn" data-action="skip">跳过引导</button>
        <button class="next-btn" data-action="next" disabled>下一步</button>
      </div>
    `;
      this._shadow.appendChild(container);
      this._renderStep();
    }
    _renderStep() {
      const content = this._shadow.getElementById('step-content');
      if (!content) return;
      switch (this._step) {
        case 0:
          content.innerHTML = `
          <h3>1/3. 选择跳过模式</h3>
          <p>你希望插件如何处理广告？</p>
          <div class="option-list">
            <div class="option-btn" data-choice="auto">
              <strong>⚡ 全自动</strong><br>
              <span style="color:#888;font-size:12px">检测到广告自动跳过，体验优先</span>
            </div>
            <div class="option-btn" data-choice="stealth">
              <strong>🛡️ 隐身模式</strong><br>
              <span style="color:#888;font-size:12px">更安全的跳过方式，降低平台检测风险</span>
            </div>
          </div>
        `;
          break;
        case 1:
          content.innerHTML = `
          <h3>2/3. 启用 SponsorBlock</h3>
          <p>SponsorBlock 是一个社区驱动的广告数据库，可以自动跳过 YouTube 视频中的赞助段落。</p>
          <div class="option-list">
            <div class="option-btn" data-choice="true">
              <strong>✅ 启用</strong><br>
              <span style="color:#888;font-size:12px">自动跳过赞助/自推/互动等段落（推荐）</span>
            </div>
            <div class="option-btn" data-choice="false">
              <strong>❌ 不启用</strong><br>
              <span style="color:#888;font-size:12px">纯本地广告检测，不依赖外部数据</span>
            </div>
          </div>
        `;
          break;
        case 2:
          content.innerHTML = `
          <h3>3/3. 准备好啦！</h3>
          <p>
            ✅ 你已经完成了所有配置。<br><br>
            <strong>接下来：</strong>打开任意 YouTube 或 B站 视频，插件将自动工作。<br>
            你可以随时点击右上角的悬浮球打开配置面板调整设置。
          </p>
          <div class="option-list">
            <div class="option-btn" data-choice="done">
              🚀 开始使用！
            </div>
          </div>
        `;
          break;
      }

      // 更新按钮状态
      this._updateButtons();

      // 绑定选项点击
      content.querySelectorAll('.option-btn').forEach(btn => {
        btn.addEventListener('click', () => this._selectOption(btn));
      });
    }
    _selectOption(btn) {
      // 清除其他选中状态
      const parent = btn.closest('.option-list') || btn.parentElement;
      parent.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');

      // 记录选择
      const choice = btn.dataset.choice;
      this._selections[this._step] = choice;

      // 启用下一步按钮
      const nextBtn = this._shadow.querySelector('[data-action="next"]');
      if (nextBtn) nextBtn.disabled = false;
    }
    _updateButtons() {
      const nextBtn = this._shadow.querySelector('[data-action="next"]');
      if (!nextBtn) return;
      if (this._step >= this._totalSteps - 1) {
        nextBtn.textContent = '🚀 完成';
      } else {
        nextBtn.textContent = '下一步';
      }

      // 如果当前步骤已经有选择，启用按钮
      if (this._selections[this._step]) {
        nextBtn.disabled = false;
      }
    }
    _bindEvents() {
      if (!this._shadow) return;

      // 下一步按钮
      this._shadow.querySelector('[data-action="next"]').addEventListener('click', () => {
        this._step++;
        if (this._step >= this._totalSteps) {
          this._finish();
          return;
        }
        this._render();
      });

      // 跳过引导
      this._shadow.querySelector('[data-action="skip"]').addEventListener('click', () => {
        this._finish();
      });
    }
    _finish() {
      // 保存配置
      if (this._selections[0]) {
        configManager.set('skipMode', this._selections[0]);
      }
      if (this._selections[1] !== undefined) {
        configManager.set('enableSponsorBlock', this._selections[1] === 'true');
      }

      // 标记引导完成
      StorageUtils.set('onboarding_done', true);
      this.destroy();
      Logger.info('首次引导完成', this._selections);
    }
  }
  const onboardingGuide = new OnboardingGuide();

  /**
   * 状态悬浮球 — 视频右上角轻量显示
   *
   * 功能：
   * - 显示今日已跳过广告数
   * - 点击打开/关闭配置面板
   * - 长按显示快捷菜单（暂停/恢复）
   */
  const FLOATING_BALL_STYLES = `
:host {
  all: initial;
  display: block;
  position: fixed;
  z-index: 2147483646;
  cursor: pointer;
  user-select: none;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  transition: opacity 0.3s;
}
:host(.hidden) {
  display: none !important;
}

.ball {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(26, 26, 46, 0.85);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 20px;
  color: #e0e0e0;
  font-size: 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.3);
  transition: all 0.2s;
}
.ball:hover {
  background: rgba(26, 26, 46, 0.95);
  transform: scale(1.05);
}

.icon {
  font-size: 14px;
}
.count {
  font-weight: 600;
  color: #4caf50;
  min-width: 16px;
  text-align: center;
}
.label {
  color: #888;
  font-size: 11px;
}

/* 拖拽手柄 */
.ball {
  cursor: grab;
}
.ball:active {
  cursor: grabbing;
}
`;
  class StatusFloatingBall {
    constructor() {
      this._host = null;
      this._shadow = null;
      this._isDragging = false;
      this._startX = 0;
      this._startY = 0;
      this._offsetX = 0;
      this._offsetY = 0;
    }

    /**
     * 挂载悬浮球
     */
    mount() {
      if (this._host) return;
      this._loadPosition();
      this._host = document.createElement('div');
      this._host.id = 'greasy-status-ball';
      this._shadow = this._host.attachShadow({
        mode: 'closed'
      });
      const style = document.createElement('style');
      style.textContent = FLOATING_BALL_STYLES;
      this._shadow.appendChild(style);
      this._shadow.innerHTML += `
      <div class="ball">
        <span class="icon">🎬</span>
        <span class="count" id="skip-count">0</span>
        <span class="label">跳过</span>
      </div>
    `;

      // 设置初始位置
      this._host.style.top = this._offsetY + 'px';
      this._host.style.right = this._offsetX + 'px';
      document.body.appendChild(this._host);
      this._bindEvents();
      Logger.debug('状态悬浮球已挂载');
    }

    /**
     * 更新跳过计数
     */
    updateCount() {
      if (!this._shadow) return;
      const countEl = this._shadow.getElementById('skip-count');
      if (countEl) {
        const stats = StorageUtils.getTodayStats();
        countEl.textContent = stats.adsSkipped || '0';
      }
    }

    /**
     * 显示/隐藏
     */
    setVisible(visible) {
      if (this._host) {
        this._host.classList.toggle('hidden', !visible);
      }
    }

    /**
     * 销毁
     */
    destroy() {
      if (this._host && this._host.parentNode) {
        this._host.parentNode.removeChild(this._host);
      }
      this._host = null;
      this._shadow = null;
    }

    // ─── 私有方法 ─────────────────────────

    _bindEvents() {
      if (!this._shadow) return;
      const ball = this._shadow.querySelector('.ball');

      // 点击：打开配置面板
      ball.addEventListener('click', e => {
        if (this._isDragging) return;
        configPanel.toggle();
      });

      // 拖拽功能
      ball.addEventListener('mousedown', e => this._startDrag(e));
      document.addEventListener('mousemove', e => this._onDrag(e));
      document.addEventListener('mouseup', () => this._endDrag());

      // 触屏支持
      ball.addEventListener('touchstart', e => this._startDrag(e), {
        passive: true
      });
      document.addEventListener('touchmove', e => this._onDrag(e), {
        passive: true
      });
      document.addEventListener('touchend', () => this._endDrag());
    }
    _startDrag(e) {
      this._isDragging = false;
      const pos = e.touches ? e.touches[0] : e;
      this._startX = pos.clientX;
      this._startY = pos.clientY;

      // 记录开始时的位置
      this._dragStartOffsetX = this._offsetX;
      this._dragStartOffsetY = this._offsetY;
    }
    _onDrag(e) {
      if (!this._host) return;
      const pos = e.touches ? e.touches[0] : e;
      const dx = pos.clientX - this._startX;
      const dy = pos.clientY - this._startY;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        this._isDragging = true;
      }
      if (this._isDragging) {
        const newY = this._dragStartOffsetY + dy;
        const newXFromRight = this._dragStartOffsetX - dx;
        this._host.style.top = Math.max(0, newY) + 'px';
        this._host.style.right = Math.max(0, newXFromRight) + 'px';
      }
    }
    _endDrag() {
      if (this._isDragging && this._host) {
        // 保存新位置
        this._offsetY = parseInt(this._host.style.top) || 60;
        this._offsetX = parseInt(this._host.style.right) || 20;
        this._savePosition();
      }
      this._isDragging = false;
    }
    _loadPosition() {
      this._offsetX = StorageUtils.get('ball_position_x', 20);
      this._offsetY = StorageUtils.get('ball_position_y', 60);
    }
    _savePosition() {
      StorageUtils.set('ball_position_x', this._offsetX);
      StorageUtils.set('ball_position_y', this._offsetY);
    }
  }
  const statusFloatingBall = new StatusFloatingBall();

  const version="0.1.0";const updatedAt="2026-06-14";const rules={youtube:{selectors:{adContainer:[".video-ads ytd-action-companion-ad-renderer","ytd-ad-slot-renderer","ytd-in-feed-ad-layout-renderer","ytd-display-ad-renderer","ytd-statement-banner-renderer","#masthead-ad","ytd-search-panel-ad-renderer","ytd-ad-simple-promo-card-renderer","ytd-merchandise-shelf-renderer"],adBadge:[".ytp-ad-badge-label",".ytp-ad-simple-ad-badge",".ytp-ad-text"],skipButton:[".ytp-ad-skip-button",".ytp-ad-skip-button-modern","button[aria-label*='Skip']","button[aria-label*='跳过']"],detectionWarning:["ytd-enforcement-message-view-model","ytd-enforcement-message-ad-blocker-view-model","#ad-blocker-detected"]},observers:{playerContainer:"ytd-watch-flexy",adContainerParent:"#movie_player"},skipStrategies:["click_skip_button","seek_to_end","wait_and_remove"],antiDetection:{clickDelay:{min:800,max:3500},observerDebounceMs:500,randomizeSelectors:true,simulateMouseMove:true,useNativeAPIsOnly:false}},bilibili:{selectors:{adContainer:[".bpx-player-video-ad",".bilibili-player-video-btn-ad",".ad-report",".bpx-player-video-pause-ad",".ad-tip",".video-ads"],skipButton:[".bpx-player-video-ad .bpx-player-ad-skip",".bpx-player-video-ad .bpx-player-ad-countdown",".bilibili-player-video-btn-ad .bpx-player-ad-skip"],adBadge:[".bpx-player-ad-badge",".bpx-ad-badge"]},observers:{playerContainer:".bpx-player-video-wrap",adContainer:".bpx-player-video-ad"},skipStrategies:["remove_element","click_skip_button"],embeddedAdDetection:{enabled:true,method:"danmaku_keyword",danmakuKeywords:["广告","恰饭","金主","推广","植入","赞助","合作","商务","带货","广告位","防不胜防","入股","品牌方"],minKeywordDensity:0.3,detectionWindowMs:10000},antiDetection:{clickDelay:{min:200,max:800},observerDebounceMs:300,randomizeSelectors:false}},tencent:{selectors:{adContainer:[".txp_ad",".tvp_ad_container",".mod_ad",".tenvideo_ad",".ad_content",".txp_ad_container"],skipButton:[".tvp_ad_skip",".txp_ad_skip_btn",".tenvideo_ad_skip"],countdown:[".txp_ad_countdown",".tvp_ad_countdown"]},observers:{playerContainer:"#tenvideo_player"},skipStrategies:["timer_accelerate","remove_element","click_skip_button"]},iqiyi:{selectors:{adContainer:[".adUIBox","[class*='adLayer']",".iqp-ad",".ad-mark"],skipButton:[".know-detail","[class*='closeAdBtn']","#btn_auto_13"],countdown:[".countdown-topright"],banner:["[class*='adBanner']","[class*='adTitleBox']"]},observers:{playerContainer:"#flash_container, .XPlayer"},skipStrategies:["remove_element","timer_accelerate","click_skip_button"]},youku:{selectors:{adContainer:[".advertise-layer",".youku-advertise-layer",".ad-box",".ad-custom-wrap"],skipButton:[".ad-colse-btn","[class*='loginnew_close']"],countdown:[".adtopright_container",".advertise-layer"],adLabel:[".ad-text",".ad-tag"]},observers:{playerContainer:"#youku-player, .advertise-layer"},skipStrategies:["remove_element","timer_accelerate","click_skip_button"]},mgtv:{selectors:{adContainer:[".mgtv-ad",".mgtv-ad-block",".mgtv-ad-countdown",".ad-mark"],skipButton:[".mgtv-ad-skip",".mgtv-skip-ad-btn"],countdown:[".mgtv-ad-countdown-text"]},observers:{playerContainer:"#mgtv-player"},skipStrategies:["remove_element","click_skip_button"]}};const defaultSettings={skipMode:"auto",enableSponsorBlock:true,enableCrowdSource:false,showStatusBall:true,showProgressOverlay:false,stealthMode:true};var builtinRules = {version:version,updatedAt:updatedAt,rules:rules,defaultSettings:defaultSettings};

  /**
   * Greasy Ad Skipper — 主入口
   *
   * 启动流程：
   * 1. 平台检测 → 判断当前页面是否匹配
   * 2. 初始化规则引擎
   * 3. 初始化配置管理器
   * 4. 初始化反检测引擎
   * 5. 注册并初始化对应平台的适配器
   * 6. 挂载 UI 组件（配置面板 + 悬浮球 + 首次引导）
   * 7. 注册核心事件处理器
   */

  /** @type {Map<string, import('./adapters/BaseAdapter').default>} */
  const activeAdapters = new Map();

  /**
   * 启动插件
   */
  async function bootstrap() {
    Logger.info('🚀 Greasy Ad Skipper 启动中...');

    // Step 1: 检测当前平台
    const platform = UrlUtils.detectPlatform();
    if (!platform) {
      Logger.debug('当前页面不在支持的平台列表中，跳过');
      return;
    }
    Logger.info(`检测到平台: ${UrlUtils.getPlatformDisplayName(platform)}`);

    // Step 2: 初始化规则引擎
    const REMOTE_RULES_URL = 'https://raw.githubusercontent.com/bilbilmyc/Greasy/main/projects/greasy-ad-skipper/rules/rules.json';
    await ruleEngine.init(builtinRules, REMOTE_RULES_URL);
    const defaultSettings = ruleEngine.getDefaultSettings();

    // Step 3: 初始化配置管理器
    configManager.init(defaultSettings);

    // Step 4: 初始化反检测引擎（全局策略）
    const adConfig = ruleEngine.getAntiDetectionConfig(platform);
    if (adConfig) {
      antiDetection.configure({
        ...adConfig,
        stealthMode: configManager.get('stealthMode')
      });
    }
    antiDetection.apply();

    // Step 5: 注册并初始化适配器
    const adapter = await registerAndInitAdapter(platform);
    if (!adapter) {
      Logger.warn(`[${platform}] 适配器初始化失败`);
      return;
    }

    // Step 6: 挂载 UI 组件
    try {
      configPanel.mount();
      statusFloatingBall.mount();
      if (configManager.get('showStatusBall')) {
        statusFloatingBall.setVisible(true);
      }
    } catch (e) {
      Logger.warn('UI 组件挂载失败（非关键错误）:', e.message);
    }

    // 首次引导（非关键，不抛异常）
    try {
      if (onboardingGuide.shouldShow()) {
        setTimeout(() => onboardingGuide.show(), 1000);
      }
    } catch (e) {
      // 引导失败不影响核心功能
    }

    // Step 7: 注册全局事件处理器
    registerGlobalHandlers(platform);

    // Step 8: 标记就绪
    Logger.info(`✅ Greasy Ad Skipper 就绪 — ${UrlUtils.getPlatformDisplayName(platform)}`);

    // Step 9: 将启动状态保存到 DOM（供调试）
    document.documentElement.dataset.greasySkipperActive = platform;
  }

  /**
   * 注册并初始化平台适配器
   */
  async function registerAndInitAdapter(platform) {
    let adapter = null;
    switch (platform) {
      case 'youtube':
        adapter = new YouTubeAdapter();
        break;
      case 'bilibili':
        adapter = new BilibiliAdapter();
        break;
      case 'tencent':
        adapter = new TencentAdapter();
        break;
      case 'iqiyi':
        adapter = new IqiyiAdapter();
        break;
      case 'youku':
        adapter = new YoukuAdapter();
        break;
      case 'mgtv':
        adapter = new MgtvAdapter();
        break;
      default:
        Logger.warn(`[${platform}] 不支持的平台`);
        return null;
    }

    // 注册到规则引擎
    ruleEngine.registerAdapter(platform, adapter);

    // 注册到事件管道
    eventPipeline.on(EventPipeline.EVENTS.AD_DETECTED, ad => {
      Logger.adEvent(platform, 'detected', ad.type);
      StorageUtils.incrementSkipped(); // 统计（后续会被实际跳过事件覆盖）
    });
    eventPipeline.on(EventPipeline.EVENTS.AD_SKIPPED, ad => {
      Logger.adEvent(platform, 'skipped', `${ad.type} (conf: ${ad.confidence})`);
      // 更新今日统计
      StorageUtils.incrementSkipped();
      // 更新悬浮球显示
      updateStatusDisplay();
    });

    // 初始化适配器
    try {
      await adapter.init();
      activeAdapters.set(platform, adapter);
      return adapter;
    } catch (e) {
      Logger.error(`[${platform}] 适配器初始化失败:`, e.message);
      return null;
    }
  }

  /**
   * 注册全局事件处理器
   */
  function registerGlobalHandlers(platform) {
    // 配置变更监听（合并到一个 handler）
    eventPipeline.on(EventPipeline.EVENTS.CONFIG_CHANGED, changes => {
      Logger.debug('配置已变更', changes);
      if (changes.stealthMode !== undefined) {
        antiDetection.configure({
          avoidGlobalFlags: changes.stealthMode
        });
      }
      if (changes.skipMode !== undefined) {
        Logger.info(`跳过模式切换为: ${changes.skipMode}`);
      }
      if (changes.showStatusBall !== undefined) {
        statusFloatingBall.setVisible(changes.showStatusBall);
      }
    });

    // 检测到平台警告
    eventPipeline.on(EventPipeline.EVENTS.DETECTION_WARNING, data => {
      Logger.warn(`[${platform}] 检测警告`, data);
    });
  }

  /**
   * 更新状态显示
   */
  function updateStatusDisplay() {
    statusFloatingBall.updateCount();
  }

  /**
   * 清理所有适配器资源
   */
  function destroyAll() {
    for (const _ref of activeAdapters) {
      const platform = _ref[0];
      const adapter = _ref[1];
      Logger.info(`清理适配器: ${platform}`);
      adapter.destroy();
    }
    activeAdapters.clear();
    configPanel.destroy();
    statusFloatingBall.destroy();
    onboardingGuide.destroy();
    antiDetection.destroy();
    eventPipeline.clear();
    delete document.documentElement.dataset.greasySkipperActive;
  }

  // ─── 启动入口 ─────────────────────────────────────────

  // 等待页面加载完成（油猴 @run-at document-end）
  if (document.readyState === 'complete') {
    bootstrap().catch(e => Logger.error('启动失败:', e.message));
  } else {
    window.addEventListener('load', () => {
      bootstrap().catch(e => Logger.error('启动失败:', e.message));
    });
  }

  // 页面卸载时清理
  window.addEventListener('beforeunload', () => {
    destroyAll();
  });

})();
