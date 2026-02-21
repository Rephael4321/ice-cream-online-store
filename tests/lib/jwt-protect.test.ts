import { NextRequest } from "next/server";
import { protectAPI } from "@/lib/api/jwt-protect";
import { createJWT } from "@/lib/jwt";

function createMockRequest(
  method: string,
  token?: string
): NextRequest {
  const cookies = token
    ? { get: (name: string) => (name === "token" ? { value: token } : undefined) }
    : { get: () => undefined };
  return {
    method,
    cookies,
  } as unknown as NextRequest;
}

describe("protectAPI", () => {
  it("allows GET without token (returns null)", async () => {
    const req = createMockRequest("GET");
    const result = await protectAPI(req);
    expect(result).toBeNull();
  });

  it("returns 401 for POST without token", async () => {
    const req = createMockRequest("POST");
    const result = await protectAPI(req);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(401);
    const json = await result!.json();
    expect(json.error).toContain("Missing token");
  });

  it("returns 401 for POST with invalid token", async () => {
    const req = createMockRequest("POST", "invalid.jwt");
    const result = await protectAPI(req);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(401);
    const json = await result!.json();
    expect(json.error).toBeDefined();
  });

  it("allows POST with valid admin token (returns null)", async () => {
    const token = await createJWT({ role: "admin", id: "admin" });
    const req = createMockRequest("POST", token);
    const result = await protectAPI(req);
    expect(result).toBeNull();
  });

  it("allows POST with back-compat admin token (admin: true)", async () => {
    const token = await createJWT({ admin: true, id: "1" });
    const req = createMockRequest("POST", token);
    const result = await protectAPI(req);
    expect(result).toBeNull();
  });

  it("returns 403 for POST with client token on admin-only route", async () => {
    const token = await createJWT({ role: "client", id: "user1" });
    const req = createMockRequest("POST", token);
    const result = await protectAPI(req);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
    const json = await result!.json();
    expect(json.error).toContain("Forbidden");
  });
});
