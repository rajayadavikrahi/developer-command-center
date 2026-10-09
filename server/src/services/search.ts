import { stripLikeWildcards } from "../lib/analytics";
import type { Repo, SearchResults } from "../lib/repo";

export async function search(
  repo: Repo,
  userId: string,
  term: string,
  limit = 5,
): Promise<SearchResults & { term: string }> {
  const cleaned = stripLikeWildcards(term);
  if (cleaned.length === 0) {
    return { term: cleaned, projects: [], tasks: [], notes: [], bookmarks: [] };
  }
  const results = await repo.search(userId, cleaned, limit);
  return { term: cleaned, ...results };
}
