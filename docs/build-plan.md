# Cadence — Build Plan

This file is the single source of truth for building Cadence with Claude Code.
It is written for an AI agent working **unattended in scheduled cloud sessions**.
Read it fully at the start of every run.

Repository: `batinmustu/cadence` · License: MIT (already in the repo)

Contents:

1. Product
2. Run protocol (read first, every run)
3. Bootstrap (first run only)
4. CLAUDE.md (verbatim content to commit)
5. Architecture and folder structure
6. Data model
7. Design specification
8. Architecture decisions (ADRs to commit)
9. Repository files to create
10. Milestones and issues (complete backlog)

---

## 1. Product

Cadence is a calm, local-first desktop app for planning social media content.
One person captures ideas, turns them into platform-specific drafts (X threads,
YouTube videos, …), groups them into recurring **series** with a publishing
rhythm, and uses their own AI API key for writing help.

- macOS first, built with Tauri 2. Windows and mobile later.
- Single user. No backend, no account, no telemetry. Data in local SQLite.
- Cadence never publishes to platforms. It plans, drafts and reminds.
- Platforms are extensible: X and YouTube ship as presets.

---

## 2. Run protocol (every run)

Scheduled sessions run hourly and unattended. The agent merges its own PRs;
the owner reviews everything later. There is no lock branch: an open **draft PR
labelled `agent`** is the marker that a run is working.

### 2.1 Is another run working?

1. If branch `agent-lock` exists on origin, delete it. It is obsolete.
2. List open PRs labelled `agent`. If any is not labelled `blocked` and was
   updated less than 120 minutes ago, another run is active: end with
   "Skipped: another run is in progress."
3. If one is older than 120 minutes and not `blocked`, a previous run was
   interrupted: take it over (check out its branch, finish the work).

### 2.2 Work loop

1. Read `CLAUDE.md`, this file and `docs/status.md`. If the foundation is not on `main`, bootstrap (Section 3).
2. Repeat: take over an interrupted PR or fix a `blocked` PR if a fix is now
   possible; otherwise take the lowest-numbered eligible issue (open, every
   `Depends on:` issue closed, not `needs-decision`/`blocked`/`owner-task`).
3. Stop when no issue is eligible, 8 PRs were merged in the run, or context runs long.
4. When only `owner-task` issues remain open, write "Backlog complete — only
   owner tasks remain" in the Notes of `docs/status.md` in the last PR.

### 2.3 Starting, finishing and merging a PR

1. On starting an issue: create the branch, push an initial commit and
   immediately open a **draft** PR with label `agent` and `Closes #<issue>`.
   Push commits as you go so `updatedAt` stays fresh.
2. Before marking ready, update `docs/status.md` in the same PR.
3. Run all local checks (CLAUDE.md → Commands), mark the PR ready and wait for
   CI: `gh pr checks <n> --watch` (give up after 30 minutes).
4. If all checks pass (or no CI exists on `main` yet and all local checks
   passed), merge with `gh pr merge <n> --squash --delete-branch`.
5. On failure, fix and push. After 3 failed attempts, label the PR `blocked`,
   comment what fails, record it in `docs/status.md` in the next PR and move on.
6. Never use admin bypass, never force-push `main`, never change repository
   settings or rulesets. Never work on `owner-task` issues.

### 2.4 Implementing an issue

Branch `feat/<issue>-short-name` (or `fix/`, `chore/`, `ci/`, `docs/`) from `main`;
plan in the PR description; small Conventional Commits; run the full check suite
without disabling any check; PR with the template, `Closes #<issue>`,
"Needs manual testing" and label `agent`.

### 2.5 `docs/status.md`

Every merged PR updates it: Done table (issue order), Blocked / needs decision,
Next up, short Notes.

### 2.6 When something is unclear

Do not guess on product or architecture. Comment on the issue with a concrete
question and 2–3 options with a recommendation, label it `needs-decision`, move on.

### 2.7 Hard rules

- Never commit secrets. No network calls except to the user's configured AI provider.
- Do not change an accepted ADR; propose a new one in its own PR.
- Do not change repository settings, rulesets or secrets.

### 2.8 Finish

End with a short summary: PRs merged, PRs left open and why,
`needs-decision`/`blocked` issues, and what the next run picks up.

---

## 3. Bootstrap (first run only)

Goal: one PR that sets up the repository, plus the GitHub issues.

1. Create branch `docs/project-foundation`.
2. Commit these files (contents in the sections referenced):
   - `CLAUDE.md` — Section 4, verbatim.
   - `docs/build-plan.md` — **this entire file**, verbatim. If this file was
     added to the repo root as `BUILD_PLAN.md`, move it with `git mv`.
   - `docs/adr/0000-template.md` … `0004-…` — Section 8.
   - `docs/design/README.md` — Section 7, verbatim.
   - Everything listed in Section 9.
3. Labels (create if missing): `agent`, `needs-decision`, `blocked`,
   `owner-task`, `bug`, `enhancement`, `ui`, `core`, `db`, `rust`, `ai`, `ci`.
