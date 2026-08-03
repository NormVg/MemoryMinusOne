import { z } from 'zod';
import { MemoryMinusOne } from '@memory-minus-one/core';

declare function memoryEveTool(memoryInstance: MemoryMinusOne, userId: string): {
    name: string;
    description: string;
    parameters: z.ZodObject<{
        action: z.ZodEnum<["add", "query", "list", "get", "reinforce"]>;
        content: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        action: "add" | "query" | "list" | "get" | "reinforce";
        content: string;
    }, {
        action: "add" | "query" | "list" | "get" | "reinforce";
        content: string;
    }>;
    execute: (args: {
        action: string;
        content: string;
    }) => Promise<string | undefined>;
};

export { memoryEveTool };
