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
  aiSdkEmbedding: () => aiSdkEmbedding,
  memoryTool: () => memoryTool
});
module.exports = __toCommonJS(index_exports);

// src/embedding.ts
var import_ai = require("ai");
function aiSdkEmbedding(options) {
  return {
    name: "ai-sdk-embedding",
    version: "1.0.0",
    async init(ctx) {
      ctx.logger.debug("ai_sdk_embedding", `Initialized with AI SDK model`);
    },
    async embed(text, sector) {
      const { embedding } = await (0, import_ai.embed)({
        model: options.model,
        value: text
      });
      return { vector: embedding, dim: embedding.length };
    },
    async embedBatch(texts, sector) {
      const { embeddings } = await (0, import_ai.embedMany)({
        model: options.model,
        values: texts
      });
      return { vectors: embeddings, dim: embeddings[0].length };
    }
  };
}

// src/tool.ts
var import_ai2 = require("ai");
var import_zod = require("zod");
function memoryTool(memoryInstance, userId) {
  return (0, import_ai2.tool)({
    description: "Access and store long-term memory for the user. Use this to remember facts, preferences, and events.",
    parameters: import_zod.z.object({
      action: import_zod.z.enum(["add", "query", "list", "get", "reinforce"]),
      content: import_zod.z.string().describe("The memory content to store, query, or the sector to list, or ID to get/reinforce")
    }),
    execute: async ({ action, content }) => {
      try {
        if (action === "add") {
          const result = await memoryInstance.add(content, { userId });
          return { success: true, memoryId: result.id, sector: result.primarySector };
        } else if (action === "query") {
          const results = await memoryInstance.query(content, { userId, limit: 5 });
          return { success: true, memories: results.map((r) => ({ id: r.memory.id, content: r.memory.content, score: r.score })) };
        } else if (action === "list") {
          const results = await memoryInstance.getAll(content, { userId, limit: 10 });
          return { success: true, memories: results.map((m) => ({ id: m.id, content: m.content })) };
        } else if (action === "get") {
          const result = await memoryInstance.get(content, { userId });
          return { success: !!result, memory: result ? { id: result.id, content: result.content } : null };
        } else if (action === "reinforce") {
          await memoryInstance.reinforce(content, { userId });
          return { success: true, message: "Memory reinforced successfully" };
        }
      } catch (e) {
        return { success: false, error: e.message };
      }
    }
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  aiSdkEmbedding,
  memoryTool
});
