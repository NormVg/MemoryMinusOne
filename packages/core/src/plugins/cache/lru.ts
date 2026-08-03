import { ICachePlugin, PluginContext } from "../../core/plugin";
import { clock } from "../../core/clock";

export interface LRUCacheOptions {
  maxSize?: number;
  defaultTtlSeconds?: number;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number | null;
  lastAccessed: number;
}

/**
 * Simple in-memory LRU cache plugin.
 */
export function lruCache(options: LRUCacheOptions = {}): ICachePlugin {
  const maxSize = options.maxSize || 1000;
  const defaultTtlSeconds = options.defaultTtlSeconds || 3600;
  
  const store = new Map<string, CacheEntry<any>>();

  return {
    name: "lru-cache",
    version: "1.0.0",

    async init(ctx: PluginContext) {
      ctx.logger.debug("lru_cache", `Initialized with max size ${maxSize}`);
    },

    async get<T>(key: string): Promise<T | null> {
      const entry = store.get(key);
      if (!entry) return null;

      if (entry.expiresAt !== null && clock.now() > entry.expiresAt) {
        store.delete(key);
        return null;
      }

      entry.lastAccessed = clock.now();
      return entry.value as T;
    },

    async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
      if (store.size >= maxSize) {
        // Evict least recently used
        let oldestKey: string | null = null;
        let oldestTime = Infinity;
        
        for (const [k, v] of store.entries()) {
          if (v.lastAccessed < oldestTime) {
            oldestTime = v.lastAccessed;
            oldestKey = k;
          }
        }
        
        if (oldestKey) {
          store.delete(oldestKey);
        }
      }

      const ttl = ttlSeconds ?? defaultTtlSeconds;
      store.set(key, {
        value,
        expiresAt: ttl > 0 ? clock.now() + ttl * 1000 : null,
        lastAccessed: clock.now()
      });
    },

    async delete(key: string): Promise<void> {
      store.delete(key);
    },
    
    async destroy() {
      store.clear();
    }
  };
}
