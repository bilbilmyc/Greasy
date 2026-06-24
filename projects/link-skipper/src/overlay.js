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

export function showCountdown(targetUrl, seconds) {
  ensureStyle();
  cancel(); // 清理任何已有 banner

  let remaining = seconds;
  let host = targetUrl;
  try { host = new URL(targetUrl).host; } catch {}

  const node = document.createElement('div');
  node.id = 'link-skipper-banner';
  node.innerHTML =
    '<span>跳转到 <a href="' + escapeAttr(targetUrl) + '" target="_blank" rel="noopener noreferrer">' +
    escapeHtml(host) +
    '</a></span>' +
    '<span class="ls-cd">' + remaining + 's</span>' +
    '<button type="button">取消</button>';
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

export function cancel() {
  if (timer) { clearInterval(timer); timer = null; }
  if (el) { el.remove(); el = null; }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/'/g, '&#39;');
}
