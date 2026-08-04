import { EventEmitter } from 'events';

interface MemoryNode {
    id: string;
    userId: string;
    content: string;
    primarySector: string;
    sectors: string[];
    tags: string[];
    metadata: Record<string, any>;
    simhash?: string;
    salience: number;
    decayLambda: number;
    version: number;
    createdAt: number;
    updatedAt: number;
    lastSeenAt: number;
}
interface WaypointEdge {
    srcId: string;
    dstId: string;
    userId: string;
    weight: number;
    createdAt: number;
    updatedAt: number;
}
interface TemporalFact {
    id: string;
    userId: string;
    subject: string;
    predicate: string;
    object: string;
    validFrom: number;
    validTo: number | null;
    confidence: number;
    metadata?: Record<string, any>;
}
interface SectorClassification {
    primarySector: string;
    sectors: string[];
    confidence: number;
}
interface QueryResult {
    memory: MemoryNode;
    score: number;
    matchType: "semantic" | "keyword" | "waypoint";
    path?: string[];
}
type DecayTier = "hot" | "warm" | "cold";

interface MemoryEvents {
    "memory:added": {
        id: string;
        userId: string;
        sector: string;
        durationMs: number;
    };
    "memory:queried": {
        query: string;
        userId: string;
        results: number;
        durationMs: number;
    };
    "memory:deleted": {
        id: string;
        userId: string;
    };
    "decay:cycle": {
        segments: number;
        durationMs: number;
        changes: number;
    };
    "fact:set": {
        id: string;
        userId: string;
        subject: string;
        predicate: string;
        object: string;
    };
    "fact:superseded": {
        oldId: string;
        newId: string;
        userId: string;
    };
    "waypoint:created": {
        srcId: string;
        dstId: string;
        userId: string;
        weight: number;
    };
    "waypoint:pruned": {
        count: number;
        userId: string;
    };
}
declare interface TypedEventEmitter {
    on<K extends keyof MemoryEvents>(event: K, listener: (arg: MemoryEvents[K]) => void): this;
    emit<K extends keyof MemoryEvents>(event: K, arg: MemoryEvents[K]): boolean;
}
declare class TypedEventEmitter extends EventEmitter {
}

interface Logger {
    debug(namespace: string, message: string, meta?: any): void;
    info(namespace: string, message: string, meta?: any): void;
    warn(namespace: string, message: string, meta?: any): void;
    error(namespace: string, message: string, meta?: any): void;
}
interface LoggerOptions {
    enabled?: boolean;
    namespaces?: string[];
}
declare class DefaultLogger implements Logger {
    private enabled;
    private namespaces;
    private matchAll;
    constructor(options?: LoggerOptions);
    private shouldLog;
    private format;
    debug(namespace: string, message: string, meta?: any): void;
    info(namespace: string, message: string, meta?: any): void;
    warn(namespace: string, message: string, meta?: any): void;
    error(namespace: string, message: string, meta?: any): void;
}

