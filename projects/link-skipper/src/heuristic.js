/**
 * 启发式检测：识别看起来像中间跳转页的页面，返回目标 URL。
 * 命中优先级：meta refresh > 内联 JS 赋值 > 标题关键词 + 唯一外链 > "继续访问" 按钮。
 *
 * 返回 string 表示检测到目标 URL，返回 null 表示未检测到。
 *
 * 注意：@run-at document-start 调用时，body 可能尚未解析，
 * 标题/h1 关键词 + 外链 + "继续访问" 按钮检测可能漏报（不影响 meta/script 检测）。
 */

const REDIRECT_TITLE_KEYWORDS = [
  '即将跳转',
  '页面跳转',
  '正在跳转',
  '跳转中',
  'redirecting',
];

const CONTINUE_BUTTON_KEYWORDS = [
  '继续访问',
  '继续前往',
  '立即前往',
  '立即访问',
];

export function detectRedirect(doc) {
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
    const m = text.match(
      /(?:window\.)?location(?:\.href)?\s*=\s*['"]([^'"]+)['"]/
    );
    if (m) return cleanUrl(m[1]);
    const m2 = text.match(/location\.replace\s*\(\s*['"]([^'"]+)['"]/);
    if (m2) return cleanUrl(m2[1]);
  }

  // 3. 标题含跳转关键词 + 页面有唯一外链
  if (doc.body) {
    const titleText = (doc.title || '').toLowerCase();
    const bodyText = (doc.body.innerText || '').slice(0, 1000);
    const hasKeyword = REDIRECT_TITLE_KEYWORDS.some(
      k => titleText.includes(k.toLowerCase()) || bodyText.includes(k)
    );
    if (hasKeyword) {
      const extLinks = uniqueExternalLinks(doc);
      if (extLinks.length === 1) return extLinks[0];
    }

    // 4. 页面只有一个 "继续访问" 类按钮/链接
    const continueLinks = Array.from(doc.querySelectorAll('a[href]'))
      .filter(a => {
        const t = (a.textContent || '').trim();
        return CONTINUE_BUTTON_KEYWORDS.some(k => t.includes(k));
      })
      .map(a => a.href);
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
