import type { CleanRecipe } from "@/lib/types/recipe";
import { importRecipeMock } from "@/lib/recipes/adapters/mock";
import { importRecipeSpoonacular } from "@/lib/recipes/adapters/spoonacular";
import { normalizeRecipe } from "@/lib/recipes/normalize";

export type ImportRecipeResult =
  | { ok: true; recipe: CleanRecipe; source: "mock" | "spoonacular" }
  | { ok: false; error: string };

/**
 * Adapter-based import: tries Spoonacular when configured; always falls back to mock on failure or missing key.
 */
export async function importRecipeFromUrl(url: string): Promise<ImportRecipeResult> {
  const trimmed = url.trim();
  if (!trimmed) {
    return { ok: false, error: "Paste a recipe URL to import." };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, error: "That doesn’t look like a valid URL." };
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return { ok: false, error: "Use an http or https link." };
  }

  const hasKey = Boolean(process.env.SPOONACULAR_API_KEY);

  if (hasKey) {
    try {
      const raw = await importRecipeSpoonacular(trimmed);
      return {
        ok: true,
        recipe: normalizeRecipe(raw, trimmed),
        source: "spoonacular",
      };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown error from recipe API.";
      console.error("[importRecipe] Spoonacular failed:", message);
      return {
        ok: false,
        error: `Couldn't import that recipe (${message}). Try a different URL, or check that the site is publicly accessible.`,
      };
    }
  }

  // No API key — return demo recipe so the full flow is still demonstrable
  const mock = await importRecipeMock(trimmed);
  return {
    ok: true,
    recipe: normalizeRecipe(mock, trimmed),
    source: "mock",
  };
}
