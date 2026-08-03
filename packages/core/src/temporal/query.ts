import { TemporalFact } from "../core/types";
import { IStoragePlugin } from "../core/plugin";

export class FactQuery {
  constructor(private storage: IStoragePlugin) {}

  /**
   * Gets the state of the knowledge graph at a specific point in time.
   * Returns only facts that were valid at `targetTimeMs`.
   */
  async atPointInTime(targetTimeMs: number, userId: string): Promise<TemporalFact[]> {
    return this.storage.queryFacts(userId, { at: targetTimeMs });
  }

  /**
   * Gets the current, active state of the knowledge graph.
   */
  async current(userId: string): Promise<TemporalFact[]> {
    const allFacts = await this.storage.queryFacts(userId, {});
    return allFacts.filter(f => f.validTo === null);
  }

  /**
   * Gets the currently active fact for a subject/predicate.
   */
  async activeFact(subject: string, predicate: string, userId: string): Promise<TemporalFact | null> {
    return this.storage.getActiveFact(subject, predicate, userId);
  }

  /**
   * Compares the knowledge state between two time points.
   * Returns facts that were added, removed, or changed.
   */
  async compareTimePoints(timeA: number, timeB: number, userId: string): Promise<{
    added: TemporalFact[];
    removed: TemporalFact[];
    changed: { old: TemporalFact; new: TemporalFact }[];
  }> {
    const stateA = await this.atPointInTime(timeA, userId);
    const stateB = await this.atPointInTime(timeB, userId);

    const added = stateB.filter(b => !stateA.some(a => a.id === b.id));
    const removed = stateA.filter(a => !stateB.some(b => b.id === a.id));
    
    // In our model, facts don't change in place, they are superseded.
    // So a change is when a subject/predicate pair has a different active fact.
    const changed: { old: TemporalFact; new: TemporalFact }[] = [];
    
    // Find subject/predicate pairs in stateA that are different in stateB
    for (const a of stateA) {
      const b = stateB.find(b => b.subject === a.subject && b.predicate === a.predicate);
      if (b && b.id !== a.id) {
        changed.push({ old: a, new: b });
      }
    }

    return { added, removed, changed };
  }
}
