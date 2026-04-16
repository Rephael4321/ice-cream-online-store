import { describe, expect, it } from "vitest";
import {
  extractPrivilegedRoleFromPayload,
  isAdminEquivalentRole,
} from "@/lib/auth/roles";

describe("isAdminEquivalentRole", () => {
  it("is true for admin and superuser", () => {
    expect(isAdminEquivalentRole("admin")).toBe(true);
    expect(isAdminEquivalentRole("superuser")).toBe(true);
  });

  it("is false for driver and unknown", () => {
    expect(isAdminEquivalentRole("driver")).toBe(false);
    expect(isAdminEquivalentRole("")).toBe(false);
    expect(isAdminEquivalentRole(undefined)).toBe(false);
  });
});

describe("extractPrivilegedRoleFromPayload", () => {
  it("extracts superuser and legacy admin", () => {
    expect(extractPrivilegedRoleFromPayload({ role: "superuser" })).toBe(
      "superuser"
    );
    expect(extractPrivilegedRoleFromPayload({ admin: true, id: "1" })).toBe(
      "admin"
    );
  });
});
