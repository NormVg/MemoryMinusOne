import { MemoryNode, WaypointEdge, TemporalFact, QueryResult } from "./types";

export interface PluginContext {
  logger: import("./logger").Logger;
  events: import("./events").TypedEventEmitter;
}

export interface BasePlugin {
  readonly name: string;
  readonly version: string;
  init?(ctx: PluginContext): Promise<void>;
  destroy?(): Promise<void>;
}

export interface IStoragePlugin extends BasePlugin {
  // Memory CRUD
  insertMemory(memory: MemoryNode): Promise<void>;
  updateMemory(memory: MemoryNode): Promise<void>;
  getMemory(id: string, userId: string): Promise<MemoryNode | null>;
  getMemoriesBySector(sector: string, userId: string, limit: number): Promise<MemoryNode[]>;
  getMemoriesByUser?(userId: string, limit: number, offset?: number): Promise<MemoryNode[]>;
  deleteMemory(id: string, userId: string): Promise<void>;

  // Waypoints
  insertWaypoint(edge: WaypointEdge): Promise<void>;
  getNeighbors(srcId: string, userId: string): Promise<WaypointEdge[]>;
  pruneWaypoints(threshold: number, userId: string): Promise<number>;

  // Facts
  insertFact(fact: TemporalFact): Promise<void>;
  updateFact(fact: TemporalFact): Promise<void>;
  getActiveFact(subject: string, predicate: string, userId: string): Promise<TemporalFact | null>;
  queryFacts(userId: string, opts: { subject?: string; predicate?: string; at?: number }): Promise<TemporalFact[]>;
  invalidateFact(id: string, userId: string, atTime: number): Promise<void>;
}

export interface IEmbeddingPlugin extends BasePlugin {
  embed(text: string, sector: string): Promise<{ vector: number[]; dim: number }>;
  embedBatch(texts: string[], sector: string): Promise<{ vectors: number[][]; dim: number }>;
}

export interface IVectorPlugin extends BasePlugin {
  storeVector(id: string, sector: string, userId: string, vector: number[], dim: number): Promise<void>;
  search(vector: number[], sector: string, userId: string, limit: number): Promise<Array<{ id: string; score: number }>>;
  getVectorsForId?(id: string, userId: string): Promise<Array<{ sector: string; vector: number[]; dim: number }>>;
  deleteVector(id: string, sector: string, userId: string): Promise<void>;
}

export interface ICachePlugin extends BasePlugin {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
}
