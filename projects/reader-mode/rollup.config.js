const babel = require('@rollup/plugin-babel').default;
const resolve = require('@rollup/plugin-node-resolve').default;
const commonjs = require('@rollup/plugin-commonjs').default;
const json = require('@rollup/plugin-json').default;

const USCRIPT_HEADER = `// ==UserScript==
// @name         reader-mode
// @namespace    https://github.com/bilbilmyc/Greasy
// @version      0.1.0
// @description  去除 CSDN 广告与登录墙，关闭知乎登录弹窗并展开折叠内容
// @author       bilbilmyc
// @license      MIT
// @match        *://blog.csdn.net/*
// @match        *://*.zhihu.com/*
// @grant        none
// @run-at       document-end
// ==/UserScript==`;

module.exports = {
  input: 'src/main.js',
  output: [
    {
      file: '../../dist/reader-mode.user.js',
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
