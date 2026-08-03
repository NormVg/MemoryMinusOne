import { TemporalFact } from "../core/types";
import { IStoragePlugin } from "../core/plugin";

export class FactTimeline {
  constructor(private storage: IStoragePlugin) {}

  /**
   * Generates a chronological history of a specific property for a subject.
   * e.g. "Where has Bob lived over time?"
   */
  async getPropertyHistory(subject: string, predicate: string, userId: string): Promise<TemporalFact[]> {
    const facts = await this.storage.queryFacts(userId, { subject, predicate });
    // Sort chronologically by when they became valid
    return facts.sort((a, b) => a.validFrom - b.validFrom);
  }

  /**
   * Returns a chronological feed of all events/changes for a subject.
   */
  async getSubjectTimeline(subject: string, userId: string): Array<{
    timestamp: number;
    description: string;
    fact: TemporalFact;
  }> {
    const facts = await this.storage.queryFacts(userId, { subject });
    
    const events: Array<{timestamp: number; description: string; fact: TemporalFact}> = [];

    for (const fact of facts) {
      // Event: Fact became true
      events.push({
        timestamp: fact.validFrom,
        description: `Started: ${fact.subject} ${fact.predicate} ${fact.object}`,
        fact
      });

      // Event: Fact stopped being true
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
}
