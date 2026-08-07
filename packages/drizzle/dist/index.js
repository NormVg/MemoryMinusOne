"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  createSchema: () => createSchema,
  drizzleStorage: () => drizzleStorage,
  facts: () => facts,
  memories: () => memories,
  pgvectorSearch: () => pgvectorSearch,
  vectors: () => vectors,
  waypoints: () => waypoints
});
module.exports = __toCommonJS(index_exports);
var import_core = require("@memory-minus-one/core");

// src/schema.ts
var import_pg_core = require("drizzle-orm/pg-core");
var vector = (0, import_pg_core.customType)({
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
  const pgTable = (0, import_pg_core.pgTableCreator)((name) => `${prefix}${name}`);
  const memories2 = pgTable("memories", {
    id: (0, import_pg_core.text)("id").primaryKey(),
    userId: (0, import_pg_core.text)("user_id").notNull(),
    content: (0, import_pg_core.text)("content").notNull(),
    primarySector: (0, import_pg_core.text)("primary_sector").notNull(),
    sectors: (0, import_pg_core.jsonb)("sectors").$type().notNull(),
    tags: (0, import_pg_core.jsonb)("tags").$type().default([]),
    metadata: (0, import_pg_core.jsonb)("metadata").default({}),
    simhash: (0, import_pg_core.text)("simhash"),
    salience: (0, import_pg_core.real)("salience").default(1).notNull(),
    decayLambda: (0, import_pg_core.real)("decay_lambda").notNull(),
    version: (0, import_pg_core.integer)("version").default(1).notNull(),
    createdAt: (0, import_pg_core.bigint)("created_at", { mode: "number" }).notNull(),
    updatedAt: (0, import_pg_core.bigint)("updated_at", { mode: "number" }).notNull(),
    lastSeenAt: (0, import_pg_core.bigint)("last_seen_at", { mode: "number" }).notNull(),
    coactivations: (0, import_pg_core.integer)("coactivations").default(0).notNull()
  });
  const vectors2 = pgTable("vectors", {
    id: (0, import_pg_core.text)("id").notNull(),
    sector: (0, import_pg_core.text)("sector").notNull(),
    userId: (0, import_pg_core.text)("user_id").notNull(),
    vec: vector("vec").notNull(),
    dim: (0, import_pg_core.integer)("dim").notNull()
  }, (table) => {
    return {
      // Primary key on (id, sector)
      pk: {
        columns: [table.id, table.sector]
      }
    };
  });
  const waypoints2 = pgTable("waypoints", {
    srcId: (0, import_pg_core.text)("src_id").notNull(),
    dstId: (0, import_pg_core.text)("dst_id").notNull(),
    userId: (0, import_pg_core.text)("user_id").notNull(),
    weight: (0, import_pg_core.real)("weight").notNull(),
    createdAt: (0, import_pg_core.bigint)("created_at", { mode: "number" }).notNull(),
    updatedAt: (0, import_pg_core.bigint)("updated_at", { mode: "number" }).notNull()
  }, (table) => {
    return {
      pk: {
        columns: [table.srcId, table.dstId]
      }
    };
  });
  const facts2 = pgTable("facts", {
    id: (0, import_pg_core.text)("id").primaryKey(),
    userId: (0, import_pg_core.text)("user_id").notNull(),
    subject: (0, import_pg_core.text)("subject").notNull(),
    predicate: (0, import_pg_core.text)("predicate").notNull(),
    object: (0, import_pg_core.text)("object").notNull(),
    validFrom: (0, import_pg_core.bigint)("valid_from", { mode: "number" }).notNull(),
    validTo: (0, import_pg_core.bigint)("valid_to", { mode: "number" }),
    confidence: (0, import_pg_core.real)("confidence").notNull(),
    metadata: (0, import_pg_core.jsonb)("metadata").default({})
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
var import_drizzle_orm2 = require("drizzle-orm");

// src/vector.ts
var import_drizzle_orm = require("drizzle-orm");
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
        score: import_drizzle_orm.sql`1 - (${schema.vectors.vec} <=> ${vecString}::vector)`
      }).from(schema.vectors).where(
        (0, import_drizzle_orm.and)(
          (0, import_drizzle_orm.eq)(schema.vectors.sector, sector),
          (0, import_drizzle_orm.eq)(schema.vectors.userId, userId)
        )
      ).orderBy(import_drizzle_orm.sql`${schema.vectors.vec} <=> ${vecString}::vector`).limit(limit);
      return res;
    },
    async getVectorsForId(id, userId) {
      const res = await db.select({
        sector: schema.vectors.sector,
        vector: schema.vectors.vec,
        dim: schema.vectors.dim
      }).from(schema.vectors).where(
        (0, import_drizzle_orm.and)(
          (0, import_drizzle_orm.eq)(schema.vectors.id, id),
          (0, import_drizzle_orm.eq)(schema.vectors.userId, userId)
        )
      );
      return res;
    },
    async deleteVector(id, sector, userId) {
      await db.delete(schema.vectors).where(
        (0, import_drizzle_orm.and)(
          (0, import_drizzle_orm.eq)(schema.vectors.id, id),
          (0, import_drizzle_orm.eq)(schema.vectors.sector, sector),
          (0, import_drizzle_orm.eq)(schema.vectors.userId, userId)
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
      await db.update(schema.memories).set({ ...memory, updatedAt: import_core.clock.now(), version: memory.version + 1 }).where(
        (0, import_drizzle_orm2.and)(
          (0, import_drizzle_orm2.eq)(schema.memories.id, memory.id),
          (0, import_drizzle_orm2.eq)(schema.memories.userId, memory.userId)
        )
      );
    },
    async getMemory(id, userId) {
      const res = await db.select().from(schema.memories).where(
        (0, import_drizzle_orm2.and)(
          (0, import_drizzle_orm2.eq)(schema.memories.id, id),
          (0, import_drizzle_orm2.eq)(schema.memories.userId, userId)
        )
      ).limit(1);
      return res[0] || null;
    },
    async getMemoriesBySector(sector, userId, limit) {
      const res = await db.select().from(schema.memories).where(
        (0, import_drizzle_orm2.and)(
          (0, import_drizzle_orm2.eq)(schema.memories.userId, userId),
          import_drizzle_orm2.sql`${schema.memories.sectors} ? ${sector}`
        )
      ).limit(limit);
      return res;
    },
    async getMemoriesByUser(userId, limit, offset = 0) {
      const res = await db.select().from(schema.memories).where((0, import_drizzle_orm2.eq)(schema.memories.userId, userId)).orderBy(schema.memories.createdAt).limit(limit).offset(offset);
      return res;
    },
    async deleteMemory(id, userId) {
      await db.delete(schema.memories).where(
        (0, import_drizzle_orm2.and)(
          (0, import_drizzle_orm2.eq)(schema.memories.id, id),
          (0, import_drizzle_orm2.eq)(schema.memories.userId, userId)
        )
      );
    },
    async insertWaypoint(edge) {
      await db.insert(schema.waypoints).values(edge).onConflictDoUpdate({
        target: [schema.waypoints.srcId, schema.waypoints.dstId],
        set: { weight: edge.weight, updatedAt: import_core.clock.now() }
      });
    },
    async getNeighbors(srcId, userId) {
      return await db.select().from(schema.waypoints).where(
        (0, import_drizzle_orm2.and)(
          (0, import_drizzle_orm2.eq)(schema.waypoints.srcId, srcId),
          (0, import_drizzle_orm2.eq)(schema.waypoints.userId, userId)
        )
      );
    },
    async pruneWaypoints(threshold, userId) {
      const res = await db.delete(schema.waypoints).where(
        (0, import_drizzle_orm2.and)(
          (0, import_drizzle_orm2.eq)(schema.waypoints.userId, userId),
          import_drizzle_orm2.sql`${schema.waypoints.weight} < ${threshold}`
        )
      ).returning();
      return res.length;
    },
    async insertFact(fact) {
      await db.insert(schema.facts).values(fact);
    },
    async updateFact(fact) {
      await db.update(schema.facts).set(fact).where(
        (0, import_drizzle_orm2.and)(
          (0, import_drizzle_orm2.eq)(schema.facts.id, fact.id),
          (0, import_drizzle_orm2.eq)(schema.facts.userId, fact.userId)
        )
      );
    },
    async getActiveFact(subject, predicate, userId) {
      const res = await db.select().from(schema.facts).where(
        (0, import_drizzle_orm2.and)(
          (0, import_drizzle_orm2.eq)(schema.facts.userId, userId),
          (0, import_drizzle_orm2.eq)(schema.facts.subject, subject),
          (0, import_drizzle_orm2.eq)(schema.facts.predicate, predicate),
          import_drizzle_orm2.sql`${schema.facts.validTo} IS NULL`
        )
      ).limit(1);
      return res[0] || null;
    },
    async queryFacts(userId, opts) {
      const conditions = [(0, import_drizzle_orm2.eq)(schema.facts.userId, userId)];
      if (opts.subject) conditions.push((0, import_drizzle_orm2.eq)(schema.facts.subject, opts.subject));
      if (opts.predicate) conditions.push((0, import_drizzle_orm2.eq)(schema.facts.predicate, opts.predicate));
      if (opts.at !== void 0) {
        conditions.push(import_drizzle_orm2.sql`${schema.facts.validFrom} <= ${opts.at}`);
        conditions.push(
          (0, import_drizzle_orm2.or)(
            import_drizzle_orm2.sql`${schema.facts.validTo} IS NULL`,
            import_drizzle_orm2.sql`${schema.facts.validTo} > ${opts.at}`
          )
        );
      }
      return await db.select().from(schema.facts).where((0, import_drizzle_orm2.and)(...conditions));
    },
    async invalidateFact(id, userId, atTime) {
      await db.update(schema.facts).set({ validTo: atTime }).where(
        (0, import_drizzle_orm2.and)(
          (0, import_drizzle_orm2.eq)(schema.facts.id, id),
          (0, import_drizzle_orm2.eq)(schema.facts.userId, userId)
        )
      );
    }
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createSchema,
  drizzleStorage,
  facts,
  memories,
  pgvectorSearch,
  vectors,
  waypoints
});
