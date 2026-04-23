import { randomUUID } from "crypto";
import { decodeHtmlEntities } from "@/lib/decode-html-entities";
import type { CleanRecipe, Ingredient, PrepItem, Step } from "@/lib/types/recipe";

function sortPrep(prep: PrepItem[]): PrepItem[] {
  return [...prep].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function normalizeRecipe(
  raw: CleanRecipe,
  sourceUrlOverride?: string,
): CleanRecipe {
  const sourceUrl = sourceUrlOverride ?? raw.sourceUrl;
  const ingredients: Ingredient[] = raw.ingredients.map((ing) => ({
    id: ing.id || randomUUID(),
    name: decodeHtmlEntities(ing.name.trim()),
    quantity: ing.quantity?.trim(),
    unit: ing.unit?.trim(),
    note: ing.note ? decodeHtmlEntities(ing.note.trim()) : undefined,
  }));

  const steps: Step[] = raw.steps.map((s, i) => ({
    id: s.id || randomUUID(),
    text: decodeHtmlEntities(s.text.trim()),
    order: s.order ?? i,
  }));

  const prepItems = sortPrep(
    raw.prepItems.map((p, i) => ({
      id: p.id || randomUUID(),
      text: decodeHtmlEntities(p.text.trim()),
      leadTimeMinutes: p.leadTimeMinutes,
      urgency: p.urgency,
      sortOrder: p.sortOrder ?? i,
    })),
  );

  return {
    title: decodeHtmlEntities(raw.title.trim()),
    summary: decodeHtmlEntities(raw.summary.trim()),
    imageUrl: raw.imageUrl,
    sourceUrl,
    servings: Math.max(1, raw.servings || 4),
    ingredients,
    steps,
    prepItems,
    spoonacularId: raw.spoonacularId ?? null,
  };
}
