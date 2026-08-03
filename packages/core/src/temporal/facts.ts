import { TemporalFact } from "../core/types";
import { IStoragePlugin } from "../core/plugin";
import { clock } from "../core/clock";

export class FactStore {
  constructor(private storage: IStoragePlugin, private userId: string) {}

  /**
   * Directly inserts a fact. Usually you want `versioning.evolveFact` instead 
   * to handle the auto-closing of old facts.
   */
  async insert(fact: Omit<TemporalFact, "id" | "userId">): Promise<TemporalFact> {
    const newFact: TemporalFact = {
      ...fact,
      id: crypto.randomUUID(),
      userId: this.userId,
    };
    await this.storage.insertFact(newFact);
    return newFact;
  }

  /**
   * Marks a fact as no longer valid as of right now.
   */
  async invalidate(id: string): Promise<void> {
    // We assume the storage plugin has an invalidateFact method, which we will add.
    await this.storage.invalidateFact(id, this.userId, clock.now());
  }
}
