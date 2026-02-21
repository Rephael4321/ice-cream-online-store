import { getSiteUrl } from "@/lib/site-url";

describe("getSiteUrl", () => {
  const origEnv = process.env;

  afterEach(() => {
    process.env = { ...origEnv };
  });

  it("returns NEXT_PUBLIC_SITE_URL when set", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.com";
    process.env.VERCEL_URL = "";
    expect(getSiteUrl()).toBe("https://example.com");
  });

  it("strips trailing slash from NEXT_PUBLIC_SITE_URL", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.com/";
    process.env.VERCEL_URL = "";
    expect(getSiteUrl()).toBe("https://example.com");
  });

  it("returns localhost fallback when no URL env set", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.VERCEL_URL;
    expect(getSiteUrl()).toBe("http://localhost:3000");
  });
});
