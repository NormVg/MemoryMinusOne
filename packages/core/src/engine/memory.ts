import { MemoryConfig } from "../core/config";
import { MemoryNode, QueryResult } from "../core/types";
import { classifyContent } from "./sectors";
import { computeSimhash } from "./simhash";
import { createSingleWaypoint, expandViaWaypoints } from "./waypoints";
import { computeHybridScore, computeTokenOverlap, calcRecencyScore, cosineSimilarity } from "./scoring";
import { clock } from "../core/clock";

export class MemoryEngine {
  constructor(private config: MemoryConfig) {}

  /**
   * Adds a new memory to the system.
   * 1. Classify sector
   * 2. Compute simhash
   * 3. Generate embeddings
   * 4. Store vectors
   * 5. Store memory node
   * 6. Create waypoint edge
   */
  async add(content: string, metadata?: Record<string, any>, tags: string[] = []): Promise<MemoryNode> {
    const classification = classifyContent(content, metadata);
    const simhash = computeSimhash(content);
    const id = crypto.randomUUID();
    const now = clock.now();
    
    // Create memory node
    const memory: MemoryNode = {
      id,
      userId: this.config.userId,
      content,
      primarySector: classification.primarySector,
      sectors: classification.sectors,
      tags,
      metadata: metadata || {},
      simhash,
      salience: 1.0, // starts hot
      decayLambda: 0.01, // will be overridden by sector config in decay pass
      version: 1,
      createdAt: now,
      updatedAt: now,
      lastSeenAt: now,
    };

    // Embed and store vectors
    // Using the multi-sector embedding strategy
    let bestMatchId: string | undefined;
    let bestMatchSim = -1;

    for (const sector of classification.sectors) {
      const { vector, dim } = await this.config.embedding.embed(content, sector);
      await this.config.vector.storeVector(id, sector, this.config.userId, vector, dim);
      
      // Optionally find nearest neighbor in primary sector for waypoint linking
      if (sector === classification.primarySector) {
        const neighbors = await this.config.vector.search(vector, sector, this.config.userId, 1);
        if (neighbors.length > 0 && neighbors[0].id !== id) {
          bestMatchId = neighbors[0].id;
          bestMatchSim = neighbors[0].score;
        }
      }
    }

    // Store node
    await this.config.storage.insertMemory(memory);

    // Create waypoint
    await createSingleWaypoint(id, [], this.config.userId, this.config.storage, bestMatchId, bestMatchSim);

    return memory;
  }

  /**
   * Queries memories using a hybrid approach.
   */
  async query(queryText: string, sector?: string, limit: number = 5): Promise<QueryResult[]> {
    const targetSector = sector || classifyContent(queryText).primarySector;
    const { vector } = await this.config.embedding.embed(queryText, targetSector);
    
    // 1. Vector search
    const vectorHits = await this.config.vector.search(vector, targetSector, this.config.userId, limit * 2);
    
    // 2. Expand via waypoints
    const initialIds = vectorHits.map(h => h.id);
    const expanded = await expandViaWaypoints(initialIds, this.config.userId, this.config.storage, limit);
    
    // 3. Re-score
    const queryTokens = new Set(queryText.toLowerCase().split(/\W+/));
    const results: QueryResult[] = [];
    
    // Create a map to combine hits
    const candidateIds = new Set([...initialIds, ...expanded.map(e => e.id)]);
    
    for (const id of candidateIds) {
      const mem = await this.config.storage.getMemory(id, this.config.userId);
      if (!mem) continue;
      
      // We don't have the memory's vector loaded here, so we rely on the vector db's score
      // for the similarity component if it was in the initial hits.
      // If expanded, we give it a default baseline similarity.
      const vHit = vectorHits.find(h => h.id === id);
      const similarity = vHit ? vHit.score : 0.5;
      
      const eHit = expanded.find(h => h.id === id);
      const waypointWeight = eHit ? eHit.weight : 0;
      
      const memTokens = new Set(mem.content.toLowerCase().split(/\W+/));
      const overlap = computeTokenOverlap(queryTokens, memTokens);
      const recency = calcRecencyScore(mem.lastSeenAt);
      
      const score = computeHybridScore(similarity, overlap, waypointWeight, recency);
      
      results.push({
        memory: mem,
        score,
        matchType: vHit ? "semantic" : "waypoint",
        path: eHit ? eHit.path : [id]
      });
      
      // Update last seen to prevent decay
      mem.lastSeenAt = clock.now();
      await this.config.storage.updateMemory(mem);
    }
    
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  /**
   * Updates an existing memory's content and re-embeds it.
   */
  async update(id: string, content: string, metadata?: Record<string, any>, tags?: string[]): Promise<MemoryNode> {
    const existing = await this.config.storage.getMemory(id, this.config.userId);
    if (!existing) throw new Error(`Memory ${id} not found`);

    const classification = classifyContent(content, metadata || existing.metadata);
    const simhash = computeSimhash(content);
    
    const memory: MemoryNode = {
      ...existing,
      content,
      primarySector: classification.primarySector,
      sectors: classification.sectors,
      metadata: metadata || existing.metadata,
      tags: tags || existing.tags,
      simhash,
      version: existing.version + 1,
      updatedAt: clock.now(),
      lastSeenAt: clock.now(),
    };

    // Replace old vectors with new vectors for the new sectors
    for (const sector of existing.sectors) {
      await this.config.vector.deleteVector(id, sector, this.config.userId);
    }
    for (const sector of classification.sectors) {
      const { vector, dim } = await this.config.embedding.embed(content, sector);
      await this.config.vector.storeVector(id, sector, this.config.userId, vector, dim);
    }

    await this.config.storage.updateMemory(memory);
    return memory;
  }

  /**
   * Deletes a memory and its associated vectors.
   */
  async delete(id: string): Promise<void> {
    const existing = await this.config.storage.getMemory(id, this.config.userId);
    if (!existing) return;

    for (const sector of existing.sectors) {
      await this.config.vector.deleteVector(id, sector, this.config.userId);
    }
    await this.config.storage.deleteMemory(id, this.config.userId);
  }

  /**
   * Gets all memories for the user in a given sector.
   */
  async getAll(sector: string, limit: number = 100): Promise<MemoryNode[]> {
    return this.config.storage.getMemoriesBySector(sector, this.config.userId, limit);
  }

  /**
   * Runs the decay pass across all memories.
   */
  async runDecayPass(): Promise<void> {
    // TODO: implement decay logic across all memories
  }
}
