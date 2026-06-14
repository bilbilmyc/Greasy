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
import BaseAdapter from './BaseAdapter.js';
import Logger from '../utils/Logger.js';
import DomUtils from '../utils/DomUtils.js';
import antiDetection from '../core/AntiDetection.js';
import ruleEngine from '../core/RuleEngine.js';

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
    this._ensureInitialized();
    const ads = [];

    // 1. 主广告检测：查找 .adUIBox 容器
    const adUIContainer = DomUtils.querySelector('.adUIBox');
    if (adUIContainer && adUIContainer.offsetParent !== null) {
      const skipBtn = DomUtils.querySelectorAny(
        this._rules?.selectors?.skipButton || []
      );
      // 查找倒计时
      const countdown = DomUtils.querySelector('.countdown-topright');
      let match = null;
      let remaining = 999;
      if (countdown) {
        const m = countdown.textContent?.match(/(\d+)/);
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
    const bannerSelectors = this._rules?.selectors?.banner || [];
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
        const closeBtn = DomUtils.querySelector(
          '[class*="closeAdBtn"], #btn_auto_13'
        );
        if (closeBtn && closeBtn.offsetParent !== null) {
          DomUtils.safeClick(closeBtn);
          return true;
        }
        break;
      case 'remove_element':
        if (ad.element && await this._skipByRemoveElement(ad.element)) return true;
        break;
      case 'timer_accelerate':
        if (await this._skipByTimerAccelerate()) return true;
        if (ad.element && await this._skipByRemoveElement(ad.element)) return true;
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
    this._adObserver = this._createObserver(
      '#flash_container, .XPlayer, .adUIBox',
      () => this.runAdCycle(),
      { attributeFilter: ['class', 'style', 'display'] }
    );
  }
}

export default IqiyiAdapter;
