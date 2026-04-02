/**
 * Generate a privileged CMS login JWT for one of the seeded roles.
 * DB session is created on first visit with ?token= (see verifyPrivilegedSession).
 */

import path from "path";
import { config } from "dotenv";
const dotenvResult = config({ path: path.resolve(process.cwd(), ".env.local") });
import { SignJWT } from "jose";

const DEFAULT_ROLE = "admin";
const DEFAULT_EXPIRY = "14d";
const DEFAULT_PATH = "/cms";
const DEFAULT_PORT = 3000;
const DEFAULT_PROD_SITE_URL = "https://haim-ice-cream.com";

function getKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("Missing JWT_SECRET. Add it to .env.local and run from project root.");
  }
  return new TextEncoder().encode(secret);
}

function parseArgs(): {
  role: "admin" | "driver";
  expiry: string;
  path: string;
  localPort: number;
} {
  const args = process.argv.slice(2);
  const result = {
    role: DEFAULT_ROLE as "admin" | "driver",
    expiry: DEFAULT_EXPIRY,
    path: DEFAULT_PATH,
    localPort: DEFAULT_PORT,
  };

  for (const arg of args) {
    if (arg.startsWith("--role=")) {
      const v = arg.slice(7);
      if (v === "admin" || v === "driver") result.role = v;
    } else if (arg.startsWith("--expiry=")) result.expiry = arg.slice(9);
    else if (arg.startsWith("--path=")) result.path = arg.slice(7) || "/";
    else if (arg.startsWith("--port=")) result.localPort = Number(arg.slice(7)) || DEFAULT_PORT;
    else if (!arg.startsWith("--")) {
      if (result.role === DEFAULT_ROLE && (arg === "admin" || arg === "driver")) {
        result.role = arg;
      } else if (result.expiry === DEFAULT_EXPIRY && /^\d+[dhm]$/i.test(arg)) {
        result.expiry = arg;
      } else if (result.path === DEFAULT_PATH && arg.startsWith("/")) {
        result.path = arg;
      }
    }
  }

  return result;
}

function buildLinks(token: string, path: string, localPort: number) {
  const pathWithSlash = path.startsWith("/") ? path : `/${path}`;
  const query = `?token=${encodeURIComponent(token)}`;
  const local = `http://localhost:${localPort}${pathWithSlash}${query}`;
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  const isLocalhost =
    !configured ||
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(configured);
  const siteUrl = isLocalhost ? DEFAULT_PROD_SITE_URL : configured;
  const prod = `${siteUrl}${pathWithSlash}${query}`;
  return { local, prod };
}

async function createTokenForRole(
  role: "admin" | "driver",
  exp: number,
  deps: {
    pool: typeof import("../src/lib/db").default;
    generateJwtJti: typeof import("../src/lib/auth/session").generateJwtJti;
    generateSessionKey: typeof import("../src/lib/auth/session").generateSessionKey;
  }
): Promise<string> {
  const userResult = await deps.pool.query(`SELECT id, role FROM users WHERE role = $1 LIMIT 1`, [
    role,
  ]);

  if (!userResult.rowCount) {
    throw new Error(`Missing seeded user for role "${role}". Run the migration first.`);
  }

  const userId = Number(userResult.rows[0].id);
  const sessionKey = deps.generateSessionKey();
  const jwtJti = deps.generateJwtJti();
  const now = Math.floor(Date.now() / 1000);

  return await new SignJWT({
    sub: String(userId),
    role,
    sid: sessionKey,
    jti: jwtJti,
    type: "access",
    iat: now,
    exp,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(getKey());
}

async function main() {
  const [{ default: pool }, jwtModule, sessionModule] = await Promise.all([
    import("../src/lib/db"),
    import("../src/lib/jwt"),
    import("../src/lib/auth/session"),
  ]);

  const { role, expiry, path: targetPath, localPort } = parseArgs();
  const exp = jwtModule.parseExpiry(expiry);
  const token = await createTokenForRole(role, exp, {
    pool,
    generateJwtJti: sessionModule.generateJwtJti,
    generateSessionKey: sessionModule.generateSessionKey,
  });
  const { local, prod } = buildLinks(token, targetPath, localPort);

  console.log("\n--- CMS login JWT (session created on first ?token= visit) ---\n");
  console.log("Role:   ", role);
  console.log("Local:  ", local);
  if (prod) console.log("Prod:   ", prod);
  console.log("\nToken:\n");
  console.log(token);
  console.log("\n");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    const { default: pool } = await import("../src/lib/db");
    await pool.end();
  });
