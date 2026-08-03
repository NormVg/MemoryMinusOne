import { TemporalFact } from "../core/types";
import { IStoragePlugin } from "../core/plugin";

export class FactTimeline {
  constructor(private storage: IStoragePlugin, private userId: string) {}

  /**
   * Gets the full history of changes for a specific subject and predicate,
   * sorted chronologically.
   */
  async getSubjectPredicateHistory(subject: string, predicate: string): Promise<TemporalFact[]> {
    const facts = await this.storage.queryFacts(this.userId, { subject, predicate });
    // Sort by validFrom ascending
    return facts.sort((a, b) => a.validFrom - b.validFrom);
  }

  /**
   * Calculates the change frequency (volatility) of a fact.
   * High volatility means this fact changes often (e.g. current location).
   */
  async getVolatility(subject: string, predicate: string): Promise<number> {
    const history = await this.getSubjectPredicateHistory(subject, predicate);
    if (history.length < 2) return 0;
    
    const firstTime = history[0].validFrom;
    const lastTime = history[history.length - 1].validFrom;
    const duration = lastTime - firstTime;
    
    if (duration === 0) return 0;
    
    // changes per day
    return (history.length - 1) / (duration / (1000 * 60 * 60 * 24));
  }

  /**
   * Generates a chronological timeline of events for a given subject.
   */
  async getSubjectTimeline(subject: string): Promise<Array<{
    time: number;
    type: 'created' | 'invalidated';
    fact: TemporalFact;
  }>> {
    const facts = await this.storage.queryFacts(this.userId, { subject });
    const events: Array<{ time: number; type: 'created' | 'invalidated'; fact: TemporalFact }> = [];

    for (const fact of facts) {
      events.push({ time: fact.validFrom, type: 'created', fact });
      if (fact.validTo !== null) {
        events.push({ time: fact.validTo, type: 'invalidated', fact });
      }
    }

    return events.sort((a, b) => a.time - b.time);
  }
}
