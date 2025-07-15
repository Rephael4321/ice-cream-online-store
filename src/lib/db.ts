// src/lib/db.ts
import { Pool } from "pg";

// Load and validate required environment variables
const {
  PG_HOST,
  PG_PORT,
  PG_USER,
  PG_PASSWORD,
  PG_DATABASE,
  PG_USE_SSL,
  NODE_ENV,
} = process.env;

if (!PG_HOST || !PG_PORT || !PG_USER || !PG_PASSWORD || !PG_DATABASE) {
  throw new Error(
    "❌ Missing one or more required PostgreSQL environment variables."
  );
}

// Optional SSL (e.g., for Neon)
const shouldUseSSL = PG_USE_SSL === "true";

// Debug info (optional)
console.log("🔐 Connecting to PostgreSQL with:");
console.log(`   Host:     ${PG_HOST}`);
console.log(`   Port:     ${PG_PORT}`);
console.log(`   User:     ${PG_USER}`);
console.log(`   Database: ${PG_DATABASE}`);
console.log(`   SSL:      ${shouldUseSSL}`);

// Prevent accidental writes to dev DB during test runs
if (NODE_ENV === "test" && PG_DATABASE === "neondb") {
  throw new Error(
    "❌ Test environment is connected to the DEV database! Aborting."
  );
}

const pool = new Pool({
  host: PG_HOST,
  port: Number(PG_PORT),
  user: PG_USER,
  password: PG_PASSWORD,
  database: PG_DATABASE,
  ssl: shouldUseSSL ? { rejectUnauthorized: false } : false,
});

export default pool;
