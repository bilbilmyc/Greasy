# Issue 8: v1.0 release prep — README, Greasy Fork metadata, publish workflow

> Milestone: v1.0
> Triage label: `ready-for-agent`
> Blocked by: #2

## What to build

Prepare the v1.0 release: a user-facing README, Greasy Fork-ready metadata, and a publishing workflow that ships both to GitHub Release and Greasy Fork.

After this issue is merged, the project is ready for v1.0 tag + Greasy Fork submission.

## Acceptance criteria

- [ ] `README.md` includes:
  - One-line description + screenshot
  - "Install" section with Greasy Fork URL (placeholder OK before first submission)
  - "Supported sites" table (5 sites, with `@match`)
  - "What it does" — 3-4 bullets (去广告 + 免登录 + 布局优化)
  - "What it does NOT do" — out-of-scope (server-side auth bypass, mobile)
  - "Development" section: `npm install`, `npm run build`, how to test in Tampermonkey
- [ ] UserScript metadata block includes all Greasy Fork required fields:
  - `name`, `namespace`, `version` (1.0.0)
  - `description`, `author`, `homepage` (link to repo)
  - `icon` (64x64 PNG, in repo)
  - `match` (5 sites)
  - `grant` (remove `GM_setValue`/`GM_getValue` for v1.0 — not used yet)
  - `run-at`, `noframes`
  - `@updateURL` and `@downloadURL` pointing to GitHub raw URLs
- [ ] `.github/workflows/release.yml` (or equivalent): on tag push, build + attach `dist/reader-mode.user.js` to GitHub Release
- [ ] `CHANGELOG.md` initialized with v1.0.0 entry listing 5 sites and 3 feature categories
- [ ] Repo `projects/reader-mode/` committed; v1.0.0 tag created; GitHub Release published
- [ ] Greasy Fork source URL ready (paste-ready snippet ready to submit)
- [ ] Manual final smoke test: install from local `dist`, verify all 5 sites work end-to-end

## User stories covered

20

## Blocked by

- #2 (CSDN) — at minimum, to demo and screenshot
