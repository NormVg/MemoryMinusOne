# MemoryMinusOne — Full HSG Engine Port + Hardening

## Goal
Make the SDK more robust and produce more consistent benchmark results by (a) fixing everything currently broken/stubbed, and (b) porting the full OpenMemory "Hierarchical Sectored Graph" engine + the highest-leverage mem0 techniques. Scope chosen by user: **Full HSG port**.

## Working agreement (from user)
- **Stage 0 first**: resolve merge conflicts, update `BENCHMARKS.md`, write new `README.md`, commit + push — safe baseline before any port work.
- **Auto-commit going forward**: after every stage that builds cleanly, commit + push automatically. User will not re-issue this instruction.

## Scope

### In (this plan)
**Broken-state fixes:** merge conflicts (`memory.ts` add(), `package.json`, `pnpm-lock.yaml`), `sigmoid`-is-actually-a-clamp bug, dead `recency` weight, dead `keyword`/`tagMatch` paths, 8 declared-but-never-emitted events, cache plugin unused in query(), stubbed `runDecayPass`/`reflect()`/`decay()`.

**High-leverage mem0 ports (no-API-key):** MD5 dedup gate, real BM25 keyword matching → `"keyword"` matchType, result cache in query, pluggable reranker + `explain` score details, entity store (second vector collection, regex-only extraction).

**Full HSG ports:** `coactivations` field + trace reinforcement on query hits, wired decay pass (segment batching + `compressVector`/`fingerprintMemory` + `on_query_hit` regeneration), wired reflection pass (same-sector clustering + consolidation + boost), cross-sector interdependence matrices, multi-vector fusion score, sector penalty, adaptive waypoint expansion, z-score normalization, spreading-activation retrieval.

