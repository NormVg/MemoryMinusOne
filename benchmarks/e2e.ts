import "dotenv/config";
import { MemoryEngine } from "../packages/core/src/engine/memory";
import { aiSdkEmbedding } from "../packages/ai-sdk/src/embedding";
import { ollama } from "ollama-ai-provider";
import { generateText } from "ai";

import { storage, vector } from "./db";

import { Pool } from "pg";

async function runE2E() {
  console.log("==========================================");
  console.log(" E2E Production Benchmark (Neon + Ollama) ");
  console.log("==========================================");

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set.");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS vector;
    DROP TABLE IF EXISTS m1_vectors, m1_waypoints, m1_memories, m1_facts CASCADE;
    CREATE TABLE m1_vectors (
      id TEXT NOT NULL, sector TEXT NOT NULL, user_id TEXT NOT NULL, vec vector NOT NULL, dim INTEGER NOT NULL,
      PRIMARY KEY (id, sector)
    );
    CREATE TABLE m1_waypoints (
      src_id TEXT NOT NULL, dst_id TEXT NOT NULL, user_id TEXT NOT NULL, weight REAL NOT NULL,
      created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL,
      PRIMARY KEY (src_id, dst_id)
    );
    CREATE TABLE IF NOT EXISTS m1_memories (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, content TEXT NOT NULL, primary_sector TEXT NOT NULL,
      sectors JSONB NOT NULL, tags JSONB DEFAULT '[]', metadata JSONB DEFAULT '{}', simhash TEXT,
      salience REAL DEFAULT 1.0 NOT NULL, decay_lambda REAL NOT NULL, version INTEGER DEFAULT 1 NOT NULL,
      created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL, last_seen_at BIGINT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS m1_facts (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, subject TEXT NOT NULL, predicate TEXT NOT NULL, object TEXT NOT NULL,
      valid_from BIGINT NOT NULL, valid_to BIGINT, confidence REAL NOT NULL, metadata JSONB DEFAULT '{}'
    );
  `);
  console.log("[0] Tables created successfully");

  // Use real embedding model via Ollama
  const embedding = aiSdkEmbedding({
    model: ollama.embedding('nomic-embed-text')
  });

  // 1. Initialize Memory Engine
  const memory = createMemory({
    storage,
    embedding,
    vector
  });
  await memory.init();

  const testUserId = "e2e_benchmark_user_" + Date.now();

  // 1. Data Ingestion
  console.log("\n[1] Ingesting multi-hop facts into Neon Postgres...");
  const facts = [
    "Alice lives in Paris.",
    "Paris is very hot in the summer.",
    "Alice is buying summer clothes today."
  ];

  const startInsert = performance.now();
  for (const fact of facts) {
    await memory.add(fact, { userId: testUserId });
  }
  const endInsert = performance.now();
  console.log(`- Inserted facts in ${(endInsert - startInsert).toFixed(2)}ms`);

  // 2. Retrieval
  console.log("\n[2] Semantic Retrieval from pgvector...");
  const question = "Why is Alice buying clothes in Paris?";
  
  const startQuery = performance.now();
  // Fetch a larger K to make sure we grab the context chunks
  const results = await engine.query(question, undefined, 5);
  const endQuery = performance.now();
  
  console.log(`- Retrieved ${results.length} vectors in ${(endQuery - startQuery).toFixed(2)}ms`);
  
  const context = results.map(r => r.memory.content).join("\n");
  console.log(`- Raw Context Retrieved:\n"${context}"`);

  // 3. LLM Inference (Reasoning over memory)
  console.log("\n[3] E2E Reasoning with Ollama gpt-oss:120b-cloud...");
  
  const prompt = `
You are a helpful AI assistant with a long-term memory system.
Use the following retrieved memories to answer the user's question.

Retrieved Memories:
${context}

User Question: ${question}
  `;

  const startLLM = performance.now();
  const response = await generateText({
    model: ollama("gpt-oss:120b-cloud"),
    prompt: prompt
  });
  const endLLM = performance.now();

  console.log(`\n🤖 Final Answer (${(endLLM - startLLM).toFixed(2)}ms):`);
  console.log(response.text);

  console.log("\n==========================================");
  console.log(" Benchmark complete. ");
  console.log("==========================================");
  
  process.exit(0);
}

runE2E().catch(console.error);
