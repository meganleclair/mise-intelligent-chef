import { describe, it, expect } from "vitest";
import { applyIngredientOverrides } from "@/lib/recipes/display";
import type { Ingredient, IngredientOverride } from "@/lib/types/recipe";

const INGREDIENTS: Ingredient[] = [
  { id: "1", name: "White beans", quantity: "2", unit: "cup" },
  { id: "2", name: "Olive oil", quantity: "1/3", unit: "cup" },
  { id: "3", name: "Garlic", quantity: "2", unit: "clove" },
];

describe("applyIngredientOverrides", () => {
  it("returns ingredients unchanged when there are no overrides", () => {
    const result = applyIngredientOverrides(INGREDIENTS, []);
    expect(result).toEqual(INGREDIENTS);
  });

  it("replaces the name of a matching ingredient", () => {
    const overrides: IngredientOverride[] = [
      { original: "White beans", replacement: "Chickpeas" },
    ];
    const result = applyIngredientOverrides(INGREDIENTS, overrides);
    expect(result[0]!.name).toBe("Chickpeas");
    expect(result[0]!.swapBasisName).toBe("White beans");
    expect(result[1]!.name).toBe("Olive oil");
  });

  it("matches case-insensitively", () => {
    const overrides: IngredientOverride[] = [
      { original: "olive oil", replacement: "Avocado oil" },
    ];
    const result = applyIngredientOverrides(INGREDIENTS, overrides);
    expect(result[1]!.name).toBe("Avocado oil");
  });

  it("leaves ingredients with no matching override untouched", () => {
    const overrides: IngredientOverride[] = [
      { original: "Something not in the recipe", replacement: "X" },
    ];
    const result = applyIngredientOverrides(INGREDIENTS, overrides);
    expect(result).toEqual(INGREDIENTS);
  });

  it("applies multiple overrides independently", () => {
    const overrides: IngredientOverride[] = [
      { original: "White beans", replacement: "Chickpeas" },
      { original: "Garlic", replacement: "Garlic powder" },
    ];
    const result = applyIngredientOverrides(INGREDIENTS, overrides);
    expect(result[0]!.name).toBe("Chickpeas");
    expect(result[2]!.name).toBe("Garlic powder");
    expect(result[1]!.name).toBe("Olive oil");
  });
});
