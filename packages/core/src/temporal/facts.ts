import { TemporalFact } from "../core/types";
import { IStoragePlugin } from "../core/plugin";
import { clock } from "../core/clock";

export class FactStore {
  constructor(private storage: IStoragePlugin) {}

  /**
   * Directly inserts a fact. Usually you want `versioning.evolveFact` instead 
   * to handle the auto-closing of old facts.
   */
  async insert(fact: Omit<TemporalFact, "id">): Promise<TemporalFact> {
    const newFact: TemporalFact = {
      ...fact,
      id: crypto.randomUUID(),
    };
    await this.storage.insertFact(newFact);
    return newFact;
  }

  /**
   * Marks a fact as no longer valid as of right now.
   */
  async invalidate(id: string, userId: string): Promise<void> {
    await this.storage.invalidateFact(id, userId, clock.now());
  }
}
