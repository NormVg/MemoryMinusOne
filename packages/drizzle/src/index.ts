import { IStoragePlugin, PluginContext, MemoryNode, WaypointEdge, TemporalFact, clock } from "@memory-minus-one/core";
import { createSchema, MemorySchema } from "./schema";
import { eq, and, or, sql } from "drizzle-orm";

export interface DrizzleStorageOptions {
  db: any; // The Drizzle DB instance
  tablePrefix?: string;
}

export function drizzleStorage(options: DrizzleStorageOptions): IStoragePlugin {
  const prefix = options.tablePrefix ?? "m1_";
  const schema = createSchema(prefix);
  const db = options.db;

  return {
    name: "drizzle",
    version: "1.0.0",

    async init(ctx: PluginContext) {
      ctx.logger.debug("drizzle_storage", `Initialized with prefix '${prefix}'`);
    },

    async insertMemory(memory: MemoryNode) {
      await db.insert(schema.memories).values(memory);
    },

    async updateMemory(memory: MemoryNode) {
      await db
        .update(schema.memories)
        .set({ ...memory, updatedAt: clock.now(), version: memory.version + 1 })
        .where(
          and(
            eq(schema.memories.id, memory.id),
            eq(schema.memories.userId, memory.userId)
          )
        );
    },

    async getMemory(id: string, userId: string) {
      const res = await db
        .select()
        .from(schema.memories)
        .where(
          and(
            eq(schema.memories.id, id),
            eq(schema.memories.userId, userId)
          )
        )
        .limit(1);
      return res[0] || null;
    },

    async getMemoriesBySector(sector: string, userId: string, limit: number) {
      // jsonb array containment is tricky, we'll use raw sql for the arrays if needed, 
      // but assuming drizzle handles jsonb:
      const res = await db
        .select()
        .from(schema.memories)
        .where(
          and(
            eq(schema.memories.userId, userId),
            sql`${schema.memories.sectors} ? ${sector}`
          )
        )
        .limit(limit);
      return res;
    },

    async deleteMemory(id: string, userId: string) {
      await db
        .delete(schema.memories)
        .where(
          and(
            eq(schema.memories.id, id),
            eq(schema.memories.userId, userId)
          )
        );
    },

    async insertWaypoint(edge: WaypointEdge) {
      await db.insert(schema.waypoints).values(edge).onConflictDoUpdate({
        target: [schema.waypoints.srcId, schema.waypoints.dstId],
        set: { weight: edge.weight, updatedAt: clock.now() }
      });
    },

    async getNeighbors(srcId: string, userId: string) {
      return await db
        .select()
        .from(schema.waypoints)
        .where(
          and(
            eq(schema.waypoints.srcId, srcId),
            eq(schema.waypoints.userId, userId)
          )
        );
    },

    async pruneWaypoints(threshold: number, userId: string) {
      const res = await db
        .delete(schema.waypoints)
        .where(
          and(
            eq(schema.waypoints.userId, userId),
            sql`${schema.waypoints.weight} < ${threshold}`
          )
        )
        .returning();
      return res.length;
    },

    async insertFact(fact: TemporalFact) {
      await db.insert(schema.facts).values(fact);
    },

    async updateFact(fact: TemporalFact) {
      await db
        .update(schema.facts)
        .set(fact)
        .where(
          and(
            eq(schema.facts.id, fact.id),
            eq(schema.facts.userId, fact.userId)
          )
        );
    },

    async getActiveFact(subject: string, predicate: string, userId: string) {
      const res = await db
        .select()
        .from(schema.facts)
        .where(
          and(
            eq(schema.facts.userId, userId),
            eq(schema.facts.subject, subject),
            eq(schema.facts.predicate, predicate),
            sql`${schema.facts.validTo} IS NULL`
          )
        )
        .limit(1);
      return res[0] || null;
    },

    async queryFacts(userId: string, opts: { subject?: string; predicate?: string; at?: number }) {
      const conditions: any[] = [eq(schema.facts.userId, userId)];
      
      if (opts.subject) conditions.push(eq(schema.facts.subject, opts.subject));
      if (opts.predicate) conditions.push(eq(schema.facts.predicate, opts.predicate));
      if (opts.at !== undefined) {
        conditions.push(sql`${schema.facts.validFrom} <= ${opts.at}`);
        conditions.push(
          or(
            sql`${schema.facts.validTo} IS NULL`,
            sql`${schema.facts.validTo} > ${opts.at}`
          )
        );
      }

      return await db
        .select()
        .from(schema.facts)
        .where(and(...conditions));
    },

    async invalidateFact(id: string, userId: string, atTime: number) {
      await db
        .update(schema.facts)
        .set({ validTo: atTime })
        .where(
          and(
            eq(schema.facts.id, id),
            eq(schema.facts.userId, userId)
          )
        );
    }
  };
}

export * from "./schema";
export * from "./vector";
