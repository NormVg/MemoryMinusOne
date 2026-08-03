import { IStoragePlugin, IEmbeddingPlugin, IVectorPlugin, ICachePlugin } from "./plugin";
import { LoggerOptions } from "./logger";

export interface MemoryConfig {
  storage: IStoragePlugin;
  embedding: IEmbeddingPlugin;
  vector: IVectorPlugin;
  cache?: ICachePlugin;
  logger?: LoggerOptions;
  options?: {
    decayIntervalMs?: number;
    reflectionIntervalMs?: number;
    tablePrefix?: string;
  };
}

export function validateConfig(config: MemoryConfig): void {
  if (!config.storage) throw new Error("MemoryConfig requires a storage plugin");
  if (!config.embedding) throw new Error("MemoryConfig requires an embedding plugin");
  if (!config.vector) throw new Error("MemoryConfig requires a vector plugin");
}