interface PluginContext {
    logger: Logger;
    events: TypedEventEmitter;
}
interface BasePlugin {
    readonly name: string;
    readonly version: string;
    init?(ctx: PluginContext): Promise<void>;
    destroy?(): Promise<void>;
}
interface IStoragePlugin extends BasePlugin {
    insertMemory(memory: MemoryNode): Promise<void>;
    updateMemory(memory: MemoryNode): Promise<void>;
    getMemory(id: string, userId: string): Promise<MemoryNode | null>;
    getMemoriesBySector(sector: string, userId: string, limit: number): Promise<MemoryNode[]>;
    deleteMemory(id: string, userId: string): Promise<void>;
    insertWaypoint(edge: WaypointEdge): Promise<void>;
    getNeighbors(srcId: string, userId: string): Promise<WaypointEdge[]>;
    pruneWaypoints(threshold: number, userId: string): Promise<number>;
    insertFact(fact: TemporalFact): Promise<void>;
    updateFact(fact: TemporalFact): Promise<void>;
    getActiveFact(subject: string, predicate: string, userId: string): Promise<TemporalFact | null>;
    queryFacts(userId: string, opts: {
        subject?: string;
        predicate?: string;
        at?: number;
    }): Promise<TemporalFact[]>;
    invalidateFact(id: string, userId: string, atTime: number): Promise<void>;
}
interface IEmbeddingPlugin extends BasePlugin {
    embed(text: string, sector: string): Promise<{
        vector: number[];
        dim: number;
    }>;
    embedBatch(texts: string[], sector: string): Promise<{
        vectors: number[][];
        dim: number;
    }>;
}
interface IVectorPlugin extends BasePlugin {
    storeVector(id: string, sector: string, userId: string, vector: number[], dim: number): Promise<void>;
    search(vector: number[], sector: string, userId: string, limit: number): Promise<Array<{
        id: string;
        score: number;
    }>>;
    deleteVector(id: string, sector: string, userId: string): Promise<void>;
}
interface ICachePlugin extends BasePlugin {
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
    delete(key: string): Promise<void>;
}

interface MemoryConfig {
    storage: IStoragePlugin;
    embedding: IEmbeddingPlugin;
    vector: IVectorPlugin;
    cache?: ICachePlugin;
    logger?: LoggerOptions;
    options?: {
        decayIntervalMs?: number;
        reflectionIntervalMs?: number;
        tablePrefix?: string;
    };
}
declare function validateConfig(config: MemoryConfig): void;

declare class MemoryMinusOneError extends Error {
    readonly code: string;
    constructor(code: string, message: string);
}
declare class StorageError extends MemoryMinusOneError {
    constructor(code: string, message: string);
}
declare class EmbeddingError extends MemoryMinusOneError {
    constructor(code: string, message: string);
}
declare class ConfigError extends MemoryMinusOneError {
    constructor(code: string, message: string);
}
declare class PluginError extends MemoryMinusOneError {
    constructor(code: string, message: string);
}

interface Clock {
    /** Returns the current time in milliseconds since epoch */
    now(): number;
}
/**
 * Default clock implementation using Date.now().
 * In tests, this should be replaced with a deterministic mock.
 */
declare const defaultClock: Clock;
declare const clock: {
    now: () => number;
    /** Override the clock for testing */
    setClock: (newClock: Clock) => void;
    /** Restore the default clock */
    restore: () => void;
};

/**
 * Synthetic embedding uses a combination of n-grams (words and characters)
 * hashed into a fixed-size vector. This provides a deterministic, zero-dependency
 * vector representation that works surprisingly well for similarity matching
 * across short-to-medium texts, without requiring any LLM API calls.
 */
declare function syntheticEmbedding(dim?: number): IEmbeddingPlugin;

/**
 * In-memory storage plugin for testing and simple environments.
 */
declare function memoryStorage(): IStoragePlugin;

/**
 * In-memory vector store for testing or light local usage.
 * Uses brute-force cosine similarity.
 */
declare function memoryVectorStore(): IVectorPlugin;

interface LRUCacheOptions {
    maxSize?: number;
    defaultTtlSeconds?: number;
}
/**
 * Simple in-memory LRU cache plugin.
 */
declare function lruCache(options?: LRUCacheOptions): ICachePlugin;

declare function noCache(): ICachePlugin;

