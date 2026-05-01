import { describe, it, expect } from "vitest";
import { splitStepForDisplay } from "@/lib/recipes/split-step-display";

describe("splitStepForDisplay", () => {
  it("returns empty array for empty string", () => {
    expect(splitStepForDisplay("")).toEqual([]);
  });

  it("returns empty array for whitespace-only string", () => {
    expect(splitStepForDisplay("   ")).toEqual([]);
  });

  it("returns single-item array for a short sentence", () => {
    const text = "Cook until golden brown.";
    expect(splitStepForDisplay(text)).toEqual([text]);
  });

  it("splits multiple sentences on sentence boundaries", () => {
    const text = "Heat the oil. Add the onion. Cook for 5 minutes.";
    expect(splitStepForDisplay(text)).toEqual([
      "Heat the oil.",
      "Add the onion.",
      "Cook for 5 minutes.",
    ]);
  });

  it("splits on exclamation marks", () => {
    const text = "Heat the pan! Add butter. Stir well.";
    expect(splitStepForDisplay(text)).toEqual([
      "Heat the pan!",
      "Add butter.",
      "Stir well.",
    ]);
  });

  it("splits on question marks", () => {
    const text = "Is the water boiling? Add pasta. Cook 8 minutes.";
    expect(splitStepForDisplay(text)).toEqual([
      "Is the water boiling?",
      "Add pasta.",
      "Cook 8 minutes.",
    ]);
  });

  it("falls back to semicolons for one long sentence without sentence-ending punctuation", () => {
    const longText =
      "Heat olive oil in a heavy pot over medium heat; add garlic and cook for one minute until fragrant; add the tomatoes and beans";
    const result = splitStepForDisplay(longText);
    expect(result.length).toBeGreaterThan(1);
    // Each chunk should end with a period
    result.forEach((chunk) => expect(chunk.endsWith(".")).toBe(true));
  });

  it("does NOT split on semicolons if text is shorter than 90 chars", () => {
    const short = "Add garlic; stir.";
    expect(splitStepForDisplay(short)).toEqual([short]);
  });

  it("decodes HTML entities in the text", () => {
    const text = "Heat the oil &amp; add the onion. Cook until soft.";
    const result = splitStepForDisplay(text);
    expect(result[0]).toBe("Heat the oil & add the onion.");
  });
});
