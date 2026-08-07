import { describe, it, expect, vi } from "vitest";
import { MemoryEngine } from "./memory";
import { MemoryConfig } from "../core/config";
import { TypedEventEmitter } from "../core/events";
import { FactStore } from "../temporal/facts";

describe("events", () => {
  it("should emit memory:added on memory add", async () => {
    const events = new TypedEventEmitter();
    const config: MemoryConfig = {
      storage: {
        insertMemory: vi.fn(),
        insertWaypoint: vi.fn(),
      } as any,
      embedding: {
        embed: vi.fn().mockResolvedValue({ vector: [1, 2, 3], dim: 3 }),
        embedBatch: vi.fn().mockImplementation(async (texts) => ({
          vectors: texts.map(() => [1, 2, 3]),
          dim: 3
        })),
      } as any,
      vector: {
        storeVector: vi.fn(),
        search: vi.fn().mockResolvedValue([]),
      } as any,
    };

    const engine = new MemoryEngine(config, events);
    const addedHandler = vi.fn();
    events.on("memory:added", addedHandler);

    await engine.add("test content", { userId: "user1" });
    
    expect(addedHandler).toHaveBeenCalled();
    const eventArg = addedHandler.mock.calls[0][0];
    expect(eventArg.userId).toBe("user1");
    expect(eventArg.sector).toBe("semantic");
  });

  it("should emit fact:set on fact store insert", async () => {
    const events = new TypedEventEmitter();
    const storage = {
      insertFact: vi.fn(),
    } as any;
    const store = new FactStore(storage, events);
    
    const factHandler = vi.fn();
    events.on("fact:set", factHandler);

    await store.insert({
      userId: "u1",
      subject: "Alice",
      predicate: "likes",
      object: "Bob",
      validFrom: 0,
      validTo: null,
      confidence: 1.0
    });

    expect(factHandler).toHaveBeenCalled();
    expect(factHandler.mock.calls[0][0].subject).toBe("Alice");
  });
});
