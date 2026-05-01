import { describe, it, expect } from "vitest";
import { getIngredientsForStep } from "@/lib/recipes/step-ingredients";
import type { Ingredient } from "@/lib/types/recipe";

function ing(id: string, name: string): Ingredient {
  return { id, name, quantity: "1", unit: "cup" };
}

const INGREDIENTS: Ingredient[] = [
  ing("1", "Extra-virgin olive oil"),
  ing("2", "Yellow onion"),
  ing("3", "Garlic cloves"),
  ing("4", "Cherry tomatoes"),
  ing("5", "White beans"),
  ing("6", "Vegetable stock"),
  ing("7", "Heavy cream"),
  ing("8", "Fresh thyme"),
];

describe("getIngredientsForStep", () => {
  it("returns all ingredients with narrowed=false for empty step text", () => {
    const { list, narrowed } = getIngredientsForStep("", INGREDIENTS);
    expect(narrowed).toBe(false);
    expect(list).toEqual(INGREDIENTS);
  });

  it("returns all ingredients with narrowed=false for empty ingredient list", () => {
    const { list, narrowed } = getIngredientsForStep("Add oil and onion.", []);
    expect(narrowed).toBe(false);
    expect(list).toEqual([]);
  });

  it("matches an ingredient by full name (tier 1)", () => {
    const { list, narrowed } = getIngredientsForStep(
      "Cook yellow onion until soft.",
      INGREDIENTS
    );
    expect(narrowed).toBe(true);
    expect(list.map((i) => i.id)).toContain("2");
  });

  it("matches on last word (primary noun) when full name isn't present (tier 4)", () => {
    // "add the onion" should match "Yellow onion" via last-word fallback
    const { list, narrowed } = getIngredientsForStep(
      "Cook the onion until soft.",
      INGREDIENTS
    );
    expect(narrowed).toBe(true);
    expect(list.map((i) => i.id)).toContain("2");
  });

  it("does NOT match 'oil' inside 'boil' (word boundary)", () => {
    const oilIng: Ingredient[] = [ing("oil", "Olive oil")];
    const { narrowed } = getIngredientsForStep(
      "Bring a pot of water to a boil.",
      oilIng
    );
    expect(narrowed).toBe(false);
  });

  it("matches multiple ingredients mentioned in a step", () => {
    const { list, narrowed } = getIngredientsForStep(
      "Add garlic cloves and cherry tomatoes to the pot.",
      INGREDIENTS
    );
    expect(narrowed).toBe(true);
    expect(list.map((i) => i.id)).toContain("3"); // garlic cloves
    expect(list.map((i) => i.id)).toContain("4"); // cherry tomatoes
  });

  it("preserves original recipe order in results", () => {
    const { list } = getIngredientsForStep(
      "Stir in heavy cream and fresh thyme.",
      INGREDIENTS
    );
    const ids = list.map((i) => i.id);
    expect(ids.indexOf("7")).toBeLessThan(ids.indexOf("8")); // cream before thyme
  });

  it("falls back to all ingredients with narrowed=false when nothing matches", () => {
    const { list, narrowed } = getIngredientsForStep(
      "Preheat the oven to 375°F.",
      INGREDIENTS
    );
    expect(narrowed).toBe(false);
    expect(list).toEqual(INGREDIENTS);
  });

  it("matches multi-word names by all significant words", () => {
    const { list, narrowed } = getIngredientsForStep(
      "Pour in the vegetable stock.",
      INGREDIENTS
    );
    expect(narrowed).toBe(true);
    expect(list.map((i) => i.id)).toContain("6");
  });

  it("is case-insensitive", () => {
    // "garlic cloves" normalized is exactly "garlic cloves" — both words present
    const { list, narrowed } = getIngredientsForStep(
      "ADD GARLIC CLOVES and stir.",
      INGREDIENTS
    );
    expect(narrowed).toBe(true);
    expect(list.map((i) => i.id)).toContain("3");
  });

  it("excludes very short ingredient names from matched results (not fallback)", () => {
    // When there ARE matches, short-named ingredients that don't match are excluded
    const shortIng = [ing("x", "A"), ...INGREDIENTS];
    const { list, narrowed } = getIngredientsForStep(
      "Add garlic cloves to the pot.",
      shortIng
    );
    // garlic cloves matches; "A" is <2 chars so won't match
    expect(narrowed).toBe(true);
    expect(list.map((i) => i.id)).not.toContain("x");
    expect(list.map((i) => i.id)).toContain("3");
  });

  it("handles em-dash and en-dash normalisation in step text", () => {
    const { list, narrowed } = getIngredientsForStep(
      "Add white–beans to the pot.",
      INGREDIENTS
    );
    expect(narrowed).toBe(true);
    expect(list.map((i) => i.id)).toContain("5");
  });
});
