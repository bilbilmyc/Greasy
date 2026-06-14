const babel = require('@rollup/plugin-babel').default;
const resolve = require('@rollup/plugin-node-resolve').default;
const commonjs = require('@rollup/plugin-commonjs').default;
const json = require('@rollup/plugin-json').default;

const USCRIPT_HEADER = `// ==UserScript==
// @name         你的脚本名称
// @namespace    https://github.com/yourname/your-script
// @version      0.1.0
// @description  脚本描述
// @author       YourName
// @license      MIT
// @match        *://*.example.com/*
// @grant        none
// @run-at       document-end
// ==/UserScript==`;

module.exports = {
  input: 'src/main.js',
  output: [
    {
      file: 'dist/script.user.js',
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
