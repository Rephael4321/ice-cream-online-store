import { POST } from "@/app/api/auth/verify/route";
import { createJWT } from "@/lib/jwt";
import { NextRequest } from "next/server";

function createRequest(body: unknown): NextRequest {
  return new Request("http://localhost/api/auth/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

describe("POST /api/auth/verify", () => {
  it("returns 400 when token is missing", async () => {
    const res = await POST(createRequest({}));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Token");
  });

  it("returns 401 for invalid token", async () => {
    const res = await POST(createRequest({ token: "invalid.jwt.here" }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  it("returns 200 with valid: true and payload for valid token", async () => {
    const token = await createJWT({
      role: "admin",
      id: "admin",
      name: "Test Admin",
    });
    const res = await POST(createRequest({ token }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.valid).toBe(true);
    expect(json.payload).toBeDefined();
    expect(json.payload.role).toBe("admin");
    expect(json.payload.id).toBe("admin");
    expect(json.payload.name).toBe("Test Admin");
  });
});
