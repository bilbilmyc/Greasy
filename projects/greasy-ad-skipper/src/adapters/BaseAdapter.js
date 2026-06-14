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

import Logger from '../utils/Logger.js';
import DomUtils from '../utils/DomUtils.js';
import ruleEngine from '../core/RuleEngine.js';
import antiDetection from '../core/AntiDetection.js';
import eventPipeline from '../core/EventPipeline.js';
import StorageUtils from '../utils/StorageUtils.js';

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
      try { o.disconnect(); } catch (e) {}
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
  _detectBySelectors(selectors, confidence = 0.7) {
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
    const tagName = element.tagName || '';
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
    const countdownSelectors = this._rules?.selectors?.countdown || [];
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
          el.dispatchEvent(new Event('change', { bubbles: true }));
          el.dispatchEvent(new Event('input', { bubbles: true }));
        } catch (e) {}

        Logger.adEvent(this.platform, 'timer_accelerate', '倒计时已归零');
      }
    }

    // 如果没有找到倒计时元素，尝试通用方法：移除所有带倒计时特征的容器
    if (!found) {
      const adContainers = DomUtils.querySelectorAll(
        '[class*="countdown"], [class*="ad-count"], [class*="ad_time"]'
      );
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
  _createObserver(containerSelector, callback, config = {}) {
    const container = containerSelector
      ? DomUtils.querySelector(containerSelector)
      : document.body;
    if (!container) return null;

    const observer = new MutationObserver((mutations) => {
      // 反检测防抖
      clearTimeout(observer._debounce);
      observer._debounce = setTimeout(() => {
        try {
          callback(mutations);
        } catch (e) {
          Logger.error(`[${this.platform}] Observer callback error:`, e.message);
        }
      }, antiDetection._config?.observerDebounceMs || 300);
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

export default BaseAdapter;
