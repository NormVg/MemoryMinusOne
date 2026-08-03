import { TemporalFact } from "../core/types";
import { IStoragePlugin } from "../core/plugin";
import { clock } from "../core/clock";

export class FactVersioning {
  constructor(private storage: IStoragePlugin) {}

  /**
   * Sets a new fact using the Slowly Changing Dimension (SCD) pattern.
   * If an active fact exists for the same subject/predicate, it is closed (validTo = now).
   * Then the new fact is inserted.
   */
  async evolveFact(
    subject: string,
    predicate: string,
    object: string,
    options: { userId: string; confidence?: number; metadata?: Record<string, any> }
  ): Promise<TemporalFact> {
    const { userId, confidence = 1.0, metadata } = options;
    const now = clock.now();
    
    // Find currently active fact
    const active = await this.storage.getActiveFact(subject, predicate, userId);
    
    // If it's the exact same object, don't create a new version
    if (active && active.object === object) {
      return active;
    }

    // Close the active fact
    if (active) {
      active.validTo = now - 1;
      await this.storage.updateFact(active);
    }

    // Insert new fact
    const newFact: TemporalFact = {
      id: crypto.randomUUID(),
      userId,
      subject,
      predicate,
      object,
      validFrom: now,
      validTo: null,
      confidence,
      metadata,
    };
    
    await this.storage.insertFact(newFact);
    return newFact;
  }
}
