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

import { WHITELIST } from './sites.js';
import { detectRedirect } from './heuristic.js';
import { showCountdown } from './overlay.js';

const log = (...a) => console.log('[link-skipper]', ...a);
const warn = (...a) => console.warn('[link-skipper]', ...a);

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
  document.addEventListener('DOMContentLoaded', trySkip, { once: true });
} else {
  trySkip();
}
