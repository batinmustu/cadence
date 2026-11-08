# Cadence — agent status
Last updated: 2026-11-08T13:05Z · Current milestone: v0.1 Foundation

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
| #13 | feat(core): platform character counting | #57 | 2026-11-08 |
| #14 | feat(db): posts repository | #58 | 2026-11-08 |
| #15 | feat(editor): editor screen and variant tabs | #59 | 2026-11-08 |
| #16 | feat(editor): schema-driven field renderer | #60 | 2026-11-08 |
| #17 | feat(editor): schedule, publish and copy | #61 | 2026-11-08 |
| #18 | feat: tags | #62 | 2026-11-08 |
| #19 | feat(core): series rhythm and slot calculation | #63 | 2026-11-08 |

## Blocked / needs decision
- none

## Next up
- #20 feat(db): series repository

## Notes
- #18: tags are case-insensitive unique ("Launch" = "launch"), stored without `#`. Capture box and editor header have a tag input (Enter or comma adds, Backspace removes last, autocomplete from existing tags). The ideas list filters by one tag via a dropdown shown once any tag exists. Tags cannot be renamed/deleted yet.
- #19: `upcomingSlots` uses weekdays 0=Sunday…6 (7 also Sunday) to match `weekdays.ts`; build plan Section 6 says 1–7 Mon=1 — the repository (#20) must store/convert accordingly (decision needed from owner if they prefer Mon=1). Monthly = first occurrence in the month of the first listed weekday. Slots before `anchor_date` are not generated. Pure `Intl`, no new dependencies.
- #17: the header Schedule button moved into a per-variant action bar under the fields (Copy, Schedule/Reschedule, Mark as published). Copy copies the whole variant (text-like fields, checklists skipped); each part also has its own copy button. Clipboard goes through the adapter; real clipboard needs manual testing in the desktop app. Times use the local time zone, stored as UTC ISO.
- #16: adds dev deps `jsdom`, `@testing-library/react`, `@testing-library/dom`, `@testing-library/user-event` for component tests (opt in per file with `// @vitest-environment jsdom`). Field edits autosave after 600 ms (flushed on leave). Splitting a part is enabled only when it is over the limit; `splitIntoParts` lives in `core/parts.ts`. Field labels use i18n if the key exists, else plain text. "Add media" and "Copy" buttons from the design are left to #17.
- #15: route `ideas/$id` with title autosave (600 ms debounce, flushed on leave), variant tabs and a platform → content type picker. The status menu only toggles Archived (other statuses are derived from posts). Schedule is disabled until #17; variant bodies are placeholders until #16.
- #14: scheduling a post requires `scheduledAt`; moving it back to draft clears the date; publishing stamps `publishedAt`. Every post write re-derives the idea status in the same transaction (archived stays manual).
- #13: `countChars(text, rule)`; rule `x` = URLs 23, emoji and CJK (Han/Kana/Hangul) 2, everything else 1; unknown rule names fall back to plain graphemes. Not yet wired into validation (UI counters come with #16).
- #12: value shapes — text/longtext `string`, parts `string[]`, outline `{text, timestamp?}[]`, checklist `{item: done}`. Lengths are counted in code points until #13 adds count rules.
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
