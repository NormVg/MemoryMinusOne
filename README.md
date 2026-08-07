<p align="center">
  <h1 align="center">MemoryMinusOne</h1>
  <p align="center">
    <strong>Plugin-first, embeddable long-term memory for AI agents.</strong>
  </p>
  <p align="center">
    <a href="#quickstart">Quickstart</a> · <a href="#architecture">Architecture</a> · <a href="#packages">Packages</a> · <a href="#api">API</a> · <a href="#plugins">Plugins</a>
  </p>
</p>

---

MemoryMinusOne is a TypeScript SDK that gives your AI agents persistent, long-term memory. It embeds directly into your existing app (Express, Next.js, Nuxt, Hono — anything Node.js) and handles the hard parts: semantic search, temporal fact tracking, memory decay, and waypoint graphs.

**Zero vendor lock-in.** Every capability — storage, embeddings, vector search, cache — is a swappable plugin.

## Features

- 🔌 **Plugin-first** — Swap storage, embeddings, vector, and cache without changing app code
- 🧠 **Hybrid recall** — Vector similarity + waypoint graph traversal + token overlap + recency scoring
- 📅 **Temporal facts** — Track facts over time with automatic versioning (e.g. "lives in Mumbai" → "lives in Bangalore")
- 🔒 **User isolation** — Every query is scoped by `userId`. Zero data leakage between tenants.
- ⚡ **Serverless-ready** — HTTP-based plugins (Upstash Redis, Neon Postgres) work on Cloudflare Workers, Vercel Edge, AWS Lambda
- 🛠️ **LLM tool-ready** — Drop-in tool definitions for Vercel AI SDK, Eve, or raw OpenAI function calling

## Install

```bash
pnpm add @memory-minus-one/core
```

## Quickstart

```typescript
import { createMemory, memoryStorage, syntheticEmbedding, memoryVectorStore } from "@memory-minus-one/core";

const mem = createMemory({
  storage: memoryStorage(),        // in-memory (swap for Drizzle in prod)
  embedding: syntheticEmbedding(), // TF-IDF (swap for OpenAI/Cohere in prod)
  vector: memoryVectorStore(),     // brute-force cosine (swap for pgvector in prod)
});

await mem.init();

// Store
await mem.add("User is allergic to peanuts", { userId: "user_123" });

// Recall
const results = await mem.query("food allergies", { userId: "user_123" });
// → [{ memory: { content: "User is allergic to peanuts", ... }, score: 0.92 }]

// Retrieve
const memory = await mem.get(results[0].memory.id, { userId: "user_123" });

// Reinforce (prevents decay)
await mem.reinforce(results[0].memory.id, { userId: "user_123" });
```

## Production Setup

For production, swap the in-memory plugins for real backends:

```typescript
import { createMemory } from "@memory-minus-one/core";
import { drizzleStorage, drizzlePgVector } from "@memory-minus-one/drizzle";
import { aiSdkEmbedding } from "@memory-minus-one/ai-sdk";
import { upstashCache } from "@memory-minus-one/cache-redis";
import { drizzle } from "drizzle-orm/neon-http";

const db = drizzle(process.env.DATABASE_URL!);

const mem = createMemory({
  storage: drizzleStorage({ db }),
  embedding: aiSdkEmbedding({ model: openai.embedding("text-embedding-3-small") }),
  vector: drizzlePgVector({ db }),
  cache: upstashCache({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  }),
});
```

## Architecture

```mermaid
flowchart LR
    %% Styling Classes
    classDef facade fill:#0f172a,stroke:#3b82f6,stroke-width:2px,color:#f8fafc;
    classDef api fill:#1e293b,stroke:#64748b,stroke-width:1px,color:#f1f5f9;
    classDef module fill:#1e1b4b,stroke:#818cf8,stroke-width:1px,color:#c7d2fe;
    classDef engine fill:#312e81,stroke:#6366f1,stroke-width:1px,color:#e0e7ff;
    classDef pluginInterface fill:#064e3b,stroke:#10b981,stroke-width:2px,color:#ecfdf5,stroke-dasharray: 5 5;
    classDef implementation fill:#022c22,stroke:#059669,stroke-width:1px,color:#d1fae5;
    classDef database fill:#450a0a,stroke:#ef4444,stroke-width:2px,color:#fef2f2;

    %% 1. Application Layer
    UserApp(["Your App (Nuxt/Next.js)"])
    Facade["MemoryMinusOne<br/>(Facade)"]:::facade
    UserApp --> Facade

    %% 2. API Layer
    subgraph API [Core API]
        direction TB
        AddAPI["add()"]:::api
        QueryAPI["query()"]:::api
        MaintAPI["runMaintenance()"]:::api
    end
    
    Facade --> AddAPI & QueryAPI & MaintAPI

    %% 3. Cognitive Engine Layer
    subgraph Engine [Cognitive Engine Modules]
        direction TB
        Sectorizer["Sectorizer & Dedup"]:::module
        GraphBuilder["Waypoint Graph Builder"]:::module
        
        SemanticSearch["Vector Semantic Search"]:::module
        GraphTraverse["Spreading Activation"]:::module
        KeywordMatch["BM25 Keyword Scoring"]:::module
        HybridScoring["Hybrid Scorer<br/>(Recency, Fusion, Trace)"]:::engine
        
        DecayEngine["Decay & Compression"]:::module
        ReflectionEngine["Cluster & Consolidation"]:::module
    end

    AddAPI --> Sectorizer & GraphBuilder
    
    QueryAPI --> SemanticSearch & GraphTraverse & KeywordMatch
    SemanticSearch & GraphTraverse & KeywordMatch --> HybridScoring
    
    MaintAPI --> DecayEngine & ReflectionEngine

    %% 4. Plugin Contracts Layer
    subgraph Plugins [Swappable Plugin Contracts]
        direction TB
        IStorage[["IStoragePlugin"]]:::pluginInterface
        IEmbed[["IEmbeddingPlugin"]]:::pluginInterface
        IVector[["IVectorPlugin"]]:::pluginInterface
        ICache[["ICachePlugin"]]:::pluginInterface
    end

    %% Internal Wiring (Cognitive Engine to Plugins)
    Sectorizer -.-> IStorage & IEmbed
    GraphBuilder -.-> IStorage
    SemanticSearch -.-> IVector & IEmbed
    DecayEngine -.-> IStorage & IVector
    QueryAPI -.-> ICache

    %% 5. Concrete Implementations Layer
    subgraph Implementations [Concrete Providers]
        direction TB
        Drizzle["Drizzle"]:::implementation
        AISDK["Vercel AI SDK"]:::implementation
        Synthetic["Synthetic (TF-IDF)"]:::implementation
        PgVector["pgvector"]:::implementation
        Upstash["Upstash Redis"]:::implementation
    end

    IStorage --> Drizzle
    IEmbed --> AISDK & Synthetic
    IVector --> PgVector
    ICache --> Upstash

    %% 6. Physical Infrastructure Layer
    subgraph Infrastructure [Physical Infrastructure]
        direction TB
        DB[(Relational DB)]:::database
        VectorDB[(Vector DB)]:::database
        Redis[(Redis Cache)]:::database
    end

    Drizzle ==> DB
    PgVector ==> VectorDB
    Upstash ==> Redis
```

