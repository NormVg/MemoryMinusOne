/**
 * Canonicalizes text to a set of words for hashing/deduplication.
 */
export function canonicalTokenSet(text: string): Set<string> {
  const clean = text.toLowerCase().replace(/[^\w\s]/g, "");
  const words = clean.split(/\s+/).filter((w) => w.length > 0);
  return new Set(words);
}

/**
 * Fallback hash when text produces no valid tokens.
 */
export function stableTextFallbackHash(text: string): string {
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = (h << 5) - h + text.charCodeAt(i);
    h = h & h; // Convert to 32bit integer
  }
  return h.toString(16).padStart(16, "0");
}

/**
 * Computes a 64-bit simhash of the text using a simple FNV-like approach
 * for deduplication and near-miss detection.
 */
export function computeSimhash(text: string): string {
  const tokens = canonicalTokenSet(text);
  if (!tokens.size) {
    return stableTextFallbackHash(text);
  }

  const hashes = Array.from(tokens).map((t) => {
    let h = 0;
    for (let i = 0; i < t.length; i++) {
      h = (h << 5) - h + t.charCodeAt(i);
      h = h & h;
    }
    return h;
  });

  const vec = new Array(64).fill(0);
  for (const h of hashes) {
    for (let i = 0; i < 64; i++) {
      if (h & (1 << i)) vec[i]++;
      else vec[i]--;
    }
  }

  let hash = "";
  for (let i = 0; i < 64; i += 4) {
    const nibble =
      (vec[i] > 0 ? 8 : 0) +
      (vec[i + 1] > 0 ? 4 : 0) +
      (vec[i + 2] > 0 ? 2 : 0) +
      (vec[i + 3] > 0 ? 1 : 0);
    hash += nibble.toString(16);
  }
  return hash.padStart(16, "0");
}

/**
 * Calculates the Hamming distance between two simhashes.
 * Useful for fast near-duplicate detection.
 */
export function hammingDistance(hash1: string, hash2: string): number {
  if (!hash1 || !hash2) return 64;
  
  let dist = 0;
  const len = Math.min(hash1.length, hash2.length);
  
  for (let i = 0; i < len; i++) {
    const xor = parseInt(hash1[i], 16) ^ parseInt(hash2[i], 16);
    dist +=
      (xor & 8 ? 1 : 0) +
      (xor & 4 ? 1 : 0) +
      (xor & 2 ? 1 : 0) +
      (xor & 1 ? 1 : 0);
  }
  
  // Add distance for length mismatch
  dist += Math.abs(hash1.length - hash2.length) * 4;
  
  return dist;
}
