import {
  DEFAULT_IDEA_QUERY,
  type IdeaFilterKey,
  type IdeaGroupBy,
  type IdeaQuery,
  type IdeaSort,
} from "../../core/ideas";

/** Only non-default values appear in the URL, so a clean /ideas stays clean. */
export type IdeasSearch = Partial<IdeaQuery>;

const STATUS: IdeaFilterKey[] = ["all", "draft", "planned", "published"];
const SORT: IdeaSort[] = ["newest", "oldest", "planned"];
const GROUP: IdeaGroupBy[] = ["date", "series", "status"];

function pick<T extends string>(v: unknown, allowed: readonly T[]): T | undefined {
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : undefined;
}
function str(v: unknown): string | undefined {
  return typeof v === "string" && v !== "" ? v : undefined;
}

export function parseIdeasSearch(raw: Record<string, unknown>): IdeasSearch {
  const out: IdeasSearch = {};
  const status = pick(raw.status, STATUS);
  if (status && status !== "all") out.status = status;
  const sort = pick(raw.sort, SORT);
  if (sort && sort !== "newest") out.sort = sort;
  const groupBy = pick(raw.groupBy, GROUP);
  if (groupBy && groupBy !== "date") out.groupBy = groupBy;
  for (const k of ["platformId", "seriesId", "tagId", "text"] as const) {
    const v = str(raw[k]);
    if (v) out[k] = v;
  }
  return out;
}

export function searchToQuery(s: IdeasSearch): IdeaQuery {
  return { ...DEFAULT_IDEA_QUERY, ...s };
}

/** Drops values equal to the default so the URL only carries what differs. */
export function queryToSearch(q: IdeaQuery): IdeasSearch {
  return parseIdeasSearch({ ...q });
}
