import { describe, it, expect } from "vitest";
import { normalizeImageUrl } from "@/lib/images";

describe("normalizeImageUrl", () => {
  it("returns null for null", () => {
    expect(normalizeImageUrl(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(normalizeImageUrl(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(normalizeImageUrl("")).toBeNull();
  });

  it("returns null for whitespace-only string", () => {
    expect(normalizeImageUrl("   ")).toBeNull();
  });

  it("passes through https URLs unchanged", () => {
    const url = "https://example.com/image.jpg";
    expect(normalizeImageUrl(url)).toBe(url);
  });

  it("passes through http URLs unchanged", () => {
    const url = "http://example.com/image.jpg";
    expect(normalizeImageUrl(url)).toBe(url);
  });

  it("converts protocol-relative URLs to https", () => {
    expect(normalizeImageUrl("//example.com/image.jpg")).toBe(
      "https://example.com/image.jpg"
    );
  });

  it("passes through data URIs unchanged", () => {
    const uri = "data:image/png;base64,abc123";
    expect(normalizeImageUrl(uri)).toBe(uri);
  });

  it("prepends https:// to bare domain URLs", () => {
    expect(normalizeImageUrl("example.com/image.jpg")).toBe(
      "https://example.com/image.jpg"
    );
  });

  it("trims whitespace before processing", () => {
    expect(normalizeImageUrl("  https://example.com/image.jpg  ")).toBe(
      "https://example.com/image.jpg"
    );
  });
});
