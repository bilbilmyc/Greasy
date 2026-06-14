/**
 * 反检测引擎 — 规避平台的 adblock 检测
 *
 * 三层策略：
 * 1. 时序随机化：操作前随机等待，观察者防抖
 * 2. 选择器随机化：在 DOM 查询时加入噪声属性
 * 3. 用户行为模拟：模拟鼠标移动、自然的操作时序
 */
import Logger from '../utils/Logger.js';

class SeededRandom {
  constructor(seed) {
    this.seed = seed || Date.now();
  }

  /** 生成 [0, 1) 伪随机数 */
  next() {
    this.seed = (this.seed * 1664525 + 1013904223) & 0x7fffffff;
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
      clickDelay: { min: 500, max: 2000 },
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
  async randomDelay(action = 'generic') {
    const jitter = this._rng.nextInt(-100, 100);
    const baseDelay = this._rng.nextInt(
      this._config.clickDelay.min,
      this._config.clickDelay.max
    );
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
          clientX: cx, clientY: cy,
          bubbles: true, cancelable: true
        }));

        if (i < steps) {
          await new Promise(r => setTimeout(r, this._rng.nextInt(20, 80)));
        }
      }

      // 悬停
      element.dispatchEvent(new MouseEvent('mouseover', {
        clientX: endX, clientY: endY,
        bubbles: true, cancelable: true
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
        const warning = document.querySelector(
          'ytd-enforcement-message-view-model, ' +
          '#ad-blocker-detected, ' +
          '#enforcement-message'
        );
        if (warning && warning.offsetParent !== null) {
          return { detected: true, type: 'warning', element: warning };
        }

        // 视频被静音也可能是检测信号
        const video = document.querySelector('video');
        if (video && video.muted && !video.dataset._greasyUserMuted) {
          return { detected: true, type: 'muted', element: video };
        }
      }

      if (platform === 'bilibili') {
        // B站是否有特殊的检测（目前较少）
      }

      return { detected: false };
    } catch (e) {
      return { detected: false };
    }
  }

  /**
   * 避免设置全局检测标志
   */
  _patchGlobalFlags() {
    // 不在 window 上设置任何自定义属性
    // 大多数 adblock 检测脚本通过检查 window.__adblock 等标志工作
    // 我们不做任何标志设置，就是最好的躲避

    // 保护常见的检测属性（可选）
    try {
      // Object.defineProperty(window, 'chrome', { ... }) 太激进，跳过
    } catch (e) {
      // 静默
    }
  }

  /**
   * 清理资源
   */
  destroy() {
    this._timers.forEach(t => clearTimeout(t));
    this._timers = [];
    this._observers.forEach(o => { try { o.disconnect(); } catch (e) {} });
    this._observers = [];
    this._applied = false;
    Logger.debug('反检测引擎已清理');
  }
}

const antiDetection = new AntiDetectionEngine();
export default antiDetection;
