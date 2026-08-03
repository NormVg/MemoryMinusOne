import { SectorClassification } from "../core/types";

export interface SectorConfig {
  name: string;
  decayLambda: number;
  weight: number;
  patterns: RegExp[];
}

export const SECTOR_CONFIGS: Record<string, SectorConfig> = {
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
      /\bI\s+'?m\s+going\s+to\b/i,
    ],
  },
  semantic: {
    name: "semantic",
    decayLambda: 0.005,
    weight: 1.0,
    patterns: [
      /\b(is\s+a|represents|means|stands\s+for|defined\s+as)\b/i,
      /\b(concept|theory|principle|law|hypothesis|theorem|axiom)\b/i,
      /\b(fact|statistic|data|evidence|proof|research|study|report)\b/i,
      /\b(capital|population|distance|weight|height|width|depth)\b/i,
      /\b(history|science|geography|math|physics|biology|chemistry)\b/i,
      /\b(know|understand|learn|read|write|speak)\b/i,
    ],
  },
  procedural: {
    name: "procedural",
    decayLambda: 0.008,
    weight: 1.1,
    patterns: [
      /\b(how\s+to|step\s+by\s+step|guide|tutorial|manual|instructions)\b/i,
      /\b(first|second|then|next|finally|afterwards|lastly)\b/i,
      /\b(install|run|execute|compile|build|deploy|configure|setup)\b/i,
      /\b(click|press|type|enter|select|drag|drop|scroll)\b/i,
      /\b(method|function|class|algorithm|routine|recipe)\b/i,
      /\b(to\s+do|to\s+make|to\s+build|to\s+create)\b/i,
    ],
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
      /[!]{2,}/,
    ],
  },
  reflective: {
    name: "reflective",
    decayLambda: 0.001,
    weight: 0.8,
    patterns: [
      /\b(realize|realized|realization|insight|epiphany)\b/i,
      /\b(think|thought|thinking|ponder|contemplate|reflect)\b/i,
      /\b(understand|understood|understanding|grasp|comprehend)\b/i,
      /\b(pattern|trend|connection|link|relationship|correlation)\b/i,
      /\b(lesson|moral|takeaway|conclusion|summary|implication)\b/i,
      /\b(feedback|review|analysis|evaluation|assessment)\b/i,
      /\b(improve|grow|change|adapt|evolve)\b/i,
    ],
  },
};

export const SECTORS = Object.keys(SECTOR_CONFIGS);

export function classifyContent(content: string, metadata?: Record<string, any>): SectorClassification {
  if (metadata?.sector && SECTORS.includes(metadata.sector)) {
    return {
      primarySector: metadata.sector,
      sectors: [metadata.sector],
      confidence: 1.0,
    };
  }

  const scores: Record<string, number> = {};
  
  for (const [sectorName, config] of Object.entries(SECTOR_CONFIGS)) {
    let score = 0;
    for (const pattern of config.patterns) {
      const matches = content.match(new RegExp(pattern, 'gi'));
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
  
  const additionalSectors = sortedScores
    .slice(1)
    .filter(([_, score]) => score > 0 && score >= threshold)
    .map(([sectorName]) => sectorName);

  const confidence = primaryScore > 0
    ? Math.min(1.0, primaryScore / (primaryScore + (sortedScores[1]?.[1] || 0) + 1))
    : 0.2;

  const resolvedPrimary = primaryScore > 0 ? primarySector : "semantic";

  return {
    primarySector: resolvedPrimary,
    sectors: [resolvedPrimary, ...additionalSectors],
    confidence,
  };
}
