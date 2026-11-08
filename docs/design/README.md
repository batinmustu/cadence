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
