import {
  clock,
  createSingleWaypoint,
  defaultClock,
  expandViaWaypoints,
  reinforceNodeSalience,
  reinforcePath
} from "./chunk-J63H25QI.mjs";

// src/core/config.ts
function validateConfig(config) {
  if (!config.storage) throw new Error("MemoryConfig requires a storage plugin");
  if (!config.embedding) throw new Error("MemoryConfig requires an embedding plugin");
  if (!config.vector) throw new Error("MemoryConfig requires a vector plugin");
}

// src/core/logger.ts
var DefaultLogger = class {
  enabled;
  namespaces;
  matchAll;
  constructor(options = {}) {
    this.enabled = options.enabled ?? false;
    this.matchAll = options.namespaces?.includes("*") ?? true;
    this.namespaces = new Set(options.namespaces || []);
  }
  shouldLog(namespace) {
    if (!this.enabled) return false;
    if (this.matchAll) return true;
    return this.namespaces.has(namespace);
  }
  format(level, namespace, message, meta) {
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
    return `[m1:${namespace}] ${message}${metaStr}`;
  }
  debug(namespace, message, meta) {
    if (this.shouldLog(namespace)) {
      console.debug(this.format("DEBUG", namespace, message, meta));
    }
  }
  info(namespace, message, meta) {
    if (this.shouldLog(namespace)) {
      console.info(this.format("INFO", namespace, message, meta));
    }
  }
  warn(namespace, message, meta) {
    if (this.shouldLog(namespace)) {
      console.warn(this.format("WARN", namespace, message, meta));
    }
  }
  error(namespace, message, meta) {
    if (this.shouldLog(namespace)) {
      console.error(this.format("ERROR", namespace, message, meta));
    }
  }
};

// src/core/events.ts
import { EventEmitter } from "events";
var TypedEventEmitter = class extends EventEmitter {
};

// src/plugins/cache/none.ts
function noCache() {
  return {
    name: "none",
    version: "1.0.0",
    async get() {
      return null;
    },
    async set() {
    },
    async delete() {
    }
  };
}

// src/engine/sectors.ts
var SECTOR_CONFIGS = {
  episodic: {
    name: "episodic",
    decayLambda: 0.015,
    weight: 1.2,
    patterns: [
      /\b(today|yesterday|tomorrow|last\s+(week|month|year)|next\s+(week|month|year))\b/i,
      /\b(remember\s+when|recall|that\s+time|when\s+I|I\s+was|we\s+were)\b/i,
      /\b(went|saw|met|felt|heard|visited|attended|participated)\b/i,
      /\b(at\s+\d{1,2}:\d{2}|on\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b/i,
      /\b(event|moment|experience|incident|occurrence|happened)\b/i,
      /\bI\s+'?m\s+going\s+to\b/i
    ]
  },
  semantic: {
    name: "semantic",
    decayLambda: 5e-3,
    weight: 1,
    patterns: [
      /\b(is\s+a|represents|means|stands\s+for|defined\s+as)\b/i,
      /\b(concept|theory|principle|law|hypothesis|theorem|axiom)\b/i,
      /\b(fact|statistic|data|evidence|proof|research|study|report)\b/i,
      /\b(capital|population|distance|weight|height|width|depth)\b/i,
      /\b(history|science|geography|math|physics|biology|chemistry)\b/i,
      /\b(know|understand|learn|read|write|speak)\b/i
    ]
  },
  procedural: {
    name: "procedural",
    decayLambda: 8e-3,
    weight: 1.1,
    patterns: [
      /\b(how\s+to|step\s+by\s+step|guide|tutorial|manual|instructions)\b/i,
      /\b(first|second|then|next|finally|afterwards|lastly)\b/i,
      /\b(install|run|execute|compile|build|deploy|configure|setup)\b/i,
      /\b(click|press|type|enter|select|drag|drop|scroll)\b/i,
      /\b(method|function|class|algorithm|routine|recipe)\b/i,
      /\b(to\s+do|to\s+make|to\s+build|to\s+create)\b/i
    ]
  },
  emotional: {
    name: "emotional",
    decayLambda: 0.02,
    weight: 1.3,
    patterns: [
      /\b(feel|feeling|felt|emotions?|mood|vibe)\b/i,
      /\b(happy|sad|angry|mad|excited|scared|anxious|nervous|depressed)\b/i,
      /\b(love|hate|like|dislike|adore|detest|enjoy|loathe)\b/i,
      /\b(amazing|terrible|awesome|awful|wonderful|horrible|great|bad)\b/i,
      /\b(frustrated|confused|overwhelmed|stressed|relaxed|calm)\b/i,
      /\b(wow|omg|yay|nooo|ugh|sigh)\b/i,
      /[!]{2,}/
    ]
  },
  reflective: {
    name: "reflective",
    decayLambda: 1e-3,
    weight: 0.8,
    patterns: [
      /\b(realize|realized|realization|insight|epiphany)\b/i,
      /\b(think|thought|thinking|ponder|contemplate|reflect)\b/i,
      /\b(understand|understood|understanding|grasp|comprehend)\b/i,
      /\b(pattern|trend|connection|link|relationship|correlation)\b/i,
      /\b(lesson|moral|takeaway|conclusion|summary|implication)\b/i,
      /\b(feedback|review|analysis|evaluation|assessment)\b/i,
      /\b(improve|grow|change|adapt|evolve)\b/i
    ]
  }
};
var SECTORS = Object.keys(SECTOR_CONFIGS);
var SECTOR_INDEX_MAPPING_FOR_MATRIX_LOOKUP = {
  episodic: 0,
  semantic: 1,
  procedural: 2,
  emotional: 3,
  reflective: 4
};
var SECTORAL_INTERDEPENDENCE_MATRIX_FOR_COGNITIVE_RESONANCE = [
  [1, 0.7, 0.3, 0.6, 0.6],
  // episodic
  [0.7, 1, 0.4, 0.7, 0.8],
  // semantic
  [0.3, 0.4, 1, 0.5, 0.2],
  // procedural
  [0.6, 0.7, 0.5, 1, 0.8],
  // emotional
  [0.6, 0.8, 0.2, 0.8, 1]
  // reflective
];
function classifyContent(content, metadata) {
  if (metadata?.sector && SECTORS.includes(metadata.sector)) {
    return {
      primarySector: metadata.sector,
      sectors: [metadata.sector],
      confidence: 1
    };
  }
  const scores = {};
  for (const [sectorName, config] of Object.entries(SECTOR_CONFIGS)) {
    let score = 0;
    for (const pattern of config.patterns) {
      const matches = content.match(new RegExp(pattern, "gi"));
      if (matches) {
        score += matches.length * config.weight;
      }
    }
    scores[sectorName] = score;
  }
  const sortedScores = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const primarySector = sortedScores[0][0];
  const primaryScore = sortedScores[0][1];
  const threshold = Math.max(1, primaryScore * 0.3);
  const additionalSectors = sortedScores.slice(1).filter(([_, score]) => score > 0 && score >= threshold).map(([sectorName]) => sectorName);
  const confidence = primaryScore > 0 ? Math.min(1, primaryScore / (primaryScore + (sortedScores[1]?.[1] || 0) + 1)) : 0.2;
  const resolvedPrimary = primaryScore > 0 ? primarySector : "semantic";
  return {
    primarySector: resolvedPrimary,
    sectors: [resolvedPrimary, ...additionalSectors],
    confidence
  };
}

// src/engine/simhash.ts
function canonicalTokenSet(text) {
  const clean = text.toLowerCase().replace(/[^\w\s]/g, "");
  const words = clean.split(/\s+/).filter((w) => w.length > 0);
  return new Set(words);
}
function stableTextFallbackHash(text) {
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = (h << 5) - h + text.charCodeAt(i);
    h = h & h;
  }
  return h.toString(16).padStart(16, "0");
}
function computeSimhash(text) {
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
      if (h & 1 << i) vec[i]++;
      else vec[i]--;
    }
  }
  let hash = "";
  for (let i = 0; i < 64; i += 4) {
    const nibble = (vec[i] > 0 ? 8 : 0) + (vec[i + 1] > 0 ? 4 : 0) + (vec[i + 2] > 0 ? 2 : 0) + (vec[i + 3] > 0 ? 1 : 0);
    hash += nibble.toString(16);
  }
  return hash.padStart(16, "0");
}

