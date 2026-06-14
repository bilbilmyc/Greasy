/**
 * 配置面板 — Shadow DOM 隔离的 UI 组件
 *
 * 提供：
 * - 平台开关（YouTube/B站/腾讯/爱奇艺/优酷）
 * - 跳过策略选择（全自动/隐身/手动）
 * - SponsorBlock 开关
 * - 众包参与开关
 * - 今日统计展示
 *
 * 使用 Shadow DOM 避免与页面样式冲突。
 * 通过 EventPipeline 与核心引擎通信。
 */
import Logger from '../utils/Logger.js';
import DomUtils from '../utils/DomUtils.js';
import configManager from '../core/ConfigManager.js';
import eventPipeline from '../core/EventPipeline.js';
import StorageUtils from '../utils/StorageUtils.js';
import UrlUtils from '../utils/UrlUtils.js';

const CONFIG_STYLES = `
:host {
  all: initial;
  display: block;
  position: fixed;
  top: 60px;
  right: 20px;
  width: 340px;
  max-height: 80vh;
  overflow-y: auto;
  background: #1a1a2e;
  color: #e0e0e0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  z-index: 2147483647;
  padding: 0;
  user-select: none;
  border: 1px solid rgba(255,255,255,0.08);
}

/* 隐藏状态 */
:host(.hidden) {
  display: none !important;
}

/* 头部 */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.03);
}
.header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
}
.header .version {
  font-size: 11px;
  color: #888;
  background: rgba(255,255,255,0.06);
  padding: 2px 8px;
  border-radius: 10px;
}
.header .close-btn {
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  font-size: 18px;
  padding: 4px;
  line-height: 1;
}
.header .close-btn:hover { color: #fff; }

/* 面板内容 */
.body {
  padding: 16px 20px;
}

/* 区域 */
.section {
  margin-bottom: 20px;
}
.section-title {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #888;
  margin-bottom: 10px;
}

/* 开关项 */
.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255,255,255,0.04);
}
.setting-row:last-child { border-bottom: none; }
.setting-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  flex: 1;
}
.setting-label .platform-icon {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}
.setting-label .platform-icon.youtube { background: #ff0000; color: #fff; }
.setting-label .platform-icon.bilibili { background: #00a1d6; color: #fff; }
.setting-label .platform-icon.tencent { background: #006eff; color: #fff; }
.setting-label .platform-icon.iqiyi { background: #06be04; color: #fff; }
.setting-label .platform-icon.youku { background: #0079ff; color: #fff; }
.setting-label .platform-icon.mgtv { background: #ff6600; color: #fff; }

/* 开关 */
.toggle {
  position: relative;
  width: 40px;
  height: 22px;
  flex-shrink: 0;
}
.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}
.toggle .slider {
  position: absolute;
  cursor: pointer;
  top: 0; left: 0; right: 0; bottom: 0;
  background: #333;
  border-radius: 22px;
  transition: 0.3s;
}
.toggle .slider::before {
  content: '';
  position: absolute;
  height: 16px;
  width: 16px;
  left: 3px;
  bottom: 3px;
  background: #fff;
  border-radius: 50%;
  transition: 0.3s;
}
.toggle input:checked + .slider { background: #4caf50; }
.toggle input:checked + .slider::before { transform: translateX(18px); }

/* 选择框 */
.select-mode {
  width: 100%;
  padding: 8px 12px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  color: #e0e0e0;
  font-size: 14px;
  outline: none;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
}
.select-mode:focus { border-color: #4caf50; }
.select-mode option { background: #1a1a2e; color: #e0e0e0; }

/* 统计面板 */
.stats-panel {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 8px;
}
.stat-card {
  background: rgba(255,255,255,0.04);
  border-radius: 8px;
  padding: 12px;
  text-align: center;
}
.stat-card .number {
  font-size: 20px;
  font-weight: 700;
  color: #4caf50;
}
.stat-card .label {
  font-size: 11px;
  color: #888;
  margin-top: 2px;
}

/* 底部操作区 */
.footer {
  padding: 12px 20px;
  border-top: 1px solid rgba(255,255,255,0.08);
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
.footer button {
  padding: 6px 16px;
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 6px;
  background: rgba(255,255,255,0.06);
  color: #ccc;
  cursor: pointer;
  font-size: 12px;
  transition: 0.2s;
}
.footer button:hover {
  background: rgba(255,255,255,0.12);
  color: #fff;
}
.footer button.primary {
  background: #4caf50;
  border-color: #4caf50;
  color: #fff;
}
.footer button.primary:hover {
  background: #43a047;
}

.description {
  font-size: 12px;
  color: #888;
  margin-top: 4px;
}

/* 滚动条 */
:host::-webkit-scrollbar { width: 4px; }
:host::-webkit-scrollbar-track { background: transparent; }
:host::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 2px; }
`;

