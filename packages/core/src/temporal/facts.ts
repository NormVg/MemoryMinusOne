import { TemporalFact } from "../core/types";
import { IStoragePlugin } from "../core/plugin";
import { clock } from "../core/clock";
import { TypedEventEmitter } from "../core/events";

export class FactStore {
  constructor(private storage: IStoragePlugin, private events: TypedEventEmitter) {}

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
  async invalidate(id: string, userId: string): Promise<void> {
    await this.storage.invalidateFact(id, userId, clock.now());
  }
}
