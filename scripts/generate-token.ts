/**
 * Generate a stateful CMS login token for one of the seeded privileged roles.
 */

import path from "path";
import { config } from "dotenv";
const dotenvResult = config({ path: path.resolve(process.cwd(), ".env.local") });
import { SignJWT } from "jose";

const DEFAULT_ROLE = "admin";
const DEFAULT_EXPIRY = "14d";
const DEFAULT_PATH = "/management-menu";
const DEFAULT_PORT = 3000;

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
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  const prod = siteUrl ? `${siteUrl}${pathWithSlash}${query}` : null;
  return { local, prod };
}

async function createTokenForRole(
  role: "admin" | "driver",
  exp: number,
  deps: {
    pool: typeof import("../src/lib/db").default;
    createPrivilegedSessionRecord: typeof import("../src/lib/auth/session").createPrivilegedSessionRecord;
    generateJwtJti: typeof import("../src/lib/auth/session").generateJwtJti;
    generateSessionKey: typeof import("../src/lib/auth/session").generateSessionKey;
    hashSessionToken: typeof import("../src/lib/auth/session").hashSessionToken;
  }
): Promise<string> {
  const userResult = await deps.pool.query(
    `SELECT id, role FROM users WHERE role = $1 LIMIT 1`,
    [role]
  );

  if (!userResult.rowCount) {
    throw new Error(`Missing seeded user for role "${role}". Run the migration first.`);
  }

  const userId = Number(userResult.rows[0].id);
  const sessionKey = deps.generateSessionKey();
  const jwtJti = deps.generateJwtJti();
  const now = Math.floor(Date.now() / 1000);

  const token = await new SignJWT({
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

  await deps.createPrivilegedSessionRecord(deps.pool, {
    userId,
    sessionKey,
    jwtJti,
    sessionTokenHash: deps.hashSessionToken(token),
    expiresAt: new Date(exp * 1000),
    userAgent: "scripts/generate-token",
    ipAddress: null,
  });

  return token;
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
    createPrivilegedSessionRecord: sessionModule.createPrivilegedSessionRecord,
    generateJwtJti: sessionModule.generateJwtJti,
    generateSessionKey: sessionModule.generateSessionKey,
    hashSessionToken: sessionModule.hashSessionToken,
  });
  const { local, prod } = buildLinks(token, targetPath, localPort);

  console.log("\n--- session-backed CMS token generated ---\n");
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
  