class ConfigPanel {
  constructor() {
    this._host = null;
    this._shadow = null;
    this._visible = false;
    this._timer = null;
  }

  /**
   * 创建并挂载配置面板
   */
  mount() {
    if (this._host) return;

    this._host = document.createElement('div');
    this._host.id = 'greasy-adjump-config';
    this._shadow = this._host.attachShadow({ mode: 'closed' });

    // 注入样式
    const style = document.createElement('style');
    style.textContent = CONFIG_STYLES;
    this._shadow.appendChild(style);

    // 注入 HTML
    this._shadow.appendChild(this._createPanelHTML());

    document.body.appendChild(this._host);

    // 绑定事件
    this._bindEvents();

    // 初始隐藏
    this.hide();

    Logger.debug('配置面板已挂载');
  }

  /**
   * 显示面板
   */
  show() {
    if (this._host) {
      this._host.classList.remove('hidden');
      this._visible = true;
      this._refreshStats();
    }
  }

  /**
   * 隐藏面板
   */
  hide() {
    if (this._host) {
      this._host.classList.add('hidden');
      this._visible = false;
    }
  }

  /**
   * 切换显示状态
   */
  toggle() {
    if (this._visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * 销毁面板
   */
  destroy() {
    if (this._host && this._host.parentNode) {
      this._host.parentNode.removeChild(this._host);
    }
    this._host = null;
    this._shadow = null;
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  // ─── 私有方法 ─────────────────────────

  _createPanelHTML() {
    const container = document.createElement('div');

    // 从配置读取当前值
    const settings = configManager.getAll();
    const skipMode = settings.skipMode || 'auto';
    const enableSponsorBlock = settings.enableSponsorBlock !== false;
    const enableCrowdSource = settings.enableCrowdSource || false;
    const showStatusBall = settings.showStatusBall !== false;
    const stealthMode = settings.stealthMode !== false;

    container.innerHTML = `
      <div class="header">
        <h3>🎬 广告跳过助手</h3>
        <span class="version">v0.1.0</span>
        <button class="close-btn" data-action="close">✕</button>
      </div>

      <div class="body">
        <!-- 跳过模式 -->
        <div class="section">
          <div class="section-title">跳过模式</div>
          <select class="select-mode" data-setting="skipMode">
            <option value="auto" ${skipMode === 'auto' ? 'selected' : ''}>全自动 — 优先体验</option>
            <option value="stealth" ${skipMode === 'stealth' ? 'selected' : ''}>隐身 — 优先安全</option>
            <option value="manual" ${skipMode === 'manual' ? 'selected' : ''}>仅标记 — 不自动跳过</option>
          </select>
          <div class="description">隐身模式增加反检测延迟，降低被封风险</div>
        </div>

        <!-- 平台管理 -->
        <div class="section">
          <div class="section-title">平台管理</div>
          ${this._renderPlatformToggles()}
        </div>

        <!-- 功能开关 -->
        <div class="section">
          <div class="section-title">功能</div>
          <div class="setting-row">
            <label class="setting-label">
              <span>📦 SponsorBlock 集成</span>
            </label>
            <label class="toggle">
              <input type="checkbox" data-setting="enableSponsorBlock" ${enableSponsorBlock ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </div>
          <div class="setting-row">
            <label class="setting-label">
              <span>🏷️ 参与众包标记</span>
            </label>
            <label class="toggle">
              <input type="checkbox" data-setting="enableCrowdSource" ${enableCrowdSource ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </div>
          <div class="setting-row">
            <label class="setting-label">
              <span>🔵 状态悬浮球</span>
            </label>
            <label class="toggle">
              <input type="checkbox" data-setting="showStatusBall" ${showStatusBall ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </div>
          <div class="setting-row">
            <label class="setting-label">
              <span>🛡️ 隐身模式</span>
            </label>
            <label class="toggle">
              <input type="checkbox" data-setting="stealthMode" ${stealthMode ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </div>
        </div>

        <!-- 今日统计 -->
        <div class="section">
          <div class="section-title">今日统计</div>
          <div class="stats-panel" id="stats-panel">
            <div class="stat-card">
              <div class="number" id="stat-skipped">0</div>
              <div class="label">已跳过</div>
            </div>
            <div class="stat-card">
              <div class="number" id="stat-marked">0</div>
              <div class="label">已标记</div>
            </div>
          </div>
        </div>
      </div>

      <div class="footer">
        <button data-action="reset">重置默认</button>
        <button class="primary" data-action="close">关闭</button>
      </div>
    `;

    return container;
  }

  _renderPlatformToggles() {
    const allPlatforms = UrlUtils.getSupportedPlatforms();
    const platformNames = {
      youtube: 'YouTube', bilibili: 'B站', tencent: '腾讯视频',
      iqiyi: '爱奇艺', youku: '优酷', mgtv: '芒果TV'
    };

    // 目前支持的平台（所有 6 个都已实现适配器）
    const implemented = ['youtube', 'bilibili', 'tencent', 'iqiyi', 'youku', 'mgtv'];

    return allPlatforms.map(p => {
      const name = platformNames[p] || p;
      const icon = name[0];
      const checked = implemented.includes(p) ? 'checked' : '';
      const disabled = !implemented.includes(p) ? 'disabled' : '';
      return `
        <div class="setting-row">
          <label class="setting-label">
            <span class="platform-icon ${p}">${icon}</span>
            <span>${name}</span>
            ${disabled ? '<span style="color:#555;font-size:11px">(未启用)</span>' : ''}
          </label>
          <label class="toggle">
            <input type="checkbox" data-platform="${p}" ${checked} ${disabled}>
            <span class="slider"></span>
          </label>
        </div>
      `;
    }).join('');
  }

  _bindEvents() {
    if (!this._shadow) return;

    // 关闭按钮
    this._shadow.querySelectorAll('[data-action="close"]').forEach(btn => {
      btn.addEventListener('click', () => this.hide());
    });

    // 重置按钮
    this._shadow.querySelector('[data-action="reset"]').addEventListener('click', () => {
      configManager.reset();
      // 刷新界面
      this.destroy();
      this.mount();
      this.show();
    });

    // 设置变更 — 选择框
    this._shadow.querySelector('[data-setting="skipMode"]').addEventListener('change', (e) => {
      configManager.set('skipMode', e.target.value);
    });

    // 设置变更 — 复选框
    this._shadow.querySelectorAll('[data-setting]').forEach(el => {
      if (el.type === 'checkbox') {
        el.addEventListener('change', (e) => {
          const key = e.target.dataset.setting;
          configManager.set(key, e.target.checked);
        });
      }
    });

    // 点击外部关闭
    document.addEventListener('click', (e) => {
      if (this._visible && this._host && !this._host.contains(e.target)) {
        // 检查是否点击了悬浮球（稍后实现）
        const floatingBall = document.getElementById('greasy-status-ball');
        if (floatingBall && floatingBall.contains(e.target)) return;
        this.hide();
      }
    });

    // 监听配置变更，同步 UI
    eventPipeline.on(eventPipeline.constructor.EVENTS.CONFIG_CHANGED, () => {
      this._refreshStats();
    });

    // 定时刷新统计
    this._timer = setInterval(() => this._refreshStats(), 10000);
  }

  _refreshStats() {
    if (!this._shadow || !this._visible) return;

    const stats = StorageUtils.getTodayStats();
    const skippedEl = this._shadow.getElementById('stat-skipped');
    const markedEl = this._shadow.getElementById('stat-marked');

    if (skippedEl) skippedEl.textContent = stats.adsSkipped || 0;
    if (markedEl) markedEl.textContent = stats.adsMarked || 0;
  }
}

const configPanel = new ConfigPanel();
export default configPanel;
