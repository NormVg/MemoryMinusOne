/**
 * Keyword and BM25 scoring for MemoryMinusOne.
 */

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((t) => t.trim().length > 0);
}

export function extractKeywords(text: string, minLength: number = 3): Set<string> {
  const tokens = tokenize(text);
  const keywords = new Set<string>();

  for (const token of tokens) {
    if (token.length >= minLength) {
      keywords.add(token);

      // Character trigrams
      if (token.length >= 3) {
        for (let i = 0; i <= token.length - 3; i++) {
          keywords.add(token.slice(i, i + 3));
        }
      }
    }
  }

  // Word bigrams
  for (let i = 0; i < tokens.length - 1; i++) {
    const bigram = `${tokens[i]}_${tokens[i + 1]}`;
    if (bigram.length >= minLength) {
      keywords.add(bigram);
    }
  }

  // Word trigrams
  for (let i = 0; i < tokens.length - 2; i++) {
    const trigram = `${tokens[i]}_${tokens[i + 1]}_${tokens[i + 2]}`;
    keywords.add(trigram);
  }

  return keywords;
}

export function computeKeywordOverlap(queryKeywords: Set<string>, contentKeywords: Set<string>): number {
  let matches = 0;
  let totalWeight = 0;

  for (const qk of queryKeywords) {
    const weight = qk.includes("_") ? 2.0 : 1.0;
    if (contentKeywords.has(qk)) {
      matches += weight;
    }
    totalWeight += weight;
  }

  if (totalWeight === 0) return 0;
  return matches / totalWeight;
}

export function exactPhraseMatch(query: string, content: string): boolean {
  const qNorm = query.toLowerCase().trim();
  const cNorm = content.toLowerCase();
  return cNorm.includes(qNorm);
}

export function computeBm25Score(
  queryTerms: string[],
  contentTerms: string[],
  corpusSize: number = 10000,
  avgDocLength: number = 100
): number {
  const k1 = 1.5;
  const b = 0.75;

  const termFreq = new Map<string, number>();
  for (const term of contentTerms) {
    termFreq.set(term, (termFreq.get(term) || 0) + 1);
  }

  const docLength = contentTerms.length;
  let score = 0;

  for (const qTerm of queryTerms) {
    const tf = termFreq.get(qTerm) || 0;
    if (tf === 0) continue;

    // Simplified IDF
    const idf = Math.log((corpusSize + 1) / (tf + 0.5));
    const numerator = tf * (k1 + 1);
    const denominator = tf + k1 * (1 - b + b * (docLength / avgDocLength));

    score += idf * (numerator / denominator);
  }

  return score;
}

/**
 * Computes a combined keyword score for a single memory against a query.
 */
export function computeCombinedKeywordScore(query: string, memoryContent: string): number {
  let totalScore = 0;

  if (exactPhraseMatch(query, memoryContent)) {
    totalScore += 1.0;
  }

  const queryKeywords = extractKeywords(query);
  const contentKeywords = extractKeywords(memoryContent);
  const keywordScore = computeKeywordOverlap(queryKeywords, contentKeywords);
  totalScore += keywordScore * 0.8;

  const queryTerms = tokenize(query);
  const contentTerms = tokenize(memoryContent);
  const bm25Score = computeBm25Score(queryTerms, contentTerms);
  
  // Normalize BM25 score roughly
  totalScore += Math.min(1.0, bm25Score / 10) * 0.5;

  return totalScore;
}
