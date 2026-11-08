// Prompt and parsing for "AI draft" on an empty series slot. Pure text, reusable on mobile.

export interface DraftContext {
  seriesName: string;
  seriesDescription?: string;
  /** The user's template for posts in this series ("used by AI drafts"). */
  template: string;
  /** Text of recent posts in the series, newest first; used to avoid repeating topics. */
  recent: string[];
}

const MAX_RECENT = 5;
const MAX_RECENT_CHARS = 600;

/** The command prompt handed to `buildPrompt`. The first line of the answer is the idea title. */
export function buildDraftCommand(ctx: DraftContext): string {
  const lines = [
    `Write the next post for the recurring series "${ctx.seriesName}".`,
    ctx.seriesDescription?.trim() ? `About the series: ${ctx.seriesDescription.trim()}` : "",
    ctx.template.trim() ? `Follow this template:\n${ctx.template.trim()}` : "",
  ];
  const recent = ctx.recent
    .map((r) => r.trim())
    .filter(Boolean)
    .slice(0, MAX_RECENT)
    .map(
      (r, i) => `${i + 1}. ${r.length > MAX_RECENT_CHARS ? `${r.slice(0, MAX_RECENT_CHARS)}…` : r}`,
    );
  if (recent.length > 0) {
    lines.push(`Recent posts in this series (do not repeat their topics):\n${recent.join("\n\n")}`);
  }
  lines.push(
    "Answer with a short title on the first line, then a blank line, then the post content only.",
  );
  return lines.filter(Boolean).join("\n\n");
}

export interface ParsedDraft {
  title: string;
  body: string;
}

const MAX_TITLE = 80;

/** First line = title, rest = body. A one-line answer is used as both. */
export function parseDraft(raw: string): ParsedDraft | null {
  const text = raw.trim();
  if (!text) return null;
  const [first = "", ...rest] = text.split("\n");
  const title = first
    .replace(/^#+\s*/, "")
    .replace(/^(title|başlık)\s*:\s*/i, "")
    .replace(/^["*]+|["*]+$/g, "")
    .trim();
  const body = rest.join("\n").trim();
  const short = (title || text).slice(0, MAX_TITLE).trim();
  return { title: short, body: body || text };
}
