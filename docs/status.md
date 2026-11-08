# Cadence — agent status
Last updated: 2026-11-08T20:30Z · Current milestone: v0.1 Foundation

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
| #20 | feat(db): series repository | #64 | 2026-11-08 |
| #21 | feat(series): create series and sidebar list | #65 | 2026-11-08 |
| #22 | feat(series): series screen and settings panel | #66 | 2026-11-08 |
| #23 | feat(calendar): month view | #67 | 2026-11-08 |
| #24 | feat(calendar): drag ideas to schedule | #68 | 2026-11-08 |
| #25 | feat: reminders for empty series slots | #69 | 2026-11-08 |
| #26 | feat(rust): keychain secrets commands | #70 | 2026-11-08 |
| #27 | feat(rust): AI request layer with providers | #71 | 2026-11-08 |
| #28 | feat(settings): AI settings screen | #72 | 2026-11-08 |
| #29 | feat(core): prompt builder | #73 | 2026-11-08 |
| #30 | feat(ai): preset commands | #74 | 2026-11-08 |
| #31 | feat(editor): assistant panel | #75 | 2026-11-08 |
| #32 | feat(series): AI draft for an empty slot | #76 | 2026-11-08 |
| #33 | feat(calendar): fill empty slots with AI | #77 | 2026-11-08 |
| #34 | feat(settings): manage platforms and content types | #78 | 2026-11-08 |
| #35 | feat(settings): general settings | #79 | 2026-11-08 |
| #36 | feat(data): export, import and backup | #80 | 2026-11-08 |
| #37 | feat: onboarding | #81 | 2026-11-08 |
| #38 | ci: release workflow | #82 | 2026-11-08 |
| #41 | docs: screenshots and user guide | #83 | 2026-11-08 |

## Blocked / needs decision
- #40 feat: auto-update — needs an updater signing keypair (pubkey in tauri.conf.json, private key as secret); see the issue comment

## Next up
- Backlog complete — only owner tasks and #40 (needs-decision) remain

