import { baseNameFromUrl, shortName } from "@/lib/utils/image-name";

describe("baseNameFromUrl", () => {
  it("returns empty string for null or undefined", () => {
    expect(baseNameFromUrl(null)).toBe("");
    expect(baseNameFromUrl(undefined)).toBe("");
  });

  it("strips query and fragment", () => {
    expect(baseNameFromUrl("https://example.com/path/to/file.png?x=1#hash")).toBe("file");
  });

  it("returns last path segment without extension", () => {
    expect(baseNameFromUrl("https://cdn.example.com/images/photo.jpg")).toBe("photo");
  });

  it("decodes URI-encoded segment", () => {
    expect(baseNameFromUrl("https://example.com/hello%20world.png")).toBe("hello world");
  });

  it("returns full segment when no extension", () => {
    expect(baseNameFromUrl("https://example.com/noext")).toBe("noext");
  });
});

describe("shortName", () => {
  it("returns empty string for empty input", () => {
    expect(shortName("")).toBe("");
  });

  it("returns name as-is when within max length", () => {
    const name = "short";
    expect(shortName(name, 32)).toBe(name);
  });

  it("truncates with ellipsis when over max", () => {
    const name = "this-is-a-very-long-file-name.png";
    const result = shortName(name, 20);
    expect(result.length).toBeLessThanOrEqual(20);
    expect(result).toContain("...");
  });
});
