import "server-only";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../../scripts/db/schema";
import { localDatabase } from "./config";

export const pool = new Pool({
  ...localDatabase(),
  max: 5,
  connectionTimeoutMillis: 5000,
  statement_timeout: 10000,
  idleTimeoutMillis: 10000,
});
pool.on("error", () => {
  console.error(JSON.stringify({ operation: "database-pool", outcome: "failed", errorClass: "database-connection", correlationId: crypto.randomUUID() }));
});

export const db = drizzle(pool, { schema });
