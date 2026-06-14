/**
 * 状态悬浮球 — 视频右上角轻量显示
 *
 * 功能：
 * - 显示今日已跳过广告数
 * - 点击打开/关闭配置面板
 * - 长按显示快捷菜单（暂停/恢复）
 */
import Logger from '../utils/Logger.js';
import StorageUtils from '../utils/StorageUtils.js';
import configManager from '../core/ConfigManager.js';
import configPanel from './ConfigPanel.js';

const FLOATING_BALL_STYLES = `
:host {
  all: initial;
  display: block;
  position: fixed;
  z-index: 2147483646;
  cursor: pointer;
  user-select: none;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  transition: opacity 0.3s;
}
:host(.hidden) {
  display: none !important;
}

.ball {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(26, 26, 46, 0.85);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 20px;
  color: #e0e0e0;
  font-size: 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.3);
  transition: all 0.2s;
}
.ball:hover {
  background: rgba(26, 26, 46, 0.95);
  transform: scale(1.05);
}

.icon {
  font-size: 14px;
}
.count {
  font-weight: 600;
  color: #4caf50;
  min-width: 16px;
  text-align: center;
}
.label {
  color: #888;
  font-size: 11px;
}

/* 拖拽手柄 */
.ball {
  cursor: grab;
}
.ball:active {
  cursor: grabbing;
}
`;

class StatusFloatingBall {
  constructor() {
    this._host = null;
    this._shadow = null;
    this._isDragging = false;
    this._startX = 0;
    this._startY = 0;
    this._offsetX = 0;
    this._offsetY = 0;
  }

  /**
   * 挂载悬浮球
   */
  mount() {
    if (this._host) return;

    this._loadPosition();

    this._host = document.createElement('div');
    this._host.id = 'greasy-status-ball';
    this._shadow = this._host.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = FLOATING_BALL_STYLES;
    this._shadow.appendChild(style);

    this._shadow.innerHTML += `
      <div class="ball">
        <span class="icon">🎬</span>
        <span class="count" id="skip-count">0</span>
        <span class="label">跳过</span>
      </div>
    `;

    // 设置初始位置
    this._host.style.top = this._offsetY + 'px';
    this._host.style.right = this._offsetX + 'px';

    document.body.appendChild(this._host);
    this._bindEvents();

    Logger.debug('状态悬浮球已挂载');
  }

  /**
   * 更新跳过计数
   */
  updateCount() {
    if (!this._shadow) return;
    const countEl = this._shadow.getElementById('skip-count');
    if (countEl) {
      const stats = StorageUtils.getTodayStats();
      countEl.textContent = stats.adsSkipped || '0';
    }
  }

  /**
   * 显示/隐藏
   */
  setVisible(visible) {
    if (this._host) {
      this._host.classList.toggle('hidden', !visible);
    }
  }

  /**
   * 销毁
   */
  destroy() {
    if (this._host && this._host.parentNode) {
      this._host.parentNode.removeChild(this._host);
    }
    this._host = null;
    this._shadow = null;
  }

  // ─── 私有方法 ─────────────────────────

  _bindEvents() {
    if (!this._shadow) return;

    const ball = this._shadow.querySelector('.ball');

    // 点击：打开配置面板
    ball.addEventListener('click', (e) => {
      if (this._isDragging) return;
      configPanel.toggle();
    });

    // 拖拽功能
    ball.addEventListener('mousedown', (e) => this._startDrag(e));
    document.addEventListener('mousemove', (e) => this._onDrag(e));
    document.addEventListener('mouseup', () => this._endDrag());

    // 触屏支持
    ball.addEventListener('touchstart', (e) => this._startDrag(e), { passive: true });
    document.addEventListener('touchmove', (e) => this._onDrag(e), { passive: true });
    document.addEventListener('touchend', () => this._endDrag());
  }

  _startDrag(e) {
    this._isDragging = false;
    const pos = e.touches ? e.touches[0] : e;
    this._startX = pos.clientX;
    this._startY = pos.clientY;

    // 记录开始时的位置
    this._dragStartOffsetX = this._offsetX;
    this._dragStartOffsetY = this._offsetY;
  }

  _onDrag(e) {
    if (!this._host) return;
    const pos = e.touches ? e.touches[0] : e;
    const dx = pos.clientX - this._startX;
    const dy = pos.clientY - this._startY;

    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      this._isDragging = true;
    }

    if (this._isDragging) {
      const newY = this._dragStartOffsetY + dy;
      const newXFromRight = this._dragStartOffsetX - dx;

      this._host.style.top = Math.max(0, newY) + 'px';
      this._host.style.right = Math.max(0, newXFromRight) + 'px';
    }
  }

  _endDrag() {
    if (this._isDragging && this._host) {
      // 保存新位置
      this._offsetY = parseInt(this._host.style.top) || 60;
      this._offsetX = parseInt(this._host.style.right) || 20;
      this._savePosition();
    }
    this._isDragging = false;
  }

  _loadPosition() {
    this._offsetX = StorageUtils.get('ball_position_x', 20);
    this._offsetY = StorageUtils.get('ball_position_y', 60);
  }

  _savePosition() {
    StorageUtils.set('ball_position_x', this._offsetX);
    StorageUtils.set('ball_position_y', this._offsetY);
  }
}

const statusFloatingBall = new StatusFloatingBall();
export default statusFloatingBall;
