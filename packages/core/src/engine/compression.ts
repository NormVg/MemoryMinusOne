/**
 * Compresses a dense vector to a smaller target dimension using mean-pooling.
 * Used when memories transition to "cold" tier to save storage and memory.
 */
export function compressVector(vec: number[], targetDim: number): number[] {
  if (vec.length <= targetDim) return vec;
  
  const compressed = new Float32Array(targetDim);
  const bucketSize = vec.length / targetDim;
  
  for (let i = 0; i < targetDim; i++) {
    const start = Math.floor(i * bucketSize);
    const end = Math.floor((i + 1) * bucketSize);
    let sum = 0, count = 0;
    
    for (let j = start; j < end && j < vec.length; j++) {
      sum += vec[j];
      count++;
    }
    
    compressed[i] = count > 0 ? sum / count : 0;
  }
  
  // L2 Normalize
  let norm = 0;
  for (let i = 0; i < targetDim; i++) norm += compressed[i] * compressed[i];
  norm = Math.sqrt(norm);
  
  if (norm > 0) {
    for (let i = 0; i < targetDim; i++) {
      compressed[i] /= norm;
    }
  }
  
  return Array.from(compressed);
}

/**
 * Extracts a concise summary from a longer raw text, preserving key dates, entities, and actions.
 */
export function extractEssence(rawText: string, maxLength: number): string {
  if (rawText.length <= maxLength) return rawText;

  // Simple sentence boundary splitting
  const sentences = rawText
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);
    
  if (sentences.length === 0) return rawText.slice(0, maxLength);

  // Score sentences based on heuristics
  const scoreSentence = (s: string, idx: number): number => {
    let sc = 0;
    if (idx === 0) sc += 10; // First sentence is usually important
    if (idx === 1) sc += 5;
    
    // Look for dates
    if (/\d{4}-\d{2}-\d{2}/.test(s)) sc += 7;
    // Look for monetary/measurements
    if (/\$\d+|\d+\s*(miles|dollars|years|months|km)/.test(s)) sc += 4;
    // Look for actions
    if (/\b(bought|purchased|visited|went|got|received|paid|learned|discovered|found|saw|met)\b/i.test(s)) sc += 4;
    
    // Penalize very long sentences slightly
    if (s.length < 80) sc += 2;
    return sc;
  };

  const scored = sentences.map((s, idx) => ({
    text: s,
    score: scoreSentence(s, idx),
    originalIndex: idx,
  }));

  // Sort by highest score
  scored.sort((a, b) => b.score - a.score);

  const selected: typeof scored = [];
  let currentLen = 0;

  // Always try to include the first sentence if it fits
  const firstSent = scored.find((s) => s.originalIndex === 0);
  if (firstSent && firstSent.text.length < maxLength) {
    selected.push(firstSent);
    currentLen += firstSent.text.length;
  }

  // Fill remaining capacity
  for (const item of scored) {
    if (item.originalIndex === 0) continue; // Already handled
    
    if (currentLen + item.text.length + 2 <= maxLength) {
      selected.push(item);
      currentLen += item.text.length + 2; // +2 for space
    }
  }

  // Restore chronological order
  selected.sort((a, b) => a.originalIndex - b.originalIndex);

  return selected.map((s) => s.text).join(" ");
}

/**
 * 32-bit FNV-1a hash function.
 */
function fnv32a(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return hash >>> 0;
}

/**
 * Creates a 32-dimensional binary vector fingerprint for deep cold memories (f < 0.3).
 */
export function fingerprintMemory(id: string, essence: string): number[] {
  const hash = fnv32a(id + essence);
  const vec = new Float32Array(32);
  for (let i = 0; i < 32; i++) {
    vec[i] = (hash >> i) & 1;
  }
  return Array.from(vec);
}
