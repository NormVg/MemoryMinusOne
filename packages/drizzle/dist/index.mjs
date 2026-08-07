// src/index.ts
import { clock } from "@memory-minus-one/core";

// src/schema.ts
import { pgTableCreator, text, jsonb, real, integer, bigint, customType } from "drizzle-orm/pg-core";
var vector = customType({
  dataType() {
    return "vector";
  },
  toDriver(value) {
    return `[${value.join(",")}]`;
  },
  fromDriver(value) {
    if (typeof value === "string") {
      return value.replace("[", "").replace("]", "").split(",").map(Number);
    }
    return [];
  }
});
function createSchema(prefix = "m1_") {
  const pgTable = pgTableCreator((name) => `${prefix}${name}`);
  const memories2 = pgTable("memories", {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    content: text("content").notNull(),
    primarySector: text("primary_sector").notNull(),
    sectors: jsonb("sectors").$type().notNull(),
    tags: jsonb("tags").$type().default([]),
    metadata: jsonb("metadata").default({}),
    simhash: text("simhash"),
    salience: real("salience").default(1).notNull(),
    decayLambda: real("decay_lambda").notNull(),
    version: integer("version").default(1).notNull(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
    lastSeenAt: bigint("last_seen_at", { mode: "number" }).notNull(),
    coactivations: integer("coactivations").default(0).notNull()
  });
  const vectors2 = pgTable("vectors", {
    id: text("id").notNull(),
    sector: text("sector").notNull(),
    userId: text("user_id").notNull(),
    vec: vector("vec").notNull(),
    dim: integer("dim").notNull()
  }, (table) => {
    return {
      // Primary key on (id, sector)
      pk: {
        columns: [table.id, table.sector]
      }
    };
  });
  const waypoints2 = pgTable("waypoints", {
    srcId: text("src_id").notNull(),
    dstId: text("dst_id").notNull(),
    userId: text("user_id").notNull(),
    weight: real("weight").notNull(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull()
  }, (table) => {
    return {
      pk: {
        columns: [table.srcId, table.dstId]
      }
    };
  });
  const facts2 = pgTable("facts", {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    subject: text("subject").notNull(),
    predicate: text("predicate").notNull(),
    object: text("object").notNull(),
    validFrom: bigint("valid_from", { mode: "number" }).notNull(),
    validTo: bigint("valid_to", { mode: "number" }),
    confidence: real("confidence").notNull(),
    metadata: jsonb("metadata").default({})
  });
  return {
    memories: memories2,
    vectors: vectors2,
    waypoints: waypoints2,
    facts: facts2
  };
}
var tables = createSchema("m1_");
var memories = tables.memories;
var vectors = tables.vectors;
var waypoints = tables.waypoints;
var facts = tables.facts;

// src/index.ts
import { eq as eq2, and as and2, or, sql as sql2 } from "drizzle-orm";

// src/vector.ts
import { eq, and, sql } from "drizzle-orm";
function pgvectorSearch(options) {
  const prefix = options.tablePrefix ?? "m1_";
  const schema = createSchema(prefix);
  const db = options.db;
  return {
    name: "pgvector",
    version: "1.0.0",
    async init(ctx) {
      ctx.logger.debug("pgvector", `Initialized with prefix '${prefix}'`);
    },
    async storeVector(id, sector, userId, vector2, dim) {
      await db.insert(schema.vectors).values({
        id,
        sector,
        userId,
        vec: vector2,
        dim
      }).onConflictDoUpdate({
        target: [schema.vectors.id, schema.vectors.sector],
        set: { vec: vector2 }
      });
    },
    async search(vector2, sector, userId, limit) {
      const vecString = `[${vector2.join(",")}]`;
      const res = await db.select({
        id: schema.vectors.id,
        // Convert distance to similarity: similarity = 1 - distance
        score: sql`1 - (${schema.vectors.vec} <=> ${vecString}::vector)`
      }).from(schema.vectors).where(
        and(
          eq(schema.vectors.sector, sector),
          eq(schema.vectors.userId, userId)
        )
      ).orderBy(sql`${schema.vectors.vec} <=> ${vecString}::vector`).limit(limit);
      return res;
    },
    async deleteVector(id, sector, userId) {
      await db.delete(schema.vectors).where(
        and(
          eq(schema.vectors.id, id),
          eq(schema.vectors.sector, sector),
          eq(schema.vectors.userId, userId)
        )
      );
    }
  };
}

// src/index.ts
function drizzleStorage(options) {
  const prefix = options.tablePrefix ?? "m1_";
  const schema = createSchema(prefix);
  const db = options.db;
  return {
    name: "drizzle",
    version: "1.0.0",
    async init(ctx) {
      ctx.logger.debug("drizzle_storage", `Initialized with prefix '${prefix}'`);
    },
    async insertMemory(memory) {
      await db.insert(schema.memories).values(memory);
    },
    async updateMemory(memory) {
      await db.update(schema.memories).set({ ...memory, updatedAt: clock.now(), version: memory.version + 1 }).where(
        and2(
          eq2(schema.memories.id, memory.id),
          eq2(schema.memories.userId, memory.userId)
        )
      );
    },
    async getMemory(id, userId) {
      const res = await db.select().from(schema.memories).where(
        and2(
          eq2(schema.memories.id, id),
          eq2(schema.memories.userId, userId)
        )
      ).limit(1);
      return res[0] || null;
    },
    async getMemoriesBySector(sector, userId, limit) {
      const res = await db.select().from(schema.memories).where(
        and2(
          eq2(schema.memories.userId, userId),
          sql2`${schema.memories.sectors} ? ${sector}`
        )
      ).limit(limit);
      return res;
    },
    async deleteMemory(id, userId) {
      await db.delete(schema.memories).where(
        and2(
          eq2(schema.memories.id, id),
          eq2(schema.memories.userId, userId)
        )
      );
    },
    async insertWaypoint(edge) {
      await db.insert(schema.waypoints).values(edge).onConflictDoUpdate({
        target: [schema.waypoints.srcId, schema.waypoints.dstId],
        set: { weight: edge.weight, updatedAt: clock.now() }
      });
    },
    async getNeighbors(srcId, userId) {
      return await db.select().from(schema.waypoints).where(
        and2(
          eq2(schema.waypoints.srcId, srcId),
          eq2(schema.waypoints.userId, userId)
        )
      );
    },
    async pruneWaypoints(threshold, userId) {
      const res = await db.delete(schema.waypoints).where(
        and2(
          eq2(schema.waypoints.userId, userId),
          sql2`${schema.waypoints.weight} < ${threshold}`
        )
      ).returning();
      return res.length;
    },
    async insertFact(fact) {
      await db.insert(schema.facts).values(fact);
    },
    async updateFact(fact) {
      await db.update(schema.facts).set(fact).where(
        and2(
          eq2(schema.facts.id, fact.id),
          eq2(schema.facts.userId, fact.userId)
        )
      );
    },
    async getActiveFact(subject, predicate, userId) {
      const res = await db.select().from(schema.facts).where(
        and2(
          eq2(schema.facts.userId, userId),
          eq2(schema.facts.subject, subject),
          eq2(schema.facts.predicate, predicate),
          sql2`${schema.facts.validTo} IS NULL`
        )
      ).limit(1);
      return res[0] || null;
    },
    async queryFacts(userId, opts) {
      const conditions = [eq2(schema.facts.userId, userId)];
      if (opts.subject) conditions.push(eq2(schema.facts.subject, opts.subject));
      if (opts.predicate) conditions.push(eq2(schema.facts.predicate, opts.predicate));
      if (opts.at !== void 0) {
        conditions.push(sql2`${schema.facts.validFrom} <= ${opts.at}`);
        conditions.push(
          or(
            sql2`${schema.facts.validTo} IS NULL`,
            sql2`${schema.facts.validTo} > ${opts.at}`
          )
        );
      }
      return await db.select().from(schema.facts).where(and2(...conditions));
    },
    async invalidateFact(id, userId, atTime) {
      await db.update(schema.facts).set({ validTo: atTime }).where(
        and2(
          eq2(schema.facts.id, id),
          eq2(schema.facts.userId, userId)
        )
      );
    }
  };
}
export {
  createSchema,
  drizzleStorage,
  facts,
  memories,
  pgvectorSearch,
  vectors,
  waypoints
};
