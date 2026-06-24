// ==UserScript==
// @name         link-skipper
// @namespace    https://github.com/bilbilmyc/Greasy
// @version      0.1.0
// @description  跳过微博/贴吧/知乎/掘金/CSDN/淘宝/京东等中间页，直达目标
// @author       bilbilmyc
// @license      MIT
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==
(function () {
  'use strict';

  /**
   * 硬编码白名单：已知安全的中文站点中间页 host。
   * 命中即瞬时重定向，无 UI。
   */
  const WHITELIST = [
  // 短链
  't.cn',
  // 微博短链
  'url.cn',
  // 腾讯短链
  'dwz.cn',
  // 百度短链
  '3.cn',
  // 京东短链

  // 贴吧
  'jump.bdimg.com',
  // 百度贴吧跳转

  // 内容站外链
  'link.zhihu.com',
  // 知乎外链
  'link.juejin.cn',
  // 掘金外链
  'goto-link.csdn.net',
  // CSDN 外链

  // 电商
  'a.taobao.com',
  // 淘宝客
  's.click.taobao.com',
  // 淘宝广告
  's.click.tmall.com',
  // 天猫广告
  'u.jd.com' // 京东短链
  ];

  /**
   * 启发式检测：识别看起来像中间跳转页的页面，返回目标 URL。
   * 命中优先级：meta refresh > 内联 JS 赋值 > 标题关键词 + 唯一外链 > "继续访问" 按钮。
   *
   * 返回 string 表示检测到目标 URL，返回 null 表示未检测到。
   *
   * 注意：@run-at document-start 调用时，body 可能尚未解析，
   * 标题/h1 关键词 + 外链 + "继续访问" 按钮检测可能漏报（不影响 meta/script 检测）。
   */

  const REDIRECT_TITLE_KEYWORDS = ['即将跳转', '页面跳转', '正在跳转', '跳转中', 'redirecting'];
  const CONTINUE_BUTTON_KEYWORDS = ['继续访问', '继续前往', '立即前往', '立即访问'];
  function detectRedirect(doc) {
    // 1. <meta http-equiv="refresh" content="N;url=...">
    const meta = doc.querySelector('meta[http-equiv="refresh" i]');
    if (meta) {
      const content = meta.getAttribute('content') || '';
      const m = content.match(/url\s*=\s*([^;\s]+)/i);
      if (m) return cleanUrl(m[1]);
    }

    // 2. 内联 JS 中 location 赋值
    const scripts = doc.querySelectorAll('script:not([src])');
    for (const s of scripts) {
      const text = s.textContent || '';
      // window.location = "..." | location.href = "..." | location.replace("...")
      const m = text.match(/(?:window\.)?location(?:\.href)?\s*=\s*['"]([^'"]+)['"]/);
      if (m) return cleanUrl(m[1]);
      const m2 = text.match(/location\.replace\s*\(\s*['"]([^'"]+)['"]/);
      if (m2) return cleanUrl(m2[1]);
    }

    // 3. 标题含跳转关键词 + 页面有唯一外链
    if (doc.body) {
      const titleText = (doc.title || '').toLowerCase();
      const bodyText = (doc.body.innerText || '').slice(0, 1000);
      const hasKeyword = REDIRECT_TITLE_KEYWORDS.some(k => titleText.includes(k.toLowerCase()) || bodyText.includes(k));
      if (hasKeyword) {
        const extLinks = uniqueExternalLinks(doc);
        if (extLinks.length === 1) return extLinks[0];
      }

      // 4. 页面只有一个 "继续访问" 类按钮/链接
      const continueLinks = Array.from(doc.querySelectorAll('a[href]')).filter(a => {
        const t = (a.textContent || '').trim();
        return CONTINUE_BUTTON_KEYWORDS.some(k => t.includes(k));
      }).map(a => a.href);
      const extContinue = uniqueExternalLinksFromList(continueLinks);
      if (extContinue.length === 1) return extContinue[0];
    }
    return null;
  }
  function cleanUrl(raw) {
    return String(raw).trim().replace(/^['"]|['"]$/g, '');
  }
  function uniqueExternalLinks(doc) {
    const links = Array.from(doc.querySelectorAll('a[href^="http"]')).map(a => a.href);
    return uniqueExternalLinksFromList(links);
  }
  function uniqueExternalLinksFromList(list) {
    const seen = new Set();
    const result = [];
    for (const href of list) {
      try {
        const u = new URL(href, location.href);
        if (u.host === location.host) continue;
        if (seen.has(u.href)) continue;
        seen.add(u.href);
        result.push(u.href);
      } catch {}
    }
    return result;
  }

  /**
   * 右上角小条倒计时 banner。秒数到自动跳，用户可点取消。
   */

  const STYLE_ID = 'link-skipper-overlay-style';
  const STYLE = `
#link-skipper-banner {
  position: fixed;
  top: 12px;
  right: 12px;
  z-index: 2147483647;
  background: rgba(20, 20, 20, 0.92);
  color: #fff;
  font: 13px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  padding: 10px 14px;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 380px;
  animation: ls-fade-in 0.2s ease-out;
}
#link-skipper-banner a {
  color: #7ecbff;
  text-decoration: none;
  word-break: break-all;
}
#link-skipper-banner a:hover { text-decoration: underline; }
#link-skipper-banner button {
  background: transparent;
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 4px;
  padding: 3px 10px;
  cursor: pointer;
  font: inherit;
}
#link-skipper-banner button:hover { background: rgba(255, 255, 255, 0.12); }
#link-skipper-banner .ls-cd {
  font-variant-numeric: tabular-nums;
  opacity: 0.85;
}
@keyframes ls-fade-in {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
}
`;
  let timer = null;
  let el = null;
  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = STYLE;
    (document.head || document.documentElement).appendChild(s);
  }
  function showCountdown(targetUrl, seconds) {
    ensureStyle();
    cancel(); // 清理任何已有 banner

    let remaining = seconds;
    let host = targetUrl;
    try {
      host = new URL(targetUrl).host;
    } catch {}
    const node = document.createElement('div');
    node.id = 'link-skipper-banner';
    node.innerHTML = '<span>跳转到 <a href="' + escapeAttr(targetUrl) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(host) + '</a></span>' + '<span class="ls-cd">' + remaining + 's</span>' + '<button type="button">取消</button>';
    (document.body || document.documentElement).appendChild(node);
    el = node;
    node.querySelector('button').addEventListener('click', cancel);
    timer = setInterval(() => {
      remaining -= 1;
      const cd = node.querySelector('.ls-cd');
      if (cd) cd.textContent = remaining + 's';
      if (remaining <= 0) {
        clearInterval(timer);
        timer = null;
        window.location.href = targetUrl;
      }
    }, 1000);
  }
  function cancel() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    if (el) {
      el.remove();
      el = null;
    }
  }
  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function escapeAttr(s) {
    return escapeHtml(s).replace(/'/g, '&#39;');
  }

  /**
   * link-skipper — 油猴用户脚本入口
   *
   * 启动流程：
   * 1. 当前 host 是否在白名单？是 → 找目标 URL，瞬时跳转
   * 2. 否则用启发式识别 → 3 秒倒计时 banner，用户可取消后跳转
   *
   * @run-at document-start：head/meta 已解析，内联 script 文本已可扫描
   * （document-end 时 inline JS 已执行，location.href = ... 已触发跳转，
   *  所以必须 document-start 拦截）
   */

  const log = function () {
    for (var _len = arguments.length, a = new Array(_len), _key = 0; _key < _len; _key++) {
      a[_key] = arguments[_key];
    }
    return console.log('[link-skipper]', ...a);
  };
  const warn = function () {
    for (var _len2 = arguments.length, a = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
      a[_key2] = arguments[_key2];
    }
    return console.warn('[link-skipper]', ...a);
  };

  // ---- 安全检查 ----

  function isSafeTarget(url) {
    try {
      const u = new URL(url, location.href);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
      const host = u.hostname;
      if (!host) return false;
      if (host === 'localhost' || host.endsWith('.localhost')) return false;
      if (host.endsWith('.local') || host.endsWith('.internal')) return false;
      // IPv4 字面量
      if (/^(\d{1,3}\.){3}\d{1,3}$/.test(host)) return false;
      // IPv6 字面量（[::1] / [2001:...]）
      if (host.startsWith('[')) return false;
      // 要求至少一个点（避免裸 hostname）
      if (!host.includes('.')) return false;
      return true;
    } catch {
      return false;
    }
  }
  function isExternalTarget(url) {
    try {
      const u = new URL(url, location.href);
      return u.host !== location.host;
    } catch {
      return false;
    }
  }
  function inWhitelist(host) {
    const h = host.toLowerCase();
    return WHITELIST.some(w => h === w || h.endsWith('.' + w));
  }

  // ---- 路由 ----

  let handled = false;
  function trySkip() {
    if (handled) return;
    handled = true;
    const host = location.hostname.toLowerCase();
    const isWL = inWhitelist(host);
    const target = detectRedirect(document);
    if (!target) {
      if (isWL) log('whitelisted host but no redirect target found, staying');
      return;
    }
    if (!isExternalTarget(target)) {
      log('target is same-host, ignoring:', target);
      return;
    }
    if (!isSafeTarget(target)) {
      warn('unsafe target, ignoring:', target);
      return;
    }
    if (isWL) {
      log('whitelist instant redirect:', target);
      window.location.replace(target);
    } else {
      log('heuristic countdown:', target);
      showCountdown(target, 3);
    }
  }

  // document-start 时 head 已解析、script 标签已识别。
  // body 可能还未解析，所以检测在两个时机跑一次。
  if (document.readyState === 'loading') {
    trySkip();
    document.addEventListener('DOMContentLoaded', trySkip, {
      once: true
    });
  } else {
    trySkip();
  }

})();
