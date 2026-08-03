import { IEmbeddingPlugin, PluginContext } from "../../core/plugin";

/**
 * Synthetic embedding uses a combination of n-grams (words and characters) 
 * hashed into a fixed-size vector. This provides a deterministic, zero-dependency 
 * vector representation that works surprisingly well for similarity matching 
 * across short-to-medium texts, without requiring any LLM API calls.
 */
export function syntheticEmbedding(dim: number = 768): IEmbeddingPlugin {
  return {
    name: "synthetic",
    version: "1.0.0",
    
    async init(ctx: PluginContext) {
      ctx.logger.debug("synthetic_embedding", `Initialized with dimension ${dim}`);
    },

    async embed(text: string, sector: string) {
      return { vector: generateSyntheticEmbedding(text, dim), dim };
    },

    async embedBatch(texts: string[], sector: string) {
      return {
        vectors: texts.map(t => generateSyntheticEmbedding(t, dim)),
        dim
      };
    }
  };
}

function generateSyntheticEmbedding(text: string, dim: number): number[] {
  const vec = new Array(dim).fill(0);
  const cleanText = text.toLowerCase().replace(/\s+/g, " ");
  
  // Word unigrams & bigrams & skip-grams
  const words = cleanText.split(" ");
  for (let i = 0; i < words.length; i++) {
    hashToVector(words[i], vec, dim, 1.0);
    if (i < words.length - 1) {
      hashToVector(`${words[i]} ${words[i+1]}`, vec, dim, 0.8);
    }
    // Skip-gram
    if (i < words.length - 2) {
      hashToVector(`${words[i]} * ${words[i+2]}`, vec, dim, 0.4);
    }
  }

  // Character trigrams
  for (let i = 0; i < cleanText.length - 2; i++) {
    hashToVector(cleanText.substring(i, i + 3), vec, dim, 0.5);
  }

  // L2 Normalize
  let norm = 0;
  for (let i = 0; i < dim; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < dim; i++) vec[i] /= norm;
  }

  return vec;
}

function hashToVector(token: string, vec: number[], dim: number, weight: number) {
  let hash1 = 5381, hash2 = 0x811c9dc5;
  for (let i = 0; i < token.length; i++) {
    const char = token.charCodeAt(i);
    hash1 = ((hash1 << 5) + hash1) + char; // djb2
    hash2 = Math.imul(hash2 ^ char, 0x01000193); // FNV-1a
  }
  
  const idx1 = Math.abs(hash1) % dim;
  const idx2 = Math.abs(hash2) % dim;
  
  vec[idx1] += weight;
  vec[idx2] -= weight;
}
