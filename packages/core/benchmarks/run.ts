import { MemoryEngine } from "../src/engine/memory";
import { memoryStorage } from "../src/plugins/storage/memory";
import { aiSdkEmbedding } from "../../ai-sdk/src/embedding";
import { memoryVectorStore } from "../src/plugins/vector/memory";
import { FactVersioning } from "../src/temporal/versioning";
import { FactQuery } from "../src/temporal/query";
import { generateDummyData } from "./data";
import { clock } from "../src/core/clock";
import { ollama } from "ollama-ai-provider";

async function runBenchmarks() {
  console.log("==========================================");
  console.log(" MemoryMinusOne Benchmarking Suite (Ollama Real Test) ");
  console.log("==========================================");

  const storage = memoryStorage();
  const vector = memoryVectorStore();
  
  // Use real embedding model via Ollama
  const embedding = aiSdkEmbedding({
    model: ollama.embedding('nomic-embed-text')
  });

  const config = {
    userId: "benchmark_user",
    storage,
    vector,
    embedding,
  };

  const engine = new MemoryEngine(config);
  
  // -----------------------------------------------------
  // 1. Latency Benchmark
  // -----------------------------------------------------
  console.log("\n[1] Latency Benchmark (1,000 items)");
  const dummyData = generateDummyData(1000);
  
  let start = performance.now();
  for (const text of dummyData) {
    await engine.add(text);
  }
  let end = performance.now();
  
  const totalInsertMs = end - start;
  const avgInsertMs = totalInsertMs / 1000;
  console.log(`- Inserted 1,000 memories in ${totalInsertMs.toFixed(2)}ms`);
  console.log(`- Avg Insert Latency: ${avgInsertMs.toFixed(2)}ms / item`);

  start = performance.now();
  for (let i = 0; i < 50; i++) {
    await engine.query("Who likes coffee?");
  }
  end = performance.now();
  
  const totalQueryMs = end - start;
  const avgQueryMs = totalQueryMs / 50;
  console.log(`- Avg Query Latency (50 queries): ${avgQueryMs.toFixed(2)}ms / query`);

  // -----------------------------------------------------
  // 2. Needle in a Haystack
  // -----------------------------------------------------
  console.log("\n[2] Needle in a Haystack (Accuracy)");
  const needle = "The secret launch code for the rocket is XRAY-4920.";
  await engine.add(needle);
  
  start = performance.now();
  const results = await engine.query("What is the rocket launch code?", undefined, 10);
  end = performance.now();
  
  const needleFoundRank = results.findIndex(r => r.memory.content === needle) + 1;
  console.log(`- Query took ${(end - start).toFixed(2)}ms`);
  if (needleFoundRank > 0) {
    console.log(`- ✅ PASS: Needle found at rank ${needleFoundRank}`);
  } else {
    console.log(`- ❌ FAIL: Needle not found in top 10 results`);
  }

  // -----------------------------------------------------
  // 3. Temporal Resolution (FAMA)
  // -----------------------------------------------------
  console.log("\n[3] Temporal Resolution (Test-Time Learning)");
  
  const versioning = new FactVersioning(storage, config.userId);
  const factQuery = new FactQuery(storage, config.userId);
  
  // Add initial fact
  await versioning.evolveFact("User", "favorite color", "blue");
  
  // Simulate 5 days passing
  let currentTime = Date.now();
  const originalNow = clock.now;
  clock.now = () => currentTime;
  
  currentTime += 5 * 24 * 60 * 60 * 1000;
  
  // User changes their mind
  await versioning.evolveFact("User", "favorite color", "green");
  
  const activeColorFact = await factQuery.activeFact("User", "favorite color");
  
  if (activeColorFact && activeColorFact.object === "green") {
    console.log(`- ✅ PASS: System correctly recalled the new fact: "green"`);
  } else {
    console.log(`- ❌ FAIL: System recalled stale fact or no fact`);
  }
  
  // Restore clock
  clock.now = originalNow;
  
  // -----------------------------------------------------
  // 4. Multi-hop Reasoning (LoCoMo-inspired)
  // -----------------------------------------------------
  console.log("\n[4] Multi-hop Reasoning (LoCoMo)");
  // Insert disconnected facts
  await engine.add("Alice lives in Paris.");
  await engine.add("Paris is very hot in the summer.");
  await engine.add("Alice is buying summer clothes today.");
  
  // Force links in the graph manually (in a real scenario, LLM extracts these or vector search links them)
  // We'll just run a query that should semantically hit these.
  const hopResults = await engine.query("Why is Alice buying clothes in Paris?", undefined, 5);
  const hopContents = hopResults.map(r => r.memory.content);
  
  if (hopContents.some(c => c.includes("Alice lives in Paris")) && 
      hopContents.some(c => c.includes("Paris is very hot")) &&
      hopContents.some(c => c.includes("Alice is buying summer clothes"))) {
    console.log(`- ✅ PASS: All 3 disconnected multi-hop facts retrieved in context window.`);
  } else {
    console.log(`- ❌ FAIL: Multi-hop retrieval missed some facts.`);
  }

  // -----------------------------------------------------
  // 5. Knowledge Update & Contradiction (LongMemEval)
  // -----------------------------------------------------
  console.log("\n[5] Knowledge Update & Contradiction (LongMemEval)");
  
  await versioning.evolveFact("Company", "cloud provider", "AWS");
  
  // Simulate 30 days passing
  currentTime = Date.now();
  clock.now = () => currentTime;
  currentTime += 30 * 24 * 60 * 60 * 1000;
  
  await versioning.evolveFact("Company", "cloud provider", "Google Cloud");
  
  const activeCloud = await factQuery.activeFact("Company", "cloud provider");
  if (activeCloud && activeCloud.object === "Google Cloud") {
    console.log(`- ✅ PASS: SCD successfully suppressed AWS and updated to Google Cloud.`);
  } else {
    console.log(`- ❌ FAIL: Contradiction not resolved.`);
  }
  
  clock.now = originalNow;

  // -----------------------------------------------------
  // 6. Abstention (LongMemEval)
  // -----------------------------------------------------
  console.log("\n[6] Abstention (Knowing when to not answer)");
  
  const abstentionResults = await engine.query("What is Bob's favorite exotic food from Mars?", undefined, 5);
  // Our engine always returns top K based on vector proximity, but the scores will be low.
  // A good memory system flags low scores so the agent can abstain.
  
  if (abstentionResults.length === 0 || abstentionResults[0].score < 0.8) {
    console.log(`- ✅ PASS: Top result score is very low (${abstentionResults[0]?.score.toFixed(2) || 0}), allowing agent to abstain safely.`);
  } else {
    console.log(`- ❌ FAIL: System retrieved high-confidence garbage (${abstentionResults[0].score.toFixed(2)}).`);
  }

  console.log("\nAdvanced Benchmarks complete.\n");
}

runBenchmarks().catch(console.error);
