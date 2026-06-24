# Issue 3: 知乎 — ads removal + login bypass + layout optimization

> Milestone: v1.0
> Triage label: `ready-for-agent`
> Blocked by: #1

## What to build

Deliver 知乎 end-to-end for `*.zhihu.com/*`. Side-feed ads, the right-side recommendation panel, the answer-fold login wall, homepage ad cards, comment ads, and the modal login popup are all addressed.

After this issue is merged, a reader visiting 知乎 sees: no ads in feeds, no login modals, the answer area widened (right panel hidden), and "展开全部" content auto-expanded when not logged in.

## Acceptance criteria

- [ ] `src/sites/zhihu.js` exports `apply()` and is registered for `www.zhihu.com`, `zhuanlan.zhihu.com`
- [ ] 知乎 homepage feed ads removed
- [ ] 知乎 question-page right-side "相关推荐" panel hidden
- [ ] 知乎 "展开全部" content auto-expanded when fold-state detected (skipped if user is logged in — detect via DOM signals like login state, not cookies)
- [ ] 知乎 login modal auto-dismissed
- [ ] 知乎 comment-section ads removed
- [ ] Answer area widened (right panel hidden, content takes freed space)
- [ ] `docs/selectors.md` updated with 知乎 section (selectors + source HTML + verification notes)
- [ ] Logger warning emitted when any critical selector is missing on page load
- [ ] Manual smoke test passes on:
  - Homepage (`www.zhihu.com`) — feed clean
  - Question page — answer area wide, no login modal
  - Article (zhuanlan) — no ads, no login

## User stories covered

5, 6, 7, 8, 9, 13, 23, 24

## Blocked by

- #1 (bootstrap)
