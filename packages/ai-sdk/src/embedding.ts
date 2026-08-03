import { IEmbeddingPlugin, PluginContext } from "@memory-minus-one/core";
import { embed, embedMany, EmbeddingModel } from "ai";

export interface AiSdkEmbeddingOptions {
  model: EmbeddingModel<string>;
}

/**
 * Wraps any Vercel AI SDK compatible embedding model.
 */
export function aiSdkEmbedding(options: AiSdkEmbeddingOptions): IEmbeddingPlugin {
  return {
    name: "ai-sdk-embedding",
    version: "1.0.0",

    async init(ctx: PluginContext) {
      ctx.logger.debug("ai_sdk_embedding", `Initialized with AI SDK model`);
    },

    async embed(text: string, sector: string) {
      const { embedding } = await embed({
        model: options.model,
        value: text
      });
      return { vector: embedding, dim: embedding.length };
    },

    async embedBatch(texts: string[], sector: string) {
      const { embeddings } = await embedMany({
        model: options.model,
        values: texts
      });
      return { vectors: embeddings, dim: embeddings[0].length };
    }
  };
}
