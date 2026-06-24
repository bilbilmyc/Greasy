// ==UserScript==
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
// ==/UserScript==
(function () {
  'use strict';

  /**
   * reader-mode — 油猴用户脚本
   *
   * 范围（v0.1）：
   * - CSDN：去除登录墙 + 移除主要广告
   * - 知乎：关闭登录弹窗 + 展开折叠内容
   *
   * 设计原则：
   * - 纯客户端 DOM 操作，不做服务端鉴权绕过
   * - MutationObserver 监听动态注入的广告/弹窗
   * - 失败时 console.warn，不抛错破坏页面
   */
  (function () {

    const log = function () {
      for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }
      return console.log('[reader-mode]', ...args);
    };
    const warn = function () {
      for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        args[_key2] = arguments[_key2];
      }
      return console.warn('[reader-mode]', ...args);
    };

    // ============ 通用工具 ============
    // 观察 DOM 变化并自动应用移除/展开函数
    function watchAndApply(apply) {
      apply();
      const obs = new MutationObserver(() => {
        try {
          apply();
        } catch (e) {
          warn('apply error:', e);
        }
      });
      obs.observe(document.body, {
        childList: true,
        subtree: true
      });
    }

    // ============ CSDN ============
    function applyCsdn() {
      // 1. 登录/阅读全文遮罩：直接干掉，并强制展开被限制高度的内容
      const removeLoginWall = () => {
        const walls = document.querySelectorAll('.hide-article-box, .readmore_box, #passportbox, .login-mark');
        walls.forEach(el => {
          el.remove();
        });

        // 解除"展开阅读全文"对正文的 height/overflow 限制
        const content = document.querySelector('#article_content, .blog-content-box, .markdown_views, #content_views');
        if (content) {
          content.style.height = 'auto';
          content.style.maxHeight = 'none';
          content.style.overflow = 'visible';
        }
      };

      // 2. 侧边栏广告位 + 文中插入广告
      const removeAds = () => {
        const ads = document.querySelectorAll(['.recommend-box', '.recommend-ad-box', '.insert-post', '.pulllog-box', '.recommend-item', '#asideHotArticle', '.aside-box .recommend'].join(','));
        ads.forEach(el => {
          el.remove();
        });
      };
      watchAndApply(removeLoginWall);
      watchAndApply(removeAds);
    }

    // ============ 知乎 ============
    function applyZhihu() {
      // 1. 关闭登录弹窗：找到 .Modal-wrapper，找关闭按钮点一下；找不到直接移除
      const closeLoginModal = () => {
        const modals = document.querySelectorAll('.Modal-wrapper, .signFlowModal, .Modal--default, .LoginModal');
        modals.forEach(modal => {
          const closeBtn = modal.querySelector('.Modal-closeButton, button[aria-label="关闭"], button[aria-label="Close"]');
          if (closeBtn) {
            closeBtn.click();
          } else {
            modal.remove();
          }
        });
      };

      // 2. 展开折叠的答案/文章
      const expandCollapsed = () => {
        // 折叠的 RichText 容器
        const collapsed = document.querySelectorAll('.RichText.ztext.is-collapsed, .RichText--collapsed');
        collapsed.forEach(el => {
          el.classList.remove('is-collapsed', 'RichText--collapsed');
          el.style.maxHeight = 'none';
          el.style.overflow = 'visible';
        });

        // "展开全部" / "查看剩余 N 条" 按钮
        const expandBtns = document.querySelectorAll('button.AnswerItem-expandButton, .ContentItem-more, [class*="Button"][class*="expand"]');
        expandBtns.forEach(btn => {
          try {
            btn.click();
          } catch (e) {}
        });
      };
      watchAndApply(closeLoginModal);
      watchAndApply(expandCollapsed);
    }

    // ============ 路由 ============
    const host = location.hostname;
    if (host.endsWith('csdn.net')) {
      log('CSDN handler');
      applyCsdn();
    } else if (host.endsWith('zhihu.com')) {
      log('Zhihu handler');
      applyZhihu();
    } else {
      log('no handler for', host);
    }
  })();

})();
