# MemoryMinusOne

## Navigation

```mermaid
graph LR
    SO[System Overview] --> CD[Component Architecture]
    SO --> MF[Memory Flow]
    CD --> ER[Database Schema]
    MF --> SF[Sequence Flow]
```

<!-- diagram:overview:system -->
## System Overview

```mermaid
flowchart TD
    subgraph AgentFrameworks ["Agent & LLM Frameworks"]
        Eve["@memory-minus-one/eve<br/>(Eve Agent Tool)"]
        AiSdk["@memory-minus-one/ai-sdk<br/>(Vercel AI SDK Tool)"]
        Raw["Custom Backend App<br/>(Raw OpenAI / Anthropic / Hono)"]
    end

    subgraph SDKCore ["@memory-minus-one/core"]
        Core["MemoryMinusOne Facade"]
        Engine["Memory Engine"]
        Temporal["Temporal Graph (Facts)"]
    end

    subgraph Plugins ["Swappable Provider Plugins"]
        Drizzle["@memory-minus-one/drizzle<br/>(Drizzle Storage / pgvector)"]
        Redis["@memory-minus-one/cache-redis<br/>(Upstash HTTP Cache)"]
        OAI["Custom Plugins<br/>(OpenAI Embeddings, etc.)"]
    end

    subgraph External ["External Infrastructure"]
        PostgresDB[("Postgres Database<br/>(Neon / Local pgvector)")]
        RedisDB[("Upstash Redis Cache<br/>(REST API over HTTP)")]
        EmbedAPI(["Vector Embedding API<br/>(OpenAI / Cohere / Google)"])
    end

    %% Dependencies
    Eve --> Core
    AiSdk --> Core
    Raw --> Core

    Core --> Engine
    Core --> Temporal

    Engine -.->|Plugin Interfaces| Plugins
    Temporal -.->|Plugin Interfaces| Plugins

    Drizzle --> PostgresDB
    Redis --> RedisDB
    OAI --> EmbedAPI
```

<!-- diagram:component:architecture -->
## Component Architecture

```mermaid
flowchart TD
    subgraph Facade ["Entry Boundary"]
        MMO["MemoryMinusOne Class"]
    end

    subgraph Subsystems ["Core Subsystems"]
        subgraph EngineNamespace ["Engine Subsystem"]
            ME["MemoryEngine"]
            SC["Sector Classifier<br/>(simhash / classifyContent)"]
            Score["Scoring Engine<br/>(cosineSimilarity / tokenOverlap / recency)"]
            Waypoints["Waypoint Expansion<br/>(expandViaWaypoints)"]
        end

        subgraph FactsNamespace ["Facts Subsystem"]
            FS["FactStore"]
            FV["FactVersioning"]
            FQ["FactQuery"]
            FT["FactTimeline"]
        end
    end

    subgraph PluginInterfaces ["Plugin Interfaces"]
        IStore["IStoragePlugin"]
        IEmbed["IEmbeddingPlugin"]
        IVec["IVectorPlugin"]
        ICache["ICachePlugin"]
    end

    %% Internal relationships
    MMO --> ME
    MMO --> FS
    MMO --> FV
    MMO --> FQ
    MMO --> FT

    ME --> SC
    ME --> Score
    ME --> Waypoints

    %% Dependencies to interfaces
    ME --> IEmbed
    ME --> IVec
    ME --> IStore
    ME --> ICache

    FS --> IStore
    FV --> IStore
    FQ --> IStore
    FT --> IStore
```

<!-- diagram:dataflow:memory -->
## Memory Flow

```mermaid
flowchart LR
    subgraph AddFlow ["add(content) Flow"]
        direction LR
        InAdd([Memory Content]) --> Classify[Classify Sector]
        Classify --> EmbedAdd[Generate Embedding]
        EmbedAdd --> VectorStore[Store Vector]
        EmbedAdd --> DBStore[Insert Memory Node]
    end

    subgraph QueryFlow ["query(queryText) Flow"]
        direction LR
        InQuery([Query String]) --> CacheCheck{Check Cache}
        CacheCheck -->|Hit| OutCached([Cached QueryResult[]])
        
        CacheCheck -->|Miss| EmbedQuery[Generate Embedding]
        EmbedQuery --> VectorSearch[Vector Search Hits]
        VectorSearch --> GraphExpand[Expand Waypoints]
        GraphExpand --> Rescore[Compute Hybrid Scores]
        Rescore --> Sort[Sort & Slice]
        Sort --> SaveCache[Write to Cache]
        SaveCache --> OutQuery([QueryResult[]])
    end
```

<!-- diagram:er:database -->
## Database Schema

```mermaid
erDiagram
    memories {
        text id PK
        text user_id
        text content
        text primary_sector
        jsonb sectors
        jsonb tags
        jsonb metadata
        text simhash
        real salience
        real decay_lambda
        integer version
        bigint created_at
        bigint updated_at
        bigint last_seen_at
    }

    vectors {
        text id PK
        text sector PK
        text user_id
        vector vec
        integer dim
    }

    waypoints {
        text src_id PK
        text dst_id PK
        text user_id
        real weight
        bigint created_at
        bigint updated_at
    }

    facts {
        text id PK
        text user_id
        text subject
        text predicate
        text object
        bigint valid_from
        bigint valid_to
        real confidence
        jsonb metadata
    }

    memories ||--o| vectors : "represented by"
    memories ||--o{ waypoints : "source/destination in"
```

<!-- diagram:sequence:query -->
## Sequence Flow

```mermaid
sequenceDiagram
    participant App as Caller (Hono / Express / Agent)
    participant MMO as MemoryMinusOne
    participant ME as MemoryEngine
    participant Cache as ICachePlugin (Upstash)
    participant Embed as IEmbeddingPlugin
    participant Vec as IVectorPlugin
    participant Store as IStoragePlugin (Drizzle)

    App->>MMO: query("peanuts", { userId: "123" })
    MMO->>ME: query("peanuts", { userId: "123" })
    
    ME->>Cache: get("query:123:peanuts")
    alt Cache Hit
        Cache-->>ME: QueryResult[]
        ME-->>App: QueryResult[]
    else Cache Miss
        ME->>Embed: embed("peanuts", "preferences")
        Embed-->>ME: { vector, dim }
        
        ME->>Vec: search(vector, "preferences", "123")
        Vec-->>ME: [ { id, score } ]
        
        ME->>Store: getNeighbors(srcIds, "123")
        Store-->>ME: WaypointEdge[]
        
        loop For each unique memory candidate
            ME->>Store: getMemory(id, "123")
            Store-->>ME: MemoryNode
        end
        
        ME->>ME: computeHybridScore()
        ME->>Store: updateMemory(lastSeenAt)
        
        ME->>Cache: set("query:123:peanuts", results, 60)
        ME-->>App: QueryResult[]
    end
```
