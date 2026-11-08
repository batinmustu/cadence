export interface PublishedItem {
  postId: string;
  ideaId: string;
  title: string;
  platformId: string;
  platformName: string;
  seriesId: string | null;
  seriesName: string | null;
  publishedAt: string;
  /** Raw content type schema and post fields, kept for copying. */
  fieldSchema: string;
  fields: string;
}

export interface PublishedMonth {
  /** `YYYY-MM`, local time. */
  month: string;
  items: PublishedItem[];
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Groups newest-first items by local month; keeps the incoming order. */
export function groupByMonth(items: PublishedItem[]): PublishedMonth[] {
  const out: PublishedMonth[] = [];
  for (const item of items) {
    const d = new Date(item.publishedAt);
    const month = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
    const last = out[out.length - 1];
    if (last && last.month === month) last.items.push(item);
    else out.push({ month, items: [item] });
  }
  return out;
}
