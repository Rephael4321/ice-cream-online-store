import { createJWT, verifyJWT } from "@/lib/jwt";

describe("JWT lib", () => {
  it("createJWT returns a non-empty string", async () => {
    const token = await createJWT({ role: "admin", id: "1" });
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
  });

  it("verifyJWT returns payload for valid token", async () => {
    const payload = { role: "admin", id: "1", name: "Test" };
    const token = await createJWT(payload);
    const decoded = await verifyJWT(token);
    expect(decoded).not.toBeNull();
    expect(decoded!.role).toBe("admin");
    expect(decoded!.id).toBe("1");
    expect(decoded!.exp).toBeDefined();
    expect(decoded!.iat).toBeDefined();
  });

  it("verifyJWT returns null for invalid token", async () => {
    const decoded = await verifyJWT("not.a.valid.jwt");
    expect(decoded).toBeNull();
  });

  it("verifyJWT returns null for malformed token", async () => {
    const decoded = await verifyJWT("garbage");
    expect(decoded).toBeNull();
  });
});
