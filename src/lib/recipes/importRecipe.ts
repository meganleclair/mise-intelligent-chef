import type { CleanRecipe } from "@/lib/types/recipe";
import { importRecipeMock } from "@/lib/recipes/adapters/mock";
import { importRecipeSpoonacular } from "@/lib/recipes/adapters/spoonacular";
import {
  importRecipeJsonLd,
  JsonLdRecipeNotFoundError,
} from "@/lib/recipes/adapters/jsonld";
import { normalizeRecipe } from "@/lib/recipes/normalize";

export type ImportRecipeResult =
  | { ok: true; recipe: CleanRecipe; source: "mock" | "spoonacular" | "jsonld" }
  | { ok: false; error: string };

/**
 * Adapter-based import — three-tier fallback:
 *  1. Spoonacular (when API key is configured)
 *  2. JSON-LD structured data scraper (free; works on most recipe sites)
 *  3. Demo mock (when no API key — keeps full UX demonstrable)
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

  // --- Tier 1: Spoonacular ---
  if (hasKey) {
    try {
      const raw = await importRecipeSpoonacular(trimmed);
      return {
        ok: true,
        recipe: normalizeRecipe(raw, trimmed),
        source: "spoonacular",
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn("[importRecipe] Spoonacular failed, trying JSON-LD:", message);
      // Fall through to JSON-LD
    }
  }

  // --- Tier 2: JSON-LD structured data (free, no API key needed) ---
  try {
    const raw = await importRecipeJsonLd(trimmed);
    return {
      ok: true,
      recipe: normalizeRecipe(raw, trimmed),
      source: "jsonld",
    };
  } catch (err) {
    if (err instanceof JsonLdRecipeNotFoundError) {
      console.warn("[importRecipe] No JSON-LD recipe found:", trimmed);
    } else {
      const message = err instanceof Error ? err.message : String(err);
      console.warn("[importRecipe] JSON-LD extraction failed:", message);
    }
    // Fall through
  }

  // --- Tier 3: Demo mock (no API key configured) or hard failure ---
  if (!hasKey) {
    // No key at all — return demo recipe so the full flow is still demonstrable
    const mock = await importRecipeMock(trimmed);
    return {
      ok: true,
      recipe: normalizeRecipe(mock, trimmed),
      source: "mock",
    };
  }

  // Key was set but both Spoonacular and JSON-LD failed — tell the user
  return {
    ok: false,
    error:
      "Couldn’t extract a recipe from that URL. Make sure the page is publicly accessible and contains a recipe.",
  };
}
