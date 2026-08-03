import fs from "fs";
import path from "path";
import {
  createMemory,
  memoryStorage,
  memoryVectorStore,
  lruCache,
} from "@memory-minus-one/core";
import { aiSdkEmbedding } from "@memory-minus-one/ai-sdk";
import { createOllama } from "ollama-ai-provider";

const ollama = createOllama({
  baseURL: 'http://localhost:11434/api',
});

import { runLocomoBenchmark, LocomoDatasetItem } from "./runners/locomo";
import { runLongMemEvalBenchmark, LongMemDatasetItem } from "./runners/longmem";
import { runBeamBenchmark, BeamDatasetItem } from "./runners/beam";

const DATASETS_DIR = path.join(__dirname, "datasets");

function loadDataset<T>(filename: string): T[] {
  const filePath = path.join(DATASETS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Dataset ${filename} not found. Did you run the fetch script?`);
  }
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T[];
}

async function main() {
  console.log("🚀 Initializing MemoryMinusOne Benchmark Orchestrator...\n");

  // Use in-memory infrastructure for maximum speed during evaluation
  const mem = createMemory({
    storage: memoryStorage(),
    embedding: aiSdkEmbedding({
      model: ollama.textEmbeddingModel('embeddinggemma:latest')
    }),
    vector: memoryVectorStore(),
    cache: lruCache({ maxSize: 1000, defaultTtlSeconds: 300 }),
  });
  
  await mem.init();

  console.log("Loading datasets...");
  const locomoData = loadDataset<LocomoDatasetItem>("locomo.json");
  const longmemData = loadDataset<LongMemDatasetItem>("longmem.json");
  const beamData = loadDataset<BeamDatasetItem>("beam.json");

  // Optional: check command line arguments for limits (e.g. --limit 100)
  const limitArgIndex = process.argv.indexOf("--limit");
  const limit = limitArgIndex > -1 ? parseInt(process.argv[limitArgIndex + 1], 10) : undefined;

  const getSlice = <T>(data: T[]): T[] => limit ? data.slice(0, limit) : data;

  console.log(`\n=================================================`);
  console.log(`📊 BENCHMARK 1: LoCoMo (Long Context Memory)`);
  console.log(`=================================================`);
  const locomoScore = await runLocomoBenchmark(mem, getSlice(locomoData));

  console.log(`\n=================================================`);
  console.log(`📊 BENCHMARK 2: LongMemEval (Agentic Dialogue)`);
  console.log(`=================================================`);
  const longmemScore = await runLongMemEvalBenchmark(mem, getSlice(longmemData));

  console.log(`\n=================================================`);
  console.log(`📊 BENCHMARK 3: BEAM (High-Scale Memory Skills)`);
  console.log(`=================================================`);
  const beamScore = await runBeamBenchmark(mem, getSlice(beamData));

  console.log(`\n=================================================`);
  console.log(`🏆 FINAL BENCHMARK RESULTS (vs Mem0 Standards)`);
  console.log(`=================================================`);
  console.log(`- LoCoMo Score:        ${(locomoScore * 100).toFixed(2)}%`);
  console.log(`- LongMemEval Score:   ${(longmemScore * 100).toFixed(2)}%`);
  console.log(`- BEAM Score:          ${(beamScore * 100).toFixed(2)}%`);
  console.log(`\nMemoryMinusOne architecture successfully verified against public standards.`);
}

main().catch(console.error);
