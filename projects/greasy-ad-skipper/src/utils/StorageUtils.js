/**
 * GM 存储 API 封装
 * 提供带默认值和命名空间的键值存储
 */

const STORAGE_NAMESPACE = 'greasy_skipper_';

const StorageUtils = {
  /**
   * 获取存储值，支持默认值
   */
  get(key, defaultValue = null) {
    const fullKey = STORAGE_NAMESPACE + key;
    try {
      if (typeof GM_getValue === 'function') {
        const value = GM_getValue(fullKey);
        return value !== undefined ? value : defaultValue;
      }
      // fallback: localStorage
      const raw = localStorage.getItem(fullKey);
      return raw !== null ? JSON.parse(raw) : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  },

  /**
   * 设置存储值
   */
  set(key, value) {
    const fullKey = STORAGE_NAMESPACE + key;
    try {
      if (typeof GM_setValue === 'function') {
        GM_setValue(fullKey, value);
      } else {
        localStorage.setItem(fullKey, JSON.stringify(value));
      }
      return true;
    } catch (e) {
      return false;
    }
  },

  /**
   * 删除存储值
   */
  delete(key) {
    const fullKey = STORAGE_NAMESPACE + key;
    try {
      if (typeof GM_deleteValue === 'function') {
        GM_deleteValue(fullKey);
      } else {
        localStorage.removeItem(fullKey);
      }
      return true;
    } catch (e) {
      return false;
    }
  },

  /**
   * 列出所有存储键
   */
  list() {
    try {
      if (typeof GM_listValues === 'function') {
        return GM_listValues()
          .filter(k => k.startsWith(STORAGE_NAMESPACE))
          .map(k => k.slice(STORAGE_NAMESPACE.length));
      }
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_NAMESPACE)) {
          keys.push(key.slice(STORAGE_NAMESPACE.length));
        }
      }
      return keys;
    } catch (e) {
      return [];
    }
  },

  /**
   * 批量获取配置
   */
  getConfig(defaults = {}) {
    const config = {};
    for (const [key, defaultValue] of Object.entries(defaults)) {
      config[key] = this.get(`config_${key}`, defaultValue);
    }
    return config;
  },

  /**
   * 批量保存配置
   */
  setConfig(config) {
    for (const [key, value] of Object.entries(config)) {
      this.set(`config_${key}`, value);
    }
  },

  /**
   * 获取今日统计数据
   */
  getTodayStats() {
    const today = new Date().toISOString().split('T')[0];
    return this.get(`stats_${today}`, {
      adsSkipped: 0,
      adsMarked: 0,
      activeTime: 0
    });
  },

  /**
   * 增加今日跳过计数
   */
  incrementSkipped() {
    const today = new Date().toISOString().split('T')[0];
    const stats = this.get(`stats_${today}`, {
      adsSkipped: 0, adsMarked: 0, activeTime: 0
    });
    stats.adsSkipped = (stats.adsSkipped || 0) + 1;
    this.set(`stats_${today}`, stats);
    return stats.adsSkipped;
  }
};

export default StorageUtils;
