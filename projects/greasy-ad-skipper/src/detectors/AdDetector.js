/**
 * 广告检测器 — 编排所有检测策略
 *
 * 整合多种检测策略，提供统一的广告检测接口。
 * 当前支持的策略：
 * - DOMSelector:     CSS 选择器匹配已知广告元素
 * - MutationObserver: DOM 变化监听
 * - TimestampAnalysis: 视频时间戳分析
 * - DanmakuAnalysis:  弹幕文本分析（B站专用）
 */
import Logger from '../utils/Logger.js';
import DomUtils from '../utils/DomUtils.js';
import ruleEngine from '../core/RuleEngine.js';

class AdDetector {
  constructor() {
    this._strategies = [];
  }

  /**
   * 注册检测策略
   */
  use(strategy) {
    this._strategies.push(strategy);
  }

  /**
   * 对指定平台执行全量广告检测
   * @param {string} platform - 平台标识
   * @param {Object} [options] - 检测选项
   * @returns {Promise<Array>} 检测到的广告列表
   */
  async detect(platform, options = {}) {
    const allAds = [];
    const activeStrategies = options.strategies
      ? this._strategies.filter(s => options.strategies.includes(s.name))
      : this._strategies;

    for (const strategy of activeStrategies) {
      if (!strategy.supports(platform)) continue;
      try {
        const ads = await strategy.detect(platform);
        allAds.push(...ads);
      } catch (e) {
        Logger.error(`检测策略 ${strategy.name} 失败:`, e.message);
      }
    }

    return this._mergeResults(allAds);
  }

  /**
   * 合并检测结果（去重 + 排序）
   */
  _mergeResults(ads) {
    return ads
      .filter((ad, index, self) => {
        // 基于元素和类型去重
        const key = `${ad.type}_${ad.element ? ad.element.className : ''}_${ad.startTime || 0}`;
        return index === self.findIndex(a => {
          const aKey = `${a.type}_${a.element ? a.element.className : ''}_${a.startTime || 0}`;
          return aKey === key;
        });
      })
      .sort((a, b) => b.confidence - a.confidence);
  }
}

/**
 * DOM 选择器检测策略
 * 通过 CSS 选择器匹配已知的广告元素
 */
class DOMSelectorStrategy {
  constructor() {
    this.name = 'dom_selector';
  }

  supports(platform) {
    return !!ruleEngine.getRules(platform);
  }

  async detect(platform) {
    const selectors = ruleEngine.getAdSelectors(platform);
    const ads = [];

    for (const selector of selectors) {
      const elements = DomUtils.querySelectorAll(selector);
      for (const el of elements) {
        if (el.offsetParent !== null || el.style.display !== 'none') {
          ads.push({
            type: this._classify(platform, el),
            element: el,
            confidence: 0.7,
            platform
          });
        }
      }
    }

    return ads;
  }

  _classify(platform, el) {
    const cls = (el.className || '').toLowerCase();
    if (cls.includes('skip') || cls.includes('countdown')) return 'countdown';
    if (cls.includes('pause')) return 'overlay';
    return 'banner';
  }
}

/**
 * MutationObserver 检测策略
 * 监听指定容器的 DOM 变化来发现广告
 */
class MutationObserverStrategy {
  constructor() {
    this.name = 'mutation_observer';
    this._observers = new Map();
  }

  supports(platform) {
    return !!ruleEngine.getObserverConfig(platform);
  }

  async detect(platform) {
    const config = ruleEngine.getObserverConfig(platform);
    if (!config || !config.playerContainer) return [];

    // 这个策略主要通过事件驱动触发，不属于轮询检测
    // 返回空列表，实际由适配器的 observer 回调驱动
    return [];
  }

  /**
   * 开始监听
   */
  observe(platform, callback) {
    const config = ruleEngine.getObserverConfig(platform);
    if (!config || !config.playerContainer) return null;

    const container = DomUtils.querySelector(config.playerContainer);
    if (!container) return null;

    const debounceMs = ruleEngine.getAntiDetectionConfig(platform)?.observerDebounceMs || 300;

    let debounceTimer;
    const observer = new MutationObserver(() => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => callback(), debounceMs);
    });

    observer.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'display']
    });

    this._observers.set(platform, observer);
    return observer;
  }

  /**
   * 停止监听
   */
  disconnect(platform) {
    const observer = this._observers.get(platform);
    if (observer) {
      observer.disconnect();
      this._observers.delete(platform);
    }
  }
}

// 创建单例并注册默认策略
const adDetector = new AdDetector();
adDetector.use(new DOMSelectorStrategy());
adDetector.use(new MutationObserverStrategy());

export default adDetector;
export { DOMSelectorStrategy, MutationObserverStrategy };
