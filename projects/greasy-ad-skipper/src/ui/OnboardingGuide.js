/**
 * 首次安装引导面板 — 3 步快速配置
 *
 * 新用户安装脚本后第一次打开视频页面时自动弹出。
 * 3 步走完后标记为"已引导"，不再弹出。
 */
import Logger from '../utils/Logger.js';
import StorageUtils from '../utils/StorageUtils.js';
import configManager from '../core/ConfigManager.js';

const ONBOARDING_STYLES = `
:host {
  all: initial;
  display: flex;
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.6);
  z-index: 2147483647;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
}
.modal {
  background: #1a1a2e;
  color: #e0e0e0;
  border-radius: 16px;
  padding: 32px;
  max-width: 460px;
  width: 90%;
  box-shadow: 0 16px 48px rgba(0,0,0,0.5);
  border: 1px solid rgba(255,255,255,0.08);
}
.modal h2 {
  margin: 0 0 8px 0;
  font-size: 20px;
  color: #fff;
}
.modal p {
  margin: 0 0 24px 0;
  color: #aaa;
  font-size: 14px;
  line-height: 1.6;
}
.steps {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
}
.step-dot {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: rgba(255,255,255,0.1);
  transition: 0.3s;
}
.step-dot.active { background: #4caf50; }
.step-dot.done { background: #2e7d32; }

.step-content {
  min-height: 160px;
  margin-bottom: 24px;
}
.step-content h3 {
  font-size: 16px;
  margin: 0 0 12px 0;
  color: #fff;
}
.step-content .option-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.step-content .option-btn {
  padding: 10px 16px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  color: #e0e0e0;
  cursor: pointer;
  text-align: left;
  font-size: 14px;
  transition: 0.2s;
}
.step-content .option-btn:hover {
  background: rgba(255,255,255,0.12);
  border-color: #4caf50;
}
.step-content .option-btn.selected {
  background: rgba(76,175,80,0.15);
  border-color: #4caf50;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.actions button {
  padding: 8px 20px;
  border-radius: 8px;
  border: none;
  font-size: 14px;
  cursor: pointer;
  transition: 0.2s;
}
.actions .skip-btn {
  background: transparent;
  color: #888;
}
.actions .skip-btn:hover { color: #ccc; }
.actions .next-btn {
  background: #4caf50;
  color: #fff;
}
.actions .next-btn:hover { background: #43a047; }
.actions .next-btn:disabled { opacity: 0.4; cursor: default; }
`;

class OnboardingGuide {
  constructor() {
    this._host = null;
    this._shadow = null;
    this._step = 0;
    this._totalSteps = 3;
    this._selections = {};
  }

  /**
   * 检查是否需要显示引导
   */
  shouldShow() {
    return !StorageUtils.get('onboarding_done', false);
  }

  /**
   * 显示引导面板
   */
  show() {
    if (this._host) return;
    if (!this.shouldShow()) return;

    this._step = 0;

    this._host = document.createElement('div');
    this._host.id = 'greasy-onboarding';
    this._shadow = this._host.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = ONBOARDING_STYLES;
    this._shadow.appendChild(style);

    this._render();

    document.body.appendChild(this._host);
    this._bindEvents();

    Logger.debug('首次引导面板已显示');
  }

  /**
   * 销毁引导面板
   */
  destroy() {
    if (this._host && this._host.parentNode) {
      this._host.parentNode.removeChild(this._host);
    }
    this._host = null;
    this._shadow = null;
  }

  // ─── 私有方法 ─────────────────────────

  _render() {
    if (!this._shadow) return;

    const container = document.createElement('div');
    container.className = 'modal';

    const stepsHTML = Array.from({ length: this._totalSteps }, (_, i) =>
      `<div class="step-dot ${i < this._step ? 'done' : ''} ${i === this._step ? 'active' : ''}"></div>`
    ).join('');

    container.innerHTML = `
      <h2>🎬 欢迎使用广告跳过助手</h2>
      <p>3 步完成初始配置，你也可以随时在面板中调整。</p>

      <div class="steps">${stepsHTML}</div>

      <div class="step-content" id="step-content"></div>

      <div class="actions">
        <button class="skip-btn" data-action="skip">跳过引导</button>
        <button class="next-btn" data-action="next" disabled>下一步</button>
      </div>
    `;

    this._shadow.appendChild(container);
    this._renderStep();
  }