// src/engine/scoring.ts
var SCORING_WEIGHTS = {
  similarity: 0.45,
  overlap: 0.2,
  waypoint: 0.15,
  recency: 0.1,
  tag_match: 0.1
};
var STOPWORDS = /* @__PURE__ */ new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "but",
  "by",
  "for",
  "if",
  "in",
  "into",
  "is",
  "it",
  "no",
  "not",
  "of",
  "on",
  "or",
  "such",
  "that",
  "the",
  "their",
  "then",
  "there",
  "these",
  "they",
  "this",
  "to",
  "was",
  "will",
  "with",
  "what",
  "when",
  "where",
  "who",
  "how",
  "did",
  "does",
  "do",
  "has",
  "have",
  "had",
  "been",
  "would",
  "could",
  "should",
  "can",
  "may",
  "user",
  "about",
  "from",
  "which",
  "some",
  "any",
  "all"
]);
var HYBRID_PARAMS = {
  tau: 3,
  t_days: 7,
  t_max_days: 60
};
function sigmoid(x) {
  if (x > 20) return 1;
  if (x < -20) return 0;
  return 1 / (1 + Math.exp(-x));
}
function boostedSim(s) {
  return 1 - Math.exp(-HYBRID_PARAMS.tau * s);
}
function calcRecencyScore(lastSeenAt) {
  const now = clock.now();
  const daysSince = Math.max(0, (now - lastSeenAt) / (1e3 * 60 * 60 * 24));
  const t = HYBRID_PARAMS.t_days;
  const tmax = HYBRID_PARAMS.t_max_days;
  if (daysSince >= tmax) return 0;
  return Math.exp(-daysSince / t) * (1 - daysSince / tmax);
}
function computeTokenOverlap(queryTokens, memTokens) {
  if (queryTokens.size === 0) return 0;
  let overlap = 0;
  for (const t of queryTokens) {
    if (STOPWORDS.has(t)) continue;
    if (memTokens.has(t)) overlap++;
  }
  const meaningful = [...queryTokens].filter((t) => !STOPWORDS.has(t)).length;
  return meaningful === 0 ? 0 : overlap / meaningful;
}
function computeHybridScore(similarity, tokenOverlap, waypointWeight, recencyScore, tagMatchScore = 0, keywordScore = 0) {
  const s_p = boostedSim(similarity);
  const raw = SCORING_WEIGHTS.similarity * s_p + SCORING_WEIGHTS.overlap * tokenOverlap + SCORING_WEIGHTS.waypoint * waypointWeight + SCORING_WEIGHTS.recency * recencyScore + SCORING_WEIGHTS.tag_match * tagMatchScore + keywordScore;
  return sigmoid(raw);
}
function cosineSimilarity(a, b) {
  if (a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
function calcCrossSectorResonanceScore(memorySector, querySector, baseSimilarity) {
  const si = SECTOR_INDEX_MAPPING_FOR_MATRIX_LOOKUP[memorySector] ?? 1;
  const ti = SECTOR_INDEX_MAPPING_FOR_MATRIX_LOOKUP[querySector] ?? 1;
  return baseSimilarity * SECTORAL_INTERDEPENDENCE_MATRIX_FOR_COGNITIVE_RESONANCE[si][ti];
}
function calcMultiVecFusionScore(queryVectors, memoryVectors) {
  let maxScore = 0;
  for (const mv of memoryVectors) {
    for (const [qSector, qVector] of Object.entries(queryVectors)) {
      const sim = cosineSimilarity(qVector, mv.vector);
      const resonance = calcCrossSectorResonanceScore(mv.sector, qSector, sim);
      if (resonance > maxScore) {
        maxScore = resonance;
      }
    }
  }
  return maxScore;
}

// src/engine/keyword.ts
function tokenize(text) {
  return text.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter((t) => t.trim().length > 0);
}
function extractKeywords(text, minLength = 3) {
  const tokens = tokenize(text);
  const keywords = /* @__PURE__ */ new Set();
  for (const token of tokens) {
    if (token.length >= minLength) {
      keywords.add(token);
      if (token.length >= 3) {
        for (let i = 0; i <= token.length - 3; i++) {
          keywords.add(token.slice(i, i + 3));
        }
      }
    }
  }
  for (let i = 0; i < tokens.length - 1; i++) {
    const bigram = `${tokens[i]}_${tokens[i + 1]}`;
    if (bigram.length >= minLength) {
      keywords.add(bigram);
    }
  }
  for (let i = 0; i < tokens.length - 2; i++) {
    const trigram = `${tokens[i]}_${tokens[i + 1]}_${tokens[i + 2]}`;
    keywords.add(trigram);
  }
  return keywords;
}
function computeKeywordOverlap(queryKeywords, contentKeywords) {
  let matches = 0;
  let totalWeight = 0;
  for (const qk of queryKeywords) {
    const weight = qk.includes("_") ? 2 : 1;
    if (contentKeywords.has(qk)) {
      matches += weight;
    }
    totalWeight += weight;
  }
  if (totalWeight === 0) return 0;
  return matches / totalWeight;
}
function exactPhraseMatch(query, content) {
  const qNorm = query.toLowerCase().trim();
  const cNorm = content.toLowerCase();
  return cNorm.includes(qNorm);
}
function computeBm25Score(queryTerms, contentTerms, corpusSize = 1e4, avgDocLength = 100) {
  const k1 = 1.5;
  const b = 0.75;
  const termFreq = /* @__PURE__ */ new Map();
  for (const term of contentTerms) {
    termFreq.set(term, (termFreq.get(term) || 0) + 1);
  }
  const docLength = contentTerms.length;
  let score = 0;
  for (const qTerm of queryTerms) {
    const tf = termFreq.get(qTerm) || 0;
    if (tf === 0) continue;
    const idf = Math.log((corpusSize + 1) / (tf + 0.5));
    const numerator = tf * (k1 + 1);
    const denominator = tf + k1 * (1 - b + b * (docLength / avgDocLength));
    score += idf * (numerator / denominator);
  }
  return score;
}
function computeCombinedKeywordScore(query, memoryContent) {
  let totalScore = 0;
  if (exactPhraseMatch(query, memoryContent)) {
    totalScore += 1;
  }
  const queryKeywords = extractKeywords(query);
  const contentKeywords = extractKeywords(memoryContent);
  const keywordScore = computeKeywordOverlap(queryKeywords, contentKeywords);
  totalScore += keywordScore * 0.8;
  const queryTerms = tokenize(query);
  const contentTerms = tokenize(memoryContent);
  const bm25Score = computeBm25Score(queryTerms, contentTerms);
  totalScore += Math.min(1, bm25Score / 10) * 0.5;
  return totalScore;
}

// src/engine/decay.ts
var DECAY_PARAMS = {
  alphaReinforce: 0.08,
  minSalience: 0.01,
  fastDecayRate: 0.015,
  slowDecayRate: 2e-3,
  consolidationCoeff: 0.4
};
function classifyTier(salience, daysSince, coactivations) {
  if (daysSince < 6 && (coactivations > 5 || salience > 0.7)) return "hot";
  if (daysSince < 6 || salience > 0.4) return "warm";
  return "cold";
}
function calcDecay(sector, initialSalience, lastSeenAt, coactivations = 0, consolidated = false) {
  const now = clock.now();
  const daysSince = Math.max(0, (now - lastSeenAt) / (1e3 * 60 * 60 * 24));
  let sal = initialSalience * (1 + Math.log(1 + coactivations));
  sal = Math.max(0, Math.min(1, sal));
  const tier = classifyTier(sal, daysSince, coactivations);
  let lambda = 0.05;
  if (tier === "hot") lambda = 5e-3;
  else if (tier === "warm") lambda = 0.02;
  const f = Math.exp(-lambda * (daysSince / (sal + 0.1)));
  let newSalience = sal * f;
  if (consolidated) {
    const retention = Math.exp(-DECAY_PARAMS.fastDecayRate * daysSince) + DECAY_PARAMS.consolidationCoeff * Math.exp(-DECAY_PARAMS.slowDecayRate * daysSince);
    newSalience = Math.max(newSalience, initialSalience * retention);
  }
  const cfg = SECTOR_CONFIGS[sector];
  if (cfg) {
    const secLambda = cfg.decayLambda;
    const sectorDecay = initialSalience * Math.exp(-secLambda * daysSince) + DECAY_PARAMS.alphaReinforce * (1 - Math.exp(-secLambda * daysSince));
    newSalience = (newSalience + sectorDecay) / 2;
  }
  return Math.max(DECAY_PARAMS.minSalience, Math.min(1, newSalience));
}

// src/engine/compression.ts
function compressVector(vec, targetDim) {
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
function extractEssence(rawText, maxLength) {
  if (rawText.length <= maxLength) return rawText;
  const sentences = rawText.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.length > 10);
  if (sentences.length === 0) return rawText.slice(0, maxLength);
  const scoreSentence = (s, idx) => {
    let sc = 0;
    if (idx === 0) sc += 10;
    if (idx === 1) sc += 5;
    if (/\d{4}-\d{2}-\d{2}/.test(s)) sc += 7;
    if (/\$\d+|\d+\s*(miles|dollars|years|months|km)/.test(s)) sc += 4;
    if (/\b(bought|purchased|visited|went|got|received|paid|learned|discovered|found|saw|met)\b/i.test(s)) sc += 4;
    if (s.length < 80) sc += 2;
    return sc;
  };
  const scored = sentences.map((s, idx) => ({
    text: s,
    score: scoreSentence(s, idx),
    originalIndex: idx
  }));
  scored.sort((a, b) => b.score - a.score);
  const selected = [];
  let currentLen = 0;
  const firstSent = scored.find((s) => s.originalIndex === 0);
  if (firstSent && firstSent.text.length < maxLength) {
    selected.push(firstSent);
    currentLen += firstSent.text.length;
  }
  for (const item of scored) {
    if (item.originalIndex === 0) continue;
    if (currentLen + item.text.length + 2 <= maxLength) {
      selected.push(item);
      currentLen += item.text.length + 2;
    }
  }
  selected.sort((a, b) => a.originalIndex - b.originalIndex);
  return selected.map((s) => s.text).join(" ");
}
function fnv32a(str) {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return hash >>> 0;
}
function fingerprintMemory(id, essence) {
  const hash = fnv32a(id + essence);
  const vec = new Float32Array(32);
  for (let i = 0; i < 32; i++) {
    vec[i] = hash >> i & 1;
  }
  return Array.from(vec);
}

// src/engine/reflection.ts
function jaccardSimilarity(setA, setB) {
  if (setA.size === 0 || setB.size === 0) return 0;
  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = /* @__PURE__ */ new Set([...setA, ...setB]);
  return intersection.size / union.size;
}
function clusterMemories(memories, threshold = 0.8) {
  const clusters = [];
  const visited = /* @__PURE__ */ new Set();
  for (let i = 0; i < memories.length; i++) {
    const mem = memories[i];
    if (visited.has(mem.id) || mem.metadata?.consolidated === true) continue;
    const currentCluster = [mem];
    visited.add(mem.id);
    const tokensA = new Set(mem.content.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
    for (let j = i + 1; j < memories.length; j++) {
      const candidate = memories[j];
      if (visited.has(candidate.id) || candidate.metadata?.consolidated === true) continue;
      if (mem.primarySector !== candidate.primarySector) continue;
      const tokensB = new Set(candidate.content.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
      const sim = jaccardSimilarity(tokensA, tokensB);
      if (sim >= threshold) {
        currentCluster.push(candidate);
        visited.add(candidate.id);
      }
    }
    if (currentCluster.length > 1) {
      clusters.push(currentCluster);
    }
  }
  return clusters;
}
function calcReflectionSalience(cluster, nowMs) {
  const p = cluster.length / 10;
  let sumR = 0;
  for (const mem of cluster) {
    sumR += Math.exp(-(nowMs - mem.createdAt) / 432e5);
  }
  const r = sumR / cluster.length;
  const e = cluster.some((m) => m.sectors.includes("emotional")) ? 1 : 0;
  const salience = 0.6 * p + 0.3 * r + 0.1 * e;
  return Math.min(1, salience);
}

// src/engine/memory.ts
var MemoryEngine = class {
  constructor(config, events) {
    this.config = config;
    this.events = events;
  }
  config;
  events;
  /**
   * Adds a new memory to the system.
   */
  async add(content, options) {
    const startTime = clock.now();
    const { userId, metadata = {}, tags = [], sector, timestamp } = options;
    const classification = sector ? { primarySector: sector, sectors: [sector] } : classifyContent(content, metadata);
    const simhash = computeSimhash(content);
    const id = crypto.randomUUID();
    const now = timestamp ?? clock.now();
    const memory = {
      id,
      userId,
      content,
      primarySector: classification.primarySector,
      sectors: classification.sectors,
      tags,
      metadata,
      simhash,
      salience: 1,
      // starts hot
      decayLambda: 0.01,
      // will be overridden by sector config in decay pass
      version: 1,
      createdAt: now,
      updatedAt: now,
      lastSeenAt: now,
      coactivations: 0
    };
    let bestMatchId;
    let bestMatchSim = -1;
    const contentBatch = classification.sectors.map(() => content);
    const { vectors, dim } = await this.config.embedding.embedBatch(contentBatch, classification.primarySector);
    for (let i = 0; i < classification.sectors.length; i++) {
      const sector2 = classification.sectors[i];
      const vector = vectors[i];
      await this.config.vector.storeVector(id, sector2, userId, vector, dim);
      if (sector2 === classification.primarySector) {
        const neighbors = await this.config.vector.search(vector, sector2, userId, 1);
        if (neighbors.length > 0 && neighbors[0].id !== id) {
          bestMatchId = neighbors[0].id;
          bestMatchSim = neighbors[0].score;
        }
      }
    }
    await this.config.storage.insertMemory(memory);
    const edge = await createSingleWaypoint(id, [], userId, this.config.storage, bestMatchId, bestMatchSim);
    this.events.emit("waypoint:created", {
      srcId: edge.srcId,
      dstId: edge.dstId,
      userId: edge.userId,
      weight: edge.weight
    });
    this.events.emit("memory:added", {
      id,
      userId,
      sector: classification.primarySector,
      durationMs: clock.now() - startTime
    });
    return memory;
  }
  /**
   * Queries memories using a hybrid approach.
   */
  async query(queryText, options) {
    const startTime = clock.now();
    const { userId, sector, limit = 5 } = options;
    const classification = classifyContent(queryText);
    const primarySector = sector || classification.primarySector;
    const cacheKey = `q:${userId}:${computeSimhash(queryText)}:${limit}:${primarySector}`;
    if (this.config.cache) {
      const cached = await this.config.cache.get(cacheKey);
      if (cached) {
        this.events.emit("memory:queried", {
          query: queryText,
          userId,
          results: cached.length,
          durationMs: clock.now() - startTime
        });
        return cached;
      }
    }
    const searchSectors = [primarySector];
    if (primarySector !== "semantic") searchSectors.push("semantic");
    const queryTexts = searchSectors.map(() => queryText);
    const { vectors: qVectors } = await this.config.embedding.embedBatch(queryTexts, primarySector);
    const queryVectors = {};
    for (let i = 0; i < searchSectors.length; i++) {
      queryVectors[searchSectors[i]] = qVectors[i];
    }
    const allHits = /* @__PURE__ */ new Map();
    for (const s of searchSectors) {
      const hits = await this.config.vector.search(queryVectors[s], s, userId, limit * 4);
      for (const h of hits) {
        if (!allHits.has(h.id) || allHits.get(h.id) < h.score) {
          allHits.set(h.id, h.score);
        }
      }
    }
    const vectorHits = Array.from(allHits.entries()).map(([id, score]) => ({ id, score }));
    vectorHits.sort((a, b) => b.score - a.score);
    let expanded = [];
    const topScores = vectorHits.slice(0, 3).map((h) => h.score);
    const avgTop = topScores.length > 0 ? topScores.reduce((sum, score) => sum + score, 0) / topScores.length : 0;
    if (avgTop < 0.55) {
      const initialIds = vectorHits.map((h) => h.id);
      expanded = await expandViaWaypoints(initialIds, userId, this.config.storage, limit);
    }
    const queryTokens = new Set(queryText.toLowerCase().split(/\W+/));
    const results = [];
    const candidateIds = /* @__PURE__ */ new Set([...vectorHits.map((h) => h.id), ...expanded.map((e) => e.id)]);
    for (const id of candidateIds) {
      const mem = await this.config.storage.getMemory(id, userId);
      if (!mem) continue;
      const vHit = vectorHits.find((h) => h.id === id);
      let fusedSimilarity = vHit ? vHit.score : 0.5;
      if (this.config.vector.getVectorsForId) {
        const memVecs = await this.config.vector.getVectorsForId(id, userId);
        if (memVecs.length > 0) {
          fusedSimilarity = calcMultiVecFusionScore(queryVectors, memVecs);
        }
      }
      const eHit = expanded.find((h) => h.id === id);
      const waypointWeight = eHit ? eHit.weight : 0;
      const memTokens = new Set(mem.content.toLowerCase().split(/\W+/));
      const overlap = computeTokenOverlap(queryTokens, memTokens);
      const recency = calcRecencyScore(mem.lastSeenAt);
      const keywordScore = computeCombinedKeywordScore(queryText, mem.content);
      const score = computeHybridScore(fusedSimilarity, overlap, waypointWeight, recency, 0, keywordScore);
      results.push({
        memory: mem,
        score,
        matchType: vHit ? "semantic" : "waypoint",
        path: eHit ? eHit.path : [id]
      });
    }
    results.sort((a, b) => b.score - a.score);
    const topResults = results.slice(0, limit);
    for (const res of topResults) {
      res.memory.lastSeenAt = clock.now();
      res.memory.coactivations += 1;
      await this.config.storage.updateMemory(res.memory);
      if (res.matchType === "waypoint" && res.path && res.path.length > 1) {
        await reinforcePath(res.path, this.config.storage, res.memory.userId);
      }
      await reinforceNodeSalience(res.memory, this.config.storage);
    }
    if (this.config.cache) {
      await this.config.cache.set(cacheKey, topResults, 300);
    }
    this.events.emit("memory:queried", {
      query: queryText,
      userId,
      results: topResults.length,
      durationMs: clock.now() - startTime
    });
    return topResults;
  }
  /**
   * Updates an existing memory's content and re-embeds it.
   */
  async update(id, content, options) {
    const { userId, metadata, tags } = options;
    const existing = await this.config.storage.getMemory(id, userId);
    if (!existing) throw new Error(`Memory ${id} not found`);
    const classification = classifyContent(content, metadata || existing.metadata);
    const simhash = computeSimhash(content);
    const memory = {
      ...existing,
      content,
      primarySector: classification.primarySector,
      sectors: classification.sectors,
      metadata: metadata || existing.metadata,
      tags: tags || existing.tags,
      simhash,
      version: existing.version + 1,
      updatedAt: clock.now(),
      lastSeenAt: clock.now(),
      coactivations: existing.coactivations || 0
    };
    for (const sector of existing.sectors) {
      await this.config.vector.deleteVector(id, sector, userId);
    }
    const contentBatch = classification.sectors.map(() => content);
    const { vectors, dim } = await this.config.embedding.embedBatch(contentBatch, classification.primarySector);
    for (let i = 0; i < classification.sectors.length; i++) {
      const sector = classification.sectors[i];
      const vector = vectors[i];
      await this.config.vector.storeVector(id, sector, userId, vector, dim);
    }
    await this.config.storage.updateMemory(memory);
    return memory;
  }
  /**
   * Deletes a memory and its associated vectors.
   */
  async delete(id, userId) {
    const existing = await this.config.storage.getMemory(id, userId);
    if (!existing) return;
    for (const sector of existing.sectors) {
      await this.config.vector.deleteVector(id, sector, userId);
    }
    await this.config.storage.deleteMemory(id, userId);
    this.events.emit("memory:deleted", { id, userId });
  }
  /**
   * Gets all memories for the user in a given sector.
   */
  async getAll(sector, options) {
    return this.config.storage.getMemoriesBySector(sector, options.userId, options.limit || 100);
  }
  /**
   * Gets a specific memory by ID.
   */
  async get(id, options) {
    return this.config.storage.getMemory(id, options.userId);
  }
  /**
   * Manually reinforces the salience of a specific memory node.
   */
  async reinforce(id, options) {
    const memory = await this.config.storage.getMemory(id, options.userId);
    if (memory) {
      const { reinforceNodeSalience: reinforceNodeSalience2 } = await import("./waypoints-WBWJDKC7.mjs");
      await reinforceNodeSalience2(memory, this.config.storage);
    }
  }
  /**
   * Runs the decay pass across all memories.
   */
  async runDecayPass(userId) {
    if (!this.config.storage.getMemoriesByUser) {
      this.events.emit("decay:skipped", { userId, reason: "Storage plugin lacks getMemoriesByUser" });
      return;
    }
    const startTime = clock.now();
    let processed = 0;
    let compressed = 0;
    let fingerprinted = 0;
    const limit = 100;
    let offset = 0;
    let hasMore = true;
    while (hasMore) {
      const memories = await this.config.storage.getMemoriesByUser(userId, limit, offset);
      if (memories.length === 0) {
        hasMore = false;
        break;
      }
      for (const memory of memories) {
        processed++;
        const newSalience = calcDecay(
          memory.primarySector,
          memory.salience,
          memory.lastSeenAt,
          memory.coactivations,
          memory.metadata?.consolidated === true
        );
        if (newSalience !== memory.salience) {
          memory.salience = newSalience;
          memory.updatedAt = clock.now();
          await this.config.storage.updateMemory(memory);
        }
        if (newSalience < 0.3) {
          if (this.config.vector.getVectorsForId) {
            const vectors = await this.config.vector.getVectorsForId(memory.id, userId);
            for (const v of vectors) {
              if (v.dim > 32) {
                const essence = extractEssence(memory.content, 200);
                const fingerprint = fingerprintMemory(memory.id, essence);
                await this.config.vector.storeVector(memory.id, v.sector, userId, fingerprint, 32);
                fingerprinted++;
              }
            }
          }
        } else if (newSalience < 0.7) {
          if (this.config.vector.getVectorsForId) {
            const vectors = await this.config.vector.getVectorsForId(memory.id, userId);
            for (const v of vectors) {
              if (v.dim > 256) {
                const compressedVec = compressVector(v.vector, 256);
                await this.config.vector.storeVector(memory.id, v.sector, userId, compressedVec, 256);
                compressed++;
              }
            }
          }
        }
      }
      offset += limit;
    }
    this.events.emit("decay:completed", {
      userId,
      processed,
      compressed,
      fingerprinted,
      durationMs: clock.now() - startTime
    });
  }
  /**
   * Runs the reflection pass across all memories.
   */
  async runReflection(userId) {
    if (!this.config.storage.getMemoriesByUser) {
      return;
    }
    const startTime = clock.now();
    const limit = 1e3;
    const memories = await this.config.storage.getMemoriesByUser(userId, limit, 0);
    if (memories.length === 0) return;
    const clusters = clusterMemories(memories, 0.8);
    let reflectionsCreated = 0;
    for (const cluster of clusters) {
      if (cluster.length < 2) continue;
      const combinedText = cluster.map((m) => m.content).join(" ");
      const summary = extractEssence(combinedText, 300);
      const reflectionId = crypto.randomUUID();
      const now = clock.now();
      const primarySector = cluster[0].primarySector;
      const salience = calcReflectionSalience(cluster, now);
      const reflectionMemory = {
        id: reflectionId,
        userId,
        content: `[Reflection] ${summary}`,
        primarySector,
        sectors: [primarySector],
        tags: ["reflection"],
        metadata: {
          reflectionOf: cluster.map((m) => m.id)
        },
        simhash: computeSimhash(summary),
        salience,
        decayLambda: 0.01,
        version: 1,
        createdAt: now,
        updatedAt: now,
        lastSeenAt: now,
        coactivations: 0
      };
      const { vector, dim } = await this.config.embedding.embed(reflectionMemory.content, primarySector);
      await this.config.vector.storeVector(reflectionId, primarySector, userId, vector, dim);
      await this.config.storage.insertMemory(reflectionMemory);
      reflectionsCreated++;
      for (const m of cluster) {
        m.metadata = { ...m.metadata, consolidated: true };
        m.salience = Math.min(1, m.salience + 0.1);
        m.updatedAt = now;
        await this.config.storage.updateMemory(m);
        await createSingleWaypoint(m.id, [], userId, this.config.storage, reflectionId, 0.9);
      }
    }
  }
};

// src/temporal/facts.ts
var FactStore = class {
  constructor(storage, events) {
    this.storage = storage;
    this.events = events;
  }
  storage;
  events;
  /**
   * Directly inserts a fact. Usually you want `versioning.evolveFact` instead 
   * to handle the auto-closing of old facts.
   */
  async insert(fact) {
    const newFact = {
      ...fact,
      id: crypto.randomUUID()
    };
    await this.storage.insertFact(newFact);
    this.events.emit("fact:set", {
      id: newFact.id,
      userId: newFact.userId,
      subject: newFact.subject,
      predicate: newFact.predicate,
      object: newFact.object
    });
    return newFact;
  }
  /**
   * Marks a fact as no longer valid as of right now.
   */
  async invalidate(id, userId) {
    await this.storage.invalidateFact(id, userId, clock.now());
  }
};

// src/temporal/versioning.ts
var FactVersioning = class {
  constructor(storage, events) {
    this.storage = storage;
    this.events = events;
  }
  storage;
  events;
  /**
   * Sets a new fact using the Slowly Changing Dimension (SCD) pattern.
   * If an active fact exists for the same subject/predicate, it is closed (validTo = now).
   * Then the new fact is inserted.
   */
  async evolveFact(subject, predicate, object, options) {
    const { userId, confidence = 1, metadata } = options;
    const now = clock.now();
    const active = await this.storage.getActiveFact(subject, predicate, userId);
    if (active && active.object === object) {
      return active;
    }
    if (active) {
      active.validTo = now - 1;
      await this.storage.updateFact(active);
    }
    const newFact = {
      id: crypto.randomUUID(),
      userId,
      subject,
      predicate,
      object,
      validFrom: now,
      validTo: null,
      confidence,
      metadata
    };
    await this.storage.insertFact(newFact);
    this.events.emit("fact:set", {
      id: newFact.id,
      userId: newFact.userId,
      subject: newFact.subject,
      predicate: newFact.predicate,
      object: newFact.object
    });
    if (active) {
      this.events.emit("fact:superseded", {
        oldId: active.id,
        newId: newFact.id,
        userId: newFact.userId
      });
    }
    return newFact;
  }
};

// src/temporal/query.ts
var FactQuery = class {
  constructor(storage) {
    this.storage = storage;
  }
  storage;
  /**
   * Gets the state of the knowledge graph at a specific point in time.
   * Returns only facts that were valid at `targetTimeMs`.
   */
  async atPointInTime(targetTimeMs, userId) {
    return this.storage.queryFacts(userId, { at: targetTimeMs });
  }
  /**
   * Gets the current, active state of the knowledge graph.
   */
  async current(userId) {
    const allFacts = await this.storage.queryFacts(userId, {});
    return allFacts.filter((f) => f.validTo === null);
  }
  /**
   * Gets the currently active fact for a subject/predicate.
   */
  async activeFact(subject, predicate, userId) {
    return this.storage.getActiveFact(subject, predicate, userId);
  }
  /**
   * Compares the knowledge state between two time points.
   * Returns facts that were added, removed, or changed.
   */
  async compareTimePoints(timeA, timeB, userId) {
    const stateA = await this.atPointInTime(timeA, userId);
    const stateB = await this.atPointInTime(timeB, userId);
    const added = stateB.filter((b) => !stateA.some((a) => a.id === b.id));
    const removed = stateA.filter((a) => !stateB.some((b) => b.id === a.id));
    const changed = [];
    for (const a of stateA) {
      const b = stateB.find((b2) => b2.subject === a.subject && b2.predicate === a.predicate);
      if (b && b.id !== a.id) {
        changed.push({ old: a, new: b });
      }
    }
    return { added, removed, changed };
  }
};

// src/temporal/timeline.ts
var FactTimeline = class {
  constructor(storage) {
    this.storage = storage;
  }
  storage;
  /**
   * Generates a chronological history of a specific property for a subject.
   * e.g. "Where has Bob lived over time?"
   */
  async getPropertyHistory(subject, predicate, userId) {
    const facts = await this.storage.queryFacts(userId, { subject, predicate });
    return facts.sort((a, b) => a.validFrom - b.validFrom);
  }
  /**
   * Returns a chronological feed of all events/changes for a subject.
   */
  async getSubjectTimeline(subject, userId) {
    const facts = await this.storage.queryFacts(userId, { subject });
    const events = [];
    for (const fact of facts) {
      events.push({
        timestamp: fact.validFrom,
        description: `Started: ${fact.subject} ${fact.predicate} ${fact.object}`,
        fact
      });
      if (fact.validTo !== null) {
        events.push({
          timestamp: fact.validTo,
          description: `Ended: ${fact.subject} ${fact.predicate} ${fact.object}`,
          fact
        });
      }
    }
    return events.sort((a, b) => a.timestamp - b.timestamp);
  }
};

// src/core/errors.ts
var MemoryMinusOneError = class extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = "MemoryMinusOneError";
  }
  code;
};
var StorageError = class extends MemoryMinusOneError {
  constructor(code, message) {
    super(code, message);
    this.name = "StorageError";
  }
};
var EmbeddingError = class extends MemoryMinusOneError {
  constructor(code, message) {
    super(code, message);
    this.name = "EmbeddingError";
  }
};
var ConfigError = class extends MemoryMinusOneError {
  constructor(code, message) {
    super(code, message);
    this.name = "ConfigError";
  }
};
var PluginError = class extends MemoryMinusOneError {
  constructor(code, message) {
    super(code, message);
    this.name = "PluginError";
  }
};

// src/plugins/embedding/synthetic.ts
function syntheticEmbedding(dim = 768) {
  return {
    name: "synthetic",
    version: "1.0.0",
    async init(ctx) {
      ctx.logger.debug("synthetic_embedding", `Initialized with dimension ${dim}`);
    },
    async embed(text, sector) {
      return { vector: generateSyntheticEmbedding(text, dim), dim };
    },
    async embedBatch(texts, sector) {
      return {
        vectors: texts.map((t) => generateSyntheticEmbedding(t, dim)),
        dim
      };
    }
  };
}
function generateSyntheticEmbedding(text, dim) {
  const vec = new Array(dim).fill(0);
  const cleanText = text.toLowerCase().replace(/\s+/g, " ");
  const words = cleanText.split(" ");
  for (let i = 0; i < words.length; i++) {
    hashToVector(words[i], vec, dim, 1);
    if (i < words.length - 1) {
      hashToVector(`${words[i]} ${words[i + 1]}`, vec, dim, 0.8);
    }
    if (i < words.length - 2) {
      hashToVector(`${words[i]} * ${words[i + 2]}`, vec, dim, 0.4);
    }
  }
  for (let i = 0; i < cleanText.length - 2; i++) {
    hashToVector(cleanText.substring(i, i + 3), vec, dim, 0.5);
  }
  let norm = 0;
  for (let i = 0; i < dim; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < dim; i++) vec[i] /= norm;
  }
  return vec;
}
function hashToVector(token, vec, dim, weight) {
  let hash1 = 5381, hash2 = 2166136261;
  for (let i = 0; i < token.length; i++) {
    const char = token.charCodeAt(i);
    hash1 = (hash1 << 5) + hash1 + char;
    hash2 = Math.imul(hash2 ^ char, 16777619);
  }
  const idx1 = Math.abs(hash1) % dim;
  const idx2 = Math.abs(hash2) % dim;
  vec[idx1] += weight;
  vec[idx2] -= weight;
}

// src/plugins/storage/memory.ts
function memoryStorage() {
  const memories = /* @__PURE__ */ new Map();
  const waypoints = /* @__PURE__ */ new Map();
  const facts = /* @__PURE__ */ new Map();
  return {
    name: "memory-storage",
    version: "1.0.0",
    async insertMemory(memory) {
      memories.set(memory.id, { ...memory });
    },
    async updateMemory(memory) {
      memories.set(memory.id, { ...memory });
    },
    async getMemory(id, userId) {
      const mem = memories.get(id);
      if (mem && mem.userId === userId) return { ...mem };
      return null;
    },
    async getMemoriesBySector(sector, userId, limit) {
      const res = [];
      for (const mem of memories.values()) {
        if (mem.userId === userId && mem.sectors.includes(sector)) {
          res.push({ ...mem });
          if (res.length >= limit) break;
        }
      }
      return res;
    },
    async deleteMemory(id, userId) {
      const mem = memories.get(id);
      if (mem && mem.userId === userId) {
        memories.delete(id);
      }
    },
    async insertWaypoint(edge) {
      const key = `${edge.srcId}:${edge.dstId}`;
      waypoints.set(key, { ...edge });
    },
    async getNeighbors(srcId, userId) {
      const res = [];
      for (const wp of waypoints.values()) {
        if (wp.userId === userId && wp.srcId === srcId) {
          res.push({ ...wp });
        }
      }
      return res;
    },
    async pruneWaypoints(threshold, userId) {
      let pruned = 0;
      for (const [key, wp] of waypoints.entries()) {
        if (wp.userId === userId && wp.weight < threshold) {
          waypoints.delete(key);
          pruned++;
        }
      }
      return pruned;
    },
    async insertFact(fact) {
      facts.set(fact.id, { ...fact });
    },
    async updateFact(fact) {
      facts.set(fact.id, { ...fact });
    },
    async getActiveFact(subject, predicate, userId) {
      for (const fact of facts.values()) {
        if (fact.userId === userId && fact.subject === subject && fact.predicate === predicate && fact.validTo === null) {
          return { ...fact };
        }
      }
      return null;
    },
    async queryFacts(userId, opts) {
      const res = [];
      for (const fact of facts.values()) {
        if (fact.userId === userId) {
          if (opts.subject && fact.subject !== opts.subject) continue;
          if (opts.predicate && fact.predicate !== opts.predicate) continue;
          res.push({ ...fact });
        }
      }
      return res;
    },
    async invalidateFact(id, userId, atTime) {
      const fact = facts.get(id);
      if (fact && fact.userId === userId) {
        fact.validTo = atTime;
      }
    }
  };
}

// src/plugins/vector/memory.ts
function memoryVectorStore() {
  const store = /* @__PURE__ */ new Map();
  return {
    name: "memory-vector",
    version: "1.0.0",
    async storeVector(id, sector, userId, vector, dim) {
      if (!store.has(sector)) store.set(sector, []);
      const sectorStore = store.get(sector);
      const existingIdx = sectorStore.findIndex((v) => v.id === id && v.userId === userId);
      if (existingIdx >= 0) {
        sectorStore[existingIdx].vector = vector;
      } else {
        sectorStore.push({ id, userId, vector });
      }
    },
    async search(vector, sector, userId, limit) {
      const sectorStore = store.get(sector) || [];
      const userVectors = sectorStore.filter((v) => v.userId === userId);
      const results = userVectors.map((v) => ({
        id: v.id,
        score: cosineSimilarity(vector, v.vector)
      }));
      results.sort((a, b) => b.score - a.score);
      return results.slice(0, limit);
    },
    async deleteVector(id, sector, userId) {
      const sectorStore = store.get(sector);
      if (sectorStore) {
        store.set(sector, sectorStore.filter((v) => !(v.id === id && v.userId === userId)));
      }
    }
  };
}

// src/plugins/cache/lru.ts
function lruCache(options = {}) {
  const maxSize = options.maxSize || 1e3;
  const defaultTtlSeconds = options.defaultTtlSeconds || 3600;
  const store = /* @__PURE__ */ new Map();
  return {
    name: "lru-cache",
    version: "1.0.0",
    async init(ctx) {
      ctx.logger.debug("lru_cache", `Initialized with max size ${maxSize}`);
    },
    async get(key) {
      const entry = store.get(key);
      if (!entry) return null;
      if (entry.expiresAt !== null && clock.now() > entry.expiresAt) {
        store.delete(key);
        return null;
      }
      entry.lastAccessed = clock.now();
      return entry.value;
    },
    async set(key, value, ttlSeconds) {
      if (store.size >= maxSize) {
        let oldestKey = null;
        let oldestTime = Infinity;
        for (const [k, v] of store.entries()) {
          if (v.lastAccessed < oldestTime) {
            oldestTime = v.lastAccessed;
            oldestKey = k;
          }
        }
        if (oldestKey) {
          store.delete(oldestKey);
        }
      }
      const ttl = ttlSeconds ?? defaultTtlSeconds;
      store.set(key, {
        value,
        expiresAt: ttl > 0 ? clock.now() + ttl * 1e3 : null,
        lastAccessed: clock.now()
      });
    },
    async delete(key) {
      store.delete(key);
    },
    async destroy() {
      store.clear();
    }
  };
}

// src/index.ts
var MemoryMinusOne = class {
  config;
  logger;
  events;
  engine;
  factStore;
  factVersioning;
  factQuery;
  factTimeline;
  constructor(config) {
    validateConfig(config);
    this.config = Object.freeze({
      ...config,
      cache: config.cache || noCache()
    });
    this.logger = new DefaultLogger(config.logger);
    this.events = new TypedEventEmitter();
  }
  async init() {
    this.logger.info("engine", "Initializing MemoryMinusOne...");
    const ctx = { logger: this.logger, events: this.events };
    await this.config.storage.init?.(ctx);
    await this.config.embedding.init?.(ctx);
    await this.config.vector.init?.(ctx);
    await this.config.cache?.init?.(ctx);
    this.engine = new MemoryEngine(this.config, this.events);
    this.factStore = new FactStore(this.config.storage, this.events);
    this.factVersioning = new FactVersioning(this.config.storage, this.events);
    this.factQuery = new FactQuery(this.config.storage);
    this.factTimeline = new FactTimeline(this.config.storage);
    this.logger.info("engine", "Initialization complete");
  }
  async destroy() {
    this.logger.info("engine", "Destroying MemoryMinusOne...");
    await this.config.storage.destroy?.();
    await this.config.embedding.destroy?.();
    await this.config.vector.destroy?.();
    await this.config.cache?.destroy?.();
  }
  get eventsEmitter() {
    return this.events;
  }
  // Core Engine Methods
  async add(content, options) {
    return this.engine.add(content, options);
  }
  async query(queryText, options) {
    return this.engine.query(queryText, options);
  }
  async get(id, options) {
    return this.engine.get(id, options);
  }
  async getAll(sector, options) {
    return this.engine.getAll(sector, options);
  }
  async reinforce(id, options) {
    return this.engine.reinforce(id, options);
  }
  async reflect(userId) {
  }
  async decay(userId) {
  }
  // Facts namespace
  get facts() {
    return {
      insert: async (fact) => this.factStore.insert(fact),
      invalidate: async (id, userId) => this.factStore.invalidate(id, userId),
      evolve: async (subject, predicate, object, options) => this.factVersioning.evolveFact(subject, predicate, object, options),
      query: {
        at: async (timeMs, userId) => this.factQuery.atPointInTime(timeMs, userId),
        current: async (userId) => this.factQuery.current(userId),
        active: async (s, p, userId) => this.factQuery.activeFact(s, p, userId),
        compare: async (t1, t2, userId) => this.factQuery.compareTimePoints(t1, t2, userId)
      },
      timeline: async (subject, userId) => this.factTimeline.getSubjectTimeline(subject, userId)
    };
  }
};
function createMemory(config) {
  return new MemoryMinusOne(config);
}
export {
  ConfigError,
  DefaultLogger,
  EmbeddingError,
  FactStore,
  MemoryEngine,
  MemoryMinusOne,
  MemoryMinusOneError,
  PluginError,
  StorageError,
  TypedEventEmitter,
  clock,
  createMemory,
  defaultClock,
  lruCache,
  memoryStorage,
  memoryVectorStore,
  noCache,
  syntheticEmbedding,
  validateConfig
};
