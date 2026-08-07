import { IStoragePlugin } from "../core/plugin";

export const GAMMA_ATTENUATION_CONSTANT_FOR_GRAPH_DISTANCE = 0.35;

/**
 * Performs energy-based spreading activation starting from an initial set of node IDs.
 * 
 * @param initialIds The initial set of activated nodes (e.g. from semantic search)
 * @param userId The user ID
 * @param storage The storage plugin
 * @param maxDepth The maximum number of hops (iterations)
 * @returns A Map of activated memory IDs to their energy levels
 */
export async function performSpreadingActivationRetrieval(
  initialIds: string[],
  userId: string,
  storage: IStoragePlugin,
  maxDepth: number = 3
): Promise<Map<string, number>> {
  const activation = new Map<string, number>();
  
  // Initialize energy
  for (const id of initialIds) {
    activation.set(id, 1.0);
  }
  
  for (let i = 0; i < maxDepth; i++) {
    const nextUpdates = new Map<string, number>();
    
    for (const [nodeId, energy] of activation) {
      if (energy <= 0.05) continue; // prune tiny energy bounds
      
      const neighbors = await storage.getNeighbors(nodeId, userId);
      for (const edge of neighbors) {
        // Attenuate energy
        const attenuation = Math.exp(-GAMMA_ATTENUATION_CONSTANT_FOR_GRAPH_DISTANCE * 1);
        const propagatedEnergy = edge.weight * energy * attenuation;
        
        const existing = nextUpdates.get(edge.dstId) || 0;
        nextUpdates.set(edge.dstId, existing + propagatedEnergy);
      }
    }
    
    // Apply updates
    for (const [id, newEnergy] of nextUpdates) {
      const current = activation.get(id) || 0;
      activation.set(id, Math.max(current, newEnergy));
    }
  }
  
  return activation;
}
