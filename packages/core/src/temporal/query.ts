import { TemporalFact } from "../core/types";
import { IStoragePlugin } from "../core/plugin";

export class FactQuery {
  constructor(private storage: IStoragePlugin, private userId: string) {}

  /**
   * Gets all facts that were true at a specific point in time.
   */
  async atPointInTime(targetTimeMs: number): Promise<TemporalFact[]> {
    return this.storage.queryFacts(this.userId, { at: targetTimeMs });
  }

  /**
   * Gets all currently active facts (validTo is null).
   */
  async current(): Promise<TemporalFact[]> {
    const allFacts = await this.storage.queryFacts(this.userId, {});
    return allFacts.filter((f) => f.validTo === null);
  }

  /**
   * Finds the currently active fact for a specific subject and predicate.
   */
  async activeFact(subject: string, predicate: string): Promise<TemporalFact | null> {
    return this.storage.getActiveFact(subject, predicate, this.userId);
  }

  /**
   * Compares the knowledge state between two points in time.
   */
  async compareTimePoints(t1: number, t2: number): Promise<{
    added: TemporalFact[];
    removed: TemporalFact[];
    changed: TemporalFact[];
    unchanged: TemporalFact[];
  }> {
    const factsT1 = await this.atPointInTime(t1);
    const factsT2 = await this.atPointInTime(t2);

    const mapT1 = new Map(factsT1.map(f => [`${f.subject}:${f.predicate}`, f]));
    const mapT2 = new Map(factsT2.map(f => [`${f.subject}:${f.predicate}`, f]));

    const result = {
      added: [] as TemporalFact[],
      removed: [] as TemporalFact[],
      changed: [] as TemporalFact[],
      unchanged: [] as TemporalFact[]
    };

    for (const [key, f2] of mapT2.entries()) {
      const f1 = mapT1.get(key);
      if (!f1) {
        result.added.push(f2);
      } else if (f1.object === f2.object) {
        result.unchanged.push(f2);
      } else {
        result.changed.push(f2);
      }
    }

    for (const [key, f1] of mapT1.entries()) {
      if (!mapT2.has(key)) {
        result.removed.push(f1);
      }
    }

    return result;
  }
}
