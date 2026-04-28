import { decodeHtmlEntities } from "@/lib/decode-html-entities";
import { isBatchShiftNote } from "@/lib/swap-catalog";
import type { Ingredient } from "@/lib/types/recipe";

/**
 * True when this line was swapped by hand (catalog picker), not by batch recipe shifts.
 */
export function isManualIngredientSwap(note?: string | null): boolean {
  const raw = note?.trim();
  if (!raw?.startsWith("Swap:")) return false;
  const body = raw.slice("Swap:".length).trim();
  return !isBatchShiftNote(body);
}

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

/** Parses `mergeIngredientsWithMods` notes like `Swap: [Lower calorie shift] …`. */
export function parseSwapNote(note?: string | null): {
  shift?: string;
  detail: string;
} | null {
  const raw = note?.trim();
  if (!raw || !raw.startsWith("Swap:")) return null;
  let body = raw.slice("Swap:".length).trim();
  let shift: string | undefined;
  const bracket = body.match(
    /^\[(Higher protein|Lower calorie|Lower carb|Higher fiber|Lower sodium|Dairy-free) shift\]\s*/i,
  );
  if (bracket) {
    const g = bracket[1]!.toLowerCase();
    if (g === "higher protein") shift = "Higher protein";
    else if (g === "lower calorie") shift = "Lower calorie";
    else if (g === "lower carb") shift = "Lower carb";
    else if (g === "higher fiber") shift = "Higher fiber";
    else if (g === "lower sodium") shift = "Lower sodium";
    else if (g === "dairy-free") shift = "Dairy-free";
    body = body.slice(bracket[0].length).trim();
  }
  if (!body) return null;
  return { shift, detail: body };
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
