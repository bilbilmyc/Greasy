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
import BaseAdapter from './BaseAdapter.js';
import Logger from '../utils/Logger.js';
import DomUtils from '../utils/DomUtils.js';
import antiDetection from '../core/AntiDetection.js';
import ruleEngine from '../core/RuleEngine.js';

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
    this._ensureInitialized();
    const ads = [];

    // 1. 广告容器检测
    const adContainer = DomUtils.querySelectorAny(
      this._rules?.selectors?.adContainer || []
    );
    if (adContainer && adContainer.offsetParent !== null) {
      const skipBtn = DomUtils.querySelectorAny(
        this._rules?.selectors?.skipButton || []
      );
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
      const skipBtn = DomUtils.querySelectorAny(
        this._rules?.selectors?.skipButton || []
      );
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
    this._adObserver = this._createObserver(
      '#mgtv-player, .mgtv-player-wrap',
      () => this.runAdCycle(),
      { attributeFilter: ['class', 'style', 'display'] }
    );
  }
}

export default MgtvAdapter;
