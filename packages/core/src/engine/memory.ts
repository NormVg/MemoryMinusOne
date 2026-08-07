import { MemoryConfig } from "../core/config";
import { MemoryNode, QueryResult } from "../core/types";
import { classifyContent } from "./sectors";
import { computeSimhash } from "./simhash";
import { createSingleWaypoint, expandViaWaypoints } from "./waypoints";
import { computeHybridScore, computeTokenOverlap, calcRecencyScore, cosineSimilarity, calcMultiVecFusionScore } from "./scoring";
import { computeCombinedKeywordScore } from "./keyword";
import { reinforcePath, reinforceNodeSalience } from "./waypoints";
import { calcDecay } from "./decay";
import { compressVector, fingerprintMemory, extractEssence } from "./compression";
import { clusterMemories, calcReflectionSalience } from "./reflection";
import { clock } from "../core/clock";
import { TypedEventEmitter } from "../core/events";

export class MemoryEngine {
  constructor(private config: MemoryConfig, private events: TypedEventEmitter) {}

  /**
   * Adds a new memory to the system.
   */
  async add(content: string, options: { userId: string; metadata?: Record<string, any>; tags?: string[]; sector?: string; timestamp?: number }): Promise<MemoryNode> {
    const startTime = clock.now();
    const { userId, metadata = {}, tags = [], sector, timestamp } = options;
    const classification = sector
      ? { primarySector: sector, sectors: [sector] }
      : classifyContent(content, metadata);
    const simhash = computeSimhash(content);
    const id = crypto.randomUUID();
    const now = timestamp ?? clock.now();
    
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
      coactivations: 0,
    };

    // Embed and store vectors
    // Using the multi-sector embedding strategy
    let bestMatchId: string | undefined;
    let bestMatchSim = -1;

    const contentBatch = classification.sectors.map(() => content);
    const { vectors, dim } = await this.config.embedding.embedBatch(contentBatch, classification.primarySector);

    for (let i = 0; i < classification.sectors.length; i++) {
      const sector = classification.sectors[i];
      const vector = vectors[i];
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
    const edge = await createSingleWaypoint(id, [], userId, this.config.storage, bestMatchId, bestMatchSim);

    this.events.emit("waypoint:created", {
      srcId: edge.srcId,
      dstId: edge.dstId,
      userId: edge.userId,
      weight: edge.weight
    });

    this.events.emit("memory:added", {
      id,
      userId,
      sector: classification.primarySector,
      durationMs: clock.now() - startTime
    });

    return memory;
  }

