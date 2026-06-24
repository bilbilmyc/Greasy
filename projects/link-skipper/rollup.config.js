const babel = require('@rollup/plugin-babel').default;
const resolve = require('@rollup/plugin-node-resolve').default;
const commonjs = require('@rollup/plugin-commonjs').default;
const json = require('@rollup/plugin-json').default;

const USCRIPT_HEADER = `// ==UserScript==
// @name         link-skipper
// @namespace    https://github.com/bilbilmyc/Greasy
// @version      0.1.0
// @description  跳过微博/贴吧/知乎/掘金/CSDN/淘宝/京东等中间页，直达目标
// @author       bilbilmyc
// @license      MIT
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==`;

module.exports = {
  input: 'src/main.js',
  output: [
    {
      file: '../../dist/link-skipper.user.js',
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
