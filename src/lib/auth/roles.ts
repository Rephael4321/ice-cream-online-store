/**
 * Privileged CMS roles (JWT + users.role). Client-safe — no DB imports.
 */
export const ADMIN_EQUIVALENT_ROLES = ["admin", "superuser"] as const;
export type AdminEquivalentRole = (typeof ADMIN_EQUIVALENT_ROLES)[number];
export type PrivilegedRole = AdminEquivalentRole | "driver";

export function isAdminEquivalentRole(
  role: string | null | undefined
): boolean {
  return role === "admin" || role === "superuser";
}

/** Parse role from a JWT payload (privileged roles + legacy admin markers). */
export function extractPrivilegedRoleFromPayload(
  payload: unknown
): PrivilegedRole | undefined {
  const p = payload as Record<string, unknown> | null | undefined;
  if (!p) return undefined;
  const r = p.role;
  if (r === "admin" || r === "superuser" || r === "driver") {
    return r as PrivilegedRole;
  }
  if (p.admin === true || p.id === "admin") return "admin";
  return undefined;
}
