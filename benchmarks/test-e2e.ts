/**
 * Full end-to-end smoke test of the MemoryMinusOne SDK.
 * Uses in-memory plugins so no external services are needed (except the cache test above).
 */
import {
  createMemory,
  syntheticEmbedding,
  memoryStorage,
  memoryVectorStore,
  lruCache,
} from "../packages/core/src/index";

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`   ✅ ${label}`);
    passed++;
  } else {
    console.error(`   ❌ ${label}`);
    failed++;
  }
}

async function main() {
  console.log("\n🧪 MemoryMinusOne — Full SDK End-to-End Test\n");

  // ── Create the memory instance with all in-memory plugins ──
  const mem = createMemory({
    storage: memoryStorage(),
    embedding: syntheticEmbedding(),
    vector: memoryVectorStore(),
    cache: lruCache({ maxSize: 100, defaultTtlSeconds: 60 }),
  });

  await mem.init();
  console.log("── Engine initialized ──\n");

  const userId = "test-user-42";

  // ═══════════════════════════════════════
  // 1. ADD — store some memories
  // ═══════════════════════════════════════
  console.log("1️⃣  ADD — storing memories");
  const m1 = await mem.add("User is allergic to peanuts", { userId });
  assert(!!m1 && !!m1.id, `Added memory: ${m1.id.slice(0, 8)}...`);

  const m2 = await mem.add("User's favorite color is blue", { userId });
  assert(!!m2 && !!m2.id, `Added memory: ${m2.id.slice(0, 8)}...`);

  const m3 = await mem.add("User works at Google as a software engineer", { userId });
  assert(!!m3 && !!m3.id, `Added memory: ${m3.id.slice(0, 8)}...`);

  const m4 = await mem.add("User prefers dark mode in all apps", { userId });
  assert(!!m4 && !!m4.id, `Added memory: ${m4.id.slice(0, 8)}...`);

  const m5 = await mem.add("User has a golden retriever named Max", { userId });
  assert(!!m5 && !!m5.id, `Added memory: ${m5.id.slice(0, 8)}...`);
  console.log();

  // ═══════════════════════════════════════
  // 2. QUERY — semantic search
  // ═══════════════════════════════════════
  console.log("2️⃣  QUERY — searching for 'food allergies'");
  const results = await mem.query("food allergies", { userId, limit: 3 });
  assert(results.length > 0, `Got ${results.length} results`);
  assert(
    results.some((r) => r.memory.content.includes("peanuts")),
    `Top results contain peanut allergy memory`
  );
  for (const r of results) {
    console.log(`      → [${r.score.toFixed(3)}] "${r.memory.content}" (${r.matchType})`);
  }
  console.log();

  // ═══════════════════════════════════════
  // 3. GET — retrieve a single memory by ID
  // ═══════════════════════════════════════
  console.log("3️⃣  GET — retrieve memory by ID");
  const fetched = await mem.get(m1.id, { userId });
  assert(fetched !== null, `Got memory back`);
  assert(fetched!.content === "User is allergic to peanuts", `Content matches`);
  console.log();

  // ═══════════════════════════════════════
  // 4. GET — user isolation (different userId gets null)
  // ═══════════════════════════════════════
  console.log("4️⃣  USER ISOLATION — different userId should not access data");
  const isolated = await mem.get(m1.id, { userId: "other-user" });
  assert(isolated === null, `Other user cannot access this memory`);
  console.log();

  // ═══════════════════════════════════════
  // 5. REINFORCE — bump salience
  // ═══════════════════════════════════════
  console.log("5️⃣  REINFORCE — bump salience on a memory");
  const beforeReinforce = await mem.get(m2.id, { userId });
  await mem.reinforce(m2.id, { userId });
  const afterReinforce = await mem.get(m2.id, { userId });
  assert(
    afterReinforce!.salience >= beforeReinforce!.salience,
    `Salience went from ${beforeReinforce!.salience.toFixed(3)} → ${afterReinforce!.salience.toFixed(3)}`
  );
  console.log();

  // ═══════════════════════════════════════
  // 6. FACTS — temporal fact system
  // ═══════════════════════════════════════
  console.log("6️⃣  FACTS — temporal fact tracking");

  // Insert a fact
  await mem.facts.evolve("user", "lives_in", "Mumbai", { userId, confidence: 0.9 });
  const fact1 = await mem.facts.query.active("user", "lives_in", userId);
  assert(fact1 !== null, `Fact stored: user lives_in ${fact1?.object}`);

  // Evolve the fact (user moved!)
  await mem.facts.evolve("user", "lives_in", "Bangalore", { userId, confidence: 0.95 });
  const fact2 = await mem.facts.query.active("user", "lives_in", userId);
  assert(fact2?.object === "Bangalore", `Fact evolved: user lives_in ${fact2?.object}`);

  // Query current facts
  const currentFacts = await mem.facts.query.current(userId);
  assert(currentFacts.length > 0, `Got ${currentFacts.length} current facts`);

  // Timeline
  const timeline = await mem.facts.timeline("user", userId);
  assert(timeline.length >= 2, `Timeline has ${timeline.length} entries (Mumbai → Bangalore)`);
  console.log();

  // ═══════════════════════════════════════
  // 7. QUERY again — different search
  // ═══════════════════════════════════════
  console.log("7️⃣  QUERY — searching for 'pets and animals'");
  const petResults = await mem.query("pets and animals", { userId, limit: 3 });
  assert(petResults.length > 0, `Got ${petResults.length} results`);
  for (const r of petResults) {
    console.log(`      → [${r.score.toFixed(3)}] "${r.memory.content}" (${r.matchType})`);
  }
  console.log();

  // ═══════════════════════════════════════
  // Cleanup
  // ═══════════════════════════════════════
  await mem.destroy();

  console.log("═══════════════════════════════════════");
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    console.error("💥 Some tests failed!");
    process.exit(1);
  } else {
    console.log("🎉 All tests passed! The full SDK is working end-to-end.\n");
  }
}

main().catch((err) => {
  console.error("💥 Fatal error:", err);
  process.exit(1);
});
