import { MemoryMinusOne } from "@memory-minus-one/core";
import { evaluateRetrievalAccuracy } from "../evaluators/llm_judge";

export interface LongMemDatasetItem {
  session_id: string;
  dialogue_history: Array<{ role: string; content: string }>;
  question: string;
  expected_answer: string;
}

export async function runLongMemEvalBenchmark(memory: MemoryMinusOne, dataset: LongMemDatasetItem[]) {
  console.log(`Starting LongMemEval Benchmark on ${dataset.length} sessions...`);
  
  let totalScore = 0;
  
  for (const session of dataset) {
    console.log(`\nEvaluating Session: ${session.session_id}`);
    
    // 1. Ingest dialogue history
    for (const turn of session.dialogue_history) {
      // Simple format: "User: Hello" or "Assistant: Hi"
      await memory.add(`${turn.role}: ${turn.content}`, { userId: session.session_id });
    }
    
    // 2. Retrieve for the question
    const retrieved = await memory.query(session.question, { userId: session.session_id, limit: 5 });
    const retrievedContext = retrieved.map(r => r.memory.content);
    
    // 3. Evaluate
    const evalResult = await evaluateRetrievalAccuracy(session.question, session.expected_answer, retrievedContext);
    
    console.log(`Score: ${evalResult.score}`);
    console.log(`Reasoning: ${evalResult.reasoning}`);
    
    totalScore += evalResult.score;
  }
  
  const avgScore = totalScore / dataset.length;
  console.log(`\nLongMemEval Benchmark Complete. Average Score: ${avgScore.toFixed(2)}`);
  return avgScore;
}
