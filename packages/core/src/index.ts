import { MemoryConfig, validateConfig } from "./core/config";
import { DefaultLogger, Logger } from "./core/logger";
import { TypedEventEmitter } from "./core/events";
import { PluginContext } from "./core/plugin";
import { noCache } from "./plugins/cache/none";
import { MemoryEngine } from "./engine/memory";
import { FactStore } from "./temporal/facts";
import { FactVersioning } from "./temporal/versioning";
import { FactQuery } from "./temporal/query";
import { FactTimeline } from "./temporal/timeline";

export class MemoryMinusOne {
  private config: Readonly<MemoryConfig>;
  private logger: Logger;
  private events: TypedEventEmitter;
  private engine!: MemoryEngine;
  private factStore!: FactStore;
  private factVersioning!: FactVersioning;
  private factQuery!: FactQuery;
  private factTimeline!: FactTimeline;

  constructor(config: MemoryConfig) {
    validateConfig(config);
    this.config = Object.freeze({
      ...config,
      cache: config.cache || noCache(),
    });

    this.logger = new DefaultLogger(config.logger);
    this.events = new TypedEventEmitter();
  }

  async init() {
    this.logger.info("engine", "Initializing MemoryMinusOne...");
    const ctx: PluginContext = { logger: this.logger, events: this.events };

    await this.config.storage.init?.(ctx);
    await this.config.embedding.init?.(ctx);
    await this.config.vector.init?.(ctx);
    await this.config.cache?.init?.(ctx);
    
    this.engine = new MemoryEngine(this.config);
    this.factStore = new FactStore(this.config.storage, this.config.userId);
    this.factVersioning = new FactVersioning(this.config.storage, this.config.userId);
    this.factQuery = new FactQuery(this.config.storage, this.config.userId);
    this.factTimeline = new FactTimeline(this.config.storage, this.config.userId);

    this.logger.info("engine", "Initialization complete");
  }

  async destroy() {
    this.logger.info("engine", "Destroying MemoryMinusOne...");
    await this.config.storage.destroy?.();
    await this.config.embedding.destroy?.();
    await this.config.vector.destroy?.();
    await this.config.cache?.destroy?.();
  }

  get eventsEmitter() {
    return this.events;
  }

  // Core Engine Methods
  async add(content: string, metadata?: Record<string, any>, tags: string[] = []) {
    return this.engine.add(content, metadata, tags);
  }

  async query(queryText: string, sector?: string, limit: number = 5) {
    return this.engine.query(queryText, sector, limit);
  }

  async reflect() {
    // TODO: delegate to reflection engine
  }
  
  async decay() {
    // TODO: delegate to decay pass
  }

  // Facts namespace
  get facts() {
    return {
      insert: async (fact: any) => this.factStore.insert(fact),
      invalidate: async (id: string) => this.factStore.invalidate(id),
      evolve: async (subject: string, predicate: string, object: string, confidence?: number, metadata?: any) => 
        this.factVersioning.evolveFact(subject, predicate, object, confidence, metadata),
      query: {
        at: async (timeMs: number) => this.factQuery.atPointInTime(timeMs),
        current: async () => this.factQuery.current(),
        active: async (s: string, p: string) => this.factQuery.activeFact(s, p),
        compare: async (t1: number, t2: number) => this.factQuery.compareTimePoints(t1, t2),
      },
      timeline: async (subject: string) => this.factTimeline.getSubjectTimeline(subject),
    };
  }
}

export function createMemory(config: MemoryConfig) {
  return new MemoryMinusOne(config);
}

// Re-export core types
export * from "./core/types";
export * from "./core/errors";
export * from "./core/plugin";
export * from "./core/config";
export * from "./core/logger";
export * from "./core/clock";
export * from "./core/events";

// Re-export built-in plugins and engines
export { syntheticEmbedding } from "./plugins/embedding/synthetic";
export { memoryStorage } from "./plugins/storage/memory";
export { memoryVectorStore } from "./plugins/vector/memory";
export { lruCache } from "./plugins/cache/lru";
export { noCache } from "./plugins/cache/none";
export { MemoryEngine } from "./engine/memory";
export { FactStore } from "./temporal/facts";
