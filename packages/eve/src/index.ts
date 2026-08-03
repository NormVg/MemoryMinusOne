import { z } from "zod";
import { MemoryMinusOne } from "@memory-minus-one/core";

export function memoryEveTool(memoryInstance: MemoryMinusOne) {
  return {
    name: "long_term_memory",
    description: "Access and store long-term memory for the user. Use this to remember facts, preferences, and events.",
    parameters: z.object({
      action: z.enum(["add", "query"]),
      content: z.string().describe("The memory content to store or the search query to retrieve memories"),
    }),
    execute: async (args: { action: string; content: string }) => {
      try {
        if (args.action === "add") {
          const result = await memoryInstance.add(args.content);
          return JSON.stringify({ success: true, memoryId: result.id, sector: result.primarySector });
        } else if (args.action === "query") {
          const results = await memoryInstance.query(args.content, undefined, 5);
          return JSON.stringify({ success: true, memories: results.map((r: any) => ({ content: r.memory.content, score: r.score })) });
        }
      } catch (e: any) {
        return JSON.stringify({ success: false, error: e.message });
      }
    }
  };
}
