import { MemoryMinusOne, memoryStorage, memoryVectorStore, noCache, IEmbeddingPlugin } from '@memory-minus-one/core';

function mockEmbedding(): IEmbeddingPlugin {
  return {
    name: "mock-embedding",
    version: "1.0.0",
    async init() {},
    async embed(text: string) {
      return { vector: new Array(128).fill(0.1), dim: 128 };
    },
    async embedBatch(texts: string[]) {
      return { vectors: texts.map(() => new Array(128).fill(0.1)), dim: 128 };
    }
  };
}

async function runTest() {
  const memory = new MemoryMinusOne({
    storage: memoryStorage(),
    vector: memoryVectorStore(),
    cache: noCache(),
    embedding: mockEmbedding()
  });

  await memory.init();
  const userId = "test_user_1";

  console.log("========================================");
  console.log("MemoryMinusOne - Architecture Improvements Test");
  console.log("========================================\n");

  console.log(">> 1. Ingesting memories with explicit timestamps (Testing Temporal Passthrough)...");
  
  await memory.add("User lives in New York.", {
    userId,
    timestamp: new Date("2021-01-01T00:00:00Z").getTime()
  });
  
  await memory.add("User recently moved to San Francisco for a new job.", {
    userId,
    timestamp: new Date("2024-05-15T00:00:00Z").getTime()
  });

  console.log("\n>> 2. Querying 'Where does the user live?'...");
  
  const results = await memory.query("Where does the user live?", { userId, limit: 5 });
  
  console.log("\n--- QUERY RESULTS ---");
  for (const res of results) {
    console.log(`- Memory: "${res.memory.content}"`);
    console.log(`  -> ID: ${res.memory.id}`);
    console.log(`  -> Score: ${res.score.toFixed(4)} (Notice this is now clamped [0, 1] instead of squashed into sigmoid)`);
    console.log(`  -> Created At: ${new Date(res.memory.createdAt).toISOString()} (Notice exact timestamp is preserved!)`);
    console.log(`  -> Sectors: [${res.memory.sectors.join(", ")}]`);
  }
}

runTest().catch(console.error);
