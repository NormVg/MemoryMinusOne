import { config } from "dotenv";
config({ path: new URL("./.env", import.meta.url).pathname });
import { upstashCache } from "../packages/cache-redis/src/index";

async function main() {
  const cache = upstashCache({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    prefix: "m1:test:",
    defaultTtlSeconds: 30,
  });

  // Init
  await cache.init!({
    logger: {
      debug: (tag: string, msg: string) => console.log(`  [${tag}] ${msg}`),
      info: (tag: string, msg: string) => console.log(`  [${tag}] ${msg}`),
      warn: (tag: string, msg: string) => console.warn(`  [${tag}] ${msg}`),
      error: (tag: string, msg: string, err?: Error) => console.error(`  [${tag}] ${msg}`, err),
    },
    events: {} as any,
  });

  console.log("\n🧪 MemoryMinusOne — Upstash Redis Cache Test\n");

  // 1. SET
  console.log("1️⃣  SET 'user:123' → { name: 'Vishnu', allergies: ['peanuts'] }");
  await cache.set("user:123", { name: "Vishnu", allergies: ["peanuts"] }, 60);
  console.log("   ✅ SET succeeded\n");

  // 2. GET (cache hit)
  console.log("2️⃣  GET 'user:123' (expecting cache hit)");
  const hit = await cache.get<{ name: string; allergies: string[] }>("user:123");
  if (hit && hit.name === "Vishnu" && hit.allergies[0] === "peanuts") {
    console.log(`   ✅ HIT — got: ${JSON.stringify(hit)}\n`);
  } else {
    console.error(`   ❌ MISS or wrong data — got: ${JSON.stringify(hit)}\n`);
    process.exit(1);
  }

  // 3. GET (cache miss)
  console.log("3️⃣  GET 'nonexistent-key' (expecting cache miss)");
  const miss = await cache.get("nonexistent-key");
  if (miss === null) {
    console.log("   ✅ MISS — got null as expected\n");
  } else {
    console.error(`   ❌ Expected null, got: ${JSON.stringify(miss)}\n`);
    process.exit(1);
  }

  // 4. DELETE
  console.log("4️⃣  DELETE 'user:123'");
  await cache.delete("user:123");
  const afterDelete = await cache.get("user:123");
  if (afterDelete === null) {
    console.log("   ✅ DELETE succeeded — key is gone\n");
  } else {
    console.error(`   ❌ Key still exists after delete: ${JSON.stringify(afterDelete)}\n`);
    process.exit(1);
  }

  // 5. TTL test (set with 2s TTL)
  console.log("5️⃣  TTL test — SET with 2s TTL, wait 3s, then GET");
  await cache.set("ttl-test", "should-expire", 2);
  const beforeExpiry = await cache.get("ttl-test");
  console.log(`   Before expiry: ${JSON.stringify(beforeExpiry)}`);
  
  await new Promise((r) => setTimeout(r, 3000));
  const afterExpiry = await cache.get("ttl-test");
  if (afterExpiry === null) {
    console.log("   ✅ Key expired as expected\n");
  } else {
    console.error(`   ❌ Key still alive after TTL: ${JSON.stringify(afterExpiry)}\n`);
    process.exit(1);
  }

  // Cleanup
  await cache.destroy!();

  console.log("🎉 All 5 tests passed! Upstash Redis cache is working perfectly.\n");
}

main().catch((err) => {
  console.error("💥 Test failed:", err);
  process.exit(1);
});
