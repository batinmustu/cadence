# QA checklist

Result of the functional audit (#103), run in browser mode (`pnpm dev` adapters)
through Playwright and Vitest. **Auto** means a test in CI covers the item; the
file is named in the last column. **Manual** items need the desktop app.

Status as of the audit: every **Auto** item passed. No failing feature was found
by the walkthrough itself; the broken behaviour found earlier in the UX issues
(#95–#102) was fixed there with regression tests. The audit adds an i18n key
check (`src/i18n/usedKeys.test.ts`), and a walkthrough that fails on console
errors, unhandled rejections or raw translation keys in both languages
(`e2e/audit.spec.ts`).

| # | Area | Steps | Expected | Result | Covered by |
|---|---|---|---|---|---|
| 1 | Capture | Type an idea in the capture box, press Enter | Idea appears under Today | Pass (auto) | `ideas.spec.ts` |
| 2 | Capture | Toggle a platform, add a tag, focus fields | Footer layout does not move | Pass (auto) | `ideas.spec.ts` |
| 3 | Ideas list | Filter by status, platform, series, tag, text; sort; clear | List, counts and URL match; Clear resets | Pass (auto) | `ideas.spec.ts`, `core/ideas.test.ts` |
| 4 | Ideas list | Collapse a date group; Show more | Group hides; next page loads | Pass (auto) | `ideas.spec.ts` |
| 5 | Ideas list | Delete / ⌘⌫ on a row, trash button | Confirmation, idea disappears | Pass (auto) | `delete.spec.ts` |
| 6 | Editor | Open idea, rename, add variant | Saved indicator, variant tab active | Pass (auto) | `editor.spec.ts` |
| 7 | Editor | Fill fields, character counts, split parts | Counts follow platform rules | Pass (unit) | `FieldRenderer.test.tsx`, `core/countChars` tests |
| 8 | Editor | Schedule, reschedule, mark as published, copy | Status line and dates update | Pass (auto) | `editor.spec.ts` |
| 9 | Editor | Remove a variant / delete the idea | Confirmation, idea list updated | Pass (auto) | `delete.spec.ts` |
| 10 | Tags | Add/remove on an idea; delete globally in Settings → Tags | Tag gone from every idea | Pass (unit) | `repositories/tags.test.ts` |
| 11 | Series | Create series, see it in the sidebar, assign an idea | Slot filled | Pass (auto) | `series.spec.ts` |
| 12 | Series | Edit settings (autosave), delete (keep or delete ideas) | Saved on leave; deleted series gone | Pass (auto/unit) | `SeriesScreen.test.tsx`, `delete.spec.ts` |
| 13 | Series | Reminders for empty slots | Planned in-process | Manual | desktop notifications |
| 14 | Calendar | Month navigation, Today | Heading follows | Pass (auto) | `calendar.spec.ts` |
| 15 | Calendar | Schedule from a day, drag to another day, move/unschedule in the day dialog | Chip moves, unschedule returns idea to the panel | Pass (auto) | `calendar.spec.ts` |
| 16 | Calendar | Native drag and drop inside the desktop window | Chip follows the pointer | Manual | `dragDropEnabled: false` is untested on macOS |
| 17 | Published | Publish in editor, open Published, mark as not published | Row appears, then disappears | Pass (auto) | `published.spec.ts` |
| 18 | Search | ⌘K, find idea, open it; no match | Opens editor; empty state | Pass (auto) | `search.spec.ts` |
| 19 | AI settings | Save key (mock provider), remove key | Status in sidebar changes | Pass (auto) | `editor.spec.ts`, `AiSettings.test.tsx` |
| 20 | AI hidden | No key → no assistant / AI draft / fill | Entry points absent; appear after saving key | Pass (auto) | `editor.spec.ts`, `SeriesScreen.test.tsx` |
| 21 | Assistant | Run a command, use/replace result | Field updated | Pass (auto) | `editor.spec.ts` |
| 22 | AI draft | Empty slot → AI draft; Calendar → Fill with AI | Draft idea created; nothing before confirming | Pass (auto) | `series.spec.ts`, `calendar.spec.ts` |
| 23 | Real AI providers | Anthropic/OpenAI/OpenRouter/Ollama requests, streaming, cancel | Text streams | Manual | needs real keys |
| 24 | Platforms | Add platform + content type, use it in the editor | Variant menu lists it | Pass (auto) | `smoke.spec.ts` |
| 25 | General settings | Language, week start, capture shortcut | Applied | Pass (auto/unit) | `calendar.spec.ts`, `GeneralSettings.test.tsx` |
| 26 | Language | Switch en ⇄ tr, walk the screens | No raw keys, no console errors | Pass (auto) | `audit.spec.ts`, `i18n.test.ts`, `usedKeys.test.ts` |
| 27 | Theme | Light/dark follow tokens | No raw hex in components | Pass (review) | `radiusScale.test.ts`, token usage |
| 28 | Settings dialog | Open from sidebar / ⌘, / AI status; Esc closes; section remembered | Screen stays mounted | Pass (auto) | `smoke.spec.ts` |
| 29 | Data | Export, import, daily backup | Valid JSON; import validates | Pass (unit) / file dialogs Manual | `core/backup.test.ts`, `dailyBackup.test.ts` |
| 30 | Onboarding | Next/Back/Skip step/Skip setup, Enter, focus on heading | Flag stored, not shown again | Pass (unit) | `Onboarding.test.tsx` |
| 31 | Shortcuts | Global capture shortcut (⌥Space), ⌘K, ⌘, | Window/overlay opens | ⌘K/⌘, auto; global shortcut Manual | `search.spec.ts` |
| 32 | Window | Traffic lights, drag by top area, full screen | Layout adapts | Manual | macOS only |
| 33 | Keychain | Key stored/removed in the OS keychain | Never reaches the web view | Manual | macOS only |

## Needs manual testing (desktop only)

Keychain access, system notifications, global shortcut, native file dialogs
(export/import, reveal in Finder), window chrome (traffic lights, dragging,
full screen), native drag and drop in the web view, real AI provider calls.
