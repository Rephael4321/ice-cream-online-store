import { describe, expect, it } from "vitest";
import {
  decodeIncomingRequestUrlForDisplay,
  transformDevIncomingRequestLogLine,
} from "@/lib/dev-decode-request-log";

describe("decodeIncomingRequestUrlForDisplay", () => {
  it("decodes Hebrew path segments", () => {
    const raw =
      "/category-products/%D7%9B%D7%A9%D7%A8-%D7%9C%D7%A4%D7%A1%D7%97";
    expect(decodeIncomingRequestUrlForDisplay(raw)).toBe(
      "/category-products/כשר-לפסח"
    );
  });

  it("decodes url query param for img-proxy style requests", () => {
    const raw =
      "/api/img-proxy?url=https%3A%2F%2Fexample.com%2F%D7%97%D7%9C%D7%91.jpg";
    expect(decodeIncomingRequestUrlForDisplay(raw)).toBe(
      "/api/img-proxy?url=https://example.com/חלב.jpg"
    );
  });
});

describe("transformDevIncomingRequestLogLine", () => {
  it("rewrites Next-style incoming request lines", () => {
    const line =
      " GET /category-products/%D7%9B%D7%A9%D7%A8-%D7%9C%D7%A4%D7%A1%D7%97 200 in 12ms (compile: 1ms, render: 11ms)";
    expect(transformDevIncomingRequestLogLine(line)).toBe(
      " GET /category-products/כשר-לפסח 200 in 12ms (compile: 1ms, render: 11ms)"
    );
  });

  it("preserves ANSI-colored status codes", () => {
    const line = " GET /p%20q \x1b[32m200\x1b[0m in 1s";
    expect(transformDevIncomingRequestLogLine(line)).toBe(
      " GET /p q \x1b[32m200\x1b[0m in 1s"
    );
  });
});
