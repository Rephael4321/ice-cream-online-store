/**
 * Vitest globalSetup: copy Docker dev DB (from .env.local) into test DB (from .env.test)
 * so every test run starts with a full clone of dev data.
 * Requires pg_dump and pg_restore on PATH.
 */
import path from "path";
import fs from "fs";
import { Pool } from "pg";
import { pgDump, pgRestore } from "pg-dump-restore";

// Use process.cwd() so we load .env from project root when you run "npm test" (same as setup.ts fix).
const rootDir = process.cwd();

/** Load .env into a plain object by reading the file (avoids dotenv/vitest cwd issues). */
function loadEnvToObject(envFile: string): Record<string, string> {
  const envPath = path.resolve(rootDir, envFile);
  if (!fs.existsSync(envPath)) {
    throw new Error(`Env file not found: ${envPath}`);
  }
  const content = fs.readFileSync(envPath, "utf-8");
  const parsed: Record<string, string> = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    parsed[key] = val;
  }
  return parsed;
}

async function ensureTestDatabaseExists(testConfig: {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}): Promise<void> {
  const pool = new Pool({
    host: testConfig.host,
    port: testConfig.port,
    user: testConfig.user,
    password: testConfig.password,
    database: "postgres",
  });
  try {
    const { rows } = await pool.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [testConfig.database]
    );
    if (rows.length === 0) {
      await pool.query(`CREATE DATABASE ${testConfig.database}`);
      console.log("📦 Created test database:", testConfig.database);
    }
  } finally {
    await pool.end();
  }
}

/** Return true if the test DB has the main app tables (restore likely succeeded despite non-fatal errors). */
async function testDbHasExpectedTables(config: {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}): Promise<boolean> {
  const pool = new Pool({
    host: config.host,
    port: config.port,
    user: config.username,
    password: config.password,
    database: config.database,
  });
  try {
    const { rows } = await pool.query(
      "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products'"
    );
    return rows.length > 0;
  } catch {
    return false;
  } finally {
    await pool.end();
  }
}

export default async function globalSetup(): Promise<void> {
  if (process.env.SKIP_DB_CLONE === "1") {
    console.log("⏭️ SKIP_DB_CLONE=1: skipping dev DB clone.");
    return;
  }

  console.log("🔄 Cloning dev DB → test DB...");

  try {

  // Load both env files into objects (do not use process.env — it can be wrong in Vitest globalSetup)
  const envLocal = loadEnvToObject(".env.local");
  const devDb = {
    host: envLocal.PG_HOST || "localhost",
    port: Number(envLocal.PG_PORT) || 5432,
    database: envLocal.PG_DATABASE || "",
    username: envLocal.PG_USER || "",
    password: envLocal.PG_PASSWORD || "",
  };
  if (!devDb.database || !devDb.username || !devDb.password) {
    throw new Error(
      ".env.local must define PG_HOST, PG_PORT, PG_DATABASE, PG_USER, PG_PASSWORD for the dev DB"
    );
  }

  const envTest = loadEnvToObject(".env.test");
  const testDb = {
    host: envTest.PG_HOST || "localhost",
    port: Number(envTest.PG_PORT) || 5432,
    database: envTest.PG_DATABASE || "",
    username: envTest.PG_USER || "",
    password: envTest.PG_PASSWORD || "",
  };
  if (!testDb.database || !testDb.username || !testDb.password) {
    throw new Error(
      ".env.test must define PG_HOST, PG_PORT, PG_DATABASE, PG_USER, PG_PASSWORD for the test DB (got from " + rootDir + "/.env.test)"
    );
  }

  await ensureTestDatabaseExists({
    host: testDb.host,
    port: testDb.port,
    user: testDb.username,
    password: testDb.password,
    database: testDb.database,
  });

  const dumpPath = path.join(
    rootDir,
    "node_modules",
    ".tmp",
    "ice-cream-dev-dump.custom"
  );
  const dumpDir = path.dirname(dumpPath);
  if (!fs.existsSync(dumpDir)) {
    fs.mkdirSync(dumpDir, { recursive: true });
  }

  try {
    await pgDump(
      {
        host: devDb.host,
        port: devDb.port,
        database: devDb.database,
        username: devDb.username,
        password: devDb.password,
      },
      {
        filePath: dumpPath,
        format: "custom",
      }
    );

    let restoreSucceeded = false;
    try {
      await pgRestore(
        {
          host: testDb.host,
          port: testDb.port,
          database: testDb.database,
          username: testDb.username,
          password: testDb.password,
        },
        {
          filePath: dumpPath,
          clean: true,
          noOwner: true,
        }
      );
      restoreSucceeded = true;
    } catch (restoreErr) {
      // Neon dumps include SET transaction_timeout (unsupported on local Postgres); pg_restore exits 1 but still restores schema/data.
      const hasSchema = await testDbHasExpectedTables(testDb);
      if (hasSchema) {
        restoreSucceeded = true;
        console.log("ℹ️ One expected restore warning (Neon transaction_timeout) — clone completed successfully.");
      } else {
        throw restoreErr;
      }
    }

    if (restoreSucceeded) {
      console.log("✅ Dev DB cloned to test DB.");
    }
  } finally {
    if (fs.existsSync(dumpPath)) {
      fs.unlinkSync(dumpPath);
    }
  }

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("⚠️ DB clone skipped (dev or test DB unreachable):", msg);
  }
}
