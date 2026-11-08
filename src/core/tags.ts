export interface Tag {
  id: string;
  name: string;
}

/** Tags are typed as "#launch" or "launch"; stored without the hash, spaces collapsed. */
export function normalizeTagName(raw: string): string {
  return raw.trim().replace(/^#+/, "").trim().replace(/\s+/g, " ");
}

/** Tag names are unique regardless of case, so "Launch" and "launch" are one tag. */
export function sameTagName(a: string, b: string): boolean {
  return a.toLocaleLowerCase() === b.toLocaleLowerCase();
}

/** Existing tags matching what the user typed, prefix matches first. Already-chosen tags are hidden. */
export function suggestTags(all: Tag[], query: string, excludeIds: string[] = []): Tag[] {
  const q = normalizeTagName(query).toLocaleLowerCase();
  const pool = all.filter((t) => !excludeIds.includes(t.id));
  if (!q) return pool;
  const starts = pool.filter((t) => t.name.toLocaleLowerCase().startsWith(q));
  const contains = pool.filter(
    (t) => !t.name.toLocaleLowerCase().startsWith(q) && t.name.toLocaleLowerCase().includes(q),
  );
  return [...starts, ...contains];
}
