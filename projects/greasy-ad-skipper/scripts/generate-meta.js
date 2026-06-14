/**
 * Generate Greasy Fork .meta.js file
 * 从 .user.js 中提取 @name, @namespace, @version, @description,
 * @author, @match, @grant, @license, @icon 等元数据头
 */
const fs = require('fs');
const path = require('path');

const USERSCRIPT_PATH = path.resolve(__dirname, '..', 'dist', 'greasy-ad-skipper.user.js');
const META_PATH = path.resolve(__dirname, '..', 'dist', 'greasy-ad-skipper.meta.js');

function extractMetadata(content) {
  const lines = content.split('\n');
  const metaLines = [];
  let inBlock = false;

  for (const line of lines) {
    if (line.trim() === '// ==UserScript==') {
      inBlock = true;
      metaLines.push(line);
      continue;
    }
    if (line.trim() === '// ==/UserScript==') {
      metaLines.push(line);
      break;
    }
    if (inBlock) {
      // 只保留元数据行
      if (line.trimStart().startsWith('// @')) {
        metaLines.push(line);
      }
    }
  }

  return metaLines.join('\n') + '\n';
}

try {
  if (!fs.existsSync(USERSCRIPT_PATH)) {
    console.error('错误: 找不到 dist/greasy-ad-skipper.user.js');
    console.error('请先运行 npm run build');
    process.exit(1);
  }

  const content = fs.readFileSync(USERSCRIPT_PATH, 'utf8');
  const meta = extractMetadata(content);
  fs.writeFileSync(META_PATH, meta);
  console.log(`✅ .meta.js 已生成: ${META_PATH}`);
} catch (e) {
  console.error('生成 .meta.js 失败:', e.message);
  process.exit(1);
}