4. Milestones (create if missing):
   `v0.1 Foundation`, `v0.2 Editor`, `v0.3 Series & Calendar`, `v0.4 AI`,
   `v0.5 Platforms & Data`, `v1.0 Release`.
5. Issues: create **every issue in Section 10**, in order, so GitHub numbers
   match the `#` numbers used there. Title and body exactly as written, with
   the milestone and labels given. Before creating, check by title that it
   does not already exist (runs must be idempotent). If numbering would not
   match (e.g. existing issues), keep the order and rewrite every
   `Depends on:` line to the real numbers.
6. Open the PR titled `docs: project foundation` with a body that lists what
   was created. Stop.

---

## 4. CLAUDE.md

Commit the following as `CLAUDE.md` in the repository root.

````markdown
# CLAUDE.md

Guidance for Claude Code in this repository. Read it fully before every task.
The full backlog, run protocol and design spec are in `docs/build-plan.md`.

## What Cadence is

A calm, local-first desktop app for planning social media content: capture
ideas, turn them into platform-specific drafts, group them into recurring
series, and get writing help from the user's own AI provider. Single user,
no backend, no telemetry. Cadence never publishes to platforms.

## Stack

| Layer | Choice |
|---|---|
| Shell | Tauri 2 (Rust) |
| UI | React + TypeScript (strict) + Vite |
| Styling | Tailwind CSS with design tokens in `src/styles/tokens.css` |
| State | Zustand |
| Routing | TanStack Router |
| Database | SQLite via `tauri-plugin-sql` |
| i18n | i18next + react-i18next (`en`, `tr`) |
| Tests | Vitest + Testing Library; Playwright for browser-mode UI checks; `cargo test` |
| Lint/format | Biome; `cargo fmt`, `cargo clippy` |
| Package manager | pnpm |

Explain every new dependency in the PR description.

## Architecture rules

1. Business logic lives in `src/core/`: pure TypeScript, no React, no Tauri,
   fully unit-tested. It must be reusable for a future mobile app.
2. Rust (`src-tauri/`) is a thin layer: window, OS keychain, outbound AI HTTP
   requests, notifications, file system. Nothing else.
3. Every Tauri API is reached through an adapter interface in `src/platform/`.
   Each adapter has a Tauri implementation and a **browser implementation**
   (in-memory data, mock AI), selected at startup. The UI never imports
   `@tauri-apps/*` directly.
4. API keys never reach the web view. They are stored in the OS keychain and
   used only in Rust (ADR 0004).
5. Platforms and content types are data, not code. No enum or `switch` on
   platform names anywhere (ADR 0003).
6. IDs are UUIDv7 strings. Every table has `created_at` and `updated_at`
   (ISO 8601 UTC); user content has `deleted_at` (ADR 0002).
7. Migrations are append-only. Never edit a migration that is on `main`.
8. All user-facing text goes through i18n, in both `en` and `tr`.
9. Use design tokens. No raw hex values in components.

## Commands

```bash
pnpm install
pnpm dev            # UI in a browser with browser adapters
pnpm tauri dev      # desktop app (local machine only, never in cloud)
pnpm lint           # biome check
pnpm typecheck      # tsc --noEmit
pnpm test           # vitest run
pnpm test:e2e       # playwright against pnpm dev (from v0.1 #7)
cargo fmt --manifest-path src-tauri/Cargo.toml --check
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml
```

A task is done only when all of these pass. Report results honestly.

## Working in a cloud session

- No display. Never run `pnpm tauri dev`. Verify with the commands above.
- Compiling the Rust side needs `libwebkit2gtk-4.1-dev libgtk-3-dev
  libayatana-appindicator3-dev librsvg2-dev` (environment setup script).
- Check UI work through `pnpm dev` + Playwright; attach screenshots to PRs
  when possible.
- macOS-only behaviour (traffic lights, keychain, notifications, signing) cannot
  be verified here. List it under "Needs manual testing" in the PR.

## Workflow

- Never commit to `main`. Branch → draft PR (label `agent`, `Closes #n`) → ready → merge when CI is green.
  Scheduled runs merge their own PRs (`gh pr merge --squash --delete-branch`); the owner reviews afterwards.
  No lock branch: an open `agent` draft PR updated within 120 minutes means another run is working.
  Never use admin bypass or force-push `main`. Every PR updates `docs/status.md`.
- Branches: `feat/<issue>-short-name`, `fix/…`, `chore/…`, `ci/…`, `docs/…`.
- Conventional Commits for commits and PR titles: `feat(series): show empty slots`.
- One issue per PR, under ~400 changed lines where possible.
- New behaviour needs tests; bug fixes need a regression test.
- Architecture changes need a new ADR in `docs/adr/`.
- Follow the run protocol in `docs/build-plan.md` Section 2 during scheduled runs.

## Code style

- TypeScript strict, `noUncheckedIndexedAccess`. No `any`. No `!` without a comment.
- Small pure functions in `src/core/`; thin components.
- Rust: no `unwrap()`/`expect()` outside tests; return `Result` with a
  serializable error type.
- English identifiers; comments explain why, not what.

## Never

