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

- Scheduled runs hold a run lock (branch `agent-lock`), work through the backlog
  and merge their own PRs once CI is green (`gh pr merge --squash --delete-branch`).
  The owner reviews everything afterwards. Never use admin bypass or force-push `main`.
- Never work on issues labelled `owner-task`. After 3 failed CI fixes on a PR, label it `blocked`.
- Branches: `feat/<issue>-short-name`, `fix/…`, `chore/…`, `ci/…`, `docs/…`.
- Conventional Commits for commits and PR titles: `feat(series): show empty slots`.
- One issue per PR, under ~400 changed lines where possible.
- New behaviour needs tests; bug fixes need a regression test.
- Architecture changes need a new ADR in `docs/adr/`.
- Follow the run protocol in `docs/build-plan.md` Section 2 during scheduled runs.
- Use `gh api` (REST); GraphQL-based `gh issue/pr list` is unavailable in cloud sessions.

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
