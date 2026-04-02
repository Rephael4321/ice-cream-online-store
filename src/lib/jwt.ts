// lib/jwt.ts
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import {
  createPrivilegedSessionRecord,
  generateJwtJti,
  generateSessionKey,
  getActivePrivilegedSession,
  hashSessionToken,
  isRevokedPrivilegedToken,
  SESSION_MAX_AGE_SECONDS,
  type PrivilegedRole,
  type SessionUser,
} from "@/lib/auth/session";
import pool from "@/lib/db";

export type PrivilegedJWTPayload = JWTPayload & {
  role: PrivilegedRole;
  sid: string;
  jti: string;
  type: "access";
  sub: string;
};

export type VerifiedPrivilegedSession = SessionUser & {
  payload: PrivilegedJWTPayload;
};

function getKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Missing JWT_SECRET. Add JWT_SECRET to .env.local");
  return new TextEncoder().encode(secret);
}

function isPrivilegedRole(value: unknown): value is PrivilegedRole {
  return value === "admin" || value === "driver";
}

function normalizePrivilegedPayload(payload: JWTPayload): PrivilegedJWTPayload | null {
  const role = payload.role;
  const sid = payload.sid;
  const jti = payload.jti;
  const sub = payload.sub;
  const type = payload.type;

  if (!isPrivilegedRole(role)) return null;
  if (typeof sid !== "string" || !sid) return null;
  if (typeof jti !== "string" || !jti) return null;
  if (typeof sub !== "string" || !sub) return null;
  if (type !== "access") return null;

  return payload as PrivilegedJWTPayload;
}

export async function createJWT(payload: JWTPayload): Promise<string> {
  const key = getKey();
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_MAX_AGE_SECONDS)
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
  const key = getKey();
  const now = iat ?? Math.floor(Date.now() / 1000);
  return await new SignJWT({ ...payload, iat, exp: payload.exp })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(payload.exp)
    .sign(key);
}

/** JWT only; `sessions` row is created on first successful CMS visit (see verifyPrivilegedSession). */
export async function createPrivilegedAccessToken(params: {
  userId: number;
  role: PrivilegedRole;
}): Promise<string> {
  const key = getKey();
  const sessionKey = generateSessionKey();
  const jwtJti = generateJwtJti();
  const now = Math.floor(Date.now() / 1000);
  const exp = now + SESSION_MAX_AGE_SECONDS;

  const payload: PrivilegedJWTPayload = {
    sub: String(params.userId),
    role: params.role,
    sid: sessionKey,
    jti: jwtJti,
    type: "access",
    iat: now,
    exp,
  };

  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(key);
}

export async function verifyPrivilegedSession(
  token: string
): Promise<VerifiedPrivilegedSession | null> {
  try {
    const payload = await verifyJWT(token);
    const normalized = payload ? normalizePrivilegedPayload(payload) : null;
    if (!normalized) return null;

    const userId = Number(normalized.sub);
    if (!Number.isInteger(userId) || userId <= 0) return null;

    const expSec = normalized.exp;
    if (typeof expSec !== "number" || !Number.isFinite(expSec)) return null;
    if (expSec * 1000 <= Date.now()) return null;

    let session = await getActivePrivilegedSession(token, {
      userId,
      sessionKey: normalized.sid,
      jwtJti: normalized.jti,
    });
    if (session) {
      return { ...session, payload: normalized };
    }

    if (await isRevokedPrivilegedToken(token)) {
      return null;
    }

    try {
      await createPrivilegedSessionRecord(pool, {
        userId,
        sessionKey: normalized.sid,
        jwtJti: normalized.jti,
        sessionTokenHash: hashSessionToken(token),
        expiresAt: new Date(expSec * 1000),
        userAgent: null,
        ipAddress: null,
      });
    } catch (e: unknown) {
      const code =
        typeof e === "object" && e !== null && "code" in e
          ? (e as { code?: string }).code
          : undefined;
      if (code !== "23505") {
        return null;
      }
    }

    session = await getActivePrivilegedSession(token, {
      userId,
      sessionKey: normalized.sid,
      jwtJti: normalized.jti,
    });
    if (!session) return null;

    return { ...session, payload: normalized };
  } catch {
    return null;
  }
}

export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    const key = getKey();
    const { payload } = await jwtVerify(token, key);
    return payload;
  } catch {
    return null;
  }
}
