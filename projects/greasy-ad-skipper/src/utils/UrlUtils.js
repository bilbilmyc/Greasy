/**
 * URL 解析与平台检测工具
 */
const PLATFORM_CONFIG = [
  {
    name: 'youtube',
    patterns: [
      { host: 'www.youtube.com', path: /^\/watch/ },
      { host: 'm.youtube.com', path: /^\/watch/ },
      { host: 'youtube.com', path: /^\/watch/ },
      { host: 'www.youtube.com', path: /^\/shorts\// }
    ],
    videoIdRegex: /[?&]v=([^&]+)/
  },
  {
    name: 'bilibili',
    patterns: [
      { host: 'www.bilibili.com', path: /^\/video\// },
      { host: 'www.bilibili.com', path: /^\/bangumi\// },
      { host: 'm.bilibili.com', path: /^\/video\// },
      { host: 'm.bilibili.com', path: /^\/bangumi\// }
    ],
    videoIdRegex: /\/video\/(BV[a-zA-Z0-9]+)/,
    epIdRegex: /\/bangumi\/play\/(ep\d+)/
  },
  {
    name: 'tencent',
    patterns: [
      { host: 'v.qq.com', path: /^\/x\// },
      { host: 'v.qq.com', path: /^\/\w+\/\w+\// }
    ]
  },
  {
    name: 'iqiyi',
    patterns: [
      { host: 'www.iqiyi.com', path: /^\/v_/ },
      { host: 'www.iqiyi.com', path: /^\/a_/ },
      { host: 'www.iqiyi.com', path: /^\/play_\d+\// }
    ]
  },
  {
    name: 'youku',
    patterns: [
      { host: 'v.youku.com', path: /^\/v_show\// }
    ]
  },
  {
    name: 'mgtv',
    patterns: [
      { host: 'www.mgtv.com', path: /^\/b\// },
      { host: 'www.mgtv.com', path: /^\/[a-z]\/\d+\// }
    ]
  }
];

const UrlUtils = {
  /**
   * 检测当前 URL 属于哪个平台
   * @returns {string|null} 平台名称或 null
   */
  detectPlatform(url = window.location.href) {
    try {
      const urlObj = new URL(url);
      for (const platform of PLATFORM_CONFIG) {
        for (const pattern of platform.patterns) {
          if (urlObj.host === pattern.host && pattern.path.test(urlObj.pathname)) {
            return platform.name;
          }
        }
      }
      return null;
    } catch (e) {
      return null;
    }
  },

  /**
   * 判断当前页面是否是视频播放页
   */
  isVideoPage(url = window.location.href) {
    return this.detectPlatform(url) !== null;
  },

  /**
   * 提取 YouTube 视频 ID
   */
  extractYouTubeVideoId(url = window.location.href) {
    const match = url.match(/[?&]v=([^&]+)/);
    return match ? match[1] : null;
  },

  /**
   * 提取 B站 视频 ID (BV号)
   */
  extractBilibiliVideoId(url = window.location.href) {
    const match = url.match(/\/video\/(BV[a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  },

  /**
   * 获取平台名称的中文显示
   */
  getPlatformDisplayName(platform) {
    const names = {
      youtube: 'YouTube',
      bilibili: 'B站',
      tencent: '腾讯视频',
      iqiyi: '爱奇艺',
      youku: '优酷',
      mgtv: '芒果TV'
    };
    return names[platform] || platform;
  },

  /**
   * 获取支持的平台列表
   */
  getSupportedPlatforms() {
    return PLATFORM_CONFIG.map(p => p.name);
  }
};

export default UrlUtils;
