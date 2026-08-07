import { createMemory, memoryStorage, memoryVectorStore } from "@memory-minus-one/core"
import { aiSdkEmbedding } from "@memory-minus-one/ai-sdk"
import { ollama } from "ai-sdk-ollama"
import type {
  Provider,
  ProviderConfig,
  IngestOptions,
  IngestResult,
  SearchOptions,
  IndexingProgressCallback,
} from "../../types/provider"
import type { UnifiedSession } from "../../types/unified"
import { logger } from "../../utils/logger"

export class MemoryMinusOneProvider implements Provider {
  name = "memoryminusone"
  private mem: ReturnType<typeof createMemory> | null = null

  async initialize(config: ProviderConfig): Promise<void> {
    this.mem = createMemory({
      storage: memoryStorage(),
      embedding: aiSdkEmbedding({ model: ollama.embedding("embeddinggemma") }),
      vector: memoryVectorStore(),
    })
    await this.mem.init()
    logger.info("Initialized MemoryMinusOne provider")
  }

  async ingest(sessions: UnifiedSession[], options: IngestOptions): Promise<IngestResult> {
    if (!this.mem) throw new Error("Provider not initialized")

    const documentIds: string[] = []

    for (const session of sessions) {
      const sessionStr = JSON.stringify(session.messages)
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")

      const formattedDate = session.metadata?.formattedDate as string
      const isoDate = session.metadata?.date as string
      const content = formattedDate
        ? `Here is the date the following session took place: ${formattedDate}\n\nHere is the session as a stringified JSON:\n${sessionStr}`
        : `Here is the session as a stringified JSON:\n${sessionStr}`

      const memory = await this.mem.add(content, { 
        userId: options.containerTag, 
        sector: "benchmark",
        metadata: {
          sessionId: session.sessionId,
          ...(isoDate ? { date: isoDate } : {}),
        }
      })
      documentIds.push(memory.id)
      logger.debug(`Ingested session ${session.sessionId}`)
    }

    return { documentIds }
  }

  async awaitIndexing(
    result: IngestResult,
    _containerTag: string,
    onProgress?: IndexingProgressCallback
  ): Promise<void> {
    // In-memory vector store is synchronous, so indexing is immediate
    onProgress?.({
      completedIds: result.documentIds,
      failedIds: [],
      total: result.documentIds.length,
    })
  }

  async search(query: string, options: SearchOptions): Promise<unknown[]> {
    if (!this.mem) throw new Error("Provider not initialized")
    
    // Note: mem.query returns array of { memory: Memory, score: number }
    const results = await this.mem.query(query, { 
      userId: options.containerTag,
      sector: "benchmark",
      limit: options.limit || 30,
      expansion: "spreading"
    })

    return results
  }

  async clear(containerTag: string): Promise<void> {
    logger.warn(`Clear not implemented for MemoryMinusOne - containerTag: ${containerTag}`)
  }
}

export default MemoryMinusOneProvider
