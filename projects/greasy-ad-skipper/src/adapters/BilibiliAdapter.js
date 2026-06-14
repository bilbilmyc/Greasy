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
import BaseAdapter from './BaseAdapter.js';
import Logger from '../utils/Logger.js';
import DomUtils from '../utils/DomUtils.js';
import antiDetection from '../core/AntiDetection.js';
import ruleEngine from '../core/RuleEngine.js';

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
        if (ad.element && await this._skipByRemoveElement(ad.element)) return true;
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
    const adContainer = DomUtils.querySelectorAny([
      '.bpx-player-video-ad',
      '.bilibili-player-video-btn-ad',
      '.ad-report'
    ]);
    if (adContainer && adContainer.offsetParent !== null) {
      const hasSkipBtn = !!DomUtils.querySelector(
        '.bpx-player-ad-skip, .bpx-player-ad-countdown'
      );
      ads.push({
        type: hasSkipBtn ? 'preroll' : 'postroll',
        element: adContainer,
        confidence: 0.85,
        platform: 'bilibili',
        skipStrategy: hasSkipBtn ? 'click_skip_button' : 'remove_element'
      });
    }

    // 方法 2: 检测倒计时标签
    const countdown = DomUtils.querySelector(
      '.bpx-player-ad-countdown, ' +
      '.bilibili-player-video-btn-ad .bpx-player-ad-countdown'
    );
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

    const pauseAd = DomUtils.querySelector(
      '.bpx-player-video-pause-ad, ' +
      '.bpx-player-pause-ad-container, ' +
      '.bilibili-player-video-pause-ad'
    );
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
    const danmakuElements = DomUtils.querySelectorAll(
      '.bilibili-danmaku, ' +
      '.bpx-player-danmaku-item, ' +
      '[class*="danmaku"]'
    );

    if (danmakuElements.length === 0) return ads;

    // 按时间窗口统计关键词出现频率
    const timeStats = this._analyzeDanmakuKeywords(
      danmakuElements, keywords, windowMs
    );

    // 找出超过阈值的广告段
    for (const [timeKey, count] of Object.entries(timeStats)) {
      const [startStr, endStr] = timeKey.split('-');
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
    if (window.danmakuAnalyzed) return window.danmakuAnalyzed;

    const timeStats = {};

    // 尝试从 B站 的弹幕数据接口获取结构化弹幕数据
    const danmakuData = unsafeWindow?.__INITIAL_STATE__?.danmaku;
    let danmakuList = [];

    if (Array.isArray(danmakuData)) {
      danmakuList = danmakuData;
    } else if (elements.length > 0) {
      // 从 DOM 元素中提取弹幕文本和时间
      elements.forEach(el => {
        const text = el.textContent || '';
        const time = parseFloat(el.getAttribute('data-time') ||
                               el.getAttribute('data-progress') || '0');
        if (text && time > 0) {
          danmakuList.push({ text, progress: time });
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
    setTimeout(() => { window.danmakuAnalyzed = null; }, 10000);

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
      Logger.adEvent('bilibili', 'skip_embedded',
        `${ad.startTime.toFixed(1)}s → ${ad.endTime.toFixed(1)}s`);
      return true;
    }

    return false;
  }

  /**
   * 设置 DOM 观察者
   */
  _setupObservers() {
    // 监听播放器变化（检测贴片广告）
    this._adObserver = this._createObserver(
      '.bpx-player-video-wrap',
      () => this.runAdCycle()
    );
  }

  /**
   * 提取视频元信息
   */
  _extractVideoInfo() {
    try {
      const initState = unsafeWindow?.__INITIAL_STATE__;
      if (initState) {
        this._videoInfo = {
          aid: initState.aid,
          bvid: initState.bvid,
          title: initState.videoData?.title || '',
          upName: initState.upData?.name || '',
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
    return DomUtils.querySelector('video') ||
           DomUtils.querySelector('.bpx-player-video-wrap video') ||
           DomUtils.querySelector('.bilibili-player-video video');
  }

  /**
   * 广告去重
   */
  _deduplicateAds(ads) {
    const seen = new Set();
    return ads.filter(ad => {
      const key = ad.type + '_' + (ad.element?.className || '') + '_' +
                  (ad.startTime || 0) + '_' + (ad.endTime || 0);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}

export default BilibiliAdapter;
