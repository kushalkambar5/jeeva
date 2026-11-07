import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/jeeva";

// Global client for Next.js / serverless resilience
const globalForDb = globalThis as unknown as {
  sql: ReturnType<typeof postgres> | undefined;
};

export const sqlClient =
  globalForDb.sql ??
  postgres(connectionString, {
    max: 10,
    idle_timeout: 30,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.sql = sqlClient;
}

export const db = drizzle(sqlClient, { schema });

export * from "./schema";