- Commit secrets or `.env` files; log API keys or user prompts in release builds.
- Add telemetry or any network call besides the configured AI provider.
- Disable lint rules, tests or checks to get green CI.
- Change repository settings or accepted ADRs.
````

---

## 5. Architecture and folder structure

```
cadence/
├── CLAUDE.md
├── README.md
├── CONTRIBUTING.md
├── SECURITY.md
├── LICENSE
├── biome.json
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── playwright.config.ts
├── lefthook.yml
├── index.html
├── .editorconfig
├── .gitignore
├── .github/
│   ├── workflows/
│   │   ├── ci.yml
│   │   └── release.yml
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.yml
│   │   ├── feature_request.yml
│   │   └── config.yml
│   └── PULL_REQUEST_TEMPLATE.md
├── docs/
│   ├── build-plan.md
│   ├── adr/
│   └── design/
│       └── README.md
├── e2e/                         # Playwright tests (browser mode)
├── src/
│   ├── main.tsx
│   ├── app/
│   │   ├── router.tsx
│   │   ├── providers.tsx
│   │   ├── layout/              # AppShell, Sidebar, TitleStrip
│   │   └── routes/              # ideas, ideas.$id, series.$id, calendar, settings.*
│   ├── components/              # presentational UI (Button, Chip, Segmented, …)
│   ├── features/
│   │   ├── ideas/               # capture box, idea list
│   │   ├── editor/              # variant tabs, field renderer, fields/*
│   │   ├── series/
│   │   ├── calendar/
│   │   ├── assistant/           # AI side panel
│   │   └── settings/
│   ├── core/                    # pure TS domain logic + tests
│   │   ├── ids.ts               # uuidv7
│   │   ├── dates.ts             # grouping, formatting helpers
│   │   ├── ideas.ts
│   │   ├── posts.ts
│   │   ├── content-schema.ts    # field schema types + validation
│   │   ├── char-count.ts        # per-platform counting rules
│   │   ├── series.ts            # rhythm + slot calculation
│   │   └── prompts.ts           # AI prompt building
│   ├── db/
│   │   ├── migrations/          # 0001_init.sql, 0002_…
│   │   ├── seed/                # platform presets, AI command presets
│   │   └── repositories/        # ideas, posts, series, tags, platforms, commands, settings
│   ├── platform/
│   │   ├── types.ts             # adapter interfaces
│   │   ├── index.ts             # picks tauri or browser implementation
│   │   ├── tauri/
│   │   └── browser/
│   ├── stores/                  # Zustand stores
│   ├── i18n/
│   │   ├── index.ts
│   │   └── locales/{en,tr}.json
│   └── styles/
│       ├── tokens.css
│       └── globals.css
└── src-tauri/
    ├── Cargo.toml
    ├── tauri.conf.json
    ├── capabilities/
    └── src/
        ├── main.rs
        ├── lib.rs
        ├── error.rs
        ├── keychain.rs
        └── ai/
            ├── mod.rs
            ├── anthropic.rs
            ├── openai.rs          # also used for OpenRouter (compatible API)
            └── ollama.rs
```

### Adapter interfaces (`src/platform/types.ts`)

- `Database` — `select`, `execute`, `transaction`, migration runner.
- `Secrets` — `setKey(provider, key)`, `hasKey(provider)`, `clearKey(provider)`.
  There is deliberately no `getKey`.
- `AI` — `complete(request)` returning a stream of text chunks; `testConnection(provider)`.
- `Window` — `platform: 'macos' | 'windows' | 'linux' | 'web'`, drag regions, `isFullscreen`/`onFullscreenChange`.
- `Notifications` — `schedule`, `cancel`.
- `Clipboard` — `writeText`.

---

## 6. Data model

All IDs `TEXT` UUIDv7. Timestamps `TEXT` ISO 8601 UTC.
Every table: `id`, `created_at`, `updated_at`. User content also has `deleted_at`.

| Table | Columns |
|---|---|
| `platforms` | `name`, `icon` (icon key), `sort_order`, `is_preset` |
| `content_types` | `platform_id`, `name`, `field_schema` (JSON), `sort_order`, `is_preset` |
| `ideas` | `title`, `note`, `status` (`idea`/`draft`/`planned`/`published`/`archived`), `series_id` (nullable), `deleted_at` |
| `idea_platforms` | `idea_id`, `platform_id` — platforms chosen at capture |
| `posts` | `idea_id`, `content_type_id`, `fields` (JSON matching the schema), `status`, `scheduled_at`, `published_at`, `published_url`, `after_note`, `deleted_at` |
| `series` | `name`, `description`, `platform_id`, `weekdays` (JSON array 1–7, Mon=1), `time` (`HH:MM`), `frequency` (`weekly`/`biweekly`/`monthly`), `anchor_date`, `template`, `remind_before_hours`, `deleted_at` |
| `tags` | `name` (unique) |
| `idea_tags` | `idea_id`, `tag_id` |
| `ai_commands` | `name`, `prompt`, `content_type_id` (nullable = all), `sort_order`, `is_preset` |
| `settings` | `key`, `value` (JSON) — language, AI provider/model, tone note, sidebar state |

