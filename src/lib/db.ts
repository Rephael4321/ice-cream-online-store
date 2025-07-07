// lib/pg-db.neon.ts
import { Pool } from "pg";

const shouldUseSSL = process.env.PG_USE_SSL === "true";

const pgPool = new Pool({
  host: process.env.PG_HOST,
  port: Number(process.env.PG_PORT),
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
  ssl: shouldUseSSL ? { rejectUnauthorized: false } : false,
});

export default pgPool;
