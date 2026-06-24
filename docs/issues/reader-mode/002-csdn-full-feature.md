# Issue 2: CSDN — ads removal + login bypass + layout optimization

> Milestone: v1.0
> Triage label: `ready-for-agent`
> Blocked by: #1

## What to build

Deliver CSDN end-to-end. When reader-mode loads on `blog.csdn.net/*`, sidebar ads, in-feed "推荐" cards, the "扫码登录阅读全文" overlay, comment-section ads, and the constrained article width are all addressed.

After this issue is merged, a reader visiting any CSDN article page sees: no ads in sidebar / in-feed / comments, the login paywall auto-dismissed with content auto-expanded, and the article container widened.

## Acceptance criteria

- [ ] `src/sites/csdn.js` exports `apply()` and is registered for `blog.csdn.net`
- [ ] CSDN sidebar ads removed on article pages (test on a real article)
- [ ] CSDN in-feed "推荐" / "专题" cards removed
- [ ] CSDN login modal / overlay auto-dismissed (close button clicked or modal element removed)
- [ ] CSDN "read more" paywall content auto-expanded (folded content un-collapsed)
- [ ] CSDN comment-section ads removed
- [ ] CSDN article container widened to 70-80% of viewport (style injected, scoped to `.reader-mode-csdn` body class)
- [ ] `docs/selectors.md` updated with CSDN section: each selector + source HTML snippet + verification date
- [ ] Logger warning emitted when any of the 5 critical selectors (sidebar ad / in-feed card / login modal / paywall / comment ad) is missing on page load
- [ ] Manual smoke test passes on 3 page types:
  - Article list page (`blog.csdn.net/`) — no ads in feed
  - Article detail page — full content visible, no overlays
  - Search results page — ads/overlays handled

## User stories covered

1, 2, 3, 4, 13, 23, 24

## Blocked by

- #1 (bootstrap)
