# Contributing

- Start with an issue.
- Branch names: `feat/<issue>-short-name`, `fix/…`, `chore/…`, `ci/…`, `docs/…`.
- Keep PRs small (one issue, ideally under ~400 changed lines). PRs are squash-merged.
- Use Conventional Commits for commits and PR titles, e.g. `feat(series): show empty slots`,
  `fix(editor): keep cursor on autosave`. Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore.

## Quality bar

- `pnpm lint`, `pnpm typecheck`, `pnpm test`, and the cargo fmt/clippy/test checks pass.
- New behaviour has tests; UI changes include screenshots.
- User-facing strings exist in both `en` and `tr`.
- Architecture changes need an ADR in `docs/adr/`.

AI-assisted contributions are welcome; the contributor is responsible for every line.
