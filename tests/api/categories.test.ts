import { GET } from "@/app/api/categories/route";
import { NextRequest } from "next/server";

function createGetRequest(searchParams?: Record<string, string>): NextRequest {
  const url = new URL("http://localhost/api/categories");
  if (searchParams) {
    Object.entries(searchParams).forEach(([k, v]) =>
      url.searchParams.set(k, v)
    );
  }
  return new NextRequest(url, { method: "GET" });
}

describe("GET /api/categories", () => {
  it("returns 200 and categories array", async () => {
    const res = await GET(createGetRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("categories");
    expect(Array.isArray(json.categories)).toBe(true);
  });

  it("accepts full=true query param", async () => {
    const res = await GET(createGetRequest({ full: "true" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("categories");
  });
});