  _renderStep() {
    const content = this._shadow.getElementById('step-content');
    if (!content) return;

    switch (this._step) {
      case 0:
        content.innerHTML = `
          <h3>1/3. 选择跳过模式</h3>
          <p>你希望插件如何处理广告？</p>
          <div class="option-list">
            <div class="option-btn" data-choice="auto">
              <strong>⚡ 全自动</strong><br>
              <span style="color:#888;font-size:12px">检测到广告自动跳过，体验优先</span>
            </div>
            <div class="option-btn" data-choice="stealth">
              <strong>🛡️ 隐身模式</strong><br>
              <span style="color:#888;font-size:12px">更安全的跳过方式，降低平台检测风险</span>
            </div>
          </div>
        `;
        break;

      case 1:
        content.innerHTML = `
          <h3>2/3. 启用 SponsorBlock</h3>
          <p>SponsorBlock 是一个社区驱动的广告数据库，可以自动跳过 YouTube 视频中的赞助段落。</p>
          <div class="option-list">
            <div class="option-btn" data-choice="true">
              <strong>✅ 启用</strong><br>
              <span style="color:#888;font-size:12px">自动跳过赞助/自推/互动等段落（推荐）</span>
            </div>
            <div class="option-btn" data-choice="false">
              <strong>❌ 不启用</strong><br>
              <span style="color:#888;font-size:12px">纯本地广告检测，不依赖外部数据</span>
            </div>
          </div>
        `;
        break;

      case 2:
        content.innerHTML = `
          <h3>3/3. 准备好啦！</h3>
          <p>
            ✅ 你已经完成了所有配置。<br><br>
            <strong>接下来：</strong>打开任意 YouTube 或 B站 视频，插件将自动工作。<br>
            你可以随时点击右上角的悬浮球打开配置面板调整设置。
          </p>
          <div class="option-list">
            <div class="option-btn" data-choice="done">
              🚀 开始使用！
            </div>
          </div>
        `;
        break;
    }

    // 更新按钮状态
    this._updateButtons();

    // 绑定选项点击
    content.querySelectorAll('.option-btn').forEach(btn => {
      btn.addEventListener('click', () => this._selectOption(btn));
    });
  }

  _selectOption(btn) {
    // 清除其他选中状态
    const parent = btn.closest('.option-list') || btn.parentElement;
    parent.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');

    // 记录选择
    const choice = btn.dataset.choice;
    this._selections[this._step] = choice;

    // 启用下一步按钮
    const nextBtn = this._shadow.querySelector('[data-action="next"]');
    if (nextBtn) nextBtn.disabled = false;
  }

  _updateButtons() {
    const nextBtn = this._shadow.querySelector('[data-action="next"]');
    if (!nextBtn) return;

    if (this._step >= this._totalSteps - 1) {
      nextBtn.textContent = '🚀 完成';
    } else {
      nextBtn.textContent = '下一步';
    }

    // 如果当前步骤已经有选择，启用按钮
    if (this._selections[this._step]) {
      nextBtn.disabled = false;
    }
  }

  _bindEvents() {
    if (!this._shadow) return;

    // 下一步按钮
    this._shadow.querySelector('[data-action="next"]').addEventListener('click', () => {
      this._step++;

      if (this._step >= this._totalSteps) {
        this._finish();
        return;
      }

      this._render();
    });

    // 跳过引导
    this._shadow.querySelector('[data-action="skip"]').addEventListener('click', () => {
      this._finish();
    });
  }

  _finish() {
    // 保存配置
    if (this._selections[0]) {
      configManager.set('skipMode', this._selections[0]);
    }
    if (this._selections[1] !== undefined) {
      configManager.set('enableSponsorBlock', this._selections[1] === 'true');
    }

    // 标记引导完成
    StorageUtils.set('onboarding_done', true);

    this.destroy();
    Logger.info('首次引导完成', this._selections);
  }
}

const onboardingGuide = new OnboardingGuide();
export default onboardingGuide;
