import { MemoryNode } from "../core/types";
import { IVectorPlugin } from "../core/plugin";
import { IEmbeddingPlugin } from "../core/plugin";

/**
 * Extracts simple entities using regex heuristics:
 * - QUOTED: "some text"
 * - PROPER: Capitalized words
 * - IDENTIFIER: camelCase or snake_case or ALL_CAPS
 */
export function extractEntities(text: string): string[] {
  const entities = new Set<string>();

  // 1. Quoted text (double quotes)
  const quotedRegex = /"([^"]+)"/g;
  let match;
  while ((match = quotedRegex.exec(text)) !== null) {
    if (match[1].length > 2) {
      entities.add(match[1].trim());
    }
  }

  // 2. Single quoted
  const singleQuotedRegex = /'([^']+)'/g;
  while ((match = singleQuotedRegex.exec(text)) !== null) {
    if (match[1].length > 2) {
      entities.add(match[1].trim());
    }
  }

  // 3. Proper Nouns (Two or more consecutive capitalized words)
  const properRegex = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/g;
  while ((match = properRegex.exec(text)) !== null) {
    entities.add(match[1].trim());
  }

  // 4. Identifiers (snake_case, camelCase, PascalCase, MACRO_CASE)
  const idRegex = /\b([a-z]+(?:[A-Z][a-z]+)+|[A-Z][a-z]+(?:[A-Z][a-z]+)+|[a-z]+(?:_[a-z]+)+|[A-Z]+(?:_[A-Z]+)+)\b/g;
  while ((match = idRegex.exec(text)) !== null) {
    entities.add(match[1].trim());
  }

  return Array.from(entities);
}

export class EntityStore {
  constructor(
    private embedding: IEmbeddingPlugin,
    private vector: IVectorPlugin
  ) {}

  /**
   * Extracts and stores entities in a secondary vector namespace.
   * We use "entity" as the sector name for isolation.
   */
  async processAndStoreEntities(memoryId: string, content: string, userId: string) {
    const entities = extractEntities(content);
    if (entities.length === 0) return;

    const { vectors, dim } = await this.embedding.embedBatch(entities, "entity");
    
    for (let i = 0; i < entities.length; i++) {
      // Store the entity vector. The ID will include the original memory ID
      // to establish the link.
      const entityId = `entity_${memoryId}_${crypto.randomUUID()}`;
      await this.vector.storeVector(entityId, "entity", userId, vectors[i], dim);
    }
  }

  /**
   * Queries the entity store and computes a hub-dampened boost for memory IDs.
   */
  async computeEntityBoosts(queryText: string, userId: string, limit: number = 10): Promise<Map<string, number>> {
    const queryEntities = extractEntities(queryText);
    const boosts = new Map<string, number>();

    if (queryEntities.length === 0) return boosts;

    const { vectors } = await this.embedding.embedBatch(queryEntities, "entity");
    
    // Search for matching entities
    const allHits = [];
    for (const vec of vectors) {
      const hits = await this.vector.search(vec, "entity", userId, limit);
      allHits.push(...hits);
    }

    // Compute hub-dampened scores
    // If a memory ID appears too often, it's a hub. Dampen it.
    const memoryHitCounts = new Map<string, number>();
    for (const hit of allHits) {
      // Extract memoryId from entityId format "entity_memoryId_randomId"
      const parts = hit.id.split("_");
      if (parts.length >= 2) {
        const memoryId = parts[1];
        const count = memoryHitCounts.get(memoryId) || 0;
        memoryHitCounts.set(memoryId, count + 1);
        
        // Sum scores
        const existingScore = boosts.get(memoryId) || 0;
        boosts.set(memoryId, existingScore + hit.score);
      }
    }

    // Apply hub dampening: score / sqrt(count)
    for (const [memoryId, totalScore] of boosts) {
      const count = memoryHitCounts.get(memoryId)!;
      const dampenedScore = totalScore / Math.sqrt(count);
      boosts.set(memoryId, dampenedScore * 0.1); // Scale factor for entity boost
    }

    return boosts;
  }
}
