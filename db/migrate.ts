import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/jeeva";

const sql = postgres(connectionString, {
  max: 10,
  idle_timeout: 30,
  connect_timeout: 30,
});
const db = drizzle(sql);

async function run() {
  console.log("Applying database migrations...");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrations completed successfully!");
  await sql.end();
}

run().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
