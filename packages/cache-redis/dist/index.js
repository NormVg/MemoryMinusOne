var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// src/index.ts
function upstashCache(opts) {
  const prefix = opts.prefix ?? "m1:";
  const defaultTtl = opts.defaultTtlSeconds ?? 60;
  let redis = null;
  function getClient() {
    if (!redis) {
      try {
        const { Redis } = __require("@upstash/redis");
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
    async init(ctx) {
      getClient();
      ctx.logger.debug("upstash_redis", `Initialized with prefix "${prefix}", default TTL ${defaultTtl}s`);
    },
    async get(key) {
      const client = getClient();
      const result = await client.get(prefix + key);
      if (result === null || result === void 0) return null;
      return result;
    },
    async set(key, value, ttlSeconds) {
      const client = getClient();
      const ttl = ttlSeconds ?? defaultTtl;
      if (ttl > 0) {
        await client.set(prefix + key, value, { ex: ttl });
      } else {
        await client.set(prefix + key, value);
      }
    },
    async delete(key) {
      const client = getClient();
      await client.del(prefix + key);
    },
    async destroy() {
      redis = null;
    }
  };
}
export {
  upstashCache
};
