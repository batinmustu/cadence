import type { Database } from "../../platform/types";

// Fixed UUIDv7 ids make the seed idempotent: re-running is INSERT OR IGNORE.
const T = "2026-01-01T00:00:00.000Z";

const text = (key: string, extra: object = {}) => ({ key, kind: "text", ...extra });

export const PRESET_PLATFORMS = [
  { id: "01900000-0000-7000-8000-000000000001", name: "X", icon: "twitter", sort_order: 0 },
  { id: "01900000-0000-7000-8000-000000000002", name: "YouTube", icon: "youtube", sort_order: 1 },
] as const;

export const PRESET_CONTENT_TYPES = [
  {
    id: "01900000-0000-7000-8000-000000000011",
    platform_id: PRESET_PLATFORMS[0].id,
    name: "Post",
    sort_order: 0,
    schema: { fields: [{ key: "text", kind: "parts", maxPerPart: 280, maxParts: 1 }] },
  },
  {
    id: "01900000-0000-7000-8000-000000000012",
    platform_id: PRESET_PLATFORMS[0].id,
    name: "Thread",
    sort_order: 1,
    schema: { fields: [{ key: "text", kind: "parts", maxPerPart: 280 }] },
  },
  {
    id: "01900000-0000-7000-8000-000000000021",
    platform_id: PRESET_PLATFORMS[1].id,
    name: "Video",
    sort_order: 0,
    schema: {
      fields: [
        text("title", { max: 100 }),
        { key: "description", kind: "longtext", max: 5000 },
        text("thumbnail"),
        { key: "script", kind: "outline" },
        { key: "production", kind: "checklist", items: ["Script", "Shoot", "Edit", "Thumbnail"] },
      ],
    },
  },
  {
    id: "01900000-0000-7000-8000-000000000022",
    platform_id: PRESET_PLATFORMS[1].id,
    name: "Short",
    sort_order: 1,
    schema: {
      fields: [
        text("title", { max: 100 }),
        { key: "description", kind: "longtext", max: 5000 },
        { key: "script", kind: "outline" },
      ],
    },
  },
] as const;

export async function seedPresets(db: Database): Promise<void> {
  await db.transaction(async (tx) => {
    for (const p of PRESET_PLATFORMS) {
      await tx.execute(
        "INSERT OR IGNORE INTO platforms (id, name, icon, sort_order, is_preset, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)",
        [p.id, p.name, p.icon, p.sort_order, T, T],
      );
    }
    for (const c of PRESET_CONTENT_TYPES) {
      await tx.execute(
        "INSERT OR IGNORE INTO content_types (id, platform_id, name, field_schema, sort_order, is_preset, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)",
        [c.id, c.platform_id, c.name, JSON.stringify(c.schema), c.sort_order, T, T],
      );
    }
  });
}
