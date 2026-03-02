// src/lib/db.ts
import { Pool } from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
const NODE_ENV = process.env.NODE_ENV;

if (!DATABASE_URL) {
  throw new Error(
    "❌ Missing DATABASE_URL. Set it to your PostgreSQL connection string (e.g. postgresql://user:password@host:port/database)."
  );
}

// Prevent accidental writes to dev DB during test runs
try {
  const url = new URL(DATABASE_URL);
  const dbName = url.pathname?.replace(/^\//, "") || "";
  if (NODE_ENV === "test" && dbName === "neondb") {
    throw new Error(
      "❌ Test environment is connected to the DEV database! Aborting."
    );
  }
} catch (err) {
  if (err instanceof Error && err.message.includes("DEV database")) throw err;
  // URL parse failed; skip test guard
}

const pool = new Pool({
  connectionString: DATABASE_URL,
});

export default pool;
