// lib/jwt.ts
import { SignJWT, jwtVerify, type JWTPayload } from "jose";

function getKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Missing JWT_SECRET. Add JWT_SECRET to .env.local");
  return new TextEncoder().encode(secret);
}

export async function createJWT(payload: JWTPayload): Promise<string> {
  const key = getKey();
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(key);
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
