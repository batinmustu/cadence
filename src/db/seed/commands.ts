import type { Database } from "../../platform/types";

const T = "2026-01-01T00:00:00.000Z";
const SEEDED_KEY = "ai.commandsSeeded";

// Content type ids from presets.ts. `null` = every content type.
const X_POST = "01900000-0000-7000-8000-000000000011";
const YT_VIDEO = "01900000-0000-7000-8000-000000000021";

export interface PresetCommand {
  id: string;
  name: string;
  prompt: string;
  contentTypeId: string | null;
  returnsOptions: boolean;
}

export const PRESET_COMMANDS: PresetCommand[] = [
  {
    id: "01900000-0000-7000-8000-000000000101",
    name: "Split into thread",
    prompt:
      "Split the current content into a thread. Keep every part within the character limit of its field, keep the order of ideas and make each part stand on its own. Number nothing; return the parts separated by a blank line.",
    contentTypeId: X_POST,
    returnsOptions: false,
  },
  {
    id: "01900000-0000-7000-8000-000000000102",
    name: "Shorten",
    prompt:
      "Shorten the current content while keeping its meaning and voice. Respect the character limits of the fields.",
    contentTypeId: null,
    returnsOptions: false,
  },
  {
    id: "01900000-0000-7000-8000-000000000103",
    name: "Suggest hooks",
    prompt:
      "Suggest 5 different opening lines (hooks) for the current content. Each should be one or two sentences and make the reader want to continue.",
    contentTypeId: null,
    returnsOptions: true,
  },
  {
    id: "01900000-0000-7000-8000-000000000104",
    name: "Apply my tone",
    prompt:
      "Rewrite the current content in the user's tone of voice. Keep the meaning, facts and length roughly the same.",
    contentTypeId: null,
    returnsOptions: false,
  },
  {
    id: "01900000-0000-7000-8000-000000000105",
    name: "Adapt to another platform",
    prompt:
      "Adapt the current content for another platform. Follow the fields and limits of the content type described above, and change format and style where that platform's readers would expect it.",
    contentTypeId: null,
    returnsOptions: false,
  },
  {
    id: "01900000-0000-7000-8000-000000000106",
    name: "Suggest titles",
    prompt:
      "Suggest 5 titles for the current content. Keep each within the title limit and make them specific rather than clickbait.",
    contentTypeId: YT_VIDEO,
    returnsOptions: true,
  },
  {
    id: "01900000-0000-7000-8000-000000000107",
    name: "Expand script",
    prompt:
      "Expand the outline into a short script, section by section, in a spoken style. Keep the order of the outline.",
    contentTypeId: YT_VIDEO,
    returnsOptions: false,
  },
  {
    id: "01900000-0000-7000-8000-000000000108",
    name: "Write description",
    prompt:
      "Write a description for the current content: a short summary first, then a few lines on what viewers will get. Stay within the description limit.",
    contentTypeId: YT_VIDEO,
    returnsOptions: false,
  },
];

/**
 * Runs once per database. Presets are ordinary rows the user may edit or
 * delete, so re-inserting them on every launch would bring deleted ones back.
 */
export async function seedCommands(db: Database): Promise<void> {
  const done = await db.select<{ value: string }>("SELECT value FROM settings WHERE key = ?", [
    SEEDED_KEY,
  ]);
  if (done.length > 0) return;
  await db.transaction(async (tx) => {
    for (const [i, c] of PRESET_COMMANDS.entries()) {
      await tx.execute(
        "INSERT OR IGNORE INTO ai_commands (id, name, prompt, content_type_id, sort_order, is_preset, returns_options, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)",
        [c.id, c.name, c.prompt, c.contentTypeId, i, c.returnsOptions ? 1 : 0, T, T],
      );
    }
    await tx.execute(
      "INSERT OR IGNORE INTO settings (id, key, value, created_at, updated_at) VALUES (?, ?, '1', ?, ?)",
      ["01900000-0000-7000-8000-0000000001ff", SEEDED_KEY, T, T],
    );
  });
}