Status of an idea is derived from its posts where possible
(any planned post → `planned`); keep that logic in `src/core/ideas.ts`.

### Field schema (`content_types.field_schema`)

```json
{
  "fields": [
    { "key": "title", "kind": "text", "label": "Title", "max": 100 },
    { "key": "description", "kind": "longtext", "max": 5000 },
    { "key": "thumbnail", "kind": "text" },
    { "key": "script", "kind": "outline" },
    { "key": "production", "kind": "checklist", "items": ["Script", "Shoot", "Edit", "Thumbnail"] }
  ]
}
```

Field kinds: `text`, `longtext`, `parts` (ordered list of texts, each with
`maxPerPart`, used for threads), `outline` (items with optional timestamp),
`checklist`. Labels are i18n keys for presets and plain text for user-made types.

### Presets (seed)

- **X:** `Post` (`parts`, 1 part, max 280), `Thread` (`parts`, max 280 each).
- **YouTube:** `Video` (title 100, description 5000, thumbnail, script outline,
  production checklist), `Short` (title 100, description 5000, script outline).

### Series slot rules (`src/core/series.ts`)

- `weekly`: every listed weekday at `time`, in the user's local time zone.
- `biweekly`: as weekly, every other week counted from `anchor_date`.
- `monthly`: the first listed weekday of each month.
- A slot is **filled** if a post in that series is scheduled within the same
  local day; otherwise **empty**.
- Must be correct across DST changes (Europe/Istanbul has none; test with
  Europe/Berlin and America/New_York).

---

## 7. Design specification

Commit this section as `docs/design/README.md` (from the heading below to the
end of Section 7).

````markdown
# Design

Dark, monochrome and quiet. Content is the focus. Colour is not used to encode
state; text, weight and borders are.

## Tokens

| Token | Value | Use |
|---|---|---|
| `--bg` | `#0C0C0D` | window background |
| `--bg-sidebar` | `#0A0A0B` | sidebar |
| `--surface` | `#141416` | inputs, cards, selected rows |
| `--surface-2` | `#1F1F22` | chips, icon tiles, active nav |
| `--surface-3` | `#26262A` | active segment |
| `--border` | `#1F1F22` | default borders |
| `--border-input` | `#242427` | input and secondary button borders |
| `--border-strong` | `#333338` | emphasis (planned date, active toggle, over-limit) |
| `--divider` | `#1A1A1D` | separators between panes and rows |
| `--text` | `#E8E8EA` | primary text; primary button background |
| `--text-2` | `#B4B4BA` | secondary text |
| `--text-3` | `#8B8B92` | muted text, idle icons |
| `--text-4` | `#6E6E75` | section labels, hints |

- Font: Inter 400/500/600. Base 14px; labels 12px; page titles 20px/600.
- Radii: 6–8px chips/buttons, 10px rows/inputs, 16px capture box.
- Icons: line icons, 1.7px stroke, 15–18px (lucide-react is fine). No emoji, no brand logos.
- One primary action per view: light button (`--text` background, `--bg` text).
- Window: 1200×760 default, min 960×640.

## Window chrome

- macOS: `titleBarStyle: "Overlay"`, `hiddenTitle: true`,
  `trafficLightPosition` aligned with the sidebar's first row (≈ x 18, y 24).
- The sidebar's first row and a 36px strip above the content are drag regions.
- Windows/Linux (later): minimise/maximise/close at the top-right of the
  content strip, behind the `Window` adapter.

## Sidebar (240px)

1. Row 1: space for traffic lights; "hide sidebar" icon button on the right (⌃⌘S).
2. Search button with `⌘K` hint.
3. Nav: Ideas (count), Calendar, Published.
4. **Series** heading with `+`; one row per series: layers icon, name, weekday
   shorthand on the right (`Sun`, `Wed`, `2w`). Active row uses `--surface-2`.
5. Bottom: AI status row (dot + "AI connected" + model), Settings.

Collapsed: sidebar fully hidden; traffic lights stay where they were, with
"show sidebar" and search buttons next to them. Content spans the full width.
State persists across launches.

## Ideas

- Title "Ideas" and a segmented filter: All · Draft · Planned · Published.
- Capture box (`--surface`, 16px radius): textarea "What's on your mind?",
  platform toggles (icon + name), series picker ("Series ▾"), tag button,
  round light save button. Enter saves; Shift+Enter new line.
- List grouped by date (Today, This week, Earlier). Row: 34px icon tile with
  the content type icon, title (500), one-line note (`--text-3`, ellipsis),
  status chip on the right. Planned items show the date in an outlined chip
  (`--border-strong`). Published items are dimmed with "Published ✓".
- Empty state: one line of text and the capture box focused.

## Editor

- Header: back, title, save state ("Saved"), status menu, primary **Schedule**.
- Variant tabs (segmented): one per post, `+` adds a variant (pick platform + content type).
- Fields render from the schema:
  - `parts`: one card per part with `n/N` and `count / max`. Over-limit part:
    `--border-strong` border, counter bold `--text`. Buttons: + Part, Add media, Copy.
  - `text` with counter, `longtext`, `outline` rows with timestamp column,
    `checklist` as toggle chips (done = filled `--surface-2` with ✓).
