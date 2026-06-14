# 调试指南：查找广告元素

## 操作步骤

1. 打开不行的视频网站（爱奇艺/腾讯/优酷）
2. 播放任意视频，让广告出现
3. 按 **F12** 打开开发者工具
4. 切换到 **控制台 (Console)**
5. 粘贴以下脚本，按回车：

```javascript
(function() {
  // 广告常见关键词
  const keywords = ['ad', '广告', 'advert', 'skip', '跳过', 'countdown', '倒计时', 'sponsor'];
  
  function findAdElements() {
    const results = [];
    // 扫描所有元素
    const all = document.querySelectorAll('*');
    for (const el of all) {
      if (!el.id && !el.className) continue;
      const id = (el.id || '').toLowerCase();
      const cls = (typeof el.className === 'string' ? el.className : '').toLowerCase();
      const text = (el.textContent || '').toLowerCase();
      
      // 检查是否包含广告关键词
      const matched = keywords.some(k => id.includes(k) || cls.includes(k));
      if (matched && el.offsetParent !== null) {
        results.push({
          tag: el.tagName,
          id: el.id || '(无)',
          class: (typeof el.className === 'string' ? el.className.substring(0,80) : '') || '(无)',
          visible: el.offsetParent !== null,
          text: text.substring(0, 50)
        });
      }
    }
    return results;
  }
  
  const found = findAdElements();
  console.log('=== 广告元素排查 ===');
  console.log('当前网址:', location.href);
  console.log('平台检测:', location.hostname);
  console.log('找到', found.length, '个可见广告相关元素:');
  console.table(found);
  
  // 额外检测：查找跳过按钮
  const skipBtns = document.querySelectorAll(
    '[class*="skip"], [class*="跳过"], [id*="skip"], [id*="跳过"], ' +
    'button:not([aria-label]), a[class*="skip"]'
  );
  console.log('跳过按钮候选:', skipBtns.length);
  skipBtns.forEach((btn, i) => {
    console.log(`  [${i}]`, btn.tagName, 
      'id=' + (btn.id || '(无)'),
      'class=' + (typeof btn.className === 'string' ? btn.className.substring(0,60) : ''),
      'visible=' + (btn.offsetParent !== null),
      'text="' + (btn.textContent || '').trim().substring(0,30) + '"'
    );
  });
  
  // 检测播放器容器
  const players = document.querySelectorAll(
    '#player, #tenvideo_player, #youku-player, #mgtv-player, ' +
    '.player, [class*="player"], [id*="player"], [class*="Player"]'
  );
  console.log('播放器容器:', players.length);
  players.forEach((p, i) => {
    console.log(`  [${i}]`, p.tagName, 
      'id=' + (p.id || '(无)'),
      'class=' + (typeof p.className === 'string' ? p.className.substring(0,60) : '')
    );
  });
})();
```

6. 把控制台的输出结果贴给我
