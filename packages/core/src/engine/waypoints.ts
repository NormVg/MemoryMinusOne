import { clock } from "../core/clock";
import { IStoragePlugin } from "../core/plugin";
import { cosineSimilarity } from "./scoring";
import { MemoryNode, WaypointEdge } from "../core/types";

export const WAYPOINT_PARAMS = {
  similarityThreshold: 0.75,
  defaultWeight: 1.0,
  crossSectorWeight: 0.5,
  reinforcementBoost: 0.05,
  maxWeight: 1.0,
};

/**
 * Finds the most similar existing memory and creates a single waypoint to it.
 * If no similar memory is found, creates a self-waypoint.
 */
export async function createSingleWaypoint(
  newId: string,
  newVector: number[],
  userId: string,
  storage: IStoragePlugin,
  // We need vectors to compute similarity. In a real system, the vector plugin does this search.
  // We'll assume the caller passes the best match ID and similarity.
  bestMatchId?: string,
  bestMatchSimilarity?: number
): Promise<WaypointEdge> {
  const now = clock.now();
  
  let dstId = newId;
  let weight = WAYPOINT_PARAMS.defaultWeight;
  
  if (bestMatchId && bestMatchSimilarity && bestMatchSimilarity >= WAYPOINT_PARAMS.similarityThreshold) {
    dstId = bestMatchId;
    weight = bestMatchSimilarity;
  }
  
  const edge: WaypointEdge = {
    srcId: newId,
    dstId,
    userId,
    weight,
    createdAt: now,
    updatedAt: now,
  };
  
  await storage.insertWaypoint(edge);
  return edge;
}

/**
 * Expands a set of initial memory IDs through the waypoint graph using BFS.
 */
export async function expandViaWaypoints(
  initialIds: string[],
  userId: string,
  storage: IStoragePlugin,
  maxExpansions: number = 10
): Promise<Array<{ id: string; weight: number; path: string[] }>> {
  const expanded: Array<{ id: string; weight: number; path: string[] }> = [];
  const visited = new Set<string>();
  
  for (const id of initialIds) {
    expanded.push({ id, weight: 1.0, path: [id] });
    visited.add(id);
  }
  
  const queue = [...expanded];
  let expansions = 0;
  
  while (queue.length > 0 && expansions < maxExpansions) {
    const current = queue.shift()!;
    const neighbors = await storage.getNeighbors(current.id, userId);
    
    for (const neighbor of neighbors) {
      if (visited.has(neighbor.dstId)) continue;
      
      const neighborWeight = Math.min(1.0, Math.max(0, neighbor.weight || 0));
      const expansionWeight = current.weight * neighborWeight * 0.8; // Decay factor per hop
      
      if (expansionWeight < 0.1) continue;
      
      const expandedItem = {
        id: neighbor.dstId,
        weight: expansionWeight,
        path: [...current.path, neighbor.dstId],
      };
      
      expanded.push(expandedItem);
      visited.add(neighbor.dstId);
      queue.push(expandedItem);
      expansions++;
    }
  }
  
  return expanded;
}

/**
 * Reinforces the weights of edges along a successfully traversed path.
 * Also applies a fractional contextual glow to adjacent nodes.
 */
export async function reinforcePath(
  path: string[],
  storage: IStoragePlugin,
  userId: string
): Promise<void> {
  if (path.length < 2) return;

  for (let i = 0; i < path.length - 1; i++) {
    const srcId = path[i];
    const dstId = path[i + 1];
    
    // In a real DB, we'd do an atomic edge weight boost query here.
    // We'll emulate it by fetching and updating.
    const neighbors = await storage.getNeighbors(srcId, userId);
    const edge = neighbors.find(n => n.dstId === dstId);
    
    if (edge) {
      edge.weight = Math.min(WAYPOINT_PARAMS.maxWeight, edge.weight + WAYPOINT_PARAMS.reinforcementBoost);
      await storage.insertWaypoint(edge); // onConflictDoUpdate will handle this
    }
  }
}

/**
 * Reinforces the salience of a specific memory node after it is successfully recalled.
 */
export async function reinforceNodeSalience(
  memory: MemoryNode,
  storage: IStoragePlugin,
  eta: number = 0.1
): Promise<void> {
  const newSalience = Math.min(1.0, memory.salience + eta * (1 - memory.salience));
  memory.salience = newSalience;
  memory.lastSeenAt = clock.now();
  await storage.updateMemory(memory);
}
