import { IStoragePlugin } from "../../core/plugin";
import { MemoryNode, WaypointEdge, TemporalFact } from "../../core/types";

/**
 * In-memory storage plugin for testing and simple environments.
 */
export function memoryStorage(): IStoragePlugin {
  const memories = new Map<string, MemoryNode>();
  const waypoints = new Map<string, WaypointEdge>();
  const facts = new Map<string, TemporalFact>();

  return {
    name: "memory-storage",
    version: "1.0.0",

    async insertMemory(memory: MemoryNode) {
      memories.set(memory.id, { ...memory });
    },

    async updateMemory(memory: MemoryNode) {
      memories.set(memory.id, { ...memory });
    },

    async getMemory(id: string, userId: string) {
      const mem = memories.get(id);
      if (mem && mem.userId === userId) return { ...mem };
      return null;
    },

    async getMemoriesBySector(sector: string, userId: string, limit: number) {
      const res: MemoryNode[] = [];
      for (const mem of memories.values()) {
        if (mem.userId === userId && mem.sectors.includes(sector)) {
          res.push({ ...mem });
          if (res.length >= limit) break;
        }
      }
      return res;
    },

    async deleteMemory(id: string, userId: string) {
      const mem = memories.get(id);
      if (mem && mem.userId === userId) {
        memories.delete(id);
      }
    },

    async insertWaypoint(edge: WaypointEdge) {
      const key = `${edge.srcId}:${edge.dstId}`;
      waypoints.set(key, { ...edge });
    },

    async getNeighbors(srcId: string, userId: string) {
      const res: WaypointEdge[] = [];
      for (const wp of waypoints.values()) {
        if (wp.userId === userId && wp.srcId === srcId) {
          res.push({ ...wp });
        }
      }
      return res;
    },

    async pruneWaypoints(threshold: number, userId: string) {
      let pruned = 0;
      for (const [key, wp] of waypoints.entries()) {
        if (wp.userId === userId && wp.weight < threshold) {
          waypoints.delete(key);
          pruned++;
        }
      }
      return pruned;
    },

    async insertFact(fact: TemporalFact) {
      facts.set(fact.id, { ...fact });
    },

    async updateFact(fact: TemporalFact) {
      facts.set(fact.id, { ...fact });
    },

    async getActiveFact(subject: string, predicate: string, userId: string) {
      for (const fact of facts.values()) {
        if (fact.userId === userId && fact.subject === subject && fact.predicate === predicate && fact.validTo === null) {
          return { ...fact };
        }
      }
      return null;
    },

    async queryFacts(userId: string, opts: { subject?: string; predicate?: string }) {
      const res: TemporalFact[] = [];
      for (const fact of facts.values()) {
        if (fact.userId === userId) {
          if (opts.subject && fact.subject !== opts.subject) continue;
          if (opts.predicate && fact.predicate !== opts.predicate) continue;
          res.push({ ...fact });
        }
      }
      return res;
    },

    async invalidateFact(id: string, userId: string, atTime: number) {
      const fact = facts.get(id);
      if (fact && fact.userId === userId) {
        fact.validTo = atTime;
      }
    }
  };
}
