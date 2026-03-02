/**
 * Generate a JWT for CMS login. Not exposed as an API — run locally:
 *   npx tsx src/scripts/generate-token.ts [role] [expiry] [path]
 *   npx tsx src/scripts/generate-token.ts --role=driver --expiry=8h --path=/orders --port=3000
 *
 * Loads .env.local for JWT_SECRET and NEXT_PUBLIC_SITE_URL.
 */

import path from "path";
import { config } from "dotenv";
import { createJWTWithExpiry, parseExpiry } from "../lib/jwt";

// Load .env.local from project root
config({ path: path.resolve(process.cwd(), ".env.local") });

const DEFAULT_ROLE = "admin";
const DEFAULT_EXPIRY = "14d";
const DEFAULT_PATH = "/management-menu";
const DEFAULT_PORT = 3000;

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

function buildLinks(token: string, path: string, localPort: number): {
  local: string;
  prod: string | null;
  cookieHeader: string;
  consoleCommand: string;
} {
  const pathWithSlash = path.startsWith("/") ? path : `/${path}`;
  const query = `?token=${encodeURIComponent(token)}`;
  const local = `http://localhost:${localPort}${pathWithSlash}${query}`;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  const prod = siteUrl ? `${siteUrl}${pathWithSlash}${query}` : null;
  const cookieHeader = `Cookie: token=${token}`;
  const consoleCommand = `document.cookie = "token=${token}; path=/; max-age=${14 * 86400}; SameSite=Lax";`;
  return { local, prod, cookieHeader, consoleCommand };
}

async function main(): Promise<void> {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("❌ Missing JWT_SECRET. Add it to .env.local and run from project root.");
    process.exit(1);
  }

  const { role, expiry, path: targetPath, localPort } = parseArgs();
  const exp = parseExpiry(expiry);
  const iat = Math.floor(Date.now() / 1000);

  const payload: Record<string, unknown> = {
    role,
    ...(role === "admin" && { id: "admin" }),
    exp,
  };

  const token = await createJWTWithExpiry(
    payload as { role: string; id?: string; exp: number },
    iat
  );

  const { local, prod, cookieHeader, consoleCommand } = buildLinks(token, targetPath, localPort);

  const expiresAt = new Date(exp * 1000).toISOString();
  const issuedAt = new Date(iat * 1000).toISOString();

  console.log("\n--- JWT generated ---\n");
  console.log("Role:    ", role);
  console.log("Issued:  ", issuedAt);
  console.log("Expires: ", expiresAt);
  console.log("\nToken (copy):\n");
  console.log(token);
  console.log("\n--- Quick links ---\n");
  console.log("Local:   ", local);
  if (prod) console.log("Prod:    ", prod);
  console.log("\n--- Cookie (browser) ---\n");
  console.log("Header:  ", cookieHeader);
  console.log("\nConsole (paste in browser DevTools):\n");
  console.log(consoleCommand);
  console.log("\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
