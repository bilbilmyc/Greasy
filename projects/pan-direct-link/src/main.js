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
  'use strict';

  const NAME = '网盘直链下载助手';
  const log = (...args) => console.log(`[${NAME}]`, ...args);
  const warn = (...args) => console.warn(`[${NAME}]`, ...args);
  const error = (...args) => console.error(`[${NAME}]`, ...args);

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
          // 文件管理页 /disk/home, 分享页 /s/...
          isFileList: path.includes('/disk/') || path === '/home'
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

    // 是否在文件管理页面（有文件列表）
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
    _hooks: [],       // { urlPattern: regex/string, onResponse: fn }
    _active: false,

    /**
     * 注册响应拦截钩子
     * @param {RegExp|string} urlPattern - 匹配的 URL 模式
     * @param {Function} onResponse - (responseBody, url) => void
     */
    addHook(urlPattern, onResponse) {
      this._hooks.push({ urlPattern, onResponse });
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
        const url = typeof input === 'string' ? input : (input.url || '');
        return self._originalFetch.apply(this, arguments)
          .then(async response => {
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
              if (text.length > 0 && text.length < 1024 * 1024) { // 限制 1MB
                self._notifyHooks(url, text);
              }
            } catch (e) { /* 忽略 */ }
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
          const matches = hook.urlPattern instanceof RegExp
            ? hook.urlPattern.test(url)
            : url.includes(hook.urlPattern);
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
        const data = JSON.parse(responseText);
        // 百度网盘下载 API 返回格式通常为:
        // { errno: 0, data: { dlink: "https://..." } }
        // 或 { errno: 0, dlink: "https://..." }
        let dlink = data?.data?.dlink || data?.dlink || null;

        // 有些接口需要追加 sign/timestamp
        if (dlink && data?.data?.sign) {
          dlink += `&sign=${data.data.sign}`;
        }
        if (dlink && data?.data?.timestamp) {
          dlink += `×tamp=${data.data.timestamp}`;
        }

        return dlink ? { url: dlink, extra: data } : null;
      } catch (e) {
        return null;
      }
    },

    // 夸克网盘
    _parseQuarkLink(responseText, requestUrl) {
      try {
        const data = JSON.parse(responseText);
        // 夸克 API 返回格式通常为:
        // { code: 0, data: { download_url: "https://..." } }
        // 或 { status: 200, data: { url: "..." } }
        let dlink = data?.data?.download_url
                 || data?.data?.url
                 || data?.data?.downloadUrl
                 || null;

        return dlink ? { url: dlink, extra: data } : null;
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
        case 'baidu': return this._parseBaiduLink(responseText, requestUrl);
        case 'quark': return this._parseQuarkLink(responseText, requestUrl);
        default: return null;
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
        setTimeout(() => { btn.textContent = '复制链接'; }, 2000);
      };

      document.getElementById('pan-direct-link-open').onclick = () => {
        window.open(url, '_blank');
      };

      document.getElementById('pan-direct-link-close').onclick = () => {
        document.body.removeChild(overlay);
      };

      overlay.addEventListener('click', (e) => {
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
      btn.onclick = (e) => {
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
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;')
              .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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

      const resolveSelector = () =>
        typeof rowSelector === 'function' ? rowSelector() : rowSelector;

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
        LinkPresenter.addDownloadButton(row, async (btn) => {
          try {
            const link = await this._fetchDirectLink(platform, fileId);
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
      log(`获取直链逻辑待实现: ${platform} fileId=${fileId}`);
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

      // 检测是否分享页
      _isSharePage() {
        return location.pathname.startsWith('/s/');
      },

      // 文件行选择器
      rowSelector() {
        if (this._isSharePage()) {
          // 分享页文件行
          return 'dd[class*="JS-item"], dd[class*="open-enable"], dd.g-clearfix.AuPKyz, [class*="share-file-list"] dd, .file-item';
        }
        // 个人文件管理页
        return '.file-list-item, [class*="filelist"] [class*="item"], .file-row, tbody tr';
      },

      getFileName(row) {
        // 分享页文件名可能在链接或 span 中
        const nameEl = row.querySelector('a[class*="file-name"], span[class*="name"], [class*="file-name"], [class*="file_name"]');
        if (nameEl) return nameEl.textContent?.trim() || '';

        // 直接取行文本的前半部分（去掉日期）
        const text = row.textContent?.trim() || '';
        // 分享页格式: "文件名 日期"
        const parts = text.split(/\s{2,}/);
        return parts[0] || text.substring(0, 40);
      },

      getFileId(row) {
        // 分享页：可能 data 属性存了 fs_id
        return row.dataset?.fs_id
          || row.getAttribute('data-fsid')
          || row.querySelector('[data-fsid]')?.getAttribute('data-fsid')
          || row.dataset?.id
          || row.dataset?.fileid
          || '';
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
            if (window[key]) {
              const val = JSON.stringify(window[key]).substring(0, 200);
              log(`全局变量 ${key}: ${val}`);
            }
          }
        }
        log('--- DOM 探测结束 ---');
      },

      // 注册 API 拦截钩子
      setupInterceptors() {
        // 百度下载相关 API 路径
        const apiPaths = [
          '/api/download',
          '/api/invoker/check',       // 客户端检查
          '/rest/2.0/services/cloud_dl',
          '/share/download',
          '/api/sharedownload'
        ];
        for (const path of apiPaths) {
          NetworkInterceptor.addHook(path, (body, url) => {
            const result = LinkExtractor.extract('baidu', body, url);
            if (result) {
              log('捕获百度直链:', result.url.substring(0, 80) + '...');
              LinkPresenter.showLink(result.url, '百度网盘文件');
            }
            // 即使没提取到直链，也打印响应体摘要用于调试
            if (body.length < 500) {
              log(`API响应 [${path}]:`, body.substring(0, 200));
            }
          });
        }
      },

      // 获取直链（直接调用百度 API）
      async fetchDirectLink(fileId) {
        // TODO: 需要根据实际百度 API 参数调整
        // 典型的百度下载 API:
        // GET /api/download?fidlist=[${fileId}]&type=1&channel=chunlei&web=1
        const url = `/api/download?fidlist=[${fileId}]&type=1&channel=chunlei&web=1&clienttype=0`;
        try {
          const resp = await fetch(url, { credentials: 'include' });
          const text = await resp.text();
          const result = LinkExtractor.extract('baidu', text, url);
          if (result) return result.url;
          log('下载接口原始响应:', text.substring(0, 300));
          return null;
        } catch (e) {
          error('调用下载 API 失败:', e.message);
          return null;
        }
      }
    },

    quark: {
      name: 'quark',

      rowSelector: '[class*="file-item"], [class*="list-item"], .file-row',

      getFileName(row) {
        return row.querySelector('[class*="name"], [class*="title"]')
          ?.textContent?.trim() || '';
      },

      getFileId(row) {
        return row.dataset?.id
          || row.getAttribute('data-id')
          || row.querySelector('[data-id]')?.getAttribute('data-id')
          || '';
      },

      setupInterceptors() {
        // 夸克下载相关 API 路径
        const apiPaths = [
          '/api/download',
          '/download/file',
          '/file/download'
        ];
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
      // 注册 API 拦截钩子
      adapter.setupInterceptors();

      // 3 秒后探测 DOM 结构（方便调试）
      setTimeout(() => {
        if (adapter.probeDOM) adapter.probeDOM();
      }, 5000);

      // 监听文件列表注入直链按钮
      if (PlatformDetector.isFileList()) {
        setTimeout(() => {
          FileListWatcher.start(
            platform.name,
            adapter.rowSelector,
            (row) => adapter.getFileName(row),
            (row) => adapter.getFileId(row)
          );
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