  /**
   * Queries memories using a hybrid approach.
   */
  async query(queryText: string, options: { userId: string; sector?: string; limit?: number }): Promise<QueryResult[]> {
    const startTime = clock.now();
    const { userId, sector, limit = 5 } = options;
    const classification = classifyContent(queryText);
    const primarySector = sector || classification.primarySector;
    
    // Check cache
    const cacheKey = `q:${userId}:${computeSimhash(queryText)}:${limit}:${primarySector}`;
    if (this.config.cache) {
      const cached = await this.config.cache.get<QueryResult[]>(cacheKey);
      if (cached) {
        this.events.emit("memory:queried", {
          query: queryText,
          userId,
          results: cached.length,
          durationMs: clock.now() - startTime
        });
        return cached;
      }
    }
    
    // 1. Vector search — primary sector + semantic fallback (max 2 sectors)
    const searchSectors = [primarySector];
    if (primarySector !== "semantic") searchSectors.push("semantic");
    
    // Batch embed the query for all search sectors
    const queryTexts = searchSectors.map(() => queryText);
    const { vectors: qVectors } = await this.config.embedding.embedBatch(queryTexts, primarySector);
    
    const queryVectors: Record<string, number[]> = {};
    for (let i = 0; i < searchSectors.length; i++) {
      queryVectors[searchSectors[i]] = qVectors[i];
    }
    
    const allHits: Map<string, number> = new Map();
    for (const s of searchSectors) {
      const hits = await this.config.vector.search(queryVectors[s], s, userId, limit * 4);
      for (const h of hits) {
        if (!allHits.has(h.id) || allHits.get(h.id)! < h.score) {
          allHits.set(h.id, h.score);
        }
      }
    }
    const vectorHits = Array.from(allHits.entries()).map(([id, score]) => ({ id, score }));
    vectorHits.sort((a, b) => b.score - a.score);
    
    // 2. Adaptive Waypoint Expansion
    let expanded: Array<{ id: string; weight: number; path: string[] }> = [];
    const topScores = vectorHits.slice(0, 3).map(h => h.score);
    const avgTop = topScores.length > 0 ? topScores.reduce((sum, score) => sum + score, 0) / topScores.length : 0;
    
    if (avgTop < 0.55) {
      const initialIds = vectorHits.map(h => h.id);
      expanded = await expandViaWaypoints(initialIds, userId, this.config.storage, limit);
    }
    
    // 3. Re-score
    const queryTokens = new Set(queryText.toLowerCase().split(/\W+/));
    const results: QueryResult[] = [];
    
    // Create a map to combine hits
    const candidateIds = new Set([...vectorHits.map(h => h.id), ...expanded.map(e => e.id)]);
    
    for (const id of candidateIds) {
      const mem = await this.config.storage.getMemory(id, userId);
      if (!mem) continue;
      
      const vHit = vectorHits.find(h => h.id === id);
      
      // Compute fused multi-vector similarity score
      // We need the memory's vector across all its sectors
      let fusedSimilarity = vHit ? vHit.score : 0.5;
      if (this.config.vector.getVectorsForId) {
        const memVecs = await this.config.vector.getVectorsForId(id, userId);
        if (memVecs.length > 0) {
          fusedSimilarity = calcMultiVecFusionScore(queryVectors, memVecs);
        }
      }
      
      const eHit = expanded.find(h => h.id === id);
      const waypointWeight = eHit ? eHit.weight : 0;
      
      const memTokens = new Set(mem.content.toLowerCase().split(/\W+/));
      const overlap = computeTokenOverlap(queryTokens, memTokens);
      const recency = calcRecencyScore(mem.lastSeenAt);
      
      const keywordScore = computeCombinedKeywordScore(queryText, mem.content);
      
      const score = computeHybridScore(fusedSimilarity, overlap, waypointWeight, recency, 0, keywordScore);
      
      results.push({
        memory: mem,
        score,
        matchType: vHit ? "semantic" : "waypoint",
        path: eHit ? eHit.path : [id]
      });
    }
    
    results.sort((a, b) => b.score - a.score);
    const topResults = results.slice(0, limit);
    
    // Update last seen and coactivations to prevent decay only for returned results
    for (const res of topResults) {
      res.memory.lastSeenAt = clock.now();
      res.memory.coactivations += 1;
      
      // Stage 6: Decay regeneration on query hit
      if (this.config.vector.getVectorsForId) {
        const vecs = await this.config.vector.getVectorsForId(res.memory.id, userId);
        if (vecs.length > 0 && vecs[0].dim <= 64) {
          // It was fingerprinted. Re-embed to full resolution and boost salience!
          const contentBatch = res.memory.sectors.map(() => res.memory.content);
          const { vectors, dim } = await this.config.embedding.embedBatch(contentBatch, res.memory.primarySector);
          
          for (let i = 0; i < res.memory.sectors.length; i++) {
            await this.config.vector.storeVector(res.memory.id, res.memory.sectors[i], userId, vectors[i], dim);
          }
          
          res.memory.salience = 1.0; // "Un-decay" completely
        }
      }
      
      await this.config.storage.updateMemory(res.memory);
      
      // Reinforce path if it was found via waypoints
      if (res.matchType === "waypoint" && res.path && res.path.length > 1) {
        await reinforcePath(res.path, this.config.storage, res.memory.userId);
      }
      
      // Also reinforce the node salience itself
      await reinforceNodeSalience(res.memory, this.config.storage);
    }
    
    if (this.config.cache) {
      await this.config.cache.set(cacheKey, topResults, 300); // 5 min TTL
    }
    
    this.events.emit("memory:queried", {
      query: queryText,
      userId,
      results: topResults.length,
      durationMs: clock.now() - startTime
    });
    
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
      coactivations: existing.coactivations || 0,
    };

