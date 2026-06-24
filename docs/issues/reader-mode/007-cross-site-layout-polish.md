# Issue 7: Cross-site layout polish — sticky header, font, line height

> Milestone: v1.0
> Triage label: `ready-for-agent`
> Blocked by: #2 AND #3

## What to build

After at least 2 site modules are merged (CSDN + 知乎), extract shared layout polish into a cross-site utility + style block:

- Sticky header handling (don't let fixed-position top bars overlap content)
- Article font optimization (system-ui stack, refined line-height, max line length)
- These apply to ALL registered sites via a single `applyLayoutPolish()` call after each site's `apply()`.

This validates the shared cross-site pattern before extending to 掘金 / 简书 / B站.

## Acceptance criteria

- [ ] `src/utils/dom.js` (or new `src/utils/layout.js`) exports `applyLayoutPolish(siteName, options)`
- [ ] Injected style block scoped to `.reader-mode-<sitename>` body class
- [ ] Sticky headers (`position: fixed; top: 0` on site chrome) do not overlap article content — either add `padding-top` equal to header height, or override header to `position: relative`
- [ ] Article body font-family refined (system-ui / sans-serif fallback stack, NOT site-default)
- [ ] Article body line-height set to 1.7-1.8
- [ ] Long paragraphs capped at ~70-80ch via `max-width`
- [ ] Behavior verified on both CSDN and 知乎 (Issues #2 and #3 must be merged first)
- [ ] Adding the polish to a new site (e.g. 掘金 after Issue #4 merges) requires only calling `applyLayoutPolish('juejin')` from the site's `apply()`

## User stories covered

13, 14, 15, 23

## Blocked by

- #2 (CSDN) — must be merged first to validate the pattern
- #3 (知乎) — must be merged first to validate the pattern