## Notes
- Backlog complete — only owner tasks remain, plus #40 which waits for the owner's updater key.
- #41: `pnpm screenshots` (scripts/screenshots.mjs) starts its own dev server on port 1421 and writes `docs/screenshots/*.png` (ideas, editor, calendar) from browser mode with demo ideas typed into the capture box; no new dependencies. Screenshots are dark theme at 2x. The Install section describes the .dmg from Releases and does not exist until the first release.
- #38: `.github/workflows/release.yml` runs release-please on every push to main (release PR with CHANGELOG + version bumps in package.json, Cargo.toml, tauri.conf.json); when its PR is merged the same workflow builds a universal macOS app with tauri-action and attaches it to the release (a release created with GITHUB_TOKEN cannot trigger a separate tag workflow). Apple secrets are passed through and ignored when empty; see `docs/releasing.md`. **Owner:** enable "Allow GitHub Actions to create and approve pull requests" in repo Actions settings (I may not change repo settings). The workflow cannot be tested before a release PR is merged; the first run needs a look.
- #37: first-launch overlay (`features/onboarding`) rendered by the app shell: welcome + language, optional AI provider/key, optional first series (reuses the new-series dialog). Skip or finish stores setting `onboarding.done`. Playwright starts the dev server with `VITE_SKIP_ONBOARDING=1` because the browser DB is in-memory and the overlay would cover every test page. Existing desktop users with data will see it once too (no data check); skip hides it for good. Real keychain key storage needs manual testing on macOS.
- #36: Settings → Data. Export is a versioned JSON (`format: cadence-export`, `version: 1`, all tables, no API keys; validated by `core/backup.ts`). Import works only when there are no ideas/series/posts/tags; the file is fully validated first (unknown tables/columns, missing fields, dangling references), and if inserting still fails the database is emptied and re-seeded because the desktop SQL plugin has no real transactions. After a successful import the app reloads. Rust `files.rs` adds `save_export` (writes to Downloads, plain file names only), `reveal_database` and `backup_target` (keeps the last 7 `cadence-YYYY-MM-DD.db` in `<app config>/backups`); the copy itself is made by `VACUUM INTO` at startup (`dailyBackup.ts`), at most once a day. No new dependencies. **Needs manual testing on macOS/desktop:** export location, reveal in Finder, the backups folder filling up, importing a file via the system file picker.
- #35: Settings → General stores `general.language` (system/en/tr), `general.weekStart` (monday/sunday) and `general.captureShortcut` (default `Alt+Space`) in settings; applied at startup (`main.tsx`). The week start only affects the calendar grid for now. New Rust command `set_capture_shortcut` re-registers the global shortcut and keeps the old one if registration fails. **Needs manual testing on macOS:** recording a shortcut, shortcuts that another app owns, and that the new shortcut opens quick capture.
- #34: Settings → Platforms. "Hidden" platforms are stored in setting `platforms.hidden` (JSON id list, no migration): hidden ones are not offered in the new-series dialog, the series platform select, the capture box or the editor's add-variant menu (existing data stays visible). Presets can only be hidden; custom platforms/content types can be deleted only when no post, series, idea or command uses them (otherwise a message is shown). Content types are edited through `core/platforms.ts checkSchema`, which round-trips through the #12 validator; field keys are generated from labels, and editing an existing field's label does not change its key. Count rules offered: plain, x.
- #33: the Fill with AI card appears in the calendar side panel when there are future empty series slots on days shown in the grid; the dialog lists them all ticked, nothing is created until "Create N drafts". Drafts are created one after another via the shared `features/series/aiDraft.ts`; the first failure stops the run and shows the error (drafts already made stay).
- #32: AI draft creates an idea (title = first line of the answer) with a post of the series platform's first content type, scheduled into the slot, and tags the idea "AI draft" (translated at creation time) as the visible marker, then opens the editor. Prompt uses the series template/description and up to 5 recent posts (`core/seriesDraft.ts`). Branch deletion after merge is blocked by the proxy (403), so merged branches like `feat/31-assistant-panel` remain on origin and can be deleted manually.
- #31: `core/assist.ts` `applyResult` decides where a result card goes: Replace/Insert below target the first long text field, else parts, else short text (parts results are split on blank lines, numbering stripped, limits honoured); Use puts a result into the first short text field (e.g. a title) and falls back to the body. The panel is disabled until a key is stored. Browser mock AI streams "Mock AI response." and honours the options contract. Real streaming and cancel against providers need manual testing.
- #30: migration `0002` adds `ai_commands.returns_options` (commands that return several options; the assistant panel #31 passes it as `expectsOptions` to `buildPrompt`). Eight presets are seeded once per database (guarded by setting `ai.commandsSeeded`) so a deleted preset does not come back; they are normal rows, editable and deletable. Targets: Split into thread → X/Post; Suggest titles, Expand script, Write description → YouTube/Video (not Short); the rest apply to all types. A command has a single content type (or all), as in the data model. The commands list lives under Settings → AI.
- #29: `core/prompt.ts` — `buildPrompt({tone, contentTypeName, schema, values, commandPrompt, freeText, expectsOptions})` returns `{system, prompt}`; checklists and empty fields are left out; `parseOptions` reads `{"options": [...]}` (tolerates code fences/extra text) and falls back to the raw text. Snapshot is an inline snapshot of the thread prompt; the preset-command snapshots come with #30.
- #28: `/settings` redirects to `/settings/ai`; the other sections (General, Platforms, Data) are "Coming soon" placeholders until #34–#36. Settings keys: `ai.provider`, `ai.model.<provider>`, `ai.tone`, `ai.ollama.baseUrl`, `ai.verified.<provider>`. The API key is write-only (field cleared after save, Remove key to clear). The sidebar shows "AI connected · model" once a key is stored (Ollama: once a connection test succeeded); it does not re-ping the provider. OpenRouter/Ollama take a free-text model name. Real keychain and provider tests need manual testing on macOS.
- #27: adds crates `reqwest` (rustls, stream), `tokio`, `futures-util`, `serde_json`. Commands `ai_complete` (emits `ai-chunk` {requestId, chunk} and `ai-done` events; returns a typed error `{kind: auth|rate_limit|network|timeout|provider|cancelled|config, message}`), `ai_cancel(requestId)`, `ai_test(provider, baseUrl?)` (GET the provider's model list). 60 s idle timeout, 15 s connect timeout. Tests use a local TCP mock server, no real network. The Tauri adapter cancels the Rust request if the consumer stops iterating. Real provider calls (Anthropic/OpenAI/OpenRouter/Ollama) need manual testing with real keys; `testConnection` now takes an optional `baseUrl`.
- #26: adds crates `keyring` (per-OS native backends; on Linux `sync-secret-service`) and `serde`. Commands `secret_set/has/clear` accept only the four known providers; errors never contain key material. A `get` exists on the Rust `SecretStore` trait only, for the AI layer (#27). The Tauri adapter in `src/platform/tauri/secrets.ts` now uses them instead of the in-memory stub. Real macOS Keychain access needs manual testing; Linux builds of the keychain backend need libdbus at link time of the full app (not hit by cargo check/test here).
- #25: adds `@tauri-apps/plugin-notification` and `tauri-plugin-notification` (capability `notification:default`). The desktop plugin has no persistent scheduler, so the Tauri adapter uses in-process timers; reminders are re-planned at launch, after any write to posts/ideas/series (1 s debounce) and every 6 h, 14 days ahead. Reminders only fire while the app is running. A reminder already in the past is skipped. Notification permission prompt and delivery on macOS need manual testing.
- #24: the calendar's right panel lists ideas with status idea/draft. Drag one onto a day (HTML5 drag and drop) or pick it in the select and press "Choose date…": both open a small schedule dialog (date + time, default 09:00). It reuses the idea's draft post or creates one on the idea's first platform. Native drag-and-drop is covered only by the keyboard path in tests; real dragging needs manual testing. The "Fill with AI" card comes with #33.
- #23: `/calendar` shows 6 Monday-first weeks for the chosen month (prev/next/today). Planned and published posts appear as chips (max 3 per day, then "+N more"); empty series slots (future only) are dashed chips linking to the series; clicking a post opens its idea in the editor. Drafts are not shown. The right-hand panel (unscheduled ideas, Fill with AI) comes with #24/#33. The shell e2e test now checks the grid instead of a "Calendar" heading.
- #22: `/series/<id>` shows the next 4 slots (120-day horizon, local time zone), unscheduled ideas, published ideas and a settings panel with 600 ms autosave (flushed on leave). "Assign idea" reuses the idea's draft post or creates one with the platform's first content type, then schedules it into the slot. The **AI draft** button is left out until #32. "Remind me" is stored as 24 h (`remind_before_hours`); the lead time is not configurable yet. Series description is shown but not editable.
- #21: the "+" dialog (name, platform, days, time, frequency) creates the series and opens `/series/<id>` (still a placeholder until #22). The sidebar and the capture box's series picker refresh through a small change signal (`features/series/seriesEvents.ts`). The dialog has no focus trap yet. `Input`/`Select`/`Textarea` now accept `ref` (React 19).
- #20: series weekdays are stored as a JSON array of 0=Sunday…6 (see #19 note), in the order given (monthly uses the first). `softDelete` detaches the series' ideas. Series posts are found through `ideas.series_id`.
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
