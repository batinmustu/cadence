import type { Idea } from "./ideas";
import type { Post } from "./posts";

export interface SeriesIdeaGroups {
  /** Ideas with no scheduled or published post: candidates for an empty slot. */
  unscheduled: Idea[];
  /** Ideas with at least one scheduled post and none published. */
  planned: Idea[];
  published: Idea[];
}

/** Sorts a series' live ideas by what their posts say; archived ideas are left out. */
export function groupSeriesIdeas(ideas: Idea[], posts: Post[]): SeriesIdeaGroups {
  const byIdea = new Map<string, Post[]>();
  for (const p of posts) byIdea.set(p.ideaId, [...(byIdea.get(p.ideaId) ?? []), p]);
  const out: SeriesIdeaGroups = { unscheduled: [], planned: [], published: [] };
  for (const idea of ideas) {
    if (idea.deletedAt || idea.status === "archived") continue;
    const mine = byIdea.get(idea.id) ?? [];
    if (mine.some((p) => p.status === "published")) out.published.push(idea);
    else if (mine.some((p) => p.status === "scheduled")) out.planned.push(idea);
    else out.unscheduled.push(idea);
  }
  return out;
}

/** The post to schedule for an idea: its first draft, if it has one. */
export function draftPostFor(ideaId: string, posts: Post[]): Post | null {
  return posts.find((p) => p.ideaId === ideaId && p.status === "draft") ?? null;
}
