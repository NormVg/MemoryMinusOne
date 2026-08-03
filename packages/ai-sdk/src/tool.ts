import { tool } from "ai";
import { z } from "zod";

import { MemoryMinusOne } from "@memory-minus-one/core";

export function memoryTool(memoryInstance: MemoryMinusOne) {
  return tool({
    description: "Access and store long-term memory for the user. Use this to remember facts, preferences, and events.",
    parameters: z.object({
      action: z.enum(["add", "query"]),
      content: z.string().describe("The memory content to store or the search query to retrieve memories"),
    }),
    execute: async ({ action, content }) => {
      try {
        if (action === "add") {
          const result = await memoryInstance.add(content);
          return { success: true, memoryId: result.id, sector: result.primarySector };
        } else if (action === "query") {
          const results = await memoryInstance.query(content, undefined, 5);
          return { success: true, memories: results.map((r: any) => ({ content: r.memory.content, score: r.score })) };
        }
      } catch (e: any) {
        return { success: false, error: e.message };
      }
    }
  });
}
