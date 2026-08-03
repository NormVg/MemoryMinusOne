import { pgTable, text, jsonb, real, integer, bigint, customType, primaryKey } from "drizzle-orm/pg-core";

const vector = customType<{ data: number[]; driverData: string }>({
  dataType() { return 'vector'; },
  toDriver(value: number[]): string { return `[${value.join(',')}]`; },
  fromDriver(value: unknown): number[] {
    if (typeof value === 'string') {
      return value.replace('[', '').replace(']', '').split(',').map(Number);
    }
    return [];
  }
});

export const memories = pgTable("m1_memories", {
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

export const vectors = pgTable("m1_vectors", {
  id: text("id").primaryKey(),
  sector: text("sector").notNull(),
  userId: text("user_id").notNull(),
  vec: vector("vec").notNull(),
  dim: integer("dim").notNull(),
});

export const waypoints = pgTable("m1_waypoints", {
  srcId: text("src_id").primaryKey(),
  dstId: text("dst_id").notNull(),
  userId: text("user_id").notNull(),
  weight: real("weight").notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

export const facts = pgTable("m1_facts", {
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
