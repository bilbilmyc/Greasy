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
import Logger from '../utils/Logger.js';

class SponsorBlockBridge {
  constructor() {
    this._API_BASE = 'https://sponsor.ajay.app';
    this._cache = new Map();           // videoID → segments[]
    this._cacheTTL = 30 * 60 * 1000;   // 缓存 30 分钟
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
      const categories = [
        'sponsor',
        'selfpromo',
        'interaction',
        'exclusive_access',
        'preview'
      ];

      const url = `${this._API_BASE}/api/skipSegments`
        + `?videoID=${encodeURIComponent(videoID)}`
        + `&categories=${encodeURIComponent(JSON.stringify(categories))}`;

      const response = await fetch(url, {
        signal: this._abortController.signal,
        headers: { 'Accept': 'application/json' }
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
      const rawSegments = Array.isArray(data) ? data : (data.segments || []);

      const segments = rawSegments
        .filter(item => item && item.segment && item.segment.length === 2)
        .map(item => ({
          start: item.segment[0],
          end: item.segment[1],
          category: item.category || 'sponsor',
          votes: item.votes || 0,
          UUID: item.UUID || '',
          description: item.description || '',
          videoID: videoID,
          userAgent: item.userAgent || ''
        }))
        .filter(s => (s.end - s.start) > 1)  // 过滤少于 1 秒的段
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
    if (!segment) return { shouldSkip: false, segment: null };

    // 确保不是误判：只在段的开始 1.5 秒内触发跳过
    const timeIntoSegment = currentTime - segment.start;
    if (timeIntoSegment >= 0 && timeIntoSegment <= 1.5) {
      return { shouldSkip: true, segment };
    }

    return { shouldSkip: false, segment };
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
        const progressBar = document.querySelector('.ytp-progress-bar') ||
                            document.querySelector('.ytp-play-progress');
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
          const leftPercent = (seg.start / duration) * 100;
          const widthPercent = ((seg.end - seg.start) / duration) * 100;

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
            sponsor: '#00d400',         // 赞助商 - 绿色
            selfpromo: '#cc00ff',       // 自推销 - 紫色
            interaction: '#00ffcc',     // 交互提醒 - 青色
            exclusive_access: '#ff9900', // 会员专属 - 橙色
            preview: '#ff0066',         // 预告 - 粉色
            default: '#ffcc00'          // 其他 - 黄色
          };
          marker.style.backgroundColor = colors[seg.category] || colors.default;

          // tooltip
          marker.title = `[SponsorBlock] ${this._getCategoryLabel(seg.category)}: ${this._formatTime(seg.start)} - ${this._formatTime(seg.end)}`;

          overlay.appendChild(marker);
        }

        // 将覆盖层插入到进度条容器中
        const container = progressBar.closest('.ytp-progress-bar-container')
                       || progressBar.parentElement;
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
export default sponsorBlockBridge;
