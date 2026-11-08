export type SearchKind = "idea" | "series" | "tag";

export interface SearchItem {
  kind: SearchKind;
  id: string;
  /** Main text shown and matched with the highest weight. */
  label: string;
  /** Extra text that is matched with a lower weight (idea notes). */
  detail?: string;
}

export interface SearchHit extends SearchItem {
  score: number;
}

/**
 * Case-folds with Turkish rules ("I" -> "ı", "İ" -> "i") so "ISIK" finds "ışık",
 * then strips diacritics so "sut" finds "süt". Typing without Turkish letters is common.
 */
export function normalizeSearch(raw: string): string {
  return raw
    .replace(/İ/g, "i")
    .replace(/I/g, "ı")
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreText(text: string, terms: string[]): number {
  if (!text) return 0;
  let total = 0;
  for (const term of terms) {
    const at = text.indexOf(term);
    if (at < 0) return 0;
    const atWordStart = at === 0 || text[at - 1] === " ";
    total += at === 0 ? 3 : atWordStart ? 2 : 1;
  }
  return total;
}

/** Every term must match; label matches outrank detail matches. Best first, ties keep input order. */
export function searchItems(items: SearchItem[], query: string, limit = 8): SearchHit[] {
  const terms = normalizeSearch(query).split(" ").filter(Boolean);
  if (terms.length === 0) return [];
  const hits: SearchHit[] = [];
  for (const item of items) {
    const inLabel = scoreText(normalizeSearch(item.label), terms);
    const inDetail = inLabel > 0 ? 0 : scoreText(normalizeSearch(item.detail ?? ""), terms);
    const score = inLabel > 0 ? 10 + inLabel : inDetail;
    if (score > 0) hits.push({ ...item, score });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}
