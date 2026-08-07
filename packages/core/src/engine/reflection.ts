import { MemoryNode } from "../core/types";

/**
 * Computes Jaccard similarity between two sets.
 */
export function jaccardSimilarity<T>(setA: Set<T>, setB: Set<T>): number {
  if (setA.size === 0 || setB.size === 0) return 0;
  
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  
  return intersection.size / union.size;
}

/**
 * Groups memories into clusters based on Jaccard similarity of their sector overlap
 * or keyword overlap (simhash tokens).
 */
export function clusterMemories(
  memories: MemoryNode[], 
  threshold: number = 0.8
): MemoryNode[][] {
  const clusters: MemoryNode[][] = [];
  const visited = new Set<string>();

  for (let i = 0; i < memories.length; i++) {
    const mem = memories[i];
    if (visited.has(mem.id) || mem.metadata?.consolidated === true) continue;
    
    const currentCluster = [mem];
    visited.add(mem.id);
    
    // We can use a simple word-based set for clustering
    const tokensA = new Set(mem.content.toLowerCase().split(/\W+/).filter(w => w.length > 3));

    for (let j = i + 1; j < memories.length; j++) {
      const candidate = memories[j];
      if (visited.has(candidate.id) || candidate.metadata?.consolidated === true) continue;
      
      // Strict primary sector match required for clustering
      if (mem.primarySector !== candidate.primarySector) continue;
      
      const tokensB = new Set(candidate.content.toLowerCase().split(/\W+/).filter(w => w.length > 3));
      
      const sim = jaccardSimilarity(tokensA, tokensB);
      if (sim >= threshold) {
        currentCluster.push(candidate);
        visited.add(candidate.id);
      }
    }
    
    if (currentCluster.length > 1) {
      clusters.push(currentCluster);
    }
  }

  return clusters;
}

/**
 * Calculates the salience for a new reflection memory based on its cluster.
 */
export function calcReflectionSalience(cluster: MemoryNode[], nowMs: number): number {
  const p = cluster.length / 10;
  
  // Recency decay weight (12h half-life)
  let sumR = 0;
  for (const mem of cluster) {
    sumR += Math.exp(-(nowMs - mem.createdAt) / 43200000);
  }
  const r = sumR / cluster.length;
  
  // Emotional boost
  const e = cluster.some(m => m.sectors.includes("emotional")) ? 1 : 0;
  
  const salience = 0.6 * p + 0.3 * r + 0.1 * e;
  return Math.min(1.0, salience);
}
