/**
 * Pure Jaccard similarity for topic sets.
 * Used by InterestMatcher internally and for testing.
 */
export function calculateScore(topicsA: string[], topicsB: string[]): number {
  const setA = new Set(topicsA);
  const setB = new Set(topicsB);
  const intersection = [...setA].filter(t => setB.has(t));
  const union = new Set([...setA, ...setB]);
  return union.size === 0 ? 1 : intersection.length / union.size;
}

export interface MatchResult {
  userA: string;
  userB: string;
  sharedTopics: string[];
  matchScore: number;
}

export class InterestMatcher {
  async findMatches(groupId: string): Promise<MatchResult[]> {
    // TODO: implement matching logic
    throw new Error('Not implemented');
  }

  calculateScore(topicsA: string[], topicsB: string[]): number {
    return calculateScore(topicsA, topicsB);
  }
}
