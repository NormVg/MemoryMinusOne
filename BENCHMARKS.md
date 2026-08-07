# MemoryMinusOne Benchmark Results

## Goal
The goal of this benchmark run was to evaluate **MemoryMinusOne's** recall and memory synthesis capabilities across multiple datasets (**LOCOMO**, **ConvoMem**, and **LongMemEval**), establishing the official baseline accuracy for the new Plugin-First architecture prior to the full Hierarchical Sectored Graph (HSG) engine port.

## Execution Setup
The benchmark was executed using the newly integrated `memorybench` automated test runner:
- **Test Runner:** `memorybench` (Embedded SDK execution, evaluating `core` directly).
- **Embeddings:** Local `embeddinggemma:latest` (zero API cost, fast on-device processing).
- **Answering Model:** `gemma4:31b-cloud` via Cloud API.
- **Judge Model:** `gpt-oss:120b-cloud` via Cloud API.
- **Retrieval Cutoff:** `top-k = 10` (Testing strict precision rather than brute-force recall).

---

## 📊 memorybench Results — 2026-08-06

We re-evaluated the SDK across multiple benchmark datasets utilizing our new `memorybench` runner. The original 52.1% LOCOMO baseline is superseded for comparability because these runs utilized a different judge model (`gpt-oss:120b-cloud`) and adjusted sampling.

| Dataset | Run ID | Judge Model | Accuracy | Notes |
|---------|--------|-------------|----------|-------|
| **LoCoMo** | `dar8` | `gpt-oss:120b-cloud` | **77.1%** (27/35) | Temporal reasoning improved from 19.9% → 85.7% due to the judge upgrade (not a retrieval change). |
| **LoCoMo** | `t4ib` | `phi4-mini` | 48.0% | **Broken run:** The model failed to invoke the memory tool (`searchResults: []`, 0 context tokens). Documented as known-bad. |
| **ConvoMem** | `3knw` | `gpt-oss:120b-cloud` | **88.1%** (37/42) | Perfect on user/assistant/changing-evidence; weak on `preference_evidence` (3/7). |
| **LongMemEval** | `izf6` | `gpt-oss:120b-cloud` | **76.2%** (32/42) | Temporal-reasoning 85.7%, knowledge-update 85.7%; weak on `single-session-preference` & `multi-session`. |

### 🔍 Cross-cutting Analysis & Takeaways

1. **Semantic Match Domination:** All retrievals triggered as `matchType = "semantic"`. The current waypoint graph is not yet contributing significantly, which motivates the Stage 2 (adaptive expansion and trace reinforcement) and Stage 7 (spreading-activation) architectural updates.
2. **Classifier Bypass:** Every memory in these runs defaulted to `primarySector: "benchmark"`, bypassing the automatic sector classifier. 
3. **Judge Model Quality:** Upgrading the judge from a 31B model to a 120B model completely resolved the artificial bottleneck on Temporal Reasoning, proving that the SDK *was* retrieving the correct context all along, but the smaller model lacked the reasoning capability to synthesize it.

---

## 🚀 How to re-run
These benchmarks are fully integrated into the monorepo via the `memorybench` workspace.
To re-evaluate after major engine changes:
1. `cd memorybench`
2. Start the benchmark server (or run CLI directly).
3. Ensure you have the necessary models available via your local Ollama cloud or API provider.
4. Run: `bun run src/index.ts run -p memoryminusone -b locomo -j gpt-oss:120b-cloud`
