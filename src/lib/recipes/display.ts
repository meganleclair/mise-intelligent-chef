import { decodeHtmlEntities } from "@/lib/decode-html-entities";
import type { Ingredient } from "@/lib/types/recipe";

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

  if (note.startsWith("Swap:")) {
    return decodeHtmlEntities(
      structured ? `${structured} — ${note}` : `${name} — ${note}`,
    );
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

export type ModRow = {
  ingredient_key: string;
  replacement_label: string;
  impact_note: string | null;
};

export function mergeIngredientsWithMods(
  ingredients: Ingredient[],
  mods: ModRow[],
): Ingredient[] {
  const map = new Map(
    mods.map((m) => [m.ingredient_key, m] as const),
  );
  return ingredients.map((ing) => {
    const m = map.get(ing.id);
    if (!m) return ing;
    return {
      ...ing,
      name: m.replacement_label,
      note: m.impact_note
        ? `Swap: ${m.impact_note}`
        : ing.note,
      swapBasisName: ing.name,
    };
  });
}
