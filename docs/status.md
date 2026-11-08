# Cadence — agent status
Last updated: 2026-11-08T12:00Z · Current milestone: v0.1 Foundation

## Done
| Issue | Title | PR | Merged |
|---|---|---|---|
| — | docs: project foundation | #43 | 2026-11 |
| — | docs: agent run process and status file | #44 | 2026-11-08 |
| #1 | chore: scaffold Tauri 2 + React + TypeScript app | #45 | 2026-11-08 |
| #2 | chore: add Biome, Vitest, Playwright and pre-commit hooks | #46 | 2026-11-08 |
| #3 | ci: run checks on pull requests | #47 | 2026-11-08 |
| #4 | chore: add design tokens, base components and icons | #48 | 2026-11-08 |
| #5 | chore(i18n): set up English and Turkish | #49 | 2026-11-08 |
| #6 | feat(db): SQLite setup, migrations and seed | #50 | 2026-11-08 |
| #7 | feat(core): ideas domain and repository | #51 | 2026-11-08 |
| #8 | feat(ui): app shell, sidebar and macOS window | #52 | 2026-11-08 |
| #9 | feat(ideas): Ideas screen with quick capture | #53 | 2026-11-08 |
| #10 | feat(ui): collapsible sidebar | #54 | 2026-11-08 |
| #11 | feat: global shortcut to open quick capture | #55 | 2026-11-08 |
| #12 | feat(core): content field schema and validation | #56 | 2026-11-08 |

## Blocked / needs decision
- none

## Next up
- #13 feat(core): platform character counting

## Notes
- #12: value shapes — text/longtext `string`, parts `string[]`, outline `{text, timestamp?}[]`, checklist `{item: done}`. Lengths are counted in code points until #13 adds count rules. Closing keywords do not auto-close issues here, so runs close them explicitly.
- #11: adds `tauri-plugin-global-shortcut` (Rust) and `@tauri-apps/api` (event listener in the Tauri adapter). ⌥Space is registered in Rust and emits `quick-capture`; macOS behaviour (shortcut, focus) needs manual testing. If another app owns ⌥Space, registration failure is logged and the app still starts. Not configurable yet.
- #10: collapsed state is stored in `settings` (`sidebar.collapsed`); the browser DB is in-memory so restore-on-launch is covered by repository tests and needs manual testing in the desktop app, as does the ⌃⌘S shortcut on macOS. The collapsed-strip search button is inert until search exists.
- #9: capture platform toggles are remembered in localStorage; series picker and tag button are not built yet (series/tags issues). Archived ideas are hidden under "All". Row icon is a generic lightbulb until posts/content types exist.
- #8: added `@tanstack/react-router`; screens are placeholders. `trafficLightPosition` (x18,y24) and drag regions need manual testing on macOS; Windows/Linux window controls are not built yet. Also fixed a flaky link-ordering bug in the ideas repository (#7). Remote feature branches are not auto-deleted (the proxy forbids ref deletion) — owner may clean up `feat/*` branches.
- #7: idea status is derived from post statuses (`scheduled`/`published`); `archived` is manual and never overridden. "This week" = the last 6 days before today.
- #6: the Tauri SQL plugin pools connections, so `transaction()` there runs statements sequentially (no real BEGIN/COMMIT); migrations/seed are written to be re-runnable. Real SQLite on desktop needs manual testing. `main.tsx` now awaits `prepareDatabase` before first render.
- #4: Segmented uses buttons with aria-pressed (Biome a11y forbids role=radio on buttons). Gallery at /__components is dev-only, strings not i18n'd.
- #3: owner should add required checks `Checks (Ubuntu)` and `Build (macOS)`; the macOS build is unverified locally.
- #2: Playwright is pinned to 1.63.0 to match the browser preinstalled in cloud sessions; Biome covers src, e2e and root configs only (not docs/md/yml).
- #1: app icon is a placeholder; `pnpm tauri dev` / macOS title bar need manual testing.
- Run process changed: draft `agent` PR marker, status file, self-merge (no lock branch).
