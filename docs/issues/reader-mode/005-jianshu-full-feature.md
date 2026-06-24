# Issue 5: 简书 — ads removal + login bypass

> Milestone: v1.0
> Triage label: `ready-for-agent`
> Blocked by: #1

## What to build

Deliver 简书 end-to-end for `www.jianshu.com/*`. Feed ads and login overlays are addressed.

After this issue is merged, a reader visiting 简书 sees: no feed ads, no login walls blocking content.

## Acceptance criteria

- [ ] `src/sites/jianshu.js` exports `apply()` and is registered for `www.jianshu.com`
- [ ] 简书 feed ads removed
- [ ] 简书 login overlay auto-dismissed / content un-folded
- [ ] `docs/selectors.md` updated with 简书 section
- [ ] Logger warning emitted when critical selectors are missing on page load
- [ ] Manual smoke test passes on:
  - Homepage — feed clean
  - Article detail — clean

## User stories covered

11, 23, 24

## Blocked by

- #1 (bootstrap)
