import { EventEmitter } from "events";

export interface MemoryEvents {
  "memory:added": { id: string; userId: string; sector: string; durationMs: number };
  "memory:queried": { query: string; userId: string; results: number; durationMs: number };
  "memory:deleted": { id: string; userId: string };
  "decay:cycle": { segments: number; durationMs: number; changes: number };
  "fact:set": { id: string; userId: string; subject: string; predicate: string; object: string };
  "fact:superseded": { oldId: string; newId: string; userId: string };
  "waypoint:created": { srcId: string; dstId: string; userId: string; weight: number };
  "waypoint:pruned": { count: number; userId: string };
}

export declare interface TypedEventEmitter {
  on<K extends keyof MemoryEvents>(event: K, listener: (arg: MemoryEvents[K]) => void): this;
  emit<K extends keyof MemoryEvents>(event: K, arg: MemoryEvents[K]): boolean;
}

export class TypedEventEmitter extends EventEmitter {}
