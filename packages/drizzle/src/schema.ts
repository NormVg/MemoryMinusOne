import { pgTableCreator, text, jsonb, real, integer, bigint, customType } from "drizzle-orm/pg-core";

// Custom type for pgvector if needed, or just use the generic customType
const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector';
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`;
  },
  fromDriver(value: unknown): number[] {
    if (typeof value === 'string') {
      return value.replace('[', '').replace(']', '').split(',').map(Number);
    }
    return [];
  }
});

/**
 * Creates the schema with a specific prefix.
 * Default prefix is 'm1_' to avoid conflicts in user DBs.
 */
export function createSchema(prefix: string = "m1_") {
  const pgTable = pgTableCreator((name) => `${prefix}${name}`);

  const memories = pgTable("memories", {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    content: text("content").notNull(),
    primarySector: text("primary_sector").notNull(),
    sectors: jsonb("sectors").$type<string[]>().notNull(),
    tags: jsonb("tags").$type<string[]>().default([]),
    metadata: jsonb("metadata").default({}),
    simhash: text("simhash"),
    salience: real("salience").default(1.0).notNull(),
    decayLambda: real("decay_lambda").notNull(),
    version: integer("version").default(1).notNull(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
    lastSeenAt: bigint("last_seen_at", { mode: "number" }).notNull(),
  });

  const vectors = pgTable("vectors", {
    id: text("id").notNull(),
    sector: text("sector").notNull(),
    userId: text("user_id").notNull(),
    vec: vector("vec").notNull(),
    dim: integer("dim").notNull(),
  }, (table) => {
    return {
      // Primary key on (id, sector)
      pk: {
        columns: [table.id, table.sector],
      }
    };
  });

  const waypoints = pgTable("waypoints", {
    srcId: text("src_id").notNull(),
    dstId: text("dst_id").notNull(),
    userId: text("user_id").notNull(),
    weight: real("weight").notNull(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  }, (table) => {
    return {
      pk: {
        columns: [table.srcId, table.dstId],
      }
    };
  });

  const facts = pgTable("facts", {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    subject: text("subject").notNull(),
    predicate: text("predicate").notNull(),
    object: text("object").notNull(),
    validFrom: bigint("valid_from", { mode: "number" }).notNull(),
    validTo: bigint("valid_to", { mode: "number" }),
    confidence: real("confidence").notNull(),
    metadata: jsonb("metadata").default({}),
  });

  return {
    memories,
    vectors,
    waypoints,
    facts,
  };
}

export type MemorySchema = ReturnType<typeof createSchema>;
const tables = createSchema("m1_");
export const memories = tables.memories;
export const vectors = tables.vectors;
export const waypoints = tables.waypoints;
export const facts = tables.facts;
