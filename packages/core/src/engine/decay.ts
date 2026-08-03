import { clock } from "../core/clock";
import { SECTOR_CONFIGS } from "./sectors";
import { DecayTier } from "../core/types";

export const DECAY_PARAMS = {
  alphaReinforce: 0.08,
  minSalience: 0.01,
  fastDecayRate: 0.015,
  slowDecayRate: 0.002,
  consolidationCoeff: 0.4,
};

export const TIER_THRESHOLDS = {
  hot: 0.8,
  warm: 0.3,
};

/**
 * Classifies a memory into hot/warm/cold tiers based on age and salience.
 */
export function classifyTier(
  salience: number, 
  daysSince: number, 
  coactivations: number
): DecayTier {
  if (daysSince < 6 && (coactivations > 5 || salience > 0.7)) return "hot";
  if (daysSince < 6 || salience > 0.4) return "warm";
  return "cold";
}

/**
 * Calculates the new salience of a memory after decay.
 * Implements coactivation-buffered salience scaling and dual-phase retention decay.
 */
export function calcDecay(
  sector: string,
  initialSalience: number,
  lastSeenAt: number,
  coactivations: number = 0,
  consolidated: boolean = false
): number {
  const now = clock.now();
  const daysSince = Math.max(0, (now - lastSeenAt) / (1000 * 60 * 60 * 24));
  
  // Coactivation buffer
  let sal = initialSalience * (1 + Math.log(1 + coactivations));
  sal = Math.max(0, Math.min(1.0, sal));
  
  const tier = classifyTier(sal, daysSince, coactivations);
  
  let lambda = 0.05; // cold default
  if (tier === "hot") lambda = 0.005;
  else if (tier === "warm") lambda = 0.02;
  
  // Standard Tiered Forgetting Curve
  const f = Math.exp(-lambda * (daysSince / (sal + 0.1)));
  let newSalience = sal * f;
  
  // Dual-phase consolidation for long-term memories
  if (consolidated) {
    const retention = Math.exp(-DECAY_PARAMS.fastDecayRate * daysSince) + 
                      DECAY_PARAMS.consolidationCoeff * Math.exp(-DECAY_PARAMS.slowDecayRate * daysSince);
    newSalience = Math.max(newSalience, initialSalience * retention);
  }
  
  // Sector-specific reinforcement (contextual glow)
  const cfg = SECTOR_CONFIGS[sector];
  if (cfg) {
    const secLambda = cfg.decayLambda;
    const sectorDecay = initialSalience * Math.exp(-secLambda * daysSince) + 
                        DECAY_PARAMS.alphaReinforce * (1 - Math.exp(-secLambda * daysSince));
    // Blend it
    newSalience = (newSalience + sectorDecay) / 2;
  }
  
  return Math.max(DECAY_PARAMS.minSalience, Math.min(1.0, newSalience));
}
