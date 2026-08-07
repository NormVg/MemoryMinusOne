import { clock } from "../core/clock";
import { SECTOR_INDEX_MAPPING_FOR_MATRIX_LOOKUP, SECTORAL_INTERDEPENDENCE_MATRIX_FOR_COGNITIVE_RESONANCE } from "./sectors";

export const SCORING_WEIGHTS = {
  similarity: 0.45,
  overlap: 0.20,
  waypoint: 0.15,
  recency: 0.10,
  tag_match: 0.10,
};

const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "but", "by", "for",
  "if", "in", "into", "is", "it", "no", "not", "of", "on", "or",
  "such", "that", "the", "their", "then", "there", "these",
  "they", "this", "to", "was", "will", "with", "what", "when",
  "where", "who", "how", "did", "does", "do", "has", "have",
  "had", "been", "would", "could", "should", "can", "may",
  "user", "about", "from", "which", "some", "any", "all"
]);

export const HYBRID_PARAMS = {
  tau: 3,
  t_days: 7,
  t_max_days: 60,
};

/** True logistic sigmoid to normalize scores to 0-1 */
export function sigmoid(x: number): number {
  // Guard against overflow
  if (x > 20) return 1;
  if (x < -20) return 0;
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
    if (STOPWORDS.has(t)) continue;
    if (memTokens.has(t)) overlap++;
  }
  const meaningful = [...queryTokens].filter(t => !STOPWORDS.has(t)).length;
  return meaningful === 0 ? 0 : overlap / meaningful;
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

/**
 * Applies cognitive resonance penalty/boost based on the cross-sector interdependence matrix.
 */
export function calcCrossSectorResonanceScore(
  memorySector: string,
  querySector: string,
  baseSimilarity: number
): number {
  const si = SECTOR_INDEX_MAPPING_FOR_MATRIX_LOOKUP[memorySector] ?? 1;
  const ti = SECTOR_INDEX_MAPPING_FOR_MATRIX_LOOKUP[querySector] ?? 1;
  return baseSimilarity * SECTORAL_INTERDEPENDENCE_MATRIX_FOR_COGNITIVE_RESONANCE[si][ti];
}

/**
 * Computes a fused vector score from multiple memory vectors across sectors.
 * Takes the max resonance-adjusted similarity score.
 */
export function calcMultiVecFusionScore(
  queryVectors: Record<string, number[]>,
  memoryVectors: Array<{ sector: string; vector: number[] }>
): number {
  let maxScore = 0;
  for (const mv of memoryVectors) {
    for (const [qSector, qVector] of Object.entries(queryVectors)) {
      const sim = cosineSimilarity(qVector, mv.vector);
      const resonance = calcCrossSectorResonanceScore(mv.sector, qSector, sim);
      if (resonance > maxScore) {
        maxScore = resonance;
      }
    }
  }
  return maxScore;
}
