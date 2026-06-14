/**
 * Greasy Ad Skipper — 主入口
 *
 * 启动流程：
 * 1. 平台检测 → 判断当前页面是否匹配
 * 2. 初始化规则引擎
 * 3. 初始化配置管理器
 * 4. 初始化反检测引擎
 * 5. 注册并初始化对应平台的适配器
 * 6. 挂载 UI 组件（配置面板 + 悬浮球 + 首次引导）
 * 7. 注册核心事件处理器
 */
import Logger from './utils/Logger.js';
import UrlUtils from './utils/UrlUtils.js';
import StorageUtils from './utils/StorageUtils.js';
import DomUtils from './utils/DomUtils.js';
import ruleEngine from './core/RuleEngine.js';
import configManager from './core/ConfigManager.js';
import antiDetection from './core/AntiDetection.js';
import eventPipeline from './core/EventPipeline.js';

// 适配器
import YouTubeAdapter from './adapters/YouTubeAdapter.js';
import BilibiliAdapter from './adapters/BilibiliAdapter.js';
import TencentAdapter from './adapters/TencentAdapter.js';
import IqiyiAdapter from './adapters/IqiyiAdapter.js';
import YoukuAdapter from './adapters/YoukuAdapter.js';
import MgtvAdapter from './adapters/MgtvAdapter.js';

// UI 组件
import configPanel from './ui/ConfigPanel.js';
import onboardingGuide from './ui/OnboardingGuide.js';
import statusFloatingBall from './ui/StatusFloatingBall.js';

// 内建规则
import builtinRules from '../rules/rules.json';

/** @type {Map<string, import('./adapters/BaseAdapter').default>} */
const activeAdapters = new Map();

/**
 * 启动插件
 */
async function bootstrap() {
  Logger.info('🚀 Greasy Ad Skipper 启动中...');

  // Step 1: 检测当前平台
  const platform = UrlUtils.detectPlatform();
  if (!platform) {
    Logger.debug('当前页面不在支持的平台列表中，跳过');
    return;
  }
  Logger.info(`检测到平台: ${UrlUtils.getPlatformDisplayName(platform)}`);

  // Step 2: 初始化规则引擎
  const REMOTE_RULES_URL = 'https://raw.githubusercontent.com/bilbilmyc/Greasy/main/projects/greasy-ad-skipper/rules/rules.json';
  await ruleEngine.init(builtinRules, REMOTE_RULES_URL);
  const defaultSettings = ruleEngine.getDefaultSettings();

  // Step 3: 初始化配置管理器
  configManager.init(defaultSettings);

  // Step 4: 初始化反检测引擎（全局策略）
  const adConfig = ruleEngine.getAntiDetectionConfig(platform);
  if (adConfig) {
    antiDetection.configure({
      ...adConfig,
      stealthMode: configManager.get('stealthMode')
    });
  }
  antiDetection.apply();

  // Step 5: 注册并初始化适配器
  const adapter = await registerAndInitAdapter(platform);
  if (!adapter) {
    Logger.warn(`[${platform}] 适配器初始化失败`);
    return;
  }

  // Step 6: 挂载 UI 组件
  try {
    configPanel.mount();
    statusFloatingBall.mount();
    if (configManager.get('showStatusBall')) {
      statusFloatingBall.setVisible(true);
    }
  } catch (e) {
    Logger.warn('UI 组件挂载失败（非关键错误）:', e.message);
  }

  // 首次引导（非关键，不抛异常）
  try {
    if (onboardingGuide.shouldShow()) {
      setTimeout(() => onboardingGuide.show(), 1000);
    }
  } catch (e) {
    // 引导失败不影响核心功能
  }

  // Step 7: 注册全局事件处理器
  registerGlobalHandlers(platform);

  // Step 8: 标记就绪
  Logger.info(`✅ Greasy Ad Skipper 就绪 — ${UrlUtils.getPlatformDisplayName(platform)}`);

  // Step 9: 将启动状态保存到 DOM（供调试）
  document.documentElement.dataset.greasySkipperActive = platform;
}

/**
 * 注册并初始化平台适配器
 */
async function registerAndInitAdapter(platform) {
  let adapter = null;

  switch (platform) {
    case 'youtube':
      adapter = new YouTubeAdapter();
      break;
    case 'bilibili':
      adapter = new BilibiliAdapter();
      break;
    case 'tencent':
      adapter = new TencentAdapter();
      break;
    case 'iqiyi':
      adapter = new IqiyiAdapter();
      break;
    case 'youku':
      adapter = new YoukuAdapter();
      break;
    case 'mgtv':
      adapter = new MgtvAdapter();
      break;
    default:
      Logger.warn(`[${platform}] 不支持的平台`);
      return null;
  }

  // 注册到规则引擎
  ruleEngine.registerAdapter(platform, adapter);

  // 注册到事件管道
  eventPipeline.on(EventPipeline.EVENTS.AD_DETECTED, (ad) => {
    Logger.adEvent(platform, 'detected', ad.type);
    StorageUtils.incrementSkipped(); // 统计（后续会被实际跳过事件覆盖）
  });

  eventPipeline.on(EventPipeline.EVENTS.AD_SKIPPED, (ad) => {
    Logger.adEvent(platform, 'skipped', `${ad.type} (conf: ${ad.confidence})`);
    // 更新今日统计
    StorageUtils.incrementSkipped();
    // 更新悬浮球显示
    updateStatusDisplay();
  });

  // 初始化适配器
  try {
    await adapter.init();
    activeAdapters.set(platform, adapter);
    return adapter;
  } catch (e) {
    Logger.error(`[${platform}] 适配器初始化失败:`, e.message);
    return null;
  }
}

/**
 * 注册全局事件处理器
 */
function registerGlobalHandlers(platform) {
  // 配置变更监听（合并到一个 handler）
  eventPipeline.on(EventPipeline.EVENTS.CONFIG_CHANGED, (changes) => {
    Logger.debug('配置已变更', changes);
    if (changes.stealthMode !== undefined) {
      antiDetection.configure({ avoidGlobalFlags: changes.stealthMode });
    }
    if (changes.skipMode !== undefined) {
      Logger.info(`跳过模式切换为: ${changes.skipMode}`);
    }
    if (changes.showStatusBall !== undefined) {
      statusFloatingBall.setVisible(changes.showStatusBall);
    }
  });

  // 检测到平台警告
  eventPipeline.on(EventPipeline.EVENTS.DETECTION_WARNING, (data) => {
    Logger.warn(`[${platform}] 检测警告`, data);
  });
}

/**
 * 更新状态显示
 */
function updateStatusDisplay() {
  statusFloatingBall.updateCount();
}

/**
 * 清理所有适配器资源
 */
function destroyAll() {
  for (const [platform, adapter] of activeAdapters) {
    Logger.info(`清理适配器: ${platform}`);
    adapter.destroy();
  }
  activeAdapters.clear();
  configPanel.destroy();
  statusFloatingBall.destroy();
  onboardingGuide.destroy();
  antiDetection.destroy();
  eventPipeline.clear();
  delete document.documentElement.dataset.greasySkipperActive;
}

// ─── 启动入口 ─────────────────────────────────────────

// 等待页面加载完成（油猴 @run-at document-end）
if (document.readyState === 'complete') {
  bootstrap().catch(e => Logger.error('启动失败:', e.message));
} else {
  window.addEventListener('load', () => {
    bootstrap().catch(e => Logger.error('启动失败:', e.message));
  });
}

// 页面卸载时清理
window.addEventListener('beforeunload', () => {
  destroyAll();
});
