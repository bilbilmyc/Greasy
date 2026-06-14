/**
 * 配置管理器 — 用户设置的读取/保存/监听
 */
import Logger from '../utils/Logger.js';
import StorageUtils from '../utils/StorageUtils.js';
import eventPipeline from './EventPipeline.js';

class ConfigManager {
  constructor() {
    this._settings = {};
    this._defaults = {};
    this._initialized = false;
  }

  /**
   * 初始化配置管理器
   * @param {Object} defaults - 默认配置
   */
  init(defaults = {}) {
    this._defaults = {
      skipMode: 'auto',            // auto | stealth | manual
      enableSponsorBlock: true,
      enableCrowdSource: false,
      showStatusBall: true,
      showProgressOverlay: false,
      stealthMode: true,
      logLevel: 1,
      ...defaults
    };
    this._settings = StorageUtils.getConfig(this._defaults);
    this._initialized = true;
    Logger.info('配置管理器已初始化', this._settings);
  }

  /**
   * 获取所有设置
   */
  getAll() {
    return { ...this._settings };
  }

  /**
   * 获取单个设置
   */
  get(key) {
    if (!this._initialized) return this._defaults[key];
    return this._settings.hasOwnProperty(key)
      ? this._settings[key]
      : this._defaults[key];
  }

  /**
   * 更新设置
   */
  set(key, value) {
    const oldValue = this._settings[key];
    if (oldValue === value) return;

    this._settings[key] = value;
    StorageUtils.setConfig({ [key]: value });

    Logger.debug(`配置变更: ${key} = ${value}`);
    eventPipeline.emitSync(EventPipeline.EVENTS.CONFIG_CHANGED, { key, value, oldValue });
  }

  /**
   * 批量更新设置
   */
  setMultiple(updates) {
    const changed = {};
    for (const [key, value] of Object.entries(updates)) {
      if (this._settings[key] !== value) {
        this._settings[key] = value;
        changed[key] = value;
      }
    }
    if (Object.keys(changed).length > 0) {
      StorageUtils.setConfig(changed);
      Logger.debug('批量配置变更', changed);
      eventPipeline.emitSync(EventPipeline.EVENTS.CONFIG_CHANGED, changed);
    }
  }

  /**
   * 重置为默认值
   */
  reset() {
    this._settings = { ...this._defaults };
    StorageUtils.setConfig(this._defaults);
    Logger.info('配置已重置为默认值');
    eventPipeline.emitSync(EventPipeline.EVENTS.CONFIG_CHANGED, this._defaults);
  }

  /**
   * 获取默认值
   */
  getDefaults() {
    return { ...this._defaults };
  }

  /**
   * 跳过模式判断
   */
  isAutoMode() { return this.get('skipMode') === 'auto'; }
  isStealthMode() { return this.get('skipMode') === 'stealth'; }
  isManualMode() { return this.get('skipMode') === 'manual'; }
}

const configManager = new ConfigManager();
export default configManager;