    for (const sector of existing.sectors) {
      await this.config.vector.deleteVector(id, sector, userId);
    }
    const contentBatch = classification.sectors.map(() => content);
    const { vectors, dim } = await this.config.embedding.embedBatch(contentBatch, classification.primarySector);
    for (let i = 0; i < classification.sectors.length; i++) {
      const sector = classification.sectors[i];
      const vector = vectors[i];
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
    
    this.events.emit("memory:deleted", { id, userId });
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
    if (!this.config.storage.getMemoriesByUser) {
      this.events.emit("decay:skipped", { userId, reason: "Storage plugin lacks getMemoriesByUser" });
      return;
    }

    const startTime = clock.now();
    let processed = 0;
    let compressed = 0;
    let fingerprinted = 0;

    const limit = 100;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const memories = await this.config.storage.getMemoriesByUser(userId, limit, offset);
      if (memories.length === 0) {
        hasMore = false;
        break;
      }

      for (const memory of memories) {
        processed++;
        const newSalience = calcDecay(
          memory.primarySector,
          memory.salience,
          memory.lastSeenAt,
          memory.coactivations,
          memory.metadata?.consolidated === true
        );

        if (newSalience !== memory.salience) {
          memory.salience = newSalience;
          memory.updatedAt = clock.now();
          await this.config.storage.updateMemory(memory);
        }

        // Apply compression and fingerprinting based on salience
        if (newSalience < 0.3) {
          // Deep cold - Fingerprint memory
          if (this.config.vector.getVectorsForId) {
            const vectors = await this.config.vector.getVectorsForId(memory.id, userId);
            for (const v of vectors) {
              if (v.dim > 32) {
                const essence = extractEssence(memory.content, 200);
                const fingerprint = fingerprintMemory(memory.id, essence);
                await this.config.vector.storeVector(memory.id, v.sector, userId, fingerprint, 32);
                fingerprinted++;
              }
            }
          }
        } else if (newSalience < 0.7) {
          // Warm - Compress vector
          if (this.config.vector.getVectorsForId) {
            const vectors = await this.config.vector.getVectorsForId(memory.id, userId);
            for (const v of vectors) {
              // Only compress if it hasn't been compressed down to 256 or lower already
              if (v.dim > 256) {
                const compressedVec = compressVector(v.vector, 256);
                await this.config.vector.storeVector(memory.id, v.sector, userId, compressedVec, 256);
                compressed++;
              }
            }
          }
        }
      }

      offset += limit;
    }

    this.events.emit("decay:completed", {
      userId,
      processed,
      compressed,
      fingerprinted,
      durationMs: clock.now() - startTime
    });
  }

  /**
   * Runs the reflection pass across all memories.
   */
  async runReflection(userId: string): Promise<void> {
    if (!this.config.storage.getMemoriesByUser) {
      return;
    }

    const startTime = clock.now();
    const limit = 1000; // Gather a large chunk for clustering
    const memories = await this.config.storage.getMemoriesByUser(userId, limit, 0);
    if (memories.length === 0) return;

    const clusters = clusterMemories(memories, 0.8);
    let reflectionsCreated = 0;

    for (const cluster of clusters) {
      if (cluster.length < 2) continue;

      // Extract essence of the cluster
      const combinedText = cluster.map(m => m.content).join(" ");
      const summary = extractEssence(combinedText, 300);

      const reflectionId = crypto.randomUUID();
      const now = clock.now();
      const primarySector = cluster[0].primarySector;
      const salience = calcReflectionSalience(cluster, now);

      const reflectionMemory: MemoryNode = {
        id: reflectionId,
        userId,
        content: `[Reflection] ${summary}`,
        primarySector,
        sectors: [primarySector],
        tags: ["reflection"],
        metadata: {
          reflectionOf: cluster.map(m => m.id)
        },
        simhash: computeSimhash(summary),
        salience,
        decayLambda: 0.01,
        version: 1,
        createdAt: now,
        updatedAt: now,
        lastSeenAt: now,
        coactivations: 0
      };

      // Embed and store
      const { vector, dim } = await this.config.embedding.embed(reflectionMemory.content, primarySector);
      await this.config.vector.storeVector(reflectionId, primarySector, userId, vector, dim);
      await this.config.storage.insertMemory(reflectionMemory);

      reflectionsCreated++;

      // Update originals as consolidated
      for (const m of cluster) {
        m.metadata = { ...m.metadata, consolidated: true };
        // Boost salience slightly due to consolidation
        m.salience = Math.min(1.0, m.salience + 0.1);
        m.updatedAt = now;
        await this.config.storage.updateMemory(m);

        // Optionally, create a waypoint from original to reflection
        await createSingleWaypoint(m.id, [], userId, this.config.storage, reflectionId, 0.9);
      }
    }
  }
}
