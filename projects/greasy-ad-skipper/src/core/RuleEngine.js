/**
 * 规则引擎 — 规则加载、匹配、热更新
 *
 * 职责：
 * 1. 加载内建规则（rules.json）
 * 2. 支持从远程 URL 热更新规则
 * 3. 按平台返回适用的规则
 * 4. 管理平台适配器注册
 */
import Logger from '../utils/Logger.js';

class RuleEngine {
  constructor() {
    this._adapters = new Map();   // platform -> Adapter instance
    this._rules = null;           // parsed rules object
    this._rulesUrl = null;        // remote rules URL
    this._initialized = false;
  }

  /**
   * 初始化规则引擎
   * @param {Object} builtinRules - 内建规则对象
   * @param {string} [remoteUrl] - 远程规则 URL（可选）
   */
  async init(builtinRules, remoteUrl) {
    this._rules = builtinRules;
    this._rulesUrl = remoteUrl || null;

    // 尝试加载远程规则（静默失败，回退到内建规则）
    if (this._rulesUrl) {
      try {
        await this._fetchRemoteRules();
        Logger.info(`规则已从远程更新: ${this._rulesUrl}`);
      } catch (e) {
        Logger.warn('远程规则加载失败，使用内建规则', e.message);
      }
    }

    this._initialized = true;
    Logger.info(`规则引擎已初始化，版本: ${this._rules?.version || 'unknown'}`);
  }

  /**
   * 注册平台适配器
   */
  registerAdapter(platform, adapter) {
    this._adapters.set(platform, adapter);
    Logger.debug(`适配器已注册: ${platform}`);
  }

  /**
   * 获取已注册的适配器
   */
  getAdapter(platform) {
    return this._adapters.get(platform) || null;
  }

  /**
   * 获取所有已注册的适配器
   */
  getAllAdapters() {
    return Array.from(this._adapters.entries());
  }

  /**
   * 获取指定平台的规则
   */
  getRules(platform) {
    if (!this._rules || !this._rules.rules) return null;
    return this._rules.rules[platform] || null;
  }

  /**
   * 获取平台的广告选择器列表
   */
  getAdSelectors(platform) {
    const rules = this.getRules(platform);
    if (!rules || !rules.selectors) return [];
    return [
      ...(rules.selectors.adContainer || []),
      ...(rules.selectors.adBadge || [])
    ];
  }

  /**
   * 获取平台的跳过按钮选择器列表
   */
  getSkipButtonSelectors(platform) {
    const rules = this.getRules(platform);
    if (!rules || !rules.selectors) return [];
    return rules.selectors.skipButton || [];
  }

  /**
   * 获取平台的 Observer 配置
   */
  getObserverConfig(platform) {
    const rules = this.getRules(platform);
    return rules ? (rules.observers || null) : null;
  }

  /**
   * 获取平台的跳过策略列表
   */
  getSkipStrategies(platform) {
    const rules = this.getRules(platform);
    return rules ? (rules.skipStrategies || []) : [];
  }

  /**
   * 获取平台的反检测配置
   */
  getAntiDetectionConfig(platform) {
    const rules = this.getRules(platform);
    return rules ? (rules.antiDetection || null) : null;
  }

  /**
   * 获取平台的植入广告检测配置
   */
  getEmbeddedAdDetection(platform) {
    const rules = this.getRules(platform);
    return rules ? (rules.embeddedAdDetection || null) : null;
  }

  /**
   * 获取默认设置
   */
  getDefaultSettings() {
    return this._rules ? (this._rules.defaultSettings || {}) : {};
  }

  /**
   * 强制刷新远程规则
   */
  async refreshRules() {
    if (!this._rulesUrl) return false;
    try {
      await this._fetchRemoteRules();
      Logger.info('规则远程刷新成功');
      return true;
    } catch (e) {
      Logger.error('规则远程刷新失败', e.message);
      return false;
    }
  }

  /**
   * 设置新的远程规则 URL
   */
  setRulesUrl(url) {
    this._rulesUrl = url;
  }

  /**
   * 从远程获取规则
   */
  async _fetchRemoteRules() {
    return new Promise((resolve, reject) => {
      if (typeof GM_xmlhttpRequest === 'function') {
        GM_xmlhttpRequest({
          method: 'GET',
          url: this._rulesUrl,
          onload: (res) => {
            if (res.status >= 200 && res.status < 300) {
              try {
                const parsed = JSON.parse(res.responseText);
                if (parsed && parsed.version && parsed.rules) {
                  this._rules = parsed;
                  resolve();
                } else {
                  reject(new Error('远程规则格式无效'));
                }
              } catch (e) {
                reject(new Error('远程规则 JSON 解析失败'));
              }
            } else {
              reject(new Error(`HTTP ${res.status}`));
            }
          },
          onerror: () => reject(new Error('网络请求失败')),
          ontimeout: () => reject(new Error('请求超时'))
        });
      } else {
        // fallback: 使用 fetch
        fetch(this._rulesUrl)
          .then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
          })
          .then(data => {
            if (data && data.version && data.rules) {
              this._rules = data;
              resolve();
            } else {
              reject(new Error('远程规则格式无效'));
            }
          })
          .catch(reject);
      }
    });
  }
}

// 单例导出
const ruleEngine = new RuleEngine();
export default ruleEngine;
