# 0005. shadcn/ui and Radix as the UI foundation

Status: Accepted
Date: 2026-11-08

## Context

Base components in `src/components/` were hand-written (Button, Chip, Input, Segmented, ToggleChip) on top of native controls. Dialogs were ad-hoc `div`s without focus trapping, Escape handling or correct ARIA. More screens and overlays are coming (settings dialog, selects, animated tabs).

## Decision

Adopt shadcn/ui: component source is copied into `src/components/ui/` (Radix UI primitives + Tailwind + `class-variance-authority`), with `cn()` in `src/lib/utils.ts` and an `@` alias for `src/`. shadcn's CSS variables (`--background`, `--primary`, `--muted`, `--ring`, `--radius`, …) are defined in `src/styles/tokens.css` as references to the existing Cadence tokens, so the tokens stay the single source of truth and no raw hex values appear in components. Chip becomes Badge, ToggleChip becomes Toggle, Segmented is a thin wrapper around ToggleGroup, and all overlays use Dialog or AlertDialog. Components are added one by one; the native `Select` is kept until its own migration.

## Consequences

- Accessible dialogs (focus trap, Escape, `aria-modal`) for free.
- New runtime dependencies: `@radix-ui/react-{slot,dialog,alert-dialog,toggle,toggle-group}`, `class-variance-authority`, `clsx`, `tailwind-merge`.
- `Segmented` options now have `role="radio"` (Radix ToggleGroup single) instead of pressed buttons.
- We own the copied component code and maintain it ourselves.

## Alternatives considered

- Keep hand-rolled components: more code to keep accessible.
- A packaged library (MUI, Mantine): heavier and harder to fit into the token system.
