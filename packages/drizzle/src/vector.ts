import { IVectorPlugin, PluginContext } from "@memory-minus-one/core";
import { createSchema } from "./schema";
import { eq, and, sql } from "drizzle-orm";

export interface PgvectorSearchOptions {
  db: any;
  tablePrefix?: string;
}

export function pgvectorSearch(options: PgvectorSearchOptions): IVectorPlugin {
  const prefix = options.tablePrefix ?? "m1_";
  const schema = createSchema(prefix);
  const db = options.db;

  return {
    name: "pgvector",
    version: "1.0.0",

    async init(ctx: PluginContext) {
      ctx.logger.debug("pgvector", `Initialized with prefix '${prefix}'`);
    },

    async storeVector(id: string, sector: string, userId: string, vector: number[], dim: number) {
      await db.insert(schema.vectors).values({
        id,
        sector,
        userId,
        vec: vector,
        dim
      }).onConflictDoUpdate({
        target: [schema.vectors.id, schema.vectors.sector],
        set: { vec: vector }
      });
    },

    async search(vector: number[], sector: string, userId: string, limit: number) {
      // Use pgvector cosine distance operator <=>
      const vecString = `[${vector.join(',')}]`;
      
      const res = await db
        .select({
          id: schema.vectors.id,
          // Convert distance to similarity: similarity = 1 - distance
          score: sql<number>`1 - (${schema.vectors.vec} <=> ${vecString}::vector)`
        })
        .from(schema.vectors)
        .where(
          and(
            eq(schema.vectors.sector, sector),
            eq(schema.vectors.userId, userId)
          )
        )
        .orderBy(sql`${schema.vectors.vec} <=> ${vecString}::vector`)
        .limit(limit);

      return res;
    },

    async getVectorsForId(id: string, userId: string) {
      const res = await db
        .select({
          sector: schema.vectors.sector,
          vector: schema.vectors.vec,
          dim: schema.vectors.dim
        })
        .from(schema.vectors)
        .where(
          and(
            eq(schema.vectors.id, id),
            eq(schema.vectors.userId, userId)
          )
        );
      return res;
    },

    async deleteVector(id: string, sector: string, userId: string) {
      await db
        .delete(schema.vectors)
        .where(
          and(
            eq(schema.vectors.id, id),
            eq(schema.vectors.sector, sector),
            eq(schema.vectors.userId, userId)
          )
        );
    }
  };
}
