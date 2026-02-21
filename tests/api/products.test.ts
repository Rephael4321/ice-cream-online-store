import { GET } from "@/app/api/products/route";
import { NextRequest } from "next/server";

function createGetRequest(searchParams?: Record<string, string>): NextRequest {
  const url = new URL("http://localhost/api/products");
  if (searchParams) {
    Object.entries(searchParams).forEach(([k, v]) =>
      url.searchParams.set(k, v)
    );
  }
  return new NextRequest(url, { method: "GET" });
}

describe("GET /api/products", () => {
  it("returns 200 and list shape", async () => {
    const res = await GET(createGetRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("products");
    expect(Array.isArray(json.products)).toBe(true);
  });

  it("accepts q, sort, order, offset, limit query params", async () => {
    const res = await GET(
      createGetRequest({
        q: "ice",
        sort: "name",
        order: "asc",
        offset: "0",
        limit: "10",
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("products");
  });
});
