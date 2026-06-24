# Issue 4: 掘金 — ads removal + login bypass

> Milestone: v1.0
> Triage label: `ready-for-agent`
> Blocked by: #1

## What to build

Deliver 掘金 end-to-end for `juejin.cn/post/*` and other relevant pages. Pop-up ads and login interception are addressed.

After this issue is merged, a reader visiting 掘金 articles sees: no pop-up ads, no login walls blocking content.

## Acceptance criteria

- [ ] `src/sites/juejin.js` exports `apply()` and is registered for `juejin.cn/post/*` and `juejin.cn`
- [ ] 掘金 pop-up ads removed on article pages
- [ ] 掘金 login interception bypassed (modal closed or content un-folded)
- [ ] `docs/selectors.md` updated with 掘金 section
- [ ] Logger warning emitted when critical selectors are missing on page load
- [ ] Manual smoke test passes on:
  - Article detail page (`juejin.cn/post/<id>`) — clean
  - Homepage / feed — clean

## User stories covered

10, 23, 24

## Blocked by

- #1 (bootstrap)
