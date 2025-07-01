import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

export function createJWT(payload: Record<string, any>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "4h" }) as string;
}

export function verifyJWT(token: string): Record<string, any> | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return typeof decoded === "string" ? null : decoded;
  } catch {
    return null;
  }
}
