// src/embedding.ts
import { embed, embedMany } from "ai";
function aiSdkEmbedding(options) {
  return {
    name: "ai-sdk-embedding",
    version: "1.0.0",
    async init(ctx) {
      ctx.logger.debug("ai_sdk_embedding", `Initialized with AI SDK model`);
    },
    async embed(text, sector) {
      const { embedding } = await embed({
        model: options.model,
        value: text
      });
      return { vector: embedding, dim: embedding.length };
    },
    async embedBatch(texts, sector) {
      const { embeddings } = await embedMany({
        model: options.model,
        values: texts
      });
      return { vectors: embeddings, dim: embeddings[0].length };
    }
  };
}

// src/tool.ts
import { tool } from "ai";
import { z } from "zod";
function memoryTool(memoryInstance, userId) {
  return tool({
    description: "Access and store long-term memory for the user. Use this to remember facts, preferences, and events.",
    parameters: z.object({
      action: z.enum(["add", "query", "list", "get", "reinforce"]),
      content: z.string().describe("The memory content to store, query, or the sector to list, or ID to get/reinforce")
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
export {
  aiSdkEmbedding,
  memoryTool
};
