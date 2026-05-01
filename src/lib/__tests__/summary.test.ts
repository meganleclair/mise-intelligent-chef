import { describe, it, expect } from "vitest";
import { tidyRecipeSummaryForDisplay } from "@/lib/recipes/summary";

describe("tidyRecipeSummaryForDisplay", () => {
  it("returns clean text unchanged", () => {
    const s = "A hearty stew perfect for winter evenings.";
    expect(tidyRecipeSummaryForDisplay(s)).toBe(s);
  });

  it("strips trailing personas fragment", () => {
    expect(
      tidyRecipeSummaryForDisplay("A great recipe. 4 personas")
    ).toBe("A great recipe.");
  });

  it("strips trailing personas with partial word (personnes, etc.)", () => {
    expect(
      tidyRecipeSummaryForDisplay("Quick dinner. 2 personnes")
    ).toBe("Quick dinner.");
  });

  it("strips trailing likes count", () => {
    expect(
      tidyRecipeSummaryForDisplay("Delicious pasta. 1,234 likes")
    ).toBe("Delicious pasta.");
  });

  it("strips trailing singular like", () => {
    expect(
      tidyRecipeSummaryForDisplay("Great dish. 1 like.")
    ).toBe("Great dish.");
  });

  it("is case-insensitive for likes", () => {
    expect(
      tidyRecipeSummaryForDisplay("Good recipe. 99 Likes")
    ).toBe("Good recipe.");
  });

  it("trims surrounding whitespace", () => {
    expect(tidyRecipeSummaryForDisplay("  Nice dish.  ")).toBe("Nice dish.");
  });

  it("handles empty string", () => {
    expect(tidyRecipeSummaryForDisplay("")).toBe("");
  });
});