declare class MemoryEngine {
    private config;
    constructor(config: MemoryConfig);
    /**
     * Adds a new memory to the system.
     */
    add(content: string, options: {
        userId: string;
        metadata?: Record<string, any>;
        tags?: string[];
        timestamp?: number;
    }): Promise<MemoryNode>;
    /**
     * Queries memories using a hybrid approach.
     */
    query(queryText: string, options: {
        userId: string;
        sector?: string;
        limit?: number;
    }): Promise<QueryResult[]>;
    /**
     * Updates an existing memory's content and re-embeds it.
     */
    update(id: string, content: string, options: {
        userId: string;
        metadata?: Record<string, any>;
        tags?: string[];
    }): Promise<MemoryNode>;
    /**
     * Deletes a memory and its associated vectors.
     */
    delete(id: string, userId: string): Promise<void>;
    /**
     * Gets all memories for the user in a given sector.
     */
    getAll(sector: string, options: {
        userId: string;
        limit?: number;
    }): Promise<MemoryNode[]>;
    /**
     * Gets a specific memory by ID.
     */
    get(id: string, options: {
        userId: string;
    }): Promise<MemoryNode | null>;
    /**
     * Manually reinforces the salience of a specific memory node.
     */
    reinforce(id: string, options: {
        userId: string;
    }): Promise<void>;
    /**
     * Runs the decay pass across all memories.
     */
    runDecayPass(userId: string): Promise<void>;
}

declare class FactStore {
    private storage;
    constructor(storage: IStoragePlugin);
    /**
     * Directly inserts a fact. Usually you want `versioning.evolveFact` instead
     * to handle the auto-closing of old facts.
     */
    insert(fact: Omit<TemporalFact, "id">): Promise<TemporalFact>;
    /**
     * Marks a fact as no longer valid as of right now.
     */
    invalidate(id: string, userId: string): Promise<void>;
}

declare class MemoryMinusOne {
    private config;
    private logger;
    private events;
    private engine;
    private factStore;
    private factVersioning;
    private factQuery;
    private factTimeline;
    constructor(config: MemoryConfig);
    init(): Promise<void>;
    destroy(): Promise<void>;
    get eventsEmitter(): TypedEventEmitter;
    add(content: string, options: {
        userId: string;
        metadata?: Record<string, any>;
        tags?: string[];
    }): Promise<MemoryNode>;
    query(queryText: string, options: {
        userId: string;
        sector?: string;
        limit?: number;
    }): Promise<QueryResult[]>;
    get(id: string, options: {
        userId: string;
    }): Promise<MemoryNode | null>;
    getAll(sector: string, options: {
        userId: string;
        limit?: number;
    }): Promise<MemoryNode[]>;
    reinforce(id: string, options: {
        userId: string;
    }): Promise<void>;
    reflect(userId: string): Promise<void>;
    decay(userId: string): Promise<void>;
    get facts(): {
        insert: (fact: Omit<TemporalFact, "id">) => Promise<TemporalFact>;
        invalidate: (id: string, userId: string) => Promise<void>;
        evolve: (subject: string, predicate: string, object: string, options: {
            userId: string;
            confidence?: number;
            metadata?: any;
        }) => Promise<TemporalFact>;
        query: {
            at: (timeMs: number, userId: string) => Promise<TemporalFact[]>;
            current: (userId: string) => Promise<TemporalFact[]>;
            active: (s: string, p: string, userId: string) => Promise<TemporalFact | null>;
            compare: (t1: number, t2: number, userId: string) => Promise<{
                added: TemporalFact[];
                removed: TemporalFact[];
                changed: {
                    old: TemporalFact;
                    new: TemporalFact;
                }[];
            }>;
        };
        timeline: (subject: string, userId: string) => Promise<{
            timestamp: number;
            description: string;
            fact: TemporalFact;
        }[]>;
    };
}
declare function createMemory(config: MemoryConfig): MemoryMinusOne;

export { type BasePlugin, type Clock, ConfigError, type DecayTier, DefaultLogger, EmbeddingError, FactStore, type ICachePlugin, type IEmbeddingPlugin, type IStoragePlugin, type IVectorPlugin, type Logger, type LoggerOptions, type MemoryConfig, MemoryEngine, type MemoryEvents, MemoryMinusOne, MemoryMinusOneError, type MemoryNode, type PluginContext, PluginError, type QueryResult, type SectorClassification, StorageError, type TemporalFact, TypedEventEmitter, type WaypointEdge, clock, createMemory, defaultClock, lruCache, memoryStorage, memoryVectorStore, noCache, syntheticEmbedding, validateConfig };
