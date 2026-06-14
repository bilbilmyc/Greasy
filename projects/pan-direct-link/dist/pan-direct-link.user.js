// ==UserScript==
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
// ==/UserScript==
(function () {
  'use strict';

  /**
   * 网盘直链下载助手
   *
   * 通用框架：百度网盘 / 夸克网盘 网页端直接下载
   *
   * 架构说明：
   * - PlatformDetector: 平台检测
   * - UIInjector: 在页面注入"获取直链"按钮
   * - NetworkInterceptor: 拦截 XHR/fetch，捕获下载链接
   * - LinkExtractor: 从 API 响应中提取真实下载地址
   * - LinkPresenter: 展示直链给用户（复制/新标签页）
   */
  (function () {

    const NAME = '网盘直链下载助手';
    const log = function () {
      for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }
      return console.log(`[${NAME}]`, ...args);
    };
    const warn = function () {
      for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        args[_key2] = arguments[_key2];
      }
      return console.warn(`[${NAME}]`, ...args);
    };
    const error = function () {
      for (var _len3 = arguments.length, args = new Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
        args[_key3] = arguments[_key3];
      }
      return console.error(`[${NAME}]`, ...args);
    };

    // ═══════════════════════════════════════════════════
    //  1. 平台检测
    // ═══════════════════════════════════════════════════
    const PlatformDetector = {
      detect() {
        const host = location.hostname;
        const path = location.pathname;
        if (host.includes('pan.baidu.com')) {
          return {
            name: 'baidu',
            display: '百度网盘',
            isFileList: path.includes('/disk/') || path === '/home' || path.startsWith('/s/')
          };
        }
        if (host.includes('pan.quark.cn')) {
          return {
            name: 'quark',
            display: '夸克网盘',
            isFileList: path === '/' || path.includes('/list/')
          };
        }
        return null;
      },
      isFileList() {
        const p = this.detect();
        return p && p.isFileList;
      }
    };

    // ═══════════════════════════════════════════════════
    //  2. 网络请求拦截器
    // ═══════════════════════════════════════════════════
    const NetworkInterceptor = {
      _originalFetch: null,
      _originalXHROpen: null,
      _hooks: [],
      // { urlPattern: regex/string, onResponse: fn }
      _active: false,
      /**
       * 注册响应拦截钩子
       * @param {RegExp|string} urlPattern - 匹配的 URL 模式
       * @param {Function} onResponse - (responseBody, url) => void
       */
      addHook(urlPattern, onResponse) {
        this._hooks.push({
          urlPattern,
          onResponse
        });
      },
      /**
       * 启动拦截（包装 fetch 和 XMLHttpRequest）
       */
      start() {
        if (this._active) return;
        this._active = true;

        // 拦截 fetch
        this._originalFetch = window.fetch;
        const self = this;
        window.fetch = function (input, init) {
          const url = typeof input === 'string' ? input : input.url || '';
          return self._originalFetch.apply(this, arguments).then(async response => {
            // 克隆响应才能读取 body
            const cloned = response.clone();
            try {
              const text = await cloned.text();
              // 通知匹配的钩子
              self._notifyHooks(url, text);
            } catch (e) {
              // 忽略解析错误
            }
            return response;
          });
        };

        // 拦截 XMLHttpRequest
        this._originalXHROpen = XMLHttpRequest.prototype.open;
        const origOpen = XMLHttpRequest.prototype.open;
        const origSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.open = function (method, url) {
          this._interceptUrl = typeof url === 'string' ? url : '';
          return origOpen.apply(this, arguments);
        };
        XMLHttpRequest.prototype.send = function (body) {
          const url = this._interceptUrl || '';
          this.addEventListener('loadend', function () {
            if (this.readyState === 4 && this.status >= 200 && this.status < 300) {
              try {
                const text = this.responseText || '';
                if (text.length > 0 && text.length < 1024 * 1024) {
                  // 限制 1MB
                  self._notifyHooks(url, text);
                }
              } catch (e) {/* 忽略 */}
            }
          });
          return origSend.apply(this, arguments);
        };
        log('网络拦截器已启动');
      },
      /**
       * 停止拦截并还原原生函数
       */
      stop() {
        if (this._originalFetch) {
          window.fetch = this._originalFetch;
          this._originalFetch = null;
        }
        if (this._originalXHROpen) {
          XMLHttpRequest.prototype.open = this._originalXHROpen;
          this._originalXHROpen = null;
        }
        this._active = false;
      },
      _notifyHooks(url, body) {
        for (const hook of this._hooks) {
          try {
            const matches = hook.urlPattern instanceof RegExp ? hook.urlPattern.test(url) : url.includes(hook.urlPattern);
            if (matches) {
              hook.onResponse(body, url);
            }
          } catch (e) {
            // 钩子异常不中断
          }
        }
      }
    };

    // ═══════════════════════════════════════════════════
    //  3. 直链提取器（平台特定逻辑）
    // ═══════════════════════════════════════════════════
    const LinkExtractor = {
      // 百度网盘：从 API 响应中提取下载 URL
      // 常见 API: /api/download, /rest/2.0/services/cloud_dl
      _parseBaiduLink(responseText, requestUrl) {
        try {
          var _data$data, _data$data2, _data$data3;
          const data = JSON.parse(responseText);
          // 百度网盘下载 API 返回格式通常为:
          // { errno: 0, data: { dlink: "https://..." } }
          // 或 { errno: 0, dlink: "https://..." }
          let dlink = (data == null || (_data$data = data.data) == null ? void 0 : _data$data.dlink) || (data == null ? void 0 : data.dlink) || null;

          // 有些接口需要追加 sign/timestamp
          if (dlink && data != null && (_data$data2 = data.data) != null && _data$data2.sign) {
            dlink += `&sign=${data.data.sign}`;
          }
          if (dlink && data != null && (_data$data3 = data.data) != null && _data$data3.timestamp) {
            dlink += `×tamp=${data.data.timestamp}`;
          }
          return dlink ? {
            url: dlink,
            extra: data
          } : null;
        } catch (e) {
          return null;
        }
      },
      // 夸克网盘
      _parseQuarkLink(responseText, requestUrl) {
        try {
          var _data$data4, _data$data5, _data$data6;
          const data = JSON.parse(responseText);
          // 夸克 API 返回格式通常为:
          // { code: 0, data: { download_url: "https://..." } }
          // 或 { status: 200, data: { url: "..." } }
          let dlink = (data == null || (_data$data4 = data.data) == null ? void 0 : _data$data4.download_url) || (data == null || (_data$data5 = data.data) == null ? void 0 : _data$data5.url) || (data == null || (_data$data6 = data.data) == null ? void 0 : _data$data6.downloadUrl) || null;
          return dlink ? {
            url: dlink,
            extra: data
          } : null;
        } catch (e) {
          return null;
        }
      },
      /**
       * 尝试从响应中提取直链
       * @param {string} platform - 'baidu' | 'quark'
       * @param {string} responseText - API 响应文本
       * @param {string} requestUrl - 请求 URL
       * @returns {{ url: string, extra: object } | null}
       */
      extract(platform, responseText, requestUrl) {
        switch (platform) {
          case 'baidu':
            return this._parseBaiduLink(responseText, requestUrl);
          case 'quark':
            return this._parseQuarkLink(responseText, requestUrl);
          default:
            return null;
        }
      }
    };

    // ═══════════════════════════════════════════════════
    //  4. 直链展示器（UI）
    // ═══════════════════════════════════════════════════
    const LinkPresenter = {
      /**
       * 展示下载链接（弹窗形式）
       */
      showLink(url, filename) {
        // 创建浮层
        const overlay = document.createElement('div');
        overlay.id = 'pan-direct-link-overlay';
        overlay.innerHTML = `
        <div style="
          position:fixed; top:0; left:0; right:0; bottom:0;
          background:rgba(0,0,0,0.5); z-index:9999999;
          display:flex; align-items:center; justify-content:center;
          font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
        ">
          <div style="
            background:#fff; color:#333; border-radius:12px;
            padding:24px 32px; max-width:90%; width:600px;
            box-shadow:0 8px 32px rgba(0,0,0,0.3);
          ">
            <h3 style="margin:0 0 8px 0; font-size:16px; color:#222;">
              📥 下载链接已获取
            </h3>
            <p style="margin:0 0 12px 0; font-size:13px; color:#666;">
              ${filename ? `文件: ${escapeHtml(filename)}` : '点击下方按钮下载'}
            </p>
            <textarea id="pan-direct-link-url" readonly style="
              width:100%; height:60px; padding:10px 12px;
              border:1px solid #ddd; border-radius:8px;
              font-size:13px; color:#333; background:#f5f5f5;
              box-sizing:border-box; resize:none;
              word-break:break-all;
            ">${escapeHtml(url)}</textarea>
            <div style="margin-top:12px; display:flex; gap:8px; justify-content:flex-end;">
              <button id="pan-direct-link-copy" style="
                padding:8px 20px; border:none; border-radius:8px;
                background:#1a73e8; color:#fff; font-size:14px;
                cursor:pointer;
              ">复制链接</button>
              <button id="pan-direct-link-open" style="
                padding:8px 20px; border:none; border-radius:8px;
                background:#34a853; color:#fff; font-size:14px;
                cursor:pointer;
              ">新标签页打开</button>
              <button id="pan-direct-link-close" style="
                padding:8px 20px; border:1px solid #ddd; border-radius:8px;
                background:#fff; color:#666; font-size:14px;
                cursor:pointer;
              ">关闭</button>
            </div>
          </div>
        </div>
      `;
        document.body.appendChild(overlay);

        // 事件绑定
        document.getElementById('pan-direct-link-copy').onclick = () => {
          const textarea = document.getElementById('pan-direct-link-url');
          textarea.select();
          if (typeof GM_setClipboard === 'function') {
            GM_setClipboard(url);
          } else {
            navigator.clipboard.writeText(url);
          }
          const btn = document.getElementById('pan-direct-link-copy');
          btn.textContent = '✅ 已复制';
          setTimeout(() => {
            btn.textContent = '复制链接';
          }, 2000);
        };
        document.getElementById('pan-direct-link-open').onclick = () => {
          window.open(url, '_blank');
        };
        document.getElementById('pan-direct-link-close').onclick = () => {
          document.body.removeChild(overlay);
        };
        overlay.addEventListener('click', e => {
          if (e.target === overlay) document.body.removeChild(overlay);
        });
      },
      /**
       * 在文件列表行注入下载按钮
       */
      addDownloadButton(rowElement, onClick) {
        // 防止重复注入
        if (rowElement.querySelector('.pan-direct-link-btn')) return;
        const btn = document.createElement('span');
        btn.className = 'pan-direct-link-btn';
        btn.textContent = '🔗 直链';
        btn.style.cssText = `
        cursor:pointer; color:#1a73e8; font-size:12px;
        margin-left:8px; padding:2px 6px; border-radius:4px;
        border:1px solid #1a73e8; background:rgba(26,115,232,0.05);
        white-space:nowrap;
      `;
        btn.onmouseenter = () => {
          btn.style.background = 'rgba(26,115,232,0.12)';
        };
        btn.onmouseleave = () => {
          btn.style.background = 'rgba(26,115,232,0.05)';
        };
        btn.onclick = e => {
          e.stopPropagation();
          e.preventDefault();
          btn.textContent = '⏳ 获取中...';
          btn.style.pointerEvents = 'none';
          onClick(btn);
        };
        rowElement.appendChild(btn);
      }
    };

    // HTML 转义工具
    function escapeHtml(str) {
      if (!str) return '';
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // ═══════════════════════════════════════════════════
    //  5. 文件列表观察器（通用 DOM 注入）
    // ═══════════════════════════════════════════════════
    const FileListWatcher = {
      _observer: null,
      _platform: null,
      _processed: new WeakSet(),
      /**
       * 开始监听文件列表
       * @param {string} platform - 'baidu' | 'quark'
       * @param {string|function} rowSelector - CSS 选择器或返回选择器的函数
       * @param {function} getFileName - (rowElement) => string
       * @param {function} getFileId - (rowElement) => string|number
       */
      start(platform, rowSelector, getFileName, getFileId) {
        this._platform = platform;
        const resolveSelector = () => typeof rowSelector === 'function' ? rowSelector() : rowSelector;

        // 立即扫描一次已有的行
        this._scanRows(resolveSelector(), getFileName, getFileId);

        // 持续监听新增的行
        this._observer = new MutationObserver(() => {
          this._scanRows(resolveSelector(), getFileName, getFileId);
        });
        this._observer.observe(document.body, {
          childList: true,
          subtree: true
        });
        log(`文件列表监视已启动: ${resolveSelector()}`);
      },
      _scanRows(rowSelector, getFileName, getFileId) {
        const rows = document.querySelectorAll(rowSelector);
        for (const row of rows) {
          if (this._processed.has(row)) continue;
          this._processed.add(row);
          const fileName = getFileName(row);
          const fileId = getFileId(row);
          if (!fileId) continue;

          // 注入直链按钮
          LinkPresenter.addDownloadButton(row, async btn => {
            try {
              const link = await this._fetchDirectLink(this._platform, fileId);
              if (link) {
                LinkPresenter.showLink(link, fileName);
                btn.textContent = '✅ 已获取';
              } else {
                btn.textContent = '❌ 获取失败';
                warn(`获取直链失败: ${fileName}`);
              }
            } catch (e) {
              btn.textContent = '❌ 错误';
              error('获取直链异常:', e.message);
            }
            setTimeout(() => {
              btn.textContent = '🔗 直链';
              btn.style.pointerEvents = '';
            }, 3000);
          });
        }
      },
      /**
       * 获取直链（优先使用适配器的 fetchDirectLink）
       */
      async _fetchDirectLink(platform, fileId) {
        const adapter = Adapters[platform];
        if (adapter && typeof adapter.fetchDirectLink === 'function') {
          return adapter.fetchDirectLink(fileId);
        }
        log(`获取直链逻辑待实现: ${this._platform} fileId=${fileId}`);
        return null;
      },
      stop() {
        if (this._observer) {
          this._observer.disconnect();
          this._observer = null;
        }
      }
    };

    // ═══════════════════════════════════════════════════
    //  6. 平台适配器（平台特定逻辑占位）
    // ═══════════════════════════════════════════════════
    const Adapters = {
      baidu: {
        name: 'baidu',
        // 存储从 API 拦截到的文件信息
        _fileMap: new Map(),
        // _position -> { fs_id, name }

        // 检测是否分享页
        _isSharePage() {
          return location.pathname.startsWith('/s/');
        },
        // 文件行选择器（不使用 this，避免上下文丢失）
        rowSelector() {
          return location.pathname.startsWith('/s/') ? 'dd.g-clearfix.JS-item-active.open-enable' : '.file-list-item, [class*="filelist"] [class*="item"], .file-row';
        },
        getFileName(row) {
          var _el$textContent;
          const el = row.querySelector('a.filename, [class*="file-name"] a, .file-name .text a');
          return (el == null || (_el$textContent = el.textContent) == null ? void 0 : _el$textContent.trim()) || (el == null ? void 0 : el.getAttribute('title')) || '';
        },
        getFileId(row) {
          // _position 属性是文件在列表中的索引
          const pos = row.getAttribute('_position');
          if (pos !== null) {
            // 尝试从 API 拦截数据中找
            const cached = this._fileMap.get(pos);
            if (cached != null && cached.fs_id) return cached.fs_id;
            // 没找到就存 position，后续 API 拦截到了再关联
            return `pos:${pos}`;
          }
          return '';
        },
        probeDOM() {
          log('--- DOM 结构探测 ---');
          if (this._isSharePage()) {
            log('分享页模式');
            const fileRows = document.querySelectorAll('dd.g-clearfix.AuPKyz, dd.JS-item-active, dd.open-enable');
            log(`找到 ${fileRows.length} 个文件行`);
            fileRows.forEach((dd, i) => {
              // 所有属性（不仅 data-）
              const attrs = {};
              for (const attr of dd.attributes) {
                attrs[attr.name] = attr.value.substring(0, 40);
              }
              const html = dd.innerHTML.substring(0, 300).replace(/</g, '&lt;');
              log(`文件行[${i}]`, JSON.stringify(attrs));
              log(`  HTML: ${html}`);
              // 查找所有子元素中的 data 属性
              dd.querySelectorAll('[data-]').forEach((el, j) => {
                log(`  子元素[${j}]`, el.tagName, 'data:', JSON.stringify(el.dataset));
              });
            });

            // 查 window 全局变量（百度经常把文件信息放这）
            const globalKeys = ['__INITIAL_STATE__', 'yunData', 'bdstoken', 'logid', 'shareData'];
            for (const key of globalKeys) {
              try {
                if (window[key]) {
                  const raw = JSON.stringify(window[key]);
                  const val = raw.substring(0, 1000);
                  log(`全局变量 ${key} (${raw.length} chars): ${val}`);
                } else {
                  log(`全局变量 ${key}: 不存在`);
                }
              } catch (e) {
                log(`${key} 读取失败: ${e.message}`);
              }
            }
            // 打印 cookie 中的 BDSTOKEN
            log('Cookies:', document.cookie.substring(0, 300));
            // 额外打印 bdstoken 提取结果
            const share = this._getShareParams();
            log(`bdstoken="${share.bdstoken}" surl="${share.surl}" pwd="${share.pwd}"`);
            // 打印 _fileMap
            if (this._fileMap.size > 0) {
              log('_fileMap:', JSON.stringify([...this._fileMap.entries()]));
            }
          }
          log('--- DOM 探测结束 ---');
        },
        // 从页面中提取文件信息和直链（查找 script 标签中的 JSON 数据）
        _extractFileInfoFromPage() {
          log('尝试从页面提取文件信息...');
          const scripts = document.querySelectorAll('script:not([src])');
          for (const script of scripts) {
            const text = script.textContent || '';

            // 1. 查找 dlink（直链）— 如果能直接找到就不用调 API 了
            const dlinkMatch = text.match(/"dlink"\s*:\s*"([^"]+)"/);
            if (dlinkMatch) {
              const dlink = dlinkMatch[1].replace(/\\\//g, '/');
              log('从页面找到 dlink!');
              return dlink; // 直接返回下载链接
            }

            // 2. 查找 fs_id + 文件列表 JSON
            const fsMatches = text.match(/"fs_id":\s*(\d+)/g);
            if (!fsMatches) continue;
            log(`找到 ${fsMatches.length} 个 fs_id 引用`);

            // 尝试提取 list JSON
            try {
              // 查找完整 JSON 对象: "list":[{...}]
              let listData = null;

              // 方法1: 标准 JSON key
              const listMatch = text.match(/"list"\s*:\s*(\[[\s\S]*?\])\s*[},\]]/);
              if (listMatch) {
                try {
                  listData = JSON.parse(listMatch[1]);
                } catch (e) {}
              }

              // 方法2: 直接从 window.yunData 找
              const yunMatch = text.match(/yunData\s*=\s*({[\s\S]+?});/);
              if (yunMatch) {
                try {
                  var _yunData$data;
                  const yunData = JSON.parse(yunMatch[1]);
                  const files = (yunData == null || (_yunData$data = yunData.data) == null ? void 0 : _yunData$data.list) || (yunData == null ? void 0 : yunData.list) || [];
                  if (Array.isArray(files) && files.length > 0) listData = files;
                } catch (e) {}
              }

              // 方法3: 从 dlink 反推 — 如果某行有 dlink_url 或 download_url
              const dlUrlMatch = text.match(/"(?:dlink_url|download_url|url)"\s*:\s*"([^"]+)"/);
              if (dlUrlMatch && !listData) {
                const url = dlUrlMatch[1].replace(/\\\//g, '/');
                log('从页面找到下载 URL:', url.substring(0, 80) + '...');
                return url;
              }
              if (Array.isArray(listData) && listData.length > 0) {
                for (const item of listData) {
                  if (item.fs_id) {
                    const pos = item._position ?? listData.indexOf(item);
                    // 如果列表里已经有 dlink，直接存下来
                    const dlink = item.dlink || item.url || item.download_url || '';
                    this._fileMap.set(String(pos), {
                      fs_id: String(item.fs_id),
                      name: item.file_name || item.server_filename || '',
                      dlink: typeof dlink === 'string' ? dlink.replace(/\\\//g, '/') : ''
                    });
                  }
                }
                log(`从页面提取了 ${listData.length} 个文件 (含${this._fileMap.size}个fs_id)`);
                // 如果有 dlink，直接返回第一个
                for (const _ref of this._fileMap) {
                  const v = _ref[1];
                  if (v.dlink) return v.dlink;
                }
                return;
              }
            } catch (e) {}

            // 3. 只有 fs_id，没有完整 list JSON
            const ids = text.match(/"fs_id":\s*(\d+)/g);
            ids.forEach((m, i) => {
              const id = m.match(/\d+/)[0];
              if (![...this._fileMap.values()].some(v => v.fs_id === id)) {
                this._fileMap.set(String(i), {
                  fs_id: id,
                  name: ''
                });
              }
            });
            log(`从页面提取了 ${this._fileMap.size} 个 fs_id`);
          }

          // 也尝试找 window 全局变量
          for (const key of ['__INITIAL_STATE__', 'yunData', 'pageData', 'shareData']) {
            try {
              const val = unsafeWindow[key];
              if (val) {
                var _val$data;
                const files = (val == null || (_val$data = val.data) == null ? void 0 : _val$data.list) || (val == null ? void 0 : val.list) || (val == null ? void 0 : val.fileList) || [];
                if (Array.isArray(files)) {
                  for (const item of files) {
                    if (item.fs_id) {
                      const pos = item._position ?? files.indexOf(item);
                      const dlink = item.dlink || item.url || item.download_url || '';
                      this._fileMap.set(String(pos), {
                        fs_id: String(item.fs_id),
                        name: item.file_name || item.server_filename || item.name || '',
                        dlink: typeof dlink === 'string' ? dlink.replace(/\\\//g, '/') : ''
                      });
                    }
                  }
                  log(`从 window.${key} 提取了 ${files.length} 个文件`);
                  // 有 dlink 直接返回
                  for (const _ref2 of this._fileMap) {
                    const v = _ref2[1];
                    if (v.dlink) return v.dlink;
                  }
                  return;
                }
              }
            } catch (e) {}
          }
        },
        // 注册 API 拦截钩子
        setupInterceptors() {
          // 1. 拦截文件列表 API（获取 fs_id）
          const listHooks = ['/share/list', '/api/list', '/api/file/list', '/rest/2.0/services/cloud_dl'];
          for (const path of listHooks) {
            NetworkInterceptor.addHook(path, (body, url) => {
              try {
                var _data$data7;
                const data = JSON.parse(body);
                const list = (data == null || (_data$data7 = data.data) == null ? void 0 : _data$data7.list) || (data == null ? void 0 : data.list) || [];
                if (Array.isArray(list) && list.length > 0) {
                  for (const item of list) {
                    if (item.fs_id) {
                      const pos = item._position ?? list.indexOf(item);
                      this._fileMap.set(String(pos), {
                        fs_id: String(item.fs_id),
                        name: item.file_name || item.server_filename || ''
                      });
                    }
                  }
                  log(`API 缓存 ${list.length} 个文件信息`);
                }
              } catch (e) {}
            });
          }

          // 2. 通用 dlink 捕获器 — 任何包含 dlink 的响应都捕获
          NetworkInterceptor.addHook(/dlink|download_url|downloadUrl/, (body, url) => {
            try {
              var _data$data8;
              const data = JSON.parse(body);
              let dlink = (data == null || (_data$data8 = data.data) == null ? void 0 : _data$data8.dlink) || (data == null ? void 0 : data.dlink) || (data == null ? void 0 : data.url) || '';
              if (dlink) {
                dlink = dlink.replace(/\\\//g, '/');
                log('拦截器捕获到 dlink:', url);
                LinkPresenter.showLink(dlink, '百度网盘文件');
              }
            } catch (e) {}
          });

          // 3. 所有文件列表类 API - 捕获 fs_id 列表
          const listHooks2 = ['/share/list', '/api/list', '/file/list', '/share/filelist'];
          for (const path of listHooks2) {
            NetworkInterceptor.addHook(path, (body, url) => {
              try {
                var _data$data9;
                const data = JSON.parse(body);
                const list = (data == null || (_data$data9 = data.data) == null ? void 0 : _data$data9.list) || (data == null ? void 0 : data.list) || [];
                if (Array.isArray(list)) {
                  for (const item of list) {
                    if (item.fs_id) {
                      const pos = item._position ?? list.indexOf(item);
                      const dlink = item.dlink || '';
                      this._fileMap.set(String(pos), {
                        fs_id: String(item.fs_id),
                        name: item.file_name || item.server_filename || '',
                        dlink: dlink ? dlink.replace(/\\\//g, '/') : ''
                      });
                    }
                  }
                  log(`文件列表API缓存 ${list.length} 项`);
                  // 有 dlink 直接弹窗
                  for (const _ref3 of this._fileMap) {
                    const v = _ref3[1];
                    if (v.dlink) {
                      LinkPresenter.showLink(v.dlink, v.name);
                      break;
                    }
                  }
                }
              } catch (e) {}
            });
          }
        },
        // 从用户主站页面或 cookie 获取 bdstoken
        async _fetchBdstoken() {
          // 尝试从首页获取 bdstoken（用户已登录时有效）
          try {
            const resp = await fetch('https://pan.baidu.com/', {
              credentials: 'include'
            });
            const html = await resp.text();
            const m = html.match(/bdstoken["']\s*[:=]\s*["']([^"']+)["']/);
            if (m) {
              log('从首页获取 bdstoken 成功');
              return m[1];
            }
          } catch (e) {}
          return '';
        },
        _getShareParams() {
          const url = new URL(location.href);
          const surl = location.pathname.replace('/s/', '');
          const pwd = url.searchParams.get('pwd') || '';
          return {
            surl,
            pwd,
            app_id: '250528'
          };
        },
        // 初始化时主动提取文件信息
        init() {
          setTimeout(() => this._extractFileInfoFromPage(), 2000);
          setTimeout(() => {
            if (this._fileMap.size === 0) this._extractFileInfoFromPage();
          }, 6000);
        },
        // 获取直链
        async fetchDirectLink(fileId) {
          var _cached, _cached2;
          let cached = null;
          if (typeof fileId === 'string' && fileId.startsWith('pos:')) {
            cached = this._fileMap.get(fileId.replace('pos:', ''));
          }
          if ((_cached = cached) != null && _cached.dlink) return cached.dlink;
          const realFsId = ((_cached2 = cached) == null ? void 0 : _cached2.fs_id) || fileId;
          const share = this._getShareParams();
          const baseUrl = location.origin;

          // 0. 先获取 bdstoken
          const bdstoken = await this._fetchBdstoken();
          log('bdstoken:', bdstoken ? '已获取' : '未获取到');

          // 1. POST /api/sharedownload
          const ts = Date.now();
          try {
            var _data$data0;
            const body = new URLSearchParams();
            body.append('fs_id', JSON.stringify([Number(realFsId)]));
            body.append('surl', share.surl);
            if (share.pwd) body.append('pwd', share.pwd);
            if (bdstoken) body.append('bdstoken', bdstoken);
            const resp = await fetch(`${baseUrl}/api/sharedownload?app_id=${share.app_id}&channel=chunlei&clienttype=0&web=1&logid=${ts}`, {
              method: 'POST',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
              },
              body: body.toString()
            });
            const text = await resp.text();
            const data = JSON.parse(text);
            const dlink = (data == null || (_data$data0 = data.data) == null ? void 0 : _data$data0.dlink) || (data == null ? void 0 : data.dlink) || null;
            if (dlink) return dlink.replace(/\\\//g, '/');
            log('sharedownload 响应:', text.substring(0, 300));
          } catch (e) {
            log('sharedownload 失败:', e.message);
          }

          // 2. GET /api/download
          try {
            var _data$data1;
            const resp = await fetch(`${baseUrl}/api/download?fidlist=[${realFsId}]&type=1&channel=chunlei&web=1&clienttype=0${bdstoken ? '&bdstoken=' + bdstoken : ''}`, {
              credentials: 'include'
            });
            const text = await resp.text();
            const data = JSON.parse(text);
            const dlink = (data == null || (_data$data1 = data.data) == null ? void 0 : _data$data1.dlink) || (data == null ? void 0 : data.dlink) || null;
            if (dlink) return dlink.replace(/\\\//g, '/');
            log('download 响应:', text.substring(0, 300));
          } catch (e) {}
          return null;
        }
      },
      quark: {
        name: 'quark',
        rowSelector: '[class*="file-item"], [class*="list-item"], .file-row',
        getFileName(row) {
          var _row$querySelector;
          return ((_row$querySelector = row.querySelector('[class*="name"], [class*="title"]')) == null || (_row$querySelector = _row$querySelector.textContent) == null ? void 0 : _row$querySelector.trim()) || '';
        },
        getFileId(row) {
          var _row$dataset, _row$querySelector2;
          return ((_row$dataset = row.dataset) == null ? void 0 : _row$dataset.id) || row.getAttribute('data-id') || ((_row$querySelector2 = row.querySelector('[data-id]')) == null ? void 0 : _row$querySelector2.getAttribute('data-id')) || '';
        },
        setupInterceptors() {
          // 夸克下载相关 API 路径
          const apiPaths = ['/api/download', '/download/file', '/file/download'];
          for (const path of apiPaths) {
            NetworkInterceptor.addHook(path, (body, url) => {
              const result = LinkExtractor.extract('quark', body, url);
              if (result) {
                log('捕获夸克直链:', result.url.substring(0, 80) + '...');
                LinkPresenter.showLink(result.url, '夸克网盘文件');
              }
            });
          }
        }
      }
    };

    // ═══════════════════════════════════════════════════
    //  7. 主启动
    // ═══════════════════════════════════════════════════
    function bootstrap() {
      const platform = PlatformDetector.detect();
      if (!platform) {
        log('不支持的平台');
        return;
      }
      log(`启动: ${platform.display}`);

      // 启动网络拦截
      NetworkInterceptor.start();

      // 配置当前平台的适配器
      const adapter = Adapters[platform.name];
      if (adapter) {
        // 适配器初始化（提取页面文件信息等）
        if (typeof adapter.init === 'function') adapter.init();

        // 注册 API 拦截钩子
        adapter.setupInterceptors();

        // 3 秒后探测 DOM 结构（方便调试）
        setTimeout(() => {
          if (adapter.probeDOM) adapter.probeDOM();
        }, 5000);

        // 监听文件列表注入直链按钮
        if (PlatformDetector.isFileList()) {
          setTimeout(() => {
            FileListWatcher.start(platform.name, adapter.rowSelector, row => adapter.getFileName(row), row => adapter.getFileId(row));
          }, 3000);
        }
      }
      log('就绪 ✅');
    }

    // ─── 启动 ─────────────────────────────────────
    if (document.readyState === 'complete') {
      bootstrap();
    } else {
      window.addEventListener('load', bootstrap);
    }
  })();

})();
