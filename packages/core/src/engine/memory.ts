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
   */
  async add(content: string, options: { userId: string; metadata?: Record<string, any>; tags?: string[]; timestamp?: number }): Promise<MemoryNode> {
    const { userId, metadata = {}, tags = [], timestamp } = options;
    const classification = classifyContent(content, metadata);
    const simhash = computeSimhash(content);
    const id = crypto.randomUUID();
    const now = timestamp || clock.now();
    
    // Create memory node
    const memory: MemoryNode = {
      id,
      userId,
      content,
      primarySector: classification.primarySector,
      sectors: classification.sectors,
      tags,
      metadata,
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
      await this.config.vector.storeVector(id, sector, userId, vector, dim);
      
      // Optionally find nearest neighbor in primary sector for waypoint linking
      if (sector === classification.primarySector) {
        const neighbors = await this.config.vector.search(vector, sector, userId, 1);
        if (neighbors.length > 0 && neighbors[0].id !== id) {
          bestMatchId = neighbors[0].id;
          bestMatchSim = neighbors[0].score;
        }
      }
    }

    // Store node
    await this.config.storage.insertMemory(memory);

    // Create waypoint
    await createSingleWaypoint(id, [], userId, this.config.storage, bestMatchId, bestMatchSim);

    return memory;
  }

  /**
   * Queries memories using a hybrid approach.
   */
  async query(queryText: string, options: { userId: string; sector?: string; limit?: number }): Promise<QueryResult[]> {
    const { userId, sector, limit = 5 } = options;
    const classification = classifyContent(queryText);
    const primarySector = sector || classification.primarySector;
    
    // 1. Vector search — primary sector + semantic fallback (max 2 sectors)
    const searchSectors = [primarySector];
    if (primarySector !== "semantic") searchSectors.push("semantic");
    
    const allHits: Map<string, number> = new Map();
    for (const s of searchSectors) {
      const { vector } = await this.config.embedding.embed(queryText, s);
      const hits = await this.config.vector.search(vector, s, userId, limit * 4);
      for (const h of hits) {
        if (!allHits.has(h.id) || allHits.get(h.id)! < h.score) {
          allHits.set(h.id, h.score);
        }
      }
    }
    const vectorHits = Array.from(allHits.entries()).map(([id, score]) => ({ id, score }));
    
    // 2. Expand via waypoints
    const initialIds = vectorHits.map(h => h.id);
    const expanded = await expandViaWaypoints(initialIds, userId, this.config.storage, limit);
    
    // 3. Re-score
    const queryTokens = new Set(queryText.toLowerCase().split(/\W+/));
    const results: QueryResult[] = [];
    
    // Create a map to combine hits
    const candidateIds = new Set([...initialIds, ...expanded.map(e => e.id)]);
    
    for (const id of candidateIds) {
      const mem = await this.config.storage.getMemory(id, userId);
      if (!mem) continue;
      
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
    }
    
    results.sort((a, b) => b.score - a.score);
    const topResults = results.slice(0, limit);
    
    // Update last seen to prevent decay only for returned results
    for (const res of topResults) {
      res.memory.lastSeenAt = clock.now();
      await this.config.storage.updateMemory(res.memory);
    }
    
    return topResults;
  }

  /**
   * Updates an existing memory's content and re-embeds it.
   */
  async update(id: string, content: string, options: { userId: string; metadata?: Record<string, any>; tags?: string[] }): Promise<MemoryNode> {
    const { userId, metadata, tags } = options;
    const existing = await this.config.storage.getMemory(id, userId);
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

    for (const sector of existing.sectors) {
      await this.config.vector.deleteVector(id, sector, userId);
    }
    for (const sector of classification.sectors) {
      const { vector, dim } = await this.config.embedding.embed(content, sector);
      await this.config.vector.storeVector(id, sector, userId, vector, dim);
    }

    await this.config.storage.updateMemory(memory);
    return memory;
  }

  /**
   * Deletes a memory and its associated vectors.
   */
  async delete(id: string, userId: string): Promise<void> {
    const existing = await this.config.storage.getMemory(id, userId);
    if (!existing) return;

    for (const sector of existing.sectors) {
      await this.config.vector.deleteVector(id, sector, userId);
    }
    await this.config.storage.deleteMemory(id, userId);
  }

  /**
   * Gets all memories for the user in a given sector.
   */
  async getAll(sector: string, options: { userId: string; limit?: number }): Promise<MemoryNode[]> {
    return this.config.storage.getMemoriesBySector(sector, options.userId, options.limit || 100);
  }

  /**
   * Gets a specific memory by ID.
   */
  async get(id: string, options: { userId: string }): Promise<MemoryNode | null> {
    return this.config.storage.getMemory(id, options.userId);
  }

  /**
   * Manually reinforces the salience of a specific memory node.
   */
  async reinforce(id: string, options: { userId: string }): Promise<void> {
    const memory = await this.config.storage.getMemory(id, options.userId);
    if (memory) {
      const { reinforceNodeSalience } = await import("./waypoints");
      await reinforceNodeSalience(memory, this.config.storage);
    }
  }

  /**
   * Runs the decay pass across all memories.
   */
  async runDecayPass(userId: string): Promise<void> {
    // TODO: implement decay logic across all memories
  }
}
