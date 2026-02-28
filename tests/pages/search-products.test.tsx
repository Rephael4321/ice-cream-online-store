/**
 * Ensures the search-products page uses searchParams as a Promise (Next.js 15+).
 * If someone changes it back to sync searchParams.query, this test will fail.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import SearchResultsPage from "@/app/(root)/(store)/search-products/page";

const NOT_FOUND = Symbol("NOT_FOUND");
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw NOT_FOUND;
  },
}));

describe("SearchResultsPage (searchParams as Promise)", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ products: [] }),
      })
    );
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
  });

  it("awaits searchParams and renders query in heading", async () => {
    const searchParams = Promise.resolve({ query: "גלידה" });
    const result = await SearchResultsPage({ searchParams });
    const html = renderToStaticMarkup(result);
    expect(html).toContain("גלידה");
    expect(html).toContain("תוצאות חיפוש");
  });

  it("calls notFound() when query is missing (empty searchParams)", async () => {
    const searchParams = Promise.resolve({});
    await expect(SearchResultsPage({ searchParams })).rejects.toBe(NOT_FOUND);
  });

  it("calls notFound() when query is blank string", async () => {
    const searchParams = Promise.resolve({ query: "   " });
    await expect(SearchResultsPage({ searchParams })).rejects.toBe(NOT_FOUND);
  });
});
