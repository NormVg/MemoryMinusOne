import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { drizzleStorage, pgvectorSearch } from "../packages/drizzle/src/index";
import * as schema from "./schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });

// Initialize our plugins
export const storage = drizzleStorage({ db });
export const vector = pgvectorSearch({ db });
