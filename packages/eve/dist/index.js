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
  memoryEveTool: () => memoryEveTool
});
module.exports = __toCommonJS(index_exports);
var import_zod = require("zod");
function memoryEveTool(memoryInstance, userId) {
  return {
    name: "long_term_memory",
    description: "Access and store long-term memory for the user. Use this to remember facts, preferences, and events.",
    parameters: import_zod.z.object({
      action: import_zod.z.enum(["add", "query", "list", "get", "reinforce"]),
      content: import_zod.z.string().describe("The memory content to store, query, or the sector to list, or ID to get/reinforce")
    }),
    execute: async (args) => {
      try {
        if (args.action === "add") {
          const result = await memoryInstance.add(args.content, { userId });
          return JSON.stringify({ success: true, memoryId: result.id, sector: result.primarySector });
        } else if (args.action === "query") {
          const results = await memoryInstance.query(args.content, { userId, limit: 5 });
          return JSON.stringify({ success: true, memories: results.map((r) => ({ id: r.memory.id, content: r.memory.content, score: r.score })) });
        } else if (args.action === "list") {
          const results = await memoryInstance.getAll(args.content, { userId, limit: 10 });
          return JSON.stringify({ success: true, memories: results.map((m) => ({ id: m.id, content: m.content })) });
        } else if (args.action === "get") {
          const result = await memoryInstance.get(args.content, { userId });
          return JSON.stringify({ success: !!result, memory: result ? { id: result.id, content: result.content } : null });
        } else if (args.action === "reinforce") {
          await memoryInstance.reinforce(args.content, { userId });
          return JSON.stringify({ success: true, message: "Memory reinforced successfully" });
        }
      } catch (e) {
        return JSON.stringify({ success: false, error: e.message });
      }
    }
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  memoryEveTool
});
