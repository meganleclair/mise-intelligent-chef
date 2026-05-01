import { describe, it, expect } from "vitest";
import { decodeHtmlEntities } from "@/lib/decode-html-entities";

describe("decodeHtmlEntities", () => {
  it("returns empty string unchanged", () => {
    expect(decodeHtmlEntities("")).toBe("");
  });

  it("returns plain text unchanged", () => {
    expect(decodeHtmlEntities("Hello world")).toBe("Hello world");
  });

  it("decodes &amp;", () => {
    expect(decodeHtmlEntities("salt &amp; pepper")).toBe("salt & pepper");
  });

  it("decodes &lt; and &gt;", () => {
    expect(decodeHtmlEntities("&lt;div&gt;")).toBe("<div>");
  });

  it("decodes &quot;", () => {
    expect(decodeHtmlEntities("She said &quot;hello&quot;")).toBe(
      'She said "hello"'
    );
  });

  it("decodes &rsquo; to right single quote", () => {
    expect(decodeHtmlEntities("don&rsquo;t")).toBe("don’t");
  });

  it("decodes &mdash; to em dash", () => {
    expect(decodeHtmlEntities("one&mdash;two")).toBe("one—two");
  });

  it("decodes numeric decimal entities", () => {
    expect(decodeHtmlEntities("&#39;")).toBe("'");
  });

  it("decodes numeric hex entities", () => {
    expect(decodeHtmlEntities("&#x27;")).toBe("'");
  });

  it("handles double-encoded entities", () => {
    // &amp;amp; → &amp; → &
    expect(decodeHtmlEntities("&amp;amp;")).toBe("&");
  });

  it("leaves unknown entities intact", () => {
    expect(decodeHtmlEntities("&unknownentity;")).toBe("&unknownentity;");
  });
});
