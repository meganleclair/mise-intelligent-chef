import type { Ingredient } from "@/lib/types/recipe";

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** True when `word` appears as a whole word (not a substring of another word). */
function containsWord(text: string, word: string): boolean {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[^a-z])${escaped}(?:[^a-z]|$)`).test(text);
}

/**
 * Heuristic: which ingredients this step text is likely referring to.
 *
 * Matching tiers (first match wins):
 *  1. Full normalized name appears as substring ("garlic cloves" in "add garlic cloves")
 *  2. All significant words (>2 chars) appear ("cherry" + "tomatoes")
 *  3. Last significant word appears as a whole word ("onion" in "add the onion"
 *     matches "Yellow onion"; "oil" won't match "boil" due to word boundary check)
 *
 * Uses swapBasisName when available so swapped ingredients still match on
 * their original name (e.g. "oat milk" matches steps written for "whole milk").
 */
function ingredientMatchesStep(ing: Ingredient, textNorm: string): boolean {
  // Always match on the original ingredient name, not the swap replacement
  const name = normalize(ing.swapBasisName ?? ing.name);
  if (name.length < 2) return false;

  // Tier 1: full name substring
  if (textNorm.includes(name)) return true;

  const words = name.split(" ").filter((w) => w.length > 2);
  if (words.length === 0) return false;

  // Tier 2: single meaningful word
  if (words.length === 1) {
    return containsWord(textNorm, words[0]!);
  }

  // Tier 3: all significant words present
  if (words.every((w) => textNorm.includes(w))) return true;

  // Tier 4: last word (primary noun) appears as a whole word
  // e.g. "add the onion" \u2192 matches "Yellow onion"; "bring to a boil" \u2192 does NOT match "olive oil"
  const lastWord = words[words.length - 1]!;
  return containsWord(textNorm, lastWord);
}

export function getIngredientsForStep(
  stepText: string,
  ingredients: Ingredient[],
): { list: Ingredient[]; narrowed: boolean } {
  const textNorm = normalize(stepText);
  if (!textNorm || ingredients.length === 0) {
    return { list: ingredients, narrowed: false };
  }

  // Longer names first so "cherry tomatoes" wins over "tomatoes" when both could match
  const sorted = [...ingredients].sort(
    (a, b) => normalize(b.name).length - normalize(a.name).length,
  );

  const matched: Ingredient[] = [];
  const seen = new Set<string>();
  for (const ing of sorted) {
    if (seen.has(ing.id)) continue;
    if (ingredientMatchesStep(ing, textNorm)) {
      matched.push(ing);
      seen.add(ing.id);
    }
  }

  // Preserve original recipe order for display
  const order = new Map(ingredients.map((ing, i) => [ing.id, i]));
  matched.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

  if (matched.length > 0) {
    return { list: matched, narrowed: true };
  }

  return { list: ingredients, narrowed: false };
}
