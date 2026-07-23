import { decodeHtmlEntities } from "@/lib/decode-html-entities";
import type { Ingredient, IngredientOverride } from "@/lib/types/recipe";

/** Quantity + unit + name only (replacement line after a swap). */
export function getIngredientPrimaryLine(ing: Ingredient): string {
  const qty = ing.quantity?.trim();
  const unit = ing.unit?.trim();
  const unitLower = unit?.toLowerCase() ?? "";
  const name = (ing.name || "").trim();

  // Legacy bad parses: amount + unit "to" + empty name (Spoonacular range bug). Re-import fixes it.
  if (unitLower === "to" && !name && qty) {
    return decodeHtmlEntities(
      `Amount unclear (${qty} …). Re-import this recipe from home to refresh the full line.`,
    );
  }

  const structured = [qty, unit, name]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return decodeHtmlEntities(structured || name);
}

/**
 * One readable line for an ingredient: avoids duplicating Spoonacular-style
 * "amount + unit + name" next to the full original string.
 */
export function formatIngredientLine(ing: Ingredient): string {
  const qty = ing.quantity?.trim();
  const unit = ing.unit?.trim();
  const unitLower = unit?.toLowerCase() ?? "";
  const name = (ing.name || "").trim();
  const note = ing.note?.trim();

  // Legacy bad parses: amount + unit "to" + empty name (Spoonacular range bug). Re-import fixes it.
  if (unitLower === "to" && !name && qty) {
    return decodeHtmlEntities(
      `Amount unclear (${qty} …). Re-import this recipe from home to refresh the full line.`,
    );
  }

  const structured = [qty, unit, name]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  if (!note) {
    return decodeHtmlEntities(structured || name);
  }

  const n = note.toLowerCase();
  const head = structured.slice(0, Math.min(16, structured.length)).toLowerCase();
  if (head && n.includes(head) && note.length >= structured.length * 0.75) {
    return decodeHtmlEntities(note);
  }

  if (
    name &&
    n.includes(name.toLowerCase()) &&
    note.length > name.length + 12 &&
    /[\d¼½⅓]|teaspoon|tablespoon|cup\b/i.test(note)
  ) {
    return decodeHtmlEntities(note);
  }

  return decodeHtmlEntities(
    structured ? `${structured} — ${note}` : note,
  );
}

/** Applies the current nutrition-chat swaps to a recipe's ingredient list for display. */
export function applyIngredientOverrides(
  ingredients: Ingredient[],
  overrides: IngredientOverride[],
): Ingredient[] {
  const map = new Map(
    overrides.map((o) => [o.original.trim().toLowerCase(), o] as const),
  );
  return ingredients.map((ing) => {
    const match = map.get(ing.name.trim().toLowerCase());
    if (!match) return ing;
    return {
      ...ing,
      name: match.replacement,
      swapBasisName: ing.name,
    };
  });
}
