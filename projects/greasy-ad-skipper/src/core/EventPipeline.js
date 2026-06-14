/**
 * 事件管道 — 广告检测事件的发布/订阅系统
 *
 * 解耦「广告检测」和「广告跳过」之间的直接依赖。
 * 任何检测器发现广告 → 发布事件 → 任意执行器收到事件后处理
 */
import Logger from '../utils/Logger.js';

class EventPipeline {
  constructor() {
    this._handlers = new Map();
    this._history = [];
    this._maxHistory = 100;
  }

  /**
   * 注册事件处理器
   * @param {string} event - 事件名
   * @param {Function} handler - (data) => void
   * @param {number} [priority=0] - 优先级，越高越先执行
   */
  on(event, handler, priority = 0) {
    if (!this._handlers.has(event)) {
      this._handlers.set(event, []);
    }
    this._handlers.get(event).push({ handler, priority });
    // 按优先级降序排列
    this._handlers.get(event).sort((a, b) => b.priority - a.priority);
  }

  /**
   * 移除事件处理器
   */
  off(event, handler) {
    const handlers = this._handlers.get(event);
    if (!handlers) return;
    if (handler) {
      const idx = handlers.findIndex(h => h.handler === handler);
      if (idx >= 0) handlers.splice(idx, 1);
    } else {
      this._handlers.delete(event);
    }
  }

  /**
   * 发布事件
   * @param {string} event - 事件名
   * @param {*} data - 事件数据
   */
  async emit(event, data) {
    const handlers = this._handlers.get(event);
    if (!handlers || handlers.length === 0) return;

    // 记录事件历史
    this._recordHistory(event, data);

    Logger.debug(`事件发布: ${event}`, data);

    // 依次执行处理器
    for (const { handler } of handlers) {
      try {
        await handler(data);
      } catch (e) {
        Logger.error(`事件处理器错误 [${event}]:`, e.message);
      }
    }
  }

  /**
   * 同步版本的事件发布
   */
  emitSync(event, data) {
    const handlers = this._handlers.get(event);
    if (!handlers || handlers.length === 0) return;

    this._recordHistory(event, data);

    for (const { handler } of handlers) {
      try {
        handler(data);
      } catch (e) {
        Logger.error(`事件处理器错误 [${event}]:`, e.message);
      }
    }
  }

  /**
   * 获取所有已注册的事件类型
   */
  getEvents() {
    return Array.from(this._handlers.keys());
  }

  /**
   * 获取事件历史
   */
  getHistory(event, limit = 10) {
    const events = event
      ? this._history.filter(h => h.event === event)
      : this._history;
    return events.slice(-limit);
  }

  /**
   * 清除所有处理器
   */
  clear() {
    this._handlers.clear();
    this._history = [];
  }

  _recordHistory(event, data) {
    this._history.push({
      event,
      data: this._sanitizeData(data),
      timestamp: Date.now()
    });
    if (this._history.length > this._maxHistory) {
      this._history.shift();
    }
  }

  _sanitizeData(data) {
    // 只保存关键信息，避免保存 DOM 元素引用
    if (data && typeof data === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(data)) {
        if (value instanceof HTMLElement) {
          sanitized[key] = `<${value.tagName}>`;
        } else if (typeof value !== 'function') {
          sanitized[key] = value;
        }
      }
      return sanitized;
    }
    return data;
  }
}

// 预定义事件类型
EventPipeline.EVENTS = {
  AD_DETECTED: 'ad:detected',           // 检测到广告
  AD_SKIPPED: 'ad:skipped',             // 广告已跳过
  AD_SKIP_FAILED: 'ad:skip_failed',     // 广告跳过失败
  AD_MARKED: 'ad:marked',               // 用户标记了广告
  PLATFORM_CHANGED: 'platform:changed', // 页面平台变更
  CONFIG_CHANGED: 'config:changed',     // 配置变更
  DETECTION_WARNING: 'detection:warning' // 检测到平台警告
};

const eventPipeline = new EventPipeline();
export { EventPipeline };
export default eventPipeline;
