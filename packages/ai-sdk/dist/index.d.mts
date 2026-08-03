import { IEmbeddingPlugin, MemoryMinusOne } from '@memory-minus-one/core';
import * as ai from 'ai';
import { EmbeddingModel } from 'ai';
import { z } from 'zod';

interface AiSdkEmbeddingOptions {
    model: EmbeddingModel<string>;
}
/**
 * Wraps any Vercel AI SDK compatible embedding model.
 */
declare function aiSdkEmbedding(options: AiSdkEmbeddingOptions): IEmbeddingPlugin;

declare function memoryTool(memoryInstance: MemoryMinusOne): ai.CoreTool<z.ZodObject<{
    action: z.ZodEnum<["add", "query"]>;
    content: z.ZodString;
}, "strip", z.ZodTypeAny, {
    action: "add" | "query";
    content: string;
}, {
    action: "add" | "query";
    content: string;
}>, {
    success: boolean;
    memoryId: string;
    sector: string;
    memories?: undefined;
    error?: undefined;
} | {
    success: boolean;
    memories: {
        content: any;
        score: any;
    }[];
    memoryId?: undefined;
    sector?: undefined;
    error?: undefined;
} | {
    success: boolean;
    error: any;
    memoryId?: undefined;
    sector?: undefined;
    memories?: undefined;
} | undefined> & {
    execute: (args: {
        action: "add" | "query";
        content: string;
    }, options: {
        abortSignal?: AbortSignal;
    }) => PromiseLike<{
        success: boolean;
        memoryId: string;
        sector: string;
        memories?: undefined;
        error?: undefined;
    } | {
        success: boolean;
        memories: {
            content: any;
            score: any;
        }[];
        memoryId?: undefined;
        sector?: undefined;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        memoryId?: undefined;
        sector?: undefined;
        memories?: undefined;
    } | undefined>;
};

export { type AiSdkEmbeddingOptions, aiSdkEmbedding, memoryTool };
