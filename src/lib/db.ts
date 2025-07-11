// lib/db.ts
import { Pool } from "pg";

// Fallbacks to avoid crashing if values are missing
const {
  PG_HOST = "localhost",
  PG_PORT = "5432",
  PG_USER = "postgres",
  PG_PASSWORD = "",
  PG_DATABASE = "postgres",
  PG_USE_SSL = "false",
} = process.env;

const shouldUseSSL = PG_USE_SSL === "true";

const pgPool = new Pool({
  host: PG_HOST,
  port: Number(PG_PORT),
  user: PG_USER,
  password: PG_PASSWORD,
  database: PG_DATABASE,
  ssl: shouldUseSSL ? { rejectUnauthorized: false } : false,
});

// 🛡 SAFETY GUARD — throws if test is connected to dev DB
if (process.env.NODE_ENV === "test" && PG_DATABASE === "neondb") {
  throw new Error(
    "❌ Test environment is connected to the DEV database! Aborting."
  );
}

export default pgPool;
