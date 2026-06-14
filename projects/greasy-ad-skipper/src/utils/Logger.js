/**
 * 日志工具 — 开发模式下输出详细日志，生产模式只输出警告/错误
 */
const Logger = {
  prefix: '[GreasyAdSkipper]',

  /**
   * 设置日志等级
   * 0=生产（仅 error）, 1=warn+, 2=info+, 3=debug+
   */
  level: (typeof GM_getValue === 'function' && GM_getValue('log_level')) || 1,

  debug(...args) {
    if (this.level >= 3) {
      console.debug(this.prefix, '[DEBUG]', ...args);
    }
  },

  info(...args) {
    if (this.level >= 2) {
      console.log(this.prefix, '[INFO]', ...args);
    }
  },

  warn(...args) {
    if (this.level >= 1) {
      console.warn(this.prefix, '[WARN]', ...args);
    }
  },

  error(...args) {
    console.error(this.prefix, '[ERROR]', ...args);
  },

  /**
   * 广告事件专用日志（仅 debug 模式）
   */
  adEvent(platform, action, detail) {
    this.debug(`[AdEvent][${platform}] ${action}`, detail);
  }
};

export default Logger;
