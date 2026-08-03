import { MemoryMinusOne } from "@memory-minus-one/core";
import { evaluateRetrievalAccuracy } from "../evaluators/llm_judge";

export interface LocomoDatasetItem {
  id: string;
  context: string[];
  question: string;
  expected_answer: string;
}

export async function runLocomoBenchmark(memory: MemoryMinusOne, dataset: LocomoDatasetItem[]) {
  console.log(`Starting LOCOMO Benchmark on ${dataset.length} items...`);
  
  let totalScore = 0;
  
  for (const item of dataset) {
    console.log(`\nEvaluating: ${item.question}`);
    
    // 1. Ingest context
    for (const fact of item.context) {
      await memory.add(fact);
    }
    
    // 2. Retrieve
    const retrieved = await memory.query(item.question, undefined, 5);
    const retrievedContext = retrieved.map(r => r.memory.content);
    
    // 3. Evaluate
    const evalResult = await evaluateRetrievalAccuracy(item.question, item.expected_answer, retrievedContext);
    
    console.log(`Score: ${evalResult.score}`);
    console.log(`Reasoning: ${evalResult.reasoning}`);
    
    totalScore += evalResult.score;
  }
  
  const avgScore = totalScore / dataset.length;
  console.log(`\nLOCOMO Benchmark Complete. Average Score: ${avgScore.toFixed(2)}`);
  return avgScore;
}
