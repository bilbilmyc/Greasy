# Issue 1: Bootstrap reader-mode project skeleton

> Milestone: v1.0
> Triage label: `ready-for-agent`
> Blocked by: None

## What to build

Establish the foundation for the `reader-mode` Tampermonkey userscript project. After this issue is merged, loading `dist/reader-mode.user.js` on any supported site is a no-op — logs `[reader-mode] loaded for <site>`, performs no DOM mutations.

This is the prefactoring slice that unblocks all subsequent per-site work. It delivers a complete path through:

- Project scaffold (rollup + babel, copy from `_template/`)
- Site registry pattern (each site registers a `match → apply()` mapping)
- Shared utility skeleton (`dom.js`, `logger.js`, `storage.js` stubs)
- Build pipeline emitting UserScript IIFE bundle
- Manifest/metadata block (Greasy Fork-ready fields)

## Acceptance criteria

- [ ] `projects/reader-mode/` exists with `package.json`, `rollup.config.js`, `babel.config.js` adapted from `projects/_template/`
- [ ] `projects/reader-mode/src/main.js` detects `@match` URL and looks up the registered site module
- [ ] `projects/reader-mode/src/sites/_template.js` exists with documented `apply(root)` signature + comments showing how to add a new site
- [ ] `projects/reader-mode/src/utils/dom.js` exports at minimum:
  - `removeOnMatch(selector, label)` — removes matching elements and observes new ones via MutationObserver
  - `waitFor(selector, timeout)` — returns Promise that resolves when element appears
- [ ] `projects/reader-mode/src/utils/logger.js` exports `log/warn/error` prefixed with `[reader-mode]`
- [ ] `projects/reader-mode/src/utils/storage.js` exports `get(key)`/`set(key, value)` wrapping `GM_getValue`/`GM_setValue` with `reader-mode:` prefix
- [ ] UserScript metadata block in build output includes: `name`, `namespace`, `version` (0.1.0), `description`, `author`, `match` (5 sites), `grant` (GM_setValue, GM_getValue), `run-at` (document-end), `noframes`
- [ ] `npm run build` produces `dist/reader-mode.user.js` that, when loaded on any of the 5 sites, logs `[reader-mode] loaded for <site>` and performs no DOM mutations
- [ ] `docs/selectors.md` exists with section headers for each site (empty selectors fine — structure only)
- [ ] `README.md` exists with placeholder sections (Install, Supported Sites, Development — content lands in Issue #8)

## User stories covered

16, 17, 18, 19, 20

## Blocked by

None — can start immediately.
