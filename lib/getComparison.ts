// lib/getComparison.ts

import { comparisons, type ComparisonRecord } from "@/data/comparisons";

/**
 * Find a comparison between two topics.
 * Order doesn't matter: (A,B) == (B,A)
 */
export function getComparison(topicA: string, topicB: string): ComparisonRecord | undefined {
  if (!topicA || !topicB) return undefined;

  return comparisons.find((c) => {
    const matchDirect = c.topicA === topicA && c.topicB === topicB;
    const matchReverse = c.topicA === topicB && c.topicB === topicA;
    return matchDirect || matchReverse;
  });
}
