import type { ICachePlugin, PluginContext } from "@memory-minus-one/core";

export interface UpstashCacheOptions {
  /** Upstash Redis REST URL */
  url: string;
  /** Upstash Redis REST token */
  token: string;
  /** Key prefix to namespace all cache entries. Defaults to "m1:" */
  prefix?: string;
  /** Default TTL in seconds. Defaults to 60 (short — just enough to deduplicate bursts within a conversation turn). */
  defaultTtlSeconds?: number;
}

/**
 * Serverless-safe Redis cache plugin using Upstash REST API.
 * 
 * Every operation is a single HTTP fetch() call — no persistent TCP connections,
 * no connection pools, works on Cloudflare Workers, Vercel Edge, AWS Lambda, etc.
 * 
 * @example
 * ```ts
 * import { createMemory } from "@memory-minus-one/core";
 * import { upstashCache } from "@memory-minus-one/cache-redis";
 * 
 * const memory = createMemory({
 *   storage: drizzleStorage,
 *   embedding: openaiEmbedding,
 *   vector: pgVector,
 *   cache: upstashCache({
 *     url: process.env.UPSTASH_REDIS_REST_URL!,
 *     token: process.env.UPSTASH_REDIS_REST_TOKEN!,
 *   }),
 * });
 * ```
 */
export function upstashCache(opts: UpstashCacheOptions): ICachePlugin {
  const prefix = opts.prefix ?? "m1:";
  const defaultTtl = opts.defaultTtlSeconds ?? 60;

  // Lazy-init the Redis client so the import doesn't fail at module-load
  // if @upstash/redis isn't installed yet.
  let redis: any = null;

  function getClient() {
    if (!redis) {
      // Dynamic require so @upstash/redis stays a peerDependency
      try {
        const { Redis } = require("@upstash/redis");
        redis = new Redis({ url: opts.url, token: opts.token });
      } catch {
        throw new Error(
          "[@memory-minus-one/redis] @upstash/redis is required as a peer dependency. Install it with: pnpm add @upstash/redis"
        );
      }
    }
    return redis;
  }

  return {
    name: "upstash-redis",
    version: "1.0.0",

    async init(ctx: PluginContext) {
      // Eagerly init to fail fast if credentials are bad
      getClient();
      ctx.logger.debug("upstash_redis", `Initialized with prefix "${prefix}", default TTL ${defaultTtl}s`);
    },

    async get<T>(key: string): Promise<T | null> {
      const client = getClient();
      const result = await client.get(prefix + key);
      if (result === null || result === undefined) return null;
      return result as T;
    },

    async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
      const client = getClient();
      const ttl = ttlSeconds ?? defaultTtl;
      if (ttl > 0) {
        await client.set(prefix + key, value, { ex: ttl });
      } else {
        await client.set(prefix + key, value);
      }
    },

    async delete(key: string): Promise<void> {
      const client = getClient();
      await client.del(prefix + key);
    },

    async destroy() {
      // HTTP-based — nothing to close
      redis = null;
    },
  };
}
