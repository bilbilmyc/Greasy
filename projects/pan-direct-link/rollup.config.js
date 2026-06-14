const babel = require('@rollup/plugin-babel').default;
const resolve = require('@rollup/plugin-node-resolve').default;
const commonjs = require('@rollup/plugin-commonjs').default;
const json = require('@rollup/plugin-json').default;

const USCRIPT_HEADER = `// ==UserScript==
// @name         网盘直链下载助手
// @namespace    https://github.com/bilbilmyc/Greasy
// @version      0.1.0
// @description  百度网盘 / 夸克网盘 网页端直接下载，无需客户端
// @author       bilbilmyc
// @license      MIT
// @match        *://pan.baidu.com/*
// @match        *://pan.quark.cn/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @grant        GM_notification
// @grant        unsafeWindow
// @run-at       document-idle
// ==/UserScript==`;

module.exports = {
  input: 'src/main.js',
  output: [
    {
      file: 'dist/pan-direct-link.user.js',
      format: 'iife',
      banner: USCRIPT_HEADER,
      strict: true,
    }
  ],
  plugins: [
    json({ compact: true }),
    resolve({ browser: true }),
    commonjs(),
    babel({
      babelHelpers: 'bundled',
      exclude: 'node_modules/**',
    }),
  ],
};
