export type CountRule = "plain" | "x";

const URL_RE = /https?:\/\/[^\s]+/gu;
const X_URL_LENGTH = 23;
// Trailing punctuation belongs to the sentence, not the link.
const TRAILING_PUNCT = /[.,;:!?)\]}'"]+$/u;
const EMOJI_RE = /\p{Extended_Pictographic}|\p{Regional_Indicator}/u;
const WIDE_RE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;

const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

function graphemes(text: string): string[] {
  return Array.from(segmenter.segment(text), (s) => s.segment);
}

/** Rule names come from field schemas (data); unknown names fall back to plain. */
export function normalizeCountRule(rule: string | undefined): CountRule {
  return rule === "x" ? "x" : "plain";
}

function countX(text: string): number {
  let total = 0;
  let last = 0;
  for (const match of text.matchAll(URL_RE)) {
    const index = match.index ?? 0;
    const trail = TRAILING_PUNCT.exec(match[0])?.[0] ?? "";
    total += countXWeighted(text.slice(last, index));
    total += X_URL_LENGTH + countXWeighted(trail);
    last = index + match[0].length;
  }
  return total + countXWeighted(text.slice(last));
}

function countXWeighted(text: string): number {
  let total = 0;
  for (const g of graphemes(text)) total += EMOJI_RE.test(g) || WIDE_RE.test(g) ? 2 : 1;
  return total;
}

/** Counts what a platform counts: user-perceived characters, or X's weighted length. */
export function countChars(text: string, rule: CountRule | string = "plain"): number {
  return normalizeCountRule(rule) === "x" ? countX(text) : graphemes(text).length;
}
