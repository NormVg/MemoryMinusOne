import { clock } from "../core/clock";

export const SCORING_WEIGHTS = {
  similarity: 0.35,
  overlap: 0.2,
  waypoint: 0.15,
  recency: 0.1,
  tag_match: 0.2,
};

export const HYBRID_PARAMS = {
  tau: 3,
  t_days: 7,
  t_max_days: 60,
};

/** Sigmoid function to normalize scores to 0-1 */
export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/** Boosts similarity score non-linearly using tau */
export function boostedSim(s: number): number {
  return 1 - Math.exp(-HYBRID_PARAMS.tau * s);
}

/**
 * Calculates a recency score that decays over time.
 * Heavily biased towards recent memories.
 */
export function calcRecencyScore(lastSeenAt: number): number {
  const now = clock.now();
  const daysSince = Math.max(0, (now - lastSeenAt) / (1000 * 60 * 60 * 24));
  const t = HYBRID_PARAMS.t_days;
  const tmax = HYBRID_PARAMS.t_max_days;
  
  if (daysSince >= tmax) return 0;
  return Math.exp(-daysSince / t) * (1 - daysSince / tmax);
}

/**
 * Computes Jaccard-like overlap of tokens between query and memory.
 */
export function computeTokenOverlap(queryTokens: Set<string>, memTokens: Set<string>): number {
  if (queryTokens.size === 0) return 0;
  let overlap = 0;
  for (const t of queryTokens) {
    if (memTokens.has(t)) overlap++;
  }
  return overlap / queryTokens.size;
}

/**
 * Computes the final hybrid score combining all retrieval signals.
 */
export function computeHybridScore(
  similarity: number,
  tokenOverlap: number,
  waypointWeight: number,
  recencyScore: number,
  tagMatchScore: number = 0,
  keywordScore: number = 0
): number {
  const s_p = boostedSim(similarity);
  const raw =
    SCORING_WEIGHTS.similarity * s_p +
    SCORING_WEIGHTS.overlap * tokenOverlap +
    SCORING_WEIGHTS.waypoint * waypointWeight +
    SCORING_WEIGHTS.recency * recencyScore +
    SCORING_WEIGHTS.tag_match * tagMatchScore +
    keywordScore;
    
  return sigmoid(raw);
}

/**
 * Calculates cosine similarity between two vectors.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
