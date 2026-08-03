import { MemoryMinusOne } from "@memory-minus-one/core";
import { evaluateRetrievalAccuracy } from "../evaluators/llm_judge";

export interface BeamDatasetItem {
  context: string[];
  question: string;
  expected_answer: string;
  skill: string; // e.g. "contradiction resolution", "event ordering"
}

export async function runBeamBenchmark(memory: MemoryMinusOne, dataset: BeamDatasetItem[]) {
  console.log(`Starting BEAM Benchmark on ${dataset.length} items...`);
  
  let totalScore = 0;
  
  for (let index = 0; index < dataset.length; index++) {
    const item = dataset[index];
    const userId = `beam_eval_${index}`;
    console.log(`\nEvaluating BEAM Skill [${item.skill}]: ${item.question}`);
    
    // 1. Ingest context
    for (const fact of item.context) {
      await memory.add(fact, { userId });
    }
    
    // 2. Retrieve
    const retrieved = await memory.query(item.question, { userId, limit: 5 });
    const retrievedContext = retrieved.map(r => r.memory.content);
    
    // 3. Evaluate
    const evalResult = await evaluateRetrievalAccuracy(item.question, item.expected_answer, retrievedContext);
    
    console.log(`Score: ${evalResult.score}`);
    console.log(`Reasoning: ${evalResult.reasoning}`);
    
    totalScore += evalResult.score;
  }
  
  const avgScore = totalScore / dataset.length;
  console.log(`\nBEAM Benchmark Complete. Average Score: ${avgScore.toFixed(2)}`);
  return avgScore;
}
