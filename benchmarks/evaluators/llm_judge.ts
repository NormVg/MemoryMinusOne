import { generateObject } from 'ai';
import { createOllama } from 'ollama-ai-provider';
import { z } from 'zod';

const ollama = createOllama({
  baseURL: 'http://localhost:11434/api',
});

// We use the same model as the rest of the project
const judgeModel = ollama('gpt-oss:120b-cloud');

const EvaluationSchema = z.object({
  score: z.number().min(0).max(1).describe("The accuracy score from 0.0 to 1.0"),
  reasoning: z.string().describe("Step-by-step reasoning for the score"),
});

export async function evaluateRetrievalAccuracy(
  question: string,
  expectedAnswer: string,
  retrievedMemories: string[]
): Promise<{ score: number; reasoning: string }> {
  const context = retrievedMemories.map((m, i) => `[${i + 1}] ${m}`).join("\n");
  
  const prompt = `
You are an impartial judge evaluating a memory retrieval system.
A user asked the following question: "${question}"
The expected ground-truth answer is: "${expectedAnswer}"

The system retrieved the following memories to help answer the question:
${context}

Task: Determine if the retrieved memories contain the necessary information to correctly answer the question based on the expected answer.
Score 1.0 if the memories contain all required facts to fully answer the question.
Score 0.5 if the memories contain partial information.
Score 0.0 if the memories do not contain the necessary information.

Provide your reasoning and the final score. 
IMPORTANT: You MUST output ONLY a valid JSON object matching the schema. Do NOT wrap the JSON in markdown code blocks (e.g. \`\`\`json). Do NOT output any other conversational text.
`;

  try {
    const { object } = await generateObject({
      model: judgeModel,
      schema: EvaluationSchema,
      prompt,
    });
    
    return object;
  } catch (e: any) {
    console.error("Judge failed:", e.message);
    return { score: 0, reasoning: "Evaluation failed: " + e.message };
  }
}
