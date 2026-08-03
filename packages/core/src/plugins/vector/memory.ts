import { IVectorPlugin } from "../../core/plugin";
import { cosineSimilarity } from "../../engine/scoring";

/**
 * In-memory vector store for testing or light local usage.
 * Uses brute-force cosine similarity.
 */
export function memoryVectorStore(): IVectorPlugin {
  const store = new Map<string, Array<{ id: string, userId: string, vector: number[] }>>();

  return {
    name: "memory-vector",
    version: "1.0.0",

    async storeVector(id: string, sector: string, userId: string, vector: number[], dim: number) {
      if (!store.has(sector)) store.set(sector, []);
      const sectorStore = store.get(sector)!;
      
      const existingIdx = sectorStore.findIndex(v => v.id === id && v.userId === userId);
      if (existingIdx >= 0) {
        sectorStore[existingIdx].vector = vector;
      } else {
        sectorStore.push({ id, userId, vector });
      }
    },

    async search(vector: number[], sector: string, userId: string, limit: number) {
      const sectorStore = store.get(sector) || [];
      const userVectors = sectorStore.filter(v => v.userId === userId);
      
      const results = userVectors.map(v => ({
        id: v.id,
        score: cosineSimilarity(vector, v.vector)
      }));
      
      results.sort((a, b) => b.score - a.score);
      return results.slice(0, limit);
    },

    async deleteVector(id: string, sector: string, userId: string) {
      const sectorStore = store.get(sector);
      if (sectorStore) {
        store.set(sector, sectorStore.filter(v => !(v.id === id && v.userId === userId)));
      }
    }
  };
}
