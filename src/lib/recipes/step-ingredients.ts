import type { Ingredient } from "@/lib/types/recipe";

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Heuristic: which ingredients this step text is likely referring to.
 * Matches full ingredient name as substring, or (for multi-word names) all significant words.
 */
function ingredientMatchesStep(ing: Ingredient, textNorm: string): boolean {
  const name = normalize(ing.name);
  if (name.length < 2) return false;
  if (textNorm.includes(name)) return true;

  const words = name.split(" ").filter((w) => w.length > 2);
  if (words.length === 0) return false;
  if (words.length === 1) {
    return textNorm.includes(words[0]!);
  }
  return words.every((w) => textNorm.includes(w));
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
