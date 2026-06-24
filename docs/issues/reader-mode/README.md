# reader-mode Issues

Issue breakdown for the `reader-mode` Tampermonkey plugin. Each file in this directory is one issue. Use this README as the dependency-ordered roadmap.

## v1.0 — 5 sites, 0-config, ships to Greasy Fork

| # | Issue | Blocked by | Stories |
|---|---|---|---|
| 1 | [Bootstrap](./001-bootstrap.md) | — | 16, 17, 18, 19, 20 |
| 2 | [CSDN](./002-csdn-full-feature.md) | #1 | 1, 2, 3, 4, 13, 23, 24 |
| 3 | [知乎](./003-zhihu-full-feature.md) | #1 | 5, 6, 7, 8, 9, 13, 23, 24 |
| 4 | [掘金](./004-juejin-full-feature.md) | #1 | 10, 23, 24 |
| 5 | [简书](./005-jianshu-full-feature.md) | #1 | 11, 23, 24 |
| 6 | [B站专栏](./006-bilibili-read-full-feature.md) | #1 | 12, 23, 24 |
| 7 | [Cross-site layout polish](./007-cross-site-layout-polish.md) | #2, #3 | 13, 14, 15, 23 |
| 8 | [v1.0 release prep](./008-v1-release-prep.md) | #2 | 20 |

## v1.1 — Dark mode + settings panel

| # | Issue | Blocked by | Stories |
|---|---|---|---|
| 9 | [Dark mode](./009-v1.1-dark-mode.md) | — | (PRD #12) |
| 10 | [Settings panel](./010-v1.1-settings-panel.md) | — | 21, 22 |

## Recommended execution order

1. **#1 first** — foundation / prefactor
2. **#2-#6 in parallel** after #1 — 5 site slices are independent of each other; assign to 5 different sessions / days as bandwidth allows
3. **#7 after #2 and #3 land** — cross-site polish needs 2 site modules merged to validate
4. **#8 last** — release prep needs at least #2 done to demo and screenshot
5. **v1.1 issues** can start any time after v1.0 ships

## Publishing to GitHub Issues

These are stored as local markdown files because the `gh` CLI is not yet installed on this machine. To publish:

1. Install `gh`: `winget install --id GitHub.cli` (or `scoop install gh` / `choco install gh`)
2. `gh auth login`
3. From the repo root, run for each issue:
   ```bash
   gh issue create --label "ready-for-agent" \
     --title "Issue 1: Bootstrap reader-mode project skeleton" \
     --body-file docs/issues/reader-mode/001-bootstrap.md
   ```
4. Capture the resulting issue numbers and update each issue's "Blocked by" line with the actual issue numbers (currently the relative file references are placeholders)
5. Or ask Mavis to do steps 3-5 once `gh` is installed and authenticated

## Why local files for now

The `/setup-matt-pocock-skills` skill ran with `gh` not available, so issue publishing is deferred. The local markdown files are ready-to-publish: the issue body templates match what the `to-issues` skill generates and the GitHub issue UI accepts multi-line bodies.
