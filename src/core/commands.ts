export interface AiCommand {
  id: string;
  name: string;
  prompt: string;
  /** Null = available for every content type. */
  contentTypeId: string | null;
  sortOrder: number;
  isPreset: boolean;
  /** The model is asked for `{ "options": [...] }` and results show as several cards. */
  returnsOptions: boolean;
}

export interface AiCommandInput {
  name: string;
  prompt: string;
  contentTypeId: string | null;
  returnsOptions: boolean;
}

export function validateCommand(input: AiCommandInput): string | null {
  if (!input.name.trim()) return "name";
  if (!input.prompt.trim()) return "prompt";
  return null;
}

/** Commands shown for a content type: the generic ones plus those targeted at it. */
export function commandsFor(commands: AiCommand[], contentTypeId: string): AiCommand[] {
  return commands.filter((c) => c.contentTypeId === null || c.contentTypeId === contentTypeId);
}