- Right panel (300px) **Assistant**: model name; command chips for this content
  type; result cards with Replace / Insert below / Use; free-text input at the bottom.

## Series

- Header: "Series" label, name (22px/600), description, chips:
  rhythm ("Every Sunday · 20:00"), platform, counts.
- Upcoming slots: filled = `--surface` card with date, title, "Planned" chip;
  empty = dashed border, "Empty", buttons **Assign idea** and **AI draft**.
- Ideas in this series (+ Add idea), then Published.
- Right panel (290px) settings: name, weekday toggles (7-column grid), time,
  frequency, platform, template textarea ("used by AI drafts"),
  checkbox "Remind me before an empty slot".

## Calendar

- Month view, Monday first, 6 rows. Day number top-left; today in a light circle.
- Chips: planned = filled `--surface-2`; empty series slot = dashed
  `--border-strong`; published = muted text. Legend below the grid.
- Right panel (250px): unscheduled ideas (drag onto a day) and a dashed card
  "N empty series slots this month" with **Fill with AI**.

## Settings → AI

- Section nav: General, Platforms, AI, Data.
- Provider segmented: Anthropic, OpenAI, OpenRouter, Local (Ollama).
- API key (password field) + **Test**; result line "✓ Connection works".
  Note: "Stored in your system keychain."
- Model select, tone-of-voice textarea ("sent with every request"),
  preset commands list (name, prompt preview, target) with + Add.
````

---

## 8. Architecture decisions (ADRs)

Create one file per ADR in `docs/adr/` using this structure:
`# NNNN. Title` · Status: Accepted · Date: (bootstrap date) · Context ·
Decision · Consequences · Alternatives considered.
Also create `0000-template.md` with the empty structure.

**0001 — Tauri 2 with React and TypeScript.**
Context: macOS-first desktop app, possible mobile later, small single-user utility.
Decision: Tauri 2 + React + TS + Vite; logic in TS, Rust thin.
Consequences: small binaries and memory; Tauri 2 mobile path; WebKit vs WebView2
differences to test when Windows is added; some Rust needed.
Alternatives: Electron (heavy), NativePHP (extra runtime), SwiftUI (no Windows,
separate mobile codebase).

**0002 — Local-first storage in SQLite.**
Context: personal drafts, no need for accounts or servers; sync may come later.
Decision: SQLite in the app-data dir via `tauri-plugin-sql`; UUIDv7 ids,
`created_at`/`updated_at`, soft deletes, append-only migrations.
Consequences: offline, free, private; export/backup needed in-app; sync needs its
own ADR later but no data migration.
Alternatives: hosted DB (accounts, cost, privacy), JSON files (poor querying).

**0003 — Platforms and content types are data.**
Context: users will want more platforms; content types differ in fields and limits.
Decision: `platforms` and `content_types` tables with JSON field schemas;
schema-driven editor; X and YouTube seeded; no code branches on platform names.
Consequences: users add platforms without a release; generic field renderer;
platform helpers become AI commands or field-kind behaviour.
Alternatives: hard-coded platform modules.

**0004 — AI API keys live in the OS keychain and never reach the web view.**
Context: users bring their own keys; leaks cost money; web view and SQLite are
easy to inspect.
Decision: Rust stores keys in the keychain (`keyring` crate); frontend can
set / test / clear / check existence, never read; AI requests are made from Rust,
streamed back as events; keys never in DB, files or logs.
Consequences: web view compromise cannot exfiltrate keys via app API; each
provider needs a small Rust adapter; Ollama uses the same path without a key.
Alternatives: keys in SQLite or settings (plain text); frontend requests (key exposed).

---

## 9. Repository files to create (bootstrap)

**`README.md`** (English): title "Cadence"; tagline "A calm, local-first planner
for your posts and content series."; status pre-alpha with link to the roadmap
(`docs/build-plan.md#10-milestones-and-issues`); "Why" (most tools are built for
teams; this is for one person who wants a quiet place and a routine); planned
features (quick capture, platform-aware drafts, series, calendar, bring your own
AI incl. Ollama, extensible platforms, local-first); "Cadence does not publish
for you"; Screenshots (coming with v0.1); tech stack; link to ADRs; Development
(coming with v0.1); "Built with Claude Code" (developed with Claude Code in
scheduled sessions using issues, small PRs, review and CI; AI commits carry a
`Co-Authored-By` trailer; conventions in CLAUDE.md); License MIT.

**`CONTRIBUTING.md`**: start with an issue; branch naming; small PRs; squash
merge; Conventional Commits with examples and allowed types; quality bar
(lint, typecheck, test, cargo checks, tests for new behaviour, screenshots for
UI, `en` + `tr` strings); ADRs for architecture changes; AI-assisted
contributions welcome, contributor responsible for every line.

**`SECURITY.md`**: report privately via GitHub "Report a vulnerability", not in
issues; response within 7 days; scope: API keys (keychain only, never DB/logs/web
view), AI requests only to configured provider, local data, builds and updates;
only latest release supported pre-1.0.

