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
import BaseAdapter from './BaseAdapter.js';
import Logger from '../utils/Logger.js';
import DomUtils from '../utils/DomUtils.js';
import antiDetection from '../core/AntiDetection.js';
import ruleEngine from '../core/RuleEngine.js';

class TencentAdapter extends BaseAdapter {
  constructor() {
    super('tencent');
    this._adObserver = null;
    this._videoElement = null;
  }

  async init() {
    await super.init();
    this._videoElement = DomUtils.querySelector('video') ||
                         DomUtils.querySelector('#tenvideo_player video');

    this._setupObservers();
    this._adCycleInterval = 1500;

    setTimeout(() => this.runAdCycle(), 1500);
    this._active = true;
    Logger.info('[腾讯视频] 适配器已启动');
  }

  async detectAds() {
    this._ensureInitialized();
    const ads = [];

    // 1. 片头/片中广告容器
    const adContainer = DomUtils.querySelectorAny(
      this._rules?.selectors?.adContainer || []
    );
    if (adContainer && adContainer.offsetParent !== null) {
      const hasCountdown = !!DomUtils.querySelectorAny(
        this._rules?.selectors?.countdown || []
      );
      ads.push({
        type: hasCountdown ? 'countdown' : 'preroll',
        element: adContainer,
        confidence: 0.85,
        platform: 'tencent',
        skipStrategy: hasCountdown ? 'timer_accelerate' : 'remove_element'
      });
    }

    // 2. 跳过按钮出现 → 立即点击
    const skipBtn = DomUtils.querySelectorAny(
      this._rules?.selectors?.skipButton || []
    );
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
        if (ad.element && await this._skipByRemoveElement(ad.element)) return true;
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

  _detectPauseAds(ads) {
    // 腾讯视频暂停时出现的广告覆盖层
    const pauseAd = DomUtils.querySelector(
      '.txp_ad_pause, ' +
      '.tvp_ad_pause, ' +
      '.ad_pause_content, ' +
      '.mod_ad_pause'
    );
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
    this._adObserver = this._createObserver(
      '#tenvideo_player',
      () => this.runAdCycle(),
      { attributeFilter: ['class', 'style', 'display'] }
    );
  }
}

export default TencentAdapter;
