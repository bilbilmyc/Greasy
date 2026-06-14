/**
 * DOM 操作工具集
 * 封装底层的 DOM 查询/操作，方便统一管理和替换
 */

const DomUtils = {
  /**
   * 安全地查询单个元素（支持 Shadow DOM 穿透）
   */
  querySelector(selector, root = document) {
    try {
      // 检查是否在 Shadow DOM 内
      if (root instanceof ShadowRoot || root.shadowRoot) {
        const shadow = root.shadowRoot || root;
        return shadow.querySelector(selector);
      }
      return root.querySelector(selector);
    } catch (e) {
      return null;
    }
  },

  /**
   * 安全地查询多个元素
   */
  querySelectorAll(selector, root = document) {
    try {
      if (root instanceof ShadowRoot || root.shadowRoot) {
        const shadow = root.shadowRoot || root;
        return Array.from(shadow.querySelectorAll(selector));
      }
      return Array.from(root.querySelectorAll(selector));
    } catch (e) {
      return [];
    }
  },

  /**
   * 按选择器列表依次查询，返回第一个匹配的元素
   */
  querySelectorAny(selectors, root = document) {
    for (const selector of selectors) {
      const el = this.querySelector(selector, root);
      if (el) return el;
    }
    return null;
  },

  /**
   * 查找包含指定文本的元素（支持模糊匹配）
   */
  findElementByText(parent, text, tag = '*') {
    const elements = parent.querySelectorAll(tag);
    for (const el of elements) {
      if (el.textContent && el.textContent.includes(text)) {
        return el;
      }
    }
    return null;
  },

  /**
   * 创建 Shadow DOM 隔离容器
   */
  createShadowHost(id) {
    let host = document.getElementById(id);
    if (!host) {
      host = document.createElement('div');
      host.id = id;
      host.style.cssText = 'all: initial; position: fixed; z-index: 999999;';
      document.body.appendChild(host);
    }
    if (!host.shadowRoot) {
      host.attachShadow({ mode: 'closed' });
    }
    return host;
  },

  /**
   * 模拟真实鼠标移动到目标元素
   */
  simulateMouseMove(element) {
    if (!element) return;
    try {
      const rect = element.getBoundingClientRect();
      const x = rect.left + rect.width / 2 + (Math.random() - 0.5) * 10;
      const y = rect.top + rect.height / 2 + (Math.random() - 0.5) * 10;

      // 分步移动（更接近真实用户）
      const steps = 3 + Math.floor(Math.random() * 3);
      for (let i = 1; i <= steps; i++) {
        const progress = i / steps;
        const cx = rect.left + rect.width * progress + (Math.random() - 0.5) * 20;
        const cy = rect.top + rect.height * 0.5 + (Math.random() - 0.5) * 20;
        element.dispatchEvent(new MouseEvent('mousemove', {
          clientX: cx, clientY: cy, bubbles: true, cancelable: true
        }));
      }

      element.dispatchEvent(new MouseEvent('mouseover', {
        clientX: x, clientY: y, bubbles: true, cancelable: true
      }));
    } catch (e) {
      // 静默失败，不影响核心功能
    }
  },

  /**
   * 安全地点击元素
   */
  safeClick(element) {
    if (!element) return false;
    try {
      element.click();
      return true;
    } catch (e) {
      try {
        element.dispatchEvent(new MouseEvent('click', {
          bubbles: true, cancelable: true
        }));
        return true;
      } catch (e2) {
        return false;
      }
    }
  },

  /**
   * 移除 DOM 元素（安全）
   */
  safeRemove(element) {
    if (!element || !element.parentNode) return false;
    try {
      element.style.display = 'none';
      // 延迟移除，给浏览器时间处理
      setTimeout(() => {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
      }, 100);
      return true;
    } catch (e) {
      return false;
    }
  },

  /**
   * 等待元素出现在 DOM 中
   */
  waitForElement(selector, timeout = 10000, root = document) {
    return new Promise((resolve) => {
      if (root.querySelector(selector)) {
        return resolve(root.querySelector(selector));
      }
      const observer = new MutationObserver(() => {
        const el = root.querySelector(selector);
        if (el) {
          observer.disconnect();
          resolve(el);
        }
      });
      observer.observe(root.body || root, {
        childList: true, subtree: true
      });
      setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeout);
    });
  }
};

export default DomUtils;
