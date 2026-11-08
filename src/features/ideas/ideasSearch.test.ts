import { describe, expect, it } from "vitest";
import { DEFAULT_IDEA_QUERY } from "../../core/ideas";
import { parseIdeasSearch, queryToSearch, searchToQuery } from "./ideasSearch";

describe("ideas search params", () => {
  it("ignores unknown and default values", () => {
    expect(parseIdeasSearch({ status: "nope", sort: "newest", text: "", x: 1 })).toEqual({});
  });
  it("round-trips a query", () => {
    const q = {
      ...DEFAULT_IDEA_QUERY,
      status: "planned" as const,
      tagId: "t",
      sort: "oldest" as const,
    };
    expect(searchToQuery(queryToSearch(q))).toEqual(q);
    expect(queryToSearch(DEFAULT_IDEA_QUERY)).toEqual({});
  });
});