**`.github/PULL_REQUEST_TEMPLATE.md`**: sections What, Why (`Closes #`), Plan,
How it was tested (checklist: lint, typecheck, test, e2e, cargo), Needs manual
testing, Screenshots, Checklist (Conventional title, tests, `en`+`tr`, ADR if
needed, no secrets).

**`.github/ISSUE_TEMPLATE/bug_report.yml`**: What happened (required), Steps to
reproduce (required), Cadence version, OS, Screenshots or logs (remove keys).
Label `bug`.

**`.github/ISSUE_TEMPLATE/feature_request.yml`**: Problem, Proposal, Acceptance
criteria (all required), Notes. Label `enhancement`.

**`.github/ISSUE_TEMPLATE/config.yml`**: `blank_issues_enabled: false`; contact
link to `https://github.com/batinmustu/cadence/security/advisories/new`.

**`.gitignore`**: `node_modules/`, `dist/`, `src-tauri/target/`,
`src-tauri/gen/`, `.env`, `.env.*` (keep `.env.example`), `*.pem`, `*.key`, logs,
`coverage/`, `playwright-report/`, `test-results/`, `.vscode/*` (keep
`extensions.json`), `.idea/`, `.DS_Store`, `*.db`, `*.db-journal`, `*.sqlite`,
`.claude/settings.local.json`.

**`.editorconfig`**: utf-8, lf, final newline, trim whitespace (not for `.md`),
2 spaces; 4 for `.rs`.

---

## 10. Milestones and issues

Format for each issue body:

```
<description>

**Acceptance criteria**
- [ ] …

Depends on: #n, #m   (omit if none)
```

Labels in brackets. `owner-task` issues need the owner; the agent prepares
around them but never does them.

### Milestone: v0.1 Foundation

**#1 `chore: scaffold Tauri 2 + React + TypeScript app`** [core]
Create the app with pnpm, Vite, React, TypeScript, Tailwind and Tauri 2 following
the folder structure in the build plan.
- [ ] Structure matches Section 5 (empty folders may hold a `.gitkeep`)
- [ ] `tsconfig` strict with `noUncheckedIndexedAccess`
- [ ] `src/platform/` with adapter interfaces and both implementations (browser: in-memory, no-op)
- [ ] `pnpm dev` renders a placeholder screen in a browser; `pnpm tauri build` compiles in CI later
- [ ] App identifier `app.cadence.desktop`, product name "Cadence", window 1200×760, min 960×640
- [ ] README "Development" section updated

**#2 `chore: add Biome, Vitest, Playwright and pre-commit hooks`** [core]
- [ ] Scripts: `lint`, `typecheck`, `test`, `test:e2e`
- [ ] Example unit test in `src/core/`; example Playwright test against `pnpm dev`
- [ ] lefthook runs Biome on staged files
- [ ] `cargo fmt --check` and `cargo clippy -D warnings` pass
Depends on: #1

**#3 `ci: run checks on pull requests`** [ci]
GitHub Actions on `pull_request` and push to `main`.
- [ ] Ubuntu job: install Tauri Linux deps, pnpm install, lint, typecheck, test, e2e (Playwright browsers cached), cargo fmt/clippy/test
- [ ] macOS job: `pnpm tauri build` (unsigned), upload `.dmg` as an artifact
- [ ] pnpm store and cargo caches
- [ ] PR description tells the owner which job names to add as required checks
Depends on: #2

**#4 `chore: add design tokens, base components and icons`** [ui]
- [ ] `tokens.css` with every token from the design spec; Tailwind theme maps to them
- [ ] Inter font bundled locally (no runtime Google Fonts request)
- [ ] Components: Button (primary/secondary/ghost/icon), Chip, Segmented, Input, Textarea, Select, Toggle chip
- [ ] A dev-only `/__components` route showing all components (browser mode)
Depends on: #1

**#5 `chore(i18n): set up English and Turkish`** [core]
- [ ] i18next with `en` and `tr`; language from OS, overridable via settings later
- [ ] Lint or test that fails when a key exists in one locale but not the other
Depends on: #1

**#6 `feat(db): SQLite setup, migrations and seed`** [db]
- [ ] `tauri-plugin-sql` configured; DB file in app-data dir
- [ ] Migration runner (tracks applied versions) used by both adapters
- [ ] `0001_init.sql` creates every table in Section 6 with indexes on foreign keys and `scheduled_at`
- [ ] Seed X and YouTube platforms and content types with field schemas; seed is idempotent
- [ ] Browser adapter runs the same SQL via sql.js (in-memory) so repositories are testable
Depends on: #2

**#7 `feat(core): ideas domain and repository`** [core, db]
- [ ] `src/core/ideas.ts`: create/update helpers, status derivation, grouping by date (Today, This week, Earlier), filtering by status — unit tested
- [ ] `ideas` repository: create, update, soft delete, list with filters, with platforms and tags
- [ ] Repository tests run against the sql.js adapter
Depends on: #6

