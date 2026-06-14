const babel = require('@rollup/plugin-babel').default;
const resolve = require('@rollup/plugin-node-resolve').default;
const commonjs = require('@rollup/plugin-commonjs').default;
const json = require('@rollup/plugin-json').default;

const USCRIPT_HEADER = `// ==UserScript==
// @name         视频广告跳过助手
// @namespace    https://github.com/bilbilmyc/Greasy
// @version      0.1.0
// @description  一键跳过 YouTube / B站 / 腾讯视频 / 爱奇艺 / 优酷 / 芒果TV 的视频广告，智能规避检测
// @author       bilbilmyc
// @license      MIT
// @match        *://*.youtube.com/*
// @match        *://*.bilibili.com/*
// @match        *://*.v.qq.com/*
// @match        *://*.iqiyi.com/*
// @match        *://*.youku.com/*
// @match        *://*.mgtv.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_notification
// @grant        unsafeWindow
// @run-at       document-end
// @downloadURL  https://raw.githubusercontent.com/bilbilmyc/Greasy/main/projects/greasy-ad-skipper/dist/greasy-ad-skipper.user.js
// @updateURL    https://raw.githubusercontent.com/bilbilmyc/Greasy/main/projects/greasy-ad-skipper/dist/greasy-ad-skipper.meta.js
// @supportURL   https://github.com/bilbilmyc/Greasy/issues
// ==/UserScript==

/*!
 * Greasy Ad Skipper v0.1.0
 * https://github.com/bilbilmyc/Greasy
 * MIT License
 */`;

module.exports = {
  input: 'src/main.js',
  output: [
    {
      file: 'dist/greasy-ad-skipper.user.js',
      format: 'iife',
      banner: USCRIPT_HEADER,
      strict: true,
    }
  ],
  plugins: [
    json({
      compact: true,
      preferConst: true,
    }),
    resolve({
      browser: true,
    }),
    commonjs(),
    babel({
      babelHelpers: 'bundled',
      exclude: 'node_modules/**',
    }),
  ],
  // 油猴脚本不需要 external，所有代码打包进一个文件
};