## API

### Core Operations

```typescript
// Store a memory
await mem.add(content, { userId, metadata?, tags?, sector?, timestamp? })

// Semantic search
await mem.query(queryText, { userId, sector?, limit?, rerank?, explain?, expansion? })

// Get by ID
await mem.get(id, { userId })

// List by sector
await mem.getAll(sector, { userId, limit? })

// Reinforce (bump salience, prevent decay)
await mem.reinforce(id, { userId })
```

### Temporal Facts

```typescript
// Track evolving facts
await mem.facts.evolve("user", "lives_in", "Mumbai", { userId })
await mem.facts.evolve("user", "lives_in", "Bangalore", { userId })

// Query current state
await mem.facts.query.active("user", "lives_in", userId)
// → { subject: "user", predicate: "lives_in", object: "Bangalore" }

// Full timeline
await mem.facts.timeline("user", userId)
// → [{ object: "Mumbai", validFrom: ..., validTo: ... }, { object: "Bangalore", validFrom: ..., validTo: null }]

// Point-in-time queries
await mem.facts.query.at(Date.now() - 86400000, userId) // yesterday's facts
```

## Plugins

Every plugin implements a simple interface. Write your own in ~10 lines:

```typescript
import { ICachePlugin } from "@memory-minus-one/core";

export function myCustomCache(): ICachePlugin {
  return {
    name: "my-cache",
    version: "1.0.0",
    async get(key) { /* ... */ },
    async set(key, value, ttl) { /* ... */ },
    async delete(key) { /* ... */ },
  };
}
```

### Plugin Interfaces

| Interface | Methods |
|---|---|
| `IStoragePlugin` | `insertMemory`, `updateMemory`, `getMemory`, `getMemoriesBySector`, `deleteMemory`, `insertWaypoint`, `getNeighbors`, `pruneWaypoints`, `insertFact`, `updateFact`, `getActiveFact`, `queryFacts`, `invalidateFact`, `getMemoriesByUser?` |
| `IEmbeddingPlugin` | `embed`, `embedBatch` |
| `IVectorPlugin` | `storeVector`, `search`, `deleteVector`, `getVectorsForId?` |
| `ICachePlugin` | `get`, `set`, `delete` |
| `IRerankerPlugin` | `rerank` |

## Using with LLMs

### Vercel AI SDK

```typescript
import { memoryTool } from "@memory-minus-one/ai-sdk";

const result = await generateText({
  model: openai("gpt-4o"),
  tools: { memory: memoryTool(mem) },
  messages,
});
```

### Eve Agent Framework

```typescript
import { eveMemoryTool } from "@memory-minus-one/eve";

const agent = new Eve({
  tools: [eveMemoryTool(mem)],
});
```

### Raw OpenAI / Any Provider

```typescript
// Define a tool schema, then switch on the action:
switch (args.action) {
  case "add":    await mem.add(args.content, { userId }); break;
  case "query":  await mem.query(args.content, { userId }); break;
  case "get":    await mem.get(args.content, { userId }); break;
  case "reinforce": await mem.reinforce(args.content, { userId }); break;
}
```

## Benchmarks Summary

| Dataset | Judge Model | Accuracy |
|---------|-------------|----------|
| **LoCoMo** | `gpt-oss:120b-cloud` | **77.1%** |
| **ConvoMem** | `gpt-oss:120b-cloud` | **88.1%** |
| **LongMemEval** | `gpt-oss:120b-cloud` | **76.2%** |

Read the [Full Benchmark Report](./BENCHMARKS.md) for the complete breakdown.

## License

Apache 2.0
