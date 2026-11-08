# Cadence — agent status
Last updated: 2026-11-08T11:20Z · Current milestone: v0.1 Foundation

## Done
| Issue | Title | PR | Merged |
|---|---|---|---|
| — | docs: project foundation | #43 | 2026-11 |
| — | docs: agent run process and status file | #44 | 2026-11-08 |
| #1 | chore: scaffold Tauri 2 + React + TypeScript app | #45 | 2026-11-08 |
| #2 | chore: add Biome, Vitest, Playwright and pre-commit hooks | #46 | 2026-11-08 |
| #3 | ci: run checks on pull requests | #47 | 2026-11-08 |
| #4 | chore: add design tokens, base components and icons | #48 | 2026-11-08 |

## Blocked / needs decision
- none

## Next up
- #5 chore(i18n): set up English and Turkish

## Notes
- #4: Segmented uses buttons with aria-pressed (Biome a11y forbids role=radio on buttons). Gallery at /__components is dev-only, strings not i18n'd.
- #3: owner should add required checks `Checks (Ubuntu)` and `Build (macOS)`; the macOS build is unverified locally.
- #2: Playwright is pinned to 1.63.0 to match the browser preinstalled in cloud sessions; Biome covers src, e2e and root configs only (not docs/md/yml).
- #1: app icon is a placeholder; `pnpm tauri dev` / macOS title bar need manual testing.
- Run process changed: draft `agent` PR marker, status file, self-merge (no lock branch).
