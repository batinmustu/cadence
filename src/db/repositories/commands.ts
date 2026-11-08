import { type AiCommand, type AiCommandInput, validateCommand } from "../../core/commands";
import { uuidv7 } from "../../core/ids";
import type { Database } from "../../platform/types";

export interface CommandsRepository {
  list(): Promise<AiCommand[]>;
  create(input: AiCommandInput): Promise<AiCommand>;
  update(id: string, input: AiCommandInput): Promise<void>;
  remove(id: string): Promise<void>;
}

interface Row {
  id: string;
  name: string;
  prompt: string;
  content_type_id: string | null;
  sort_order: number;
  is_preset: number;
  returns_options: number;
}

const toCommand = (r: Row): AiCommand => ({
  id: r.id,
  name: r.name,
  prompt: r.prompt,
  contentTypeId: r.content_type_id,
  sortOrder: r.sort_order,
  isPreset: r.is_preset === 1,
  returnsOptions: r.returns_options === 1,
});

export function createCommandsRepository(
  db: Database,
  clock: () => Date = () => new Date(),
): CommandsRepository {
  return {
    async list() {
      const rows = await db.select<Row>(
        "SELECT id, name, prompt, content_type_id, sort_order, is_preset, returns_options FROM ai_commands ORDER BY sort_order, created_at",
      );
      return rows.map(toCommand);
    },
    async create(input) {
      if (validateCommand(input)) throw new Error("Invalid command");
      const now = clock();
      const id = uuidv7(now.getTime());
      const ts = now.toISOString();
      const [max] = await db.select<{ n: number | null }>(
        "SELECT MAX(sort_order) AS n FROM ai_commands",
      );
      const sortOrder = (max?.n ?? -1) + 1;
      await db.execute(
        "INSERT INTO ai_commands (id, name, prompt, content_type_id, sort_order, is_preset, returns_options, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)",
        [
          id,
          input.name.trim(),
          input.prompt.trim(),
          input.contentTypeId,
          sortOrder,
          input.returnsOptions ? 1 : 0,
          ts,
          ts,
        ],
      );
      return {
        id,
        name: input.name.trim(),
        prompt: input.prompt.trim(),
        contentTypeId: input.contentTypeId,
        sortOrder,
        isPreset: false,
        returnsOptions: input.returnsOptions,
      };
    },
    async update(id, input) {
      if (validateCommand(input)) throw new Error("Invalid command");
      await db.execute(
        "UPDATE ai_commands SET name = ?, prompt = ?, content_type_id = ?, returns_options = ?, updated_at = ? WHERE id = ?",
        [
          input.name.trim(),
          input.prompt.trim(),
          input.contentTypeId,
          input.returnsOptions ? 1 : 0,
          clock().toISOString(),
          id,
        ],
      );
    },
    // Hard delete: commands are configuration, not user content (no deleted_at column).
    async remove(id) {
      await db.execute("DELETE FROM ai_commands WHERE id = ?", [id]);
    },
  };
}