**#8 `feat(ui): app shell, sidebar and macOS window`** [ui]
- [ ] Router with routes: ideas, ideas/$id, series/$id, calendar, settings/*
- [ ] Sidebar per design spec (series list from DB, empty until v0.3)
- [ ] macOS overlay title bar config, drag regions, traffic light position
- [ ] Windows/Linux fallback renders controls via the Window adapter (not verified now)
- [ ] Playwright screenshot of the shell in browser mode attached to the PR
Depends on: #4, #5

**#9 `feat(ideas): Ideas screen with quick capture`** [ui]
- [ ] Capture box per design; Enter saves, Shift+Enter newline; platform toggles saved
- [ ] Grouped list with status chips, planned date chip, dimmed published rows
- [ ] Segmented status filter; empty state
- [ ] Playwright test: capture an idea, see it under "Today", filter by status
Depends on: #7, #8

**#10 `feat(ui): collapsible sidebar`** [ui]
- [ ] ⌃⌘S and the sidebar button toggle; collapsed layout per design
- [ ] State stored in `settings` and restored on launch
Depends on: #8

**#11 `feat: global shortcut to open quick capture`** [ui, rust]
- [ ] ⌥Space (configurable later) brings Cadence to front with the capture box focused (`tauri-plugin-global-shortcut`)
- [ ] Behaviour is a no-op in browser mode
Depends on: #9

### Milestone: v0.2 Editor

**#12 `feat(core): content field schema and validation`** [core]
- [ ] Types for the schema and field kinds; parser that validates JSON from the DB
- [ ] `validateFields(schema, values)` returning per-field errors (over limit, wrong shape)
- [ ] Unit tests for every field kind
Depends on: #6

**#13 `feat(core): platform character counting`** [core]
- [ ] `countChars(text, rule)`; rules: plain (graphemes) and `x` (URLs count as 23, emoji and CJK count as 2)
- [ ] Rule chosen by a `countRule` on the field in the schema, not by platform name
- [ ] Thoroughly unit tested with emoji, Turkish characters, URLs
Depends on: #12

**#14 `feat(db): posts repository`** [db]
- [ ] Create/update/soft delete posts (variants) for an idea; list by idea; list scheduled in a date range
- [ ] Idea status derived from posts via `src/core/ideas.ts`
Depends on: #7, #12

**#15 `feat(editor): editor screen and variant tabs`** [ui]
- [ ] Route ideas/$id: header (back, title edit, save state, status menu, Schedule button)
- [ ] Variant tabs; "+" opens a picker for platform → content type
- [ ] Autosave with debounce; "Saved" indicator
Depends on: #9, #14

**#16 `feat(editor): schema-driven field renderer`** [ui]
- [ ] Renderers for `text`, `longtext`, `parts`, `outline`, `checklist` per design
- [ ] Counters use #13; over-limit styling per design
- [ ] `parts`: add, remove, reorder, split long text into parts at sentence boundaries
- [ ] Component tests per field kind
Depends on: #13, #15

**#17 `feat(editor): schedule, publish and copy`** [ui]
- [ ] Schedule dialog: date + time, local time zone; sets post `planned`
- [ ] "Copy" copies the whole variant or a single part (Clipboard adapter)
- [ ] "Mark as published": URL and after-note fields; sets `published_at`
Depends on: #16

**#18 `feat: tags`** [ui, db]
- [ ] Add/remove tags from capture box and editor; autocomplete existing tags
- [ ] Filter ideas by tag
Depends on: #9, #14

### Milestone: v0.3 Series & Calendar

**#19 `feat(core): series rhythm and slot calculation`** [core]
- [ ] `upcomingSlots(series, posts, from, to, timeZone)` per the rules in Section 6
- [ ] Filled vs empty detection; weekday shorthand formatter (`Sun`, `Wed`, `2w`)
- [ ] Tests including DST transitions (Europe/Berlin, America/New_York) and month edges
Depends on: #2

**#20 `feat(db): series repository`** [db]
- [ ] CRUD for series; assign/unassign ideas; list ideas and posts in a series
Depends on: #6, #19

**#21 `feat(series): create series and sidebar list`** [ui]
- [ ] "+" in the sidebar opens a dialog: name, platform, weekdays, time, frequency
- [ ] Sidebar lists series with weekday shorthand; active state
- [ ] Series picker in the capture box assigns the new idea
Depends on: #10, #20

**#22 `feat(series): series screen and settings panel`** [ui]
- [ ] Header, upcoming slots (filled/empty), ideas in series, published list
- [ ] Settings panel edits all fields with autosave; template textarea; reminder checkbox
- [ ] "Assign idea" picks from the series' unscheduled ideas and schedules it into the slot
Depends on: #17, #21

**#23 `feat(calendar): month view`** [ui]
- [ ] Month grid per design with planned posts, empty series slots, published items
- [ ] Previous/next/today; clicking a post opens the editor; clicking an empty slot opens the series
Depends on: #17, #19, #20

**#24 `feat(calendar): drag ideas to schedule`** [ui]
- [ ] Right panel lists unscheduled ideas; dragging onto a day opens the schedule dialog prefilled
- [ ] Keyboard-accessible alternative (select idea → choose date)
Depends on: #23

**#25 `feat: reminders for empty series slots`** [rust, ui]
- [ ] Local notification `remind_before_hours` before an empty slot (`tauri-plugin-notification`)
- [ ] Rescheduled when series or posts change; no-op in browser mode
Depends on: #22

### Milestone: v0.4 AI

**#26 `feat(rust): keychain secrets commands`** [rust]
- [ ] Tauri commands `secret_set`, `secret_has`, `secret_clear` per provider using `keyring`
- [ ] No command returns a key; unit tests with a mock store
Depends on: #1

**#27 `feat(rust): AI request layer with providers`** [rust, ai]
- [ ] Command `ai_complete` that streams chunks as events; `ai_test` for connection checks
- [ ] Providers: Anthropic Messages API, OpenAI-compatible (OpenAI and OpenRouter, configurable base URL), Ollama (local, no key)
- [ ] Timeouts, cancellation, clear error types (auth, rate limit, network, provider error)
- [ ] Tests with a mocked HTTP server; no real network calls in tests
Depends on: #26

**#28 `feat(settings): AI settings screen`** [ui, ai]
- [ ] Provider segmented, API key field (write-only) with Test, model select, tone-of-voice note
- [ ] AI status row in the sidebar reflects connection state
Depends on: #8, #27

**#29 `feat(core): prompt builder`** [core, ai]
- [ ] Builds system + user prompt from: tone note, content type schema, current field values, command prompt, user free text
- [ ] Output contract: commands that return options ask for JSON `{ "options": [...] }`; parser with fallback for plain text
- [ ] Unit tests; snapshot tests for preset prompts
Depends on: #12

**#30 `feat(ai): preset commands`** [ai, db, ui]
- [ ] Seed commands: Split into thread, Shorten, Suggest hooks, Apply my tone, Adapt to another platform, Suggest titles, Expand script, Write description
- [ ] Settings list to add/edit/delete commands and set their content type
Depends on: #28, #29

**#31 `feat(editor): assistant panel`** [ui, ai]
- [ ] Panel per design: command chips filtered by content type, streaming result cards, Replace / Insert below / Use
- [ ] Free-text input; cancel button while streaming; errors shown inline
- [ ] Browser mode uses the mock AI adapter so it is testable with Playwright
Depends on: #16, #30

**#32 `feat(series): AI draft for an empty slot`** [ai, ui]
- [ ] "AI draft" on an empty slot creates a draft post from the series template and recent posts in the series, scheduled into that slot
- [ ] The draft is clearly marked and opens in the editor
Depends on: #22, #31

**#33 `feat(calendar): fill empty slots with AI`** [ai, ui]
- [ ] "Fill with AI" lists the empty slots in view, lets the user untick some, then creates drafts
- [ ] Nothing is created without the confirmation step
Depends on: #23, #32

### Milestone: v0.5 Platforms & Data

**#34 `feat(settings): manage platforms and content types`** [ui, db]
- [ ] Add/rename/reorder/delete platforms (presets can be hidden, not deleted)
- [ ] Content type editor: add fields of each kind with label, limit and count rule
- [ ] Schema validated with #12 before saving
Depends on: #16

**#35 `feat(settings): general settings`** [ui]
- [ ] Language (System, English, Türkçe), week start (Monday/Sunday), quick-capture shortcut
Depends on: #11, #5

**#36 `feat(data): export, import and backup`** [db, rust]
- [ ] Export all data as a versioned JSON file; import into an empty database with validation
- [ ] "Reveal database file" action; automatic daily backup copy (keep last 7)
Depends on: #14, #20

**#37 `feat: onboarding`** [ui]
- [ ] First launch: short welcome, language, optional AI setup, optional first series
- [ ] Never shown again once completed or skipped
Depends on: #28, #21

### Milestone: v1.0 Release

**#38 `ci: release workflow`** [ci]
- [ ] release-please (or equivalent) maintains `CHANGELOG.md` and version bumps from Conventional Commits
- [ ] On tag: `tauri-action` builds macOS (universal) and attaches to the GitHub Release
- [ ] Workflow reads signing secrets if present and skips signing if not
Depends on: #3

**#39 `chore: Apple Developer account and signing secrets`** [owner-task]
Owner only: enrol in the Apple Developer Program, create a Developer ID
certificate, app-specific password, and add the GitHub secrets the release
workflow documents.
Depends on: #38

**#40 `feat: auto-update`** [rust, ci]
- [ ] `tauri-plugin-updater` with signed update manifests published by the release workflow
- [ ] "Check for updates" in settings; quiet check on launch
Depends on: #38

**#41 `docs: screenshots and user guide`** [ui]
- [ ] Playwright script generating README screenshots from browser mode with demo data
- [ ] README Screenshots and Install sections; short user guide in `docs/guide.md`
Depends on: #31, #23

**#42 `chore: release v1.0.0`** [owner-task]
Owner only: verify the signed build on a clean Mac, then publish the release.
Depends on: #39, #40, #41
