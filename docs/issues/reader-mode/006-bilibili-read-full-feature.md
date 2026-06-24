# Issue 6: B站专栏 — ads removal + login bypass

> Milestone: v1.0
> Triage label: `ready-for-agent`
> Blocked by: #1

## What to build

Deliver B站专栏 end-to-end for `www.bilibili.com/read/*`. Pop-up ads and login interception are addressed.

After this issue is merged, a reader visiting B站专栏 articles sees: no pop-up ads, no login walls blocking content.

## Acceptance criteria

- [ ] `src/sites/bilibili-read.js` exports `apply()` and is registered for `www.bilibili.com/read/*`
- [ ] B站专栏 pop-up ads removed
- [ ] B站专栏 login interception bypassed (modal closed or content un-folded)
- [ ] `docs/selectors.md` updated with B站专栏 section
- [ ] Logger warning emitted when critical selectors are missing on page load
- [ ] Manual smoke test passes on:
  - Article detail (`www.bilibili.com/read/cv<id>`) — clean

## User stories covered

12, 23, 24

## Blocked by

- #1 (bootstrap)
