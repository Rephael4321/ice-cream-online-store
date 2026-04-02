import { createHash, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import pool from "@/lib/db";

export type PrivilegedRole = "admin" | "driver";

export type SessionUser = {
  userId: number;
  role: PrivilegedRole;
  sessionId: number;
  sessionKey: string;
  jwtJti: string;
  expiresAt: Date;
};

export const AUTH_COOKIE_NAME = "token";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

type Queryable = Pick<PoolClient, "query">;

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateSessionKey(): string {
  return randomUUID();
}

export function generateJwtJti(): string {
  return randomUUID();
}

export function getSessionCookieOptions(isSecure: boolean) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isSecure,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

export async function createPrivilegedSessionRecord(
  db: Queryable,
  params: {
    userId: number;
    sessionKey: string;
    jwtJti: string;
    sessionTokenHash: string;
    expiresAt: Date;
    userAgent: string | null;
    ipAddress: string | null;
  }
): Promise<number> {
  const result = await db.query(
    `
      INSERT INTO sessions (
        user_id,
        session_key,
        session_token_hash,
        jwt_jti,
        expires_at,
        last_seen_at,
        user_agent,
        ip_address
      )
      VALUES ($1, $2, $3, $4, $5, now(), $6, $7)
      RETURNING id
    `,
    [
      params.userId,
      params.sessionKey,
      params.sessionTokenHash,
      params.jwtJti,
      params.expiresAt,
      params.userAgent,
      params.ipAddress,
    ]
  );

  return Number(result.rows[0]?.id);
}

export async function getActivePrivilegedSession(
  token: string,
  params: {
    userId: number;
    sessionKey: string;
    jwtJti: string;
  }
): Promise<SessionUser | null> {
  const tokenHash = hashSessionToken(token);
  const result = await pool.query(
    `
      SELECT
        s.id,
        s.session_key,
        s.jwt_jti,
        s.expires_at,
        u.id AS user_id,
        u.role
      FROM sessions s
      INNER JOIN users u ON u.id = s.user_id
      WHERE s.user_id = $1
        AND s.session_key = $2
        AND s.jwt_jti = $3
        AND s.session_token_hash = $4
        AND s.revoked_at IS NULL
        AND s.expires_at > now()
      LIMIT 1
    `,
    [params.userId, params.sessionKey, params.jwtJti, tokenHash]
  );

  if (!result.rowCount) {
    return null;
  }
  const row = result.rows[0];

  return {
    userId: Number(row.user_id),
    role: row.role as PrivilegedRole,
    sessionId: Number(row.id),
    sessionKey: String(row.session_key),
    jwtJti: String(row.jwt_jti),
    expiresAt: new Date(row.expires_at),
  };
}

/** Same bearer was logged out; blocks re-bootstrap with that JWT until a new token is minted. */
export async function isRevokedPrivilegedToken(token: string): Promise<boolean> {
  const tokenHash = hashSessionToken(token);
  const result = await pool.query(
    `
      SELECT 1
      FROM sessions
      WHERE session_token_hash = $1
        AND revoked_at IS NOT NULL
      LIMIT 1
    `,
    [tokenHash]
  );
  return Boolean(result.rowCount);
}

export async function revokeSessionByToken(token: string): Promise<void> {
  const tokenHash = hashSessionToken(token);
  await pool.query(
    `
      UPDATE sessions
      SET revoked_at = COALESCE(revoked_at, now()),
          revoked_reason = COALESCE(revoked_reason, 'logout'),
          updated_at = now()
      WHERE session_token_hash = $1
        AND revoked_at IS NULL
    `,
    [tokenHash]
  );
}

export async function revokeAllSessionsForUser(userId: number): Promise<void> {
  await pool.query(
    `
      UPDATE sessions
      SET revoked_at = COALESCE(revoked_at, now()),
          revoked_reason = COALESCE(revoked_reason, 'logout_all'),
          updated_at = now()
      WHERE user_id = $1
        AND revoked_at IS NULL
    `,
    [userId]
  );
}
