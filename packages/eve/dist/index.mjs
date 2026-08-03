// src/index.ts
import { z } from "zod";
function memoryEveTool(memoryInstance, userId) {
  return {
    name: "long_term_memory",
    description: "Access and store long-term memory for the user. Use this to remember facts, preferences, and events.",
    parameters: z.object({
      action: z.enum(["add", "query", "list", "get", "reinforce"]),
      content: z.string().describe("The memory content to store, query, or the sector to list, or ID to get/reinforce")
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
export {
  memoryEveTool
};
