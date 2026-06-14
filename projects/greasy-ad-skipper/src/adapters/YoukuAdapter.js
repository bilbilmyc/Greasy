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
import BaseAdapter from './BaseAdapter.js';
import Logger from '../utils/Logger.js';
import DomUtils from '../utils/DomUtils.js';
import antiDetection from '../core/AntiDetection.js';
import ruleEngine from '../core/RuleEngine.js';

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
    this._ensureInitialized();
    const ads = [];

    // 1. 广告容器检测
    const adContainer = DomUtils.querySelectorAny(
      this._rules?.selectors?.adContainer || []
    );

    if (adContainer && adContainer.offsetParent !== null) {
      // 检查是否有倒计时
      const countdownEl = DomUtils.querySelector('.adtopright_container');
      const hasCountdown = countdownEl && countdownEl.offsetParent !== null;
      const skipBtn = DomUtils.querySelectorAny(
        this._rules?.selectors?.skipButton || []
      );

      ads.push({
        type: hasCountdown ? 'countdown' : 'preroll',
        element: adContainer,
        confidence: 0.9,
        platform: 'youku',
        skipStrategy: hasCountdown ? 'timer_accelerate'
                   : skipBtn ? 'click_skip_button'
                   : 'remove_element'
      });
    }

    // 2. 仅跳过按钮可见（无广告容器）
    if (ads.length === 0) {
      const skipBtn = DomUtils.querySelectorAny(
        this._rules?.selectors?.skipButton || []
      );
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
        if (ad.element && await this._skipByRemoveElement(ad.element)) return true;
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
    this._adObserver = this._createObserver(
      '#youku-player, .advertise-layer, preloading-layer',
      () => this.runAdCycle(),
      { attributeFilter: ['class', 'style', 'display'] }
    );
  }
}

export default YoukuAdapter;
