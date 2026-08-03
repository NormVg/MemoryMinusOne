import { z } from 'zod';
import { MemoryMinusOne } from '@memory-minus-one/core';

declare function memoryEveTool(memoryInstance: MemoryMinusOne): {
    name: string;
    description: string;
    parameters: z.ZodObject<{
        action: z.ZodEnum<["add", "query"]>;
        content: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        action: "add" | "query";
        content: string;
    }, {
        action: "add" | "query";
        content: string;
    }>;
    execute: (args: {
        action: string;
        content: string;
    }) => Promise<string | undefined>;
};

export { memoryEveTool };
