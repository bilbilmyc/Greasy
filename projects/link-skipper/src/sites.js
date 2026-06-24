/**
 * 硬编码白名单：已知安全的中文站点中间页 host。
 * 命中即瞬时重定向，无 UI。
 */
export const WHITELIST = [
  // 短链
  't.cn',                  // 微博短链
  'url.cn',                // 腾讯短链
  'dwz.cn',                // 百度短链
  '3.cn',                  // 京东短链

  // 贴吧
  'jump.bdimg.com',        // 百度贴吧跳转

  // 内容站外链
  'link.zhihu.com',        // 知乎外链
  'link.juejin.cn',        // 掘金外链
  'goto-link.csdn.net',    // CSDN 外链

  // 电商
  'a.taobao.com',          // 淘宝客
  's.click.taobao.com',    // 淘宝广告
  's.click.tmall.com',     // 天猫广告
  'u.jd.com',              // 京东短链
];
