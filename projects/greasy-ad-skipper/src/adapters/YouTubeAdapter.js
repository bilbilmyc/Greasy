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
import BaseAdapter from './BaseAdapter.js';
import Logger from '../utils/Logger.js';
import DomUtils from '../utils/DomUtils.js';
import UrlUtils from '../utils/UrlUtils.js';
import antiDetection from '../core/AntiDetection.js';
import ruleEngine from '../core/RuleEngine.js';
import configManager from '../core/ConfigManager.js';
import sponsorBlockBridge from '../bridges/SponsorBlockBridge.js';

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
    this._videoElement = DomUtils.querySelector('video') ||
                         DomUtils.querySelector('#movie_player video');

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
    const ads = [];

    // 方法 1: 检测广告标记 UI
    const adBadge = DomUtils.querySelectorAny(
      this._rules?.selectors?.adBadge || []
    );
    if (adBadge && adBadge.offsetParent !== null) {
      const video = this._getVideoElement();
      const adInfo = {
        type: this._classifyVideoAd(video),
        element: adBadge,
        confidence: 0.8,
        platform: 'youtube',
        startTime: video ? video.currentTime : 0,
        duration: video ? (video.duration - video.currentTime) : 0,
        skipStrategy: 'click_skip_button'
      };
      ads.push(adInfo);
    }

    // 方法 2: 检测广告容器
    const adContainer = DomUtils.querySelectorAny(
      this._rules?.selectors?.adContainer || []
    );
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
    const companionAd = DomUtils.querySelector(
      '.ytp-ad-action-companion-renderer, ' +
      '.ytp-ad-overlay-container, ' +
      '.ytp-ad-image-overlay'
    );
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
    const ads = [];
    const bannerSelectors = this._rules?.selectors?.adContainer || [];

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
    const closeButton = DomUtils.querySelector(
      '#dismiss-button, ' +
      'ytd-button-renderer#dismiss-button, ' +
      'tp-yt-paper-button#dismiss-button, ' +
      'button[aria-label*="Close"]'
    );
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
      if (video && video.currentTime >= ad.startTime - 0.5 &&
          video.currentTime <= ad.startTime + 0.5) {
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
        Logger.adEvent('youtube', 'sponsorblock_skip',
          `${check.segment.category} ${check.segment.start}s→${check.segment.end}s`);
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
    this._adObserver = this._createObserver(
      '#movie_player',
      () => this.runAdCycle()
    );
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
      this._videoElement = DomUtils.querySelector('video') ||
                           DomUtils.querySelector('#movie_player video');
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
      const key = ad.type + '_' + (ad.element?.className || '') + '_' +
                  (ad.startTime || 0);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}

export default YouTubeAdapter;
