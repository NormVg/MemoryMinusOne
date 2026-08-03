"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  upstashCache: () => upstashCache
});
module.exports = __toCommonJS(index_exports);
function upstashCache(opts) {
  const prefix = opts.prefix ?? "m1:";
  const defaultTtl = opts.defaultTtlSeconds ?? 60;
  let redis = null;
  function getClient() {
    if (!redis) {
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  upstashCache
});
