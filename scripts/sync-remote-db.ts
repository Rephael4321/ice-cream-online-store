import fs from "fs";
import os from "os";
import path from "path";
import { spawn } from "child_process";
import { Pool } from "pg";
import { createInterface } from "readline/promises";
import { stdin as input, stdout as output } from "process";
import { config } from "dotenv";
import { exportDbSchemaToDocs } from "./export-db-schema";

config({ path: path.resolve(process.cwd(), ".env.local") });

type DbIdentity = {
  database: string;
  user: string;
  host: string | null;
  port: number | null;
};

function cleanInput(str: string): string {
  return str
    .trim()
    .replace(/^DATABASE_URL\s*=\s*/i, "")
    .replace(/^["'](.+)["']$/, "$1")
    .trim();
}

function redactUrl(url: string): string {
  return cleanInput(url).replace(/:\/\/([^:]+):([^@]+)@/, "://$1:****@");
}

function isSpawnNotFoundError(err: unknown): boolean {
  return (
    err instanceof Error &&
    ("code" in err ? String((err as NodeJS.ErrnoException).code) === "ENOENT" : false)
  );
}

function adaptConnectionStringForDocker(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1" || parsed.hostname === "::1") {
      parsed.hostname = "host.docker.internal";
    }
    return parsed.toString();
  } catch {
    return url
      .replace("@localhost:", "@host.docker.internal:")
      .replace("@127.0.0.1:", "@host.docker.internal:");
  }
}

async function runCommand(command: string, args: string[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
    });

    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });

    child.on("error", (err) => {
      reject(err);
    });

    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} failed with exit code ${code}. ${stderr.trim()}`));
    });
  });
}

async function runDockerPgDump(remoteUrl: string, dumpPath: string): Promise<string> {
  const absoluteDumpPath = path.resolve(dumpPath);
  const hostDumpDir = path.dirname(absoluteDumpPath);
  const dumpFileName = path.basename(absoluteDumpPath);
  const containerDumpPath = `/work/${dumpFileName}`;
  const candidateImages = ["postgres:17", "postgres:16"];
  let lastError: unknown;
  for (const image of candidateImages) {
    try {
      await runCommand("docker", [
        "run",
        "--rm",
        "--mount",
        `type=bind,source=${hostDumpDir},target=/work`,
        image,
        "pg_dump",
        "--format=custom",
        `--file=${containerDumpPath}`,
        remoteUrl,
      ]);
      return image;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function runDockerPgRestore(localUrl: string, dumpPath: string, image: string): Promise<void> {
  const absoluteDumpPath = path.resolve(dumpPath);
  const hostDumpDir = path.dirname(absoluteDumpPath);
  const dumpFileName = path.basename(absoluteDumpPath);
  const containerDumpPath = `/work/${dumpFileName}`;
  const dockerLocalUrl = adaptConnectionStringForDocker(localUrl);
  await runCommand("docker", [
    "run",
    "--rm",
    "--mount",
    `type=bind,source=${hostDumpDir},target=/work,readonly`,
    image,
    "pg_restore",
    "--clean",
    "--no-owner",
    "--no-acl",
    "--dbname",
    dockerLocalUrl,
    containerDumpPath,
  ]);
}

async function cleanupDumpFile(dumpPath: string): Promise<void> {
  if (!fs.existsSync(dumpPath)) return;

  // Docker clients on Windows can briefly hold file handles after process exit.
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      fs.rmSync(dumpPath, { force: true });
      return;
    } catch (err) {
      if (attempt === 5) {
        console.warn(`Warning: could not delete temp dump file: ${dumpPath}`);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 150 * attempt));
    }
  }
}

async function getDbIdentity(connectionString: string): Promise<DbIdentity> {
  const pool = new Pool({ connectionString });
  try {
    const result = await pool.query<DbIdentity>(
      `select current_database() as database, current_user as "user", inet_server_addr()::text as host, inet_server_port() as port`
    );
    const row = result.rows[0];
    if (!row) throw new Error("Could not fetch DB identity.");
    return row;
  } finally {
    await pool.end();
  }
}

async function main(): Promise<void> {
  const localUrlRaw = process.env.DATABASE_URL;
  if (!localUrlRaw) throw new Error("Missing DATABASE_URL in .env.local");
  const localUrl = cleanInput(localUrlRaw);

  const rl = createInterface({ input, output });
  let remoteUrl = "";
  try {
    remoteUrl = cleanInput(await rl.question("Remote DATABASE_URL: "));
  } finally {
    rl.close();
  }
  if (!remoteUrl) throw new Error("No remote URL provided.");

  const localIdentity = await getDbIdentity(localUrl);
  const remoteIdentity = await getDbIdentity(remoteUrl);

  const sameTarget =
    localIdentity.database === remoteIdentity.database &&
    localIdentity.host === remoteIdentity.host &&
    localIdentity.port === remoteIdentity.port &&
    localIdentity.user === remoteIdentity.user;
  if (sameTarget) {
    throw new Error("Source and target appear to be the same database. Aborting.");
  }

  console.log("\n--- Sync Plan ---");
  console.log(`Source: ${redactUrl(remoteUrl)}`);
  console.log(`Target: ${redactUrl(localUrl)}`);
  console.log("-----------------\n");

  const confirmRl = createInterface({ input, output });
  try {
    const answer = (await confirmRl.question("Confirm overwrite of local DB? (y/n): ")).trim().toLowerCase();
    if (answer !== "y" && answer !== "yes") {
      console.log("Aborted by user.");
      return;
    }
  } finally {
    confirmRl.close();
  }

  const dumpPath = path.join(os.tmpdir(), `remote-sync-${Date.now()}-${process.pid}.dump`);

  try {
    console.log("Step 1/2: Dumping remote database...");
    let usingDockerClient = false;
    let dockerClientImage = "postgres:17";
    try {
      await runCommand("pg_dump", ["--format=custom", "--file", dumpPath, remoteUrl]);
    } catch (err) {
      if (!isSpawnNotFoundError(err)) throw err;
      usingDockerClient = true;
      console.log("Local pg_dump not found. Falling back to Docker postgres client...");
      dockerClientImage = await runDockerPgDump(remoteUrl, dumpPath);
    }

    console.log("Step 2/2: Restoring to local database...");
    try {
      await runCommand("pg_restore", ["--clean", "--no-owner", "--no-acl", "--dbname", localUrl, dumpPath]);
    } catch (err) {
      if (!isSpawnNotFoundError(err)) throw err;
      if (!usingDockerClient) {
        console.log("Local pg_restore not found. Falling back to Docker postgres client...");
      }
      await runDockerPgRestore(localUrl, dumpPath, dockerClientImage);
    }

    console.log("Step 3/3: Exporting schema to docs/db-schema.txt...");
    await exportDbSchemaToDocs(localUrl);

    console.log("\nSuccess! Database sync complete and schema docs updated.");
  } finally {
    await cleanupDumpFile(dumpPath);
  }
}

main().catch((err) => {
  console.error(`\n[Error]: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
