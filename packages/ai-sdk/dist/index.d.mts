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

declare function memoryTool(memoryInstance: MemoryMinusOne, userId: string): ai.CoreTool<z.ZodObject<{
    action: z.ZodEnum<["add", "query", "list", "get", "reinforce"]>;
    content: z.ZodString;
}, "strip", z.ZodTypeAny, {
    action: "add" | "query" | "list" | "get" | "reinforce";
    content: string;
}, {
    action: "add" | "query" | "list" | "get" | "reinforce";
    content: string;
}>, {
    success: boolean;
    memoryId: string;
    sector: string;
    memories?: undefined;
    memory?: undefined;
    message?: undefined;
    error?: undefined;
} | {
    success: boolean;
    memories: {
        id: any;
        content: any;
    }[];
    memoryId?: undefined;
    sector?: undefined;
    memory?: undefined;
    message?: undefined;
    error?: undefined;
} | {
    success: boolean;
    memory: {
        id: string;
        content: string;
    } | null;
    memoryId?: undefined;
    sector?: undefined;
    memories?: undefined;
    message?: undefined;
    error?: undefined;
} | {
    success: boolean;
    message: string;
    memoryId?: undefined;
    sector?: undefined;
    memories?: undefined;
    memory?: undefined;
    error?: undefined;
} | {
    success: boolean;
    error: any;
    memoryId?: undefined;
    sector?: undefined;
    memories?: undefined;
    memory?: undefined;
    message?: undefined;
} | undefined> & {
    execute: (args: {
        action: "add" | "query" | "list" | "get" | "reinforce";
        content: string;
    }, options: {
        abortSignal?: AbortSignal;
    }) => PromiseLike<{
        success: boolean;
        memoryId: string;
        sector: string;
        memories?: undefined;
        memory?: undefined;
        message?: undefined;
        error?: undefined;
    } | {
        success: boolean;
        memories: {
            id: any;
            content: any;
        }[];
        memoryId?: undefined;
        sector?: undefined;
        memory?: undefined;
        message?: undefined;
        error?: undefined;
    } | {
        success: boolean;
        memory: {
            id: string;
            content: string;
        } | null;
        memoryId?: undefined;
        sector?: undefined;
        memories?: undefined;
        message?: undefined;
        error?: undefined;
    } | {
        success: boolean;
        message: string;
        memoryId?: undefined;
        sector?: undefined;
        memories?: undefined;
        memory?: undefined;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        memoryId?: undefined;
        sector?: undefined;
        memories?: undefined;
        memory?: undefined;
        message?: undefined;
    } | undefined>;
};

export { type AiSdkEmbeddingOptions, aiSdkEmbedding, memoryTool };