### Deferred (explicitly out, noted for v2)
- LLM-based additive extraction (mem0's ADD-only prompt) — changes the zero-API-key philosophy; defer to an optional plugin in a separate effort.
- User-summary reflection (IDE-specific metadata, not core).
- Document ingestion pipeline (PDF/DOCX/URL extraction — separate concern).
- nuxt/next adapter packages (docs claim them; not implemented — separate effort).

## Critical files
- `packages/core/src/engine/memory.ts` — engine (add/query/runDecayPass + conflict)
- `packages/core/src/engine/scoring.ts` — hybrid score (sigmoid bug, weights)
- `packages/core/src/engine/decay.ts` — decay math (orphaned)
- `packages/core/src/engine/reflection.ts` — cluster/salience (orphaned, diverges from spec)
- `packages/core/src/engine/waypoints.ts` — `reinforcePath`/`reinforceNodeSalience` exist, unused in query
- `packages/core/src/engine/compression.ts` — `compressVector`/`fingerprintMemory`/`extractEssence` (orphaned)
- `packages/core/src/engine/sectors.ts` — sector configs (add interdependence matrix)
- `packages/core/src/core/types.ts` — `MemoryNode` (add `coactivations`), `QueryResult` (add `scoreDetails?`)
- `packages/core/src/core/plugin.ts` — `IStoragePlugin` (add optional `getMemoriesByUser?`), `IVectorPlugin` (add optional `getVectorsForId?`), new `IRerankerPlugin`
- `packages/core/src/core/events.ts` — wire emit sites
- `packages/core/src/index.ts` — facade `reflect()`/`decay()` stubs, optional `entities?`/`reranker?` config
- `packages/drizzle/src/schema.ts` + `index.ts` — add `coactivations` column + `getMemoriesByUser`
- `packages/core/src/plugins/storage/memory.ts`, `plugins/vector/memory.ts` — implement new optional methods
- `BENCHMARKS.md`, `README.md` — docs (Stage 0)
- `pnpm-lock.yaml`, `package.json` — conflict resolution (Stage 0)

---

## Stage 0 — Safety baseline (commit + push before any port)

### 0.1 Resolve merge conflicts
1. **`packages/core/src/engine/memory.ts` add()** (lines 15–25): merge both branches into one options type:
   ```ts
   async add(content, options: { userId; metadata?; tags?; sector?; timestamp? }): Promise<MemoryNode>
   ```
   Keep `const now = timestamp ?? clock.now();` and `const classification = sector ? {primarySector: sector, sectors: [sector]} : classifyContent(content, metadata);`. Remove all `<<<<<<<`/`=======`/`>>>>>>>` markers.
2. **`package.json`** (2 conflict regions around `benchmark` scripts): pick the canonical scripts set (the post-migration one referencing `memorybench`), remove markers.
3. **`pnpm-lock.yaml`** (~90 markers, unrecoverable by hand): `rm pnpm-lock.yaml && pnpm install` to regenerate cleanly from the resolved `package.json`. Verify no `<<<<<<<` markers remain anywhere (`grep -rn '^<<<<<<<' -- ':!node_modules'`).

### 0.2 Update `BENCHMARKS.md`
Append a new section "## memorybench Results — 2026-08-06" with the 4 runs as a table + analysis:
- LoCoMo (`dar8`, gpt-oss:120b judge): 77.1% (27/35), temporal 19.9%→85.7% — judge upgrade, not retrieval fix.
- LoCoMo (`t4ib`, phi4-mini): 48% — **broken run** (model didn't call the memory tool; `searchResults: []`, 0 context tokens). Document as a known-bad run, not a real score.
- ConvoMem (`3knw`): 88.1% (37/42); perfect on user/assistant/changing-evidence; weak on `preference_evidence` (3/7).
- LongMemEval (`izf6`): 76.2% (32/42); temporal-reasoning 85.7%, knowledge-update 85.7%; weak on `single-session-preference` + `multi-session`.
- Cross-cutting: all retrieval `matchType = "semantic"` (waypoint graph adds nothing yet — motivates Stage 2); every memory `primarySector: "benchmark"` (benchmark bypasses classifier).
- Note the old 52.1% LOCOMO baseline is superseded for comparability (different judge + sample size).

### 0.3 Write new `README.md`
Professional, opinionated. Sections: what it is (1-line tagline + 3-line pitch), install, quickstart (in-memory), production setup (drizzle + ai-sdk + upstash), API reference (add/query/get/reinforce + facts namespace + new reranker/explain), plugin-writing, LLM integration (ai-sdk tool / eve tool), benchmarks summary table.

**Mermaid diagram — non-generic.** A real architecture diagram showing the **plugin-contract boundary** (the zero-vendor-lock-in selling point) with concrete providers plugged in, and the internal engine pipelines. Structure:
- Outer box "Your App (Nuxt/Next/Express)" → `MemoryMinusOne` facade.
- `MemoryMinusOne` contains 4 sub-boxes: **Add pipeline** (classify→simhash→MD5 dedup→embed per sector→vector store→waypoint link), **Query pipeline** (cache→embed all sectors→vector search→adaptive waypoint expand→hybrid score w/ BM25+tags+recency+multi-vec fusion+cross-sector resonance→z-score→trace reinforcement→events), **Maintenance** (decay pass: segment batch→calcDecay→compress→fingerprint→regen on hit; reflection pass: cluster→consolidate→boost), **Temporal facts** (FactStore/Versioning/Query/Timeline).
- A clearly-marked **Plugin Contracts** boundary layer with the 4 interfaces (`IStoragePlugin`, `IEmbeddingPlugin`, `IVectorPlugin`, `ICachePlugin`) + new `IRerankerPlugin`, each with concrete implementations hanging off: `drizzleStorage`+`pgvectorSearch`, `aiSdkEmbedding`/`syntheticEmbedding`, `memoryVectorStore`/pgvector, `upstashCache`/`lruCache`/`noCache`.
- Cross-cutting: `Clock` (injectable time), `TypedEventEmitter` (8 events), `MemoryMinusOneError` (typed codes).
No "step 1→2→3" flowchart; this is a component/architecture diagram with the swappable-plugin boundary as the centerpiece.

### 0.4 Verify + commit
- `pnpm run build` (must pass clean).
- `pnpm test` (will be no-op, fine).
- Commit: `chore: resolve merge conflicts, update benchmarks, rewrite readme (baseline)`. Push to `master`.

---

## Stage 1 — Scoring fixes + dead paths + events (small, safe)

**Files:** `scoring.ts`, `memory.ts`, `types.ts`, `events.ts`, `sectors.ts`.

1. **Fix `sigmoid`** (`scoring.ts:30`): replace `Math.max(0, Math.min(1, x))` with real logistic `1/(1+Math.exp(-x))` (guard against overflow for large |x|).
2. **Rebalance weights**: `recency: 0.0 → 0.10`, reduce `similarity: 0.50 → 0.45`, `overlap: 0.25 → 0.20` so weights still sum sensibly. Re-enable the `calcRecencyScore` contribution.
3. **Add `coactivations: number` (default 0)** to `MemoryNode` (`types.ts`) and to drizzle `m1_memories` (`schema.ts`, `integer not null default 0`). Update `memoryStorage` to persist it.
4. **Real keyword matching**: implement `computeKeywordScore(query, content)` in a new `engine/keyword.ts` — BM25-style over the existing `STOPWORDS` set + char-trigram fallback for short queries; return `{ score, matchType }`. Call it from `query()`; set `matchType: "keyword"` when keyword > semantic (resurrects the dead `"keyword"` union member). Wire `tagMatchScore` from `query.tags ∩ memory.tags`.
5. **z-score normalization**: after computing hybrid scores for the candidate set, re-center `(score - mean) / (std + ε)` then re-clamp to [0,1] for the final sort. New helper in `scoring.ts`.
6. **Emit all 8 events** at their sites:
   - `memory:added` in `add()` (with `durationMs`)
   - `memory:queried` in `query()` (with `results`, `durationMs`)
   - `memory:deleted` in `delete()`
   - `waypoint:created`/`waypoint:pruned` in `waypoints.ts`
   - `fact:set`/`fact:superseded` in `temporal/facts.ts` + `temporal/versioning.ts`
   - `decay:cycle` in `runDecayPass` (wired in Stage 3)
   Pass the `TypedEventEmitter` into `MemoryEngine` constructor (currently it's only on the facade).
7. **Add tests**: `scoring.test.ts` (sigmoid monotonic + bounds), `keyword.test.ts` (BM25 sanity), `events.test.ts` (emit assertions).
- Build, `pnpm test`, commit `feat(core): fix sigmoid, wire recency/keyword/tags, emit events, add coactivations`. Push.

---

## Stage 2 — Query path: cache + trace reinforcement + adaptive expansion

**Files:** `memory.ts` (query), `waypoints.ts`, `config.ts`/`index.ts` (pass emitter into engine).

1. **Result cache in query()**: key = `q:${hash(query+userId+sector+limit)}`; `cache?.get` before embedding; on miss, run query and `cache?.set(key, result, 60)`. Wire the already-constructed `config.cache`.
2. **Adaptive waypoint expansion**: compute `avg_top` similarity from vector hits; only call `expandViaWaypoints` when `avg_top < 0.55` (high-confidence short-circuit). Saves latency + avoids graph noise on strong hits.
3. **Trace reinforcement on hits** (the "trace" half of recall-trace): for each returned result, call `reinforceNodeSalience(id, userId)` and `reinforcePath(path, userId)` (both already exist in `waypoints.ts` but aren't called from `query()`). This makes frequently-retrieved memories/edges stronger over time.
4. **Coactivation buffering**: for each pair `(i,j)` in the returned top-k, increment `coactivations` on both nodes (capped) and Hebbian-bump their waypoint weight `w += eta*(1-w)` (or create edge if absent). This is the source signal the decay tiering (Stage 3) needs.
5. **Tests**: `query-trace.test.ts` (cache hit short-circuits; coactivations increments; waypoint weight bumps).
- Build, test, commit `feat(core): wire result cache, adaptive waypoint expansion, trace reinforcement, coactivation`. Push.

---

## Stage 3 — Decay pass

**Files:** `plugin.ts` (add optional `getMemoriesByUser?`), `memory.ts` (runDecayPass), `decay.ts`, `compression.ts`, `storage/memory.ts`, `drizzle/index.ts`, `index.ts` (decay facade).

1. **Add `getMemoriesByUser?(userId, limit?): Promise<MemoryNode[]>`** to `IStoragePlugin` as optional. Implement in `memoryStorage` (filter map by userId) and `drizzleStorage` (`select ... where user_id=?`). Decay falls back to iterating the 6 sectors if a plugin doesn't implement it.
2. **Implement `runDecayPass(userId)`** in `memory.ts`:
   - Cooldown gate (≥60s since last pass for this user — track on engine instance).
   - Load all user memories (`getMemoriesByUser`).
   - Segment-batch: pick a random window of `floor(n * 0.25)` per cycle (gradual decay, not all-at-once).
   - For each memory: `daysSince`, `classifyTier(salience, daysSince, coactivations)`, `newSal = calcDecay(...)`. If `delta > 0.001`:
     - If decay factor `f < 0.7`: `compressVector` the stored vector (needs `getVectorsForId?` — add optional to `IVectorPlugin`, implement in both stores) and re-store.
     - If `f < 0.3`: `fingerprintMemory` (replace vector with 32-dim FNV hash of content).
     - `storage.updateMemory({...node, salience: newSal})`.
   - `setImmediate` yield between memories (don't block event loop).
   - Emit `decay:cycle { segments, durationMs, changes }`.
3. **Wire `index.ts decay(userId)`** → `await engine.runDecayPass(userId)`.
4. **Decouple the conflated `calcDecay`**: split the three reference pipelines (tiered `apply_decay`, sector-hybrid, dual-phase) into separate exported functions; `runDecayPass` uses the tiered one. Keep sector-hybrid + dual-phase as standalone optional maintenance ops.
5. **Tests**: `decay.test.ts` (salience decreases over time; tier transitions; compression triggers at f<0.7; fingerprint at f<0.3; cooldown skips).
- Build, test, commit `feat(core): wire decay pass with compression, fingerprinting, cooldown`. Push.

---

## Stage 4 — Reflection pass

**Files:** `reflection.ts`, `memory.ts` (runReflection), `index.ts` (reflect facade), `types.ts` (`metadata.consolidated`).

1. **Fix `clusterMemories`** to match spec: restrict to same `primarySector`; exclude memories in `reflective` sector; exclude `metadata.consolidated === true`; raise default threshold `0.5 → 0.8`.
2. **Implement `runReflection(userId)`** in `memory.ts`:
   - Pull 100 most-recent memories (`getMemoriesByUser(userId, 100)`); bail if `< reflect_min` (default 20).
   - `clusterMemories`; for each cluster with `n ≥ 2`: compute `calcReflectionSalience`, build summary `"${n} ${sector} pattern: <truncated texts>"`, `add(summary, { userId, sector: "reflective", metadata: { type: "auto_reflect", sources: ids, freq: n } })`.
   - Mark originals: `metadata.consolidated = true` via `updateMemory`.
   - Boost originals: salience `× 1.1` (capped 1.0), refresh `updatedAt`.
3. **Wire `index.ts reflect(userId)`** → `await engine.runReflection(userId)`.
4. **Tests**: `reflection.test.ts` (clustering respects same-sector + consolidated exclusion; threshold 0.8; consolidation creates reflective memory + marks originals).
- Build, test, commit `feat(core): wire reflection pass with consolidation`. Push.

---

## Stage 5 — Cross-sector matrices + multi-vector fusion

**Files:** `sectors.ts`, `scoring.ts`, `memory.ts` (query), `plugin.ts` (add optional `getVectorsForId?`), `vector/memory.ts`, `drizzle/vector.ts`.

1. **Add the two 5×5 matrices** to `sectors.ts`: `SECTORAL_INTERDEPENDENCE_MATRIX` (resonance) and `SECTOR_RELATIONSHIPS` (penalty). Port the exact values from `.info/OpenMemory/.../dynamics.ts` + `hsg.ts`.
2. **`getVectorsForId?(id, userId): Promise<{sector, vector, dim}[]>`** on `IVectorPlugin` (optional). Implement in both stores. Needed to read a candidate's multi-sector vectors for fusion.
3. **`calcMultiVecFusionScore`** (`scoring.ts`): weighted cosine across the candidate's stored sector vectors vs the query's per-sector embeddings (softmax β=2 weighting, port from `calc_mean_vec`).
4. **`calculateCrossSectorResonanceScore`**: use the interdependence matrix on the candidate's sector set vs the query's primary sector.
5. **Sector penalty**: apply `sector_relationships[querySector][memSector]` as a multiplier.
6. **`embedQueryForAllSectors`**: use `embedding.embedBatch(query, allSectors)` (one batched call) instead of 2 separate embeds in `query()`.
7. **Wire** all four into `computeHybridScore` (extend signature) or a new `computeHybridScoreV2`.
8. **Tests**: `fusion.test.ts` (multi-vec fusion sanity; matrix lookups; sector penalty direction).
- Build, test, commit `feat(core): cross-sector matrices, multi-vector fusion, sector penalty`. Push.

---

## Stage 6 — Decay regeneration on query hit (`on_query_hit`)

**Files:** `memory.ts` (query, post-retrieval), `compression.ts`.

1. After vector search, for each hit whose stored vector is ≤64 dims (i.e. it was fingerprinted by decay): re-embed from `content` via `embedding.embed(content, sector)`, `vector.storeVector` to restore full resolution, and `salience = clamp(salience + 0.5, 0, 1)` (big boost — "remembering brings back detail"). Persist via `updateMemory`.
2. Gate behind `options.regenerationEnabled` (default true; benchmark may disable).
3. **Tests**: `regen.test.ts` (fingerprinted memory re-embeds on hit; salience +0.5; disabled flag skips).
- Build, test, commit `feat(core): on-query-hit regeneration of fingerprinted memories`. Push.

---

## Stage 7 — Spreading-activation retrieval

**Files:** new `engine/activation.ts`, `memory.ts` (optional expansion mode), `waypoints.ts` (energy helpers).

1. Port from `.info/OpenMemory/.../ops/dynamics.ts`:
   - `buildAssociativeWaypointGraphFromMemories(seedIds, userId, storage)` — local subgraph.
   - `performSpreadingActivationRetrieval(seedIds, query, {energy, decay, threshold})` — propagate activation energy along waypoint edges, collect nodes above energy threshold.
   - `determineEnergyBasedRetrievalThreshold(scores)` — adaptive cutoff.
2. Add `options.expansion: "bfs" | "spreading"` to `query()` (default `"bfs"` for backward compat; `"spreading"` opts into the energy model).
3. **Tests**: `activation.test.ts` (energy propagates with hop decay; threshold adapts; respects userId scope).
- Build, test, commit `feat(core): spreading-activation retrieval (optional expansion mode)`. Push.

---

## Stage 8 — Entity store (lightweight graph substitute)

**Files:** `config.ts` (add optional `entities?: IVectorPlugin`), `index.ts`, new `engine/entities.ts`, `memory.ts` (add + query).

1. Add optional `entities?: IVectorPlugin` to `MemoryConfig` (a second vector namespace; user can pass `pgvectorSearch({db, tablePrefix: "m1_entities_"})` or a second `memoryVectorStore()`). No new interface — reuses `IVectorPlugin`.
2. New `engine/entities.ts`:
   - `extractEntities(text)`: regex-only (no spaCy) — `QUOTED` (double/single-quoted strings), `IDENTIFIER` (dotted technical names `pkg.Class`), `PROPER` (Capitalized spans via simple NER heuristic), with deny-lists for generic heads. Port the mem0 deny-lists from `.info/mem0/.../entity_extraction.py`.
   - `linkEntitiesForMemory(memory, content, entities, userId)`: embed entities in one batch, dedup against existing by exact text OR similarity ≥ 0.95, insert/merge with `linked_memory_ids`.
   - `computeEntityBoosts(query, entities, userId)`: embed query entities, search entity store (threshold ≥ 0.5), boost linked memories by `similarity * 0.5 * (1/(1+0.001*(n-1)^2))` (hub dampening).
3. Call `linkEntitiesForMemory` at end of `add()` (if `config.entities` present). Call `computeEntityBoosts` in `query()` and add to hybrid score.
4. **Tests**: `entities.test.ts` (quoted-title extraction; identifier extraction; dedup by 0.95; hub dampening reduces mega-entity boost).
- Build, test, commit `feat(core): entity store with regex extraction + query boosts`. Push.

---

## Stage 9 — Reranker plugin + explain

**Files:** `plugin.ts` (new `IRerankerPlugin`), `config.ts` (optional `reranker?`), `index.ts`, `memory.ts`/`index.ts` (search options), `types.ts` (`scoreDetails` on `QueryResult`).

1. `IRerankerPlugin { name; version; init?; destroy?; rerank(query, results, limit): Promise<QueryResult[]> }`.
2. `mem.query(text, { userId, rerank?, explain?, limit })`: if `rerank && config.reranker`, call it post-hoc (try/except fallback to original order). If `explain`, attach `scoreDetails { similarity, bm25, entityBoost, waypoint, recency, tagMatch, raw, final, matchType }` to each result.
3. Document in README (already scaffolded in Stage 0 README — finalize API signature here).
4. **Tests**: `rerank.test.ts` (reranker reorders; fallback on throw; explain populates scoreDetails).
- Build, test, commit `feat(core): pluggable reranker + explain score details`. Push.

---

## Stage 10 — Final docs pass

1. Reconcile `README.md` API section with the final signatures from Stages 1–9 (reranker, explain, expansion mode, entities config).
2. Update `BENCHMARKS.md` with a note that the post-port numbers are pending a re-run (the re-run itself requires Ollama cloud + API keys and is a **manual user step** — cannot be automated here). Add a "How to re-run" subsection pointing at `packages/memorybench` and `benchmarks/server.ts`.
3. Final commit `docs: finalize README + benchmarks for HSG port`. Push.

---

## Verification

After every stage:
- `pnpm run build` (all packages) must exit 0.
- `pnpm test` (vitest) must pass; new tests added per stage.
- `grep -rn '^<<<<<<<' -- ':!node_modules'` returns nothing (no conflict markers).
- Git working tree clean after commit.

End-of-port manual verification (user):
- Re-run `packages/memorybench` against LoCoMo/ConvoMem/LongMemEval with the same gpt-oss:120b judge to measure improvement vs the 2026-08-06 baseline (77.1% / 88.1% / 76.2%).
- Re-run `benchmarks/server.ts` (Mem0-compat) for the LoCoMo 1,540-question strict top-10 comparison vs the 52.1% baseline.

## Risk notes
- **Plugin interface additions** (`getMemoriesByUser?`, `getVectorsForId?`, `IRerankerPlugin`, `entities?`) are all **optional** to avoid breaking existing user plugins. The `coactivations` column is a drizzle schema change — document as a migration note in the README.
- **Spreading activation + entity store + multi-vector fusion** (Stages 5, 7, 8) are the most novel/least-proven ports; they may need tuning iteration against benchmarks. They're last so earlier stages ship value independently.
- **`calcDecay` conflation fix** (Stage 3.4) changes the math shape — keep the old single function exported as a thin compat wrapper to avoid surprising any external caller.
- **Benchmark re-runs can't be automated** by me (need Ollama cloud + API keys). The deliverable is code + tests + docs; measurement is the user's manual step.
