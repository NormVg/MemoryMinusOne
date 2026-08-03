import { ICachePlugin } from '@memory-minus-one/core';

interface UpstashCacheOptions {
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
declare function upstashCache(opts: UpstashCacheOptions): ICachePlugin;

export { type UpstashCacheOptions, upstashCache };
