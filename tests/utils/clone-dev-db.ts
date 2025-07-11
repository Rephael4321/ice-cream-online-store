import { config } from "dotenv";
import path from "path";
import { execSync } from "child_process";

// ✅ Load .env.dev first (for dev DB)
console.log("📥 Loading .env.dev...");
config({ path: path.resolve(__dirname, "../.env.dev") });
const dev: {
  host: string;
  port: string;
  user: string;
  password: string;
  db: string;
} = {
  host: process.env.PG_HOST!,
  port: process.env.PG_PORT!,
  user: process.env.PG_USER!,
  password: process.env.PG_PASSWORD!,
  db: process.env.PG_DATABASE!,
};
console.log("🔍 DEV DB CONFIG", dev);

// ✅ Then load .env.test (for test DB)
console.log("📥 Loading .env.test...");
config({ path: path.resolve(__dirname, "../.env.test"), override: true });
const test: typeof dev = {
  host: process.env.PG_HOST!,
  port: process.env.PG_PORT!,
  user: process.env.PG_USER!,
  password: process.env.PG_PASSWORD!,
  db: process.env.PG_DATABASE!,
};
console.log("🧪 TEST DB CONFIG", test);

function assertSafeToClone() {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("❌ NODE_ENV must be 'test' to run clone safely.");
  }

  if (!test.db.toLowerCase().includes("test")) {
    throw new Error(
      `❌ Aborting: Test DB name must include 'test'. Got: ${test.db}`
    );
  }
}

export async function cloneDevDbToTestDb() {
  assertSafeToClone();

  console.log("⏳ Dumping and restoring full schema + data...");

  const dumpCmd = `pg_dump -h ${dev.host} -p ${dev.port} -U ${dev.user} -d ${dev.db} --no-owner --no-privileges --clean`;
  const restoreCmd = `psql -h ${test.host} -p ${test.port} -U ${test.user} -d ${test.db}`;

  try {
    const dump = execSync(dumpCmd, {
      encoding: "utf-8",
      env: {
        ...process.env,
        PGPASSWORD: dev.password,
      },
    });

    execSync(restoreCmd, {
      input: dump,
      stdio: ["pipe", "inherit", "inherit"],
      env: {
        ...process.env,
        PGPASSWORD: test.password,
      },
    });

    console.log("✅ Dev DB successfully cloned to test DB.");
  } catch (err) {
    console.error("❌ Clone failed:", err);
  }
}

// ✅ Auto-run if invoked directly
if (require.main === module) {
  cloneDevDbToTestDb();
}
