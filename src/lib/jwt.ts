// lib/jwt.ts
import { SignJWT, jwtVerify, type JWTPayload } from "jose";

function isBlockedPrivilegedPayload(payload: JWTPayload): boolean {
  const role = payload.role;
  if (role === "admin" || role === "driver") return true;
  if (payload.admin === true) return true;
  if (payload.id === "admin") return true;
  if (Array.isArray(payload.roles)) {
    return payload.roles.includes("admin") || payload.roles.includes("driver");
  }
  return false;
}

function getKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Missing JWT_SECRET. Add JWT_SECRET to .env.local");
  return new TextEncoder().encode(secret);
}

export async function createJWT(payload: JWTPayload): Promise<string> {
  if (isBlockedPrivilegedPayload(payload)) {
    throw new Error("Privileged JWT issuance is disabled");
  }
  const key = getKey();
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(key);
}

/** Parse expiry string (e.g. "14d", "8h") to seconds from now. */
export function parseExpiry(expiry: string): number {
  const match = expiry.trim().match(/^(\d+)(d|h|m)$/i);
  if (!match) throw new Error(`Invalid expiry "${expiry}". Use e.g. 14d, 8h, 30m.`);
  const [, num, unit] = match;
  const n = Number(num);
  if (!Number.isFinite(n) || n <= 0) throw new Error(`Invalid expiry number: ${num}`);
  const multipliers: Record<string, number> = { d: 86400, h: 3600, m: 60 };
  const seconds = n * (multipliers[unit.toLowerCase()] ?? 60);
  return Math.floor(Date.now() / 1000) + seconds;
}

/** Create a JWT with custom payload and expiry (exp in seconds). */
export async function createJWTWithExpiry(
  payload: Omit<JWTPayload, "iat" | "exp"> & { exp: number },
  iat?: number
): Promise<string> {
  if (isBlockedPrivilegedPayload(payload)) {
    throw new Error("Privileged JWT issuance is disabled");
  }
  const key = getKey();
  const now = iat ?? Math.floor(Date.now() / 1000);
  return await new SignJWT({ ...payload, iat, exp: payload.exp })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(payload.exp)
    .sign(key);
}

export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    const key = getKey();
    const { payload } = await jwtVerify(token, key);
    if (isBlockedPrivilegedPayload(payload)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
