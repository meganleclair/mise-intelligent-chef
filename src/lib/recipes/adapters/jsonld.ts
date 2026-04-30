import type { CleanRecipe, Ingredient, PrepItem, Step } from "@/lib/types/recipe";

// ---------------------------------------------------------------------------
// JSON-LD Recipe structured-data adapter
// Fetches any public recipe URL and extracts the Recipe schema markup.
// This is a free fallback that works with virtually every major recipe site.
// ---------------------------------------------------------------------------

type JsonLdRecipe = {
  "@type"?: string | string[];
  name?: string;
  description?: string;
  image?: string | string[] | { url?: string } | Array<{ url?: string }>;
  recipeIngredient?: string[];
  recipeInstructions?:
    | string
    | string[]
    | Array<{
        "@type"?: string;
        text?: string;
        name?: string;
        itemListElement?: Array<{ "@type"?: string; text?: string; name?: string }>;
      }>;
  recipeYield?: string | number | string[];
  url?: string;
  prepTime?: string;
  cookTime?: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isRecipeType(val: unknown): val is JsonLdRecipe {
  if (!val || typeof val !== "object") return false;
  const t = (val as Record<string, unknown>)["@type"];
  if (Array.isArray(t)) return t.some((v) => v === "Recipe");
  return t === "Recipe";
}

/** Recursively search any JSON-LD graph structure for a Recipe node. */
function findRecipeNode(data: unknown): JsonLdRecipe | null {
  if (!data) return null;
  if (Array.isArray(data)) {
    for (const item of data) {
      const found = findRecipeNode(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof data === "object") {
    if (isRecipeType(data)) return data as JsonLdRecipe;
    // Check @graph
    const graph = (data as Record<string, unknown>)["@graph"];
    if (graph) {
      const found = findRecipeNode(graph);
      if (found) return found;
    }
  }
  return null;
}

function extractImageUrl(image: JsonLdRecipe["image"]): string | null {
  if (!image) return null;
  if (typeof image === "string") return image;
  if (Array.isArray(image)) {
    const first = image[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object") return first.url ?? null;
  }
  if (typeof image === "object" && !Array.isArray(image)) {
    return (image as { url?: string }).url ?? null;
  }
  return null;
}

function extractServings(recipeYield: JsonLdRecipe["recipeYield"]): number {
  if (!recipeYield) return 4;
  const raw = Array.isArray(recipeYield) ? recipeYield[0] : recipeYield;
  const num = parseInt(String(raw), 10);
  return Number.isFinite(num) && num > 0 ? num : 4;
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function mapIngredients(lines: string[]): Ingredient[] {
  return lines
    .map((line, i) => ({
      id: `jl-ing-${i}`,
      name: stripHtml(line).trim(),
    }))
    .filter((ing) => ing.name.length > 0);
}

function flattenInstructions(
  raw: JsonLdRecipe["recipeInstructions"],
): string[] {
  if (!raw) return [];

  // Plain string — split on numbered lines or newlines
  if (typeof raw === "string") {
    const plain = stripHtml(raw);
    return plain
      .split(/\n+/)
      .map((s) => s.replace(/^\d+[\.)]\s*/, "").trim())
      .filter((s) => s.length > 4);
  }

  if (!Array.isArray(raw)) return [];

  const out: string[] = [];
  for (const item of raw) {
    if (typeof item === "string") {
      const text = stripHtml(item).trim();
      if (text.length > 4) out.push(text);
      continue;
    }
    if (typeof item === "object" && item !== null) {
      // HowToSection with itemListElement
      if (Array.isArray(item.itemListElement)) {
        for (const sub of item.itemListElement) {
          const text = stripHtml(sub.text ?? sub.name ?? "").trim();
          if (text.length > 4) out.push(text);
        }
        continue;
      }
      // HowToStep
      const text = stripHtml(item.text ?? item.name ?? "").trim();
      if (text.length > 4) out.push(text);
    }
  }
  return out;
}

function mapSteps(lines: string[]): Step[] {
  if (lines.length === 0) {
    return [
      {
        id: "jl-st-0",
        text: "Follow the instructions from your source recipe.",
        order: 0,
      },
    ];
  }
  return lines.map((text, i) => ({ id: `jl-st-${i}`, text, order: i }));
}

function inferPrepItems(steps: Step[]): PrepItem[] {
  const text = steps.map((s) => s.text.toLowerCase()).join(" ");
  const prep: PrepItem[] = [];
  let sort = 0;
  if (text.includes("overnight") || text.includes("soak")) {
    prep.push({
      id: "jl-prep-1",
      text: "Check whether anything needs soaking or resting overnight.",
      leadTimeMinutes: 720,
      urgency: "overnight",
      sortOrder: sort++,
    });
  }
  if (text.includes("room temperature") || text.includes("soften butter")) {
    prep.push({
      id: "jl-prep-2",
      text: "Pull cold ingredients to room temperature before you start.",
      leadTimeMinutes: 30,
      urgency: "before_start",
      sortOrder: sort++,
    });
  }
  if (prep.length === 0) {
    prep.push({
      id: "jl-prep-default",
      text: "Read the full recipe once before you begin.",
      urgency: "before_start",
      sortOrder: 0,
    });
  }
  return prep;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export class JsonLdRecipeNotFoundError extends Error {
  constructor(url: string) {
    super(`No Recipe JSON-LD found at ${url}`);
    this.name = "JsonLdRecipeNotFoundError";
  }
}

export async function importRecipeJsonLd(url: string): Promise<CleanRecipe> {
  const res = await fetch(url, {
    headers: {
      // Mimic a browser so sites don't block scrapers
      "User-Agent":
        "Mozilla/5.0 (compatible; MiseApp/1.0; +https://miseintelligentchef.netlify.app)",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new JsonLdRecipeNotFoundError(url);
  }

  const html = await res.text();

  // Extract all <script type="application/ld+json"> blocks
  const scriptRe =
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  let recipe: JsonLdRecipe | null = null;

  while ((match = scriptRe.exec(html)) !== null) {
    const raw = match[1]?.trim();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      const found = findRecipeNode(parsed);
      if (found) {
        recipe = found;
        break;
      }
    } catch {
      // Malformed JSON-LD — skip this block
    }
  }

  if (!recipe) {
    throw new JsonLdRecipeNotFoundError(url);
  }

  const ingredientLines = recipe.recipeIngredient ?? [];
  const ingredients = mapIngredients(ingredientLines);
  const stepLines = flattenInstructions(recipe.recipeInstructions);
  const steps = mapSteps(stepLines);
  const prepItems = inferPrepItems(steps);

  return {
    title: recipe.name?.trim() || "Imported recipe",
    summary:
      (recipe.description ? stripHtml(recipe.description).slice(0, 400) : "") ||
      "Imported from the web and ready to cook.",
    imageUrl: extractImageUrl(recipe.image),
    sourceUrl: recipe.url || url,
    servings: extractServings(recipe.recipeYield),
    ingredients,
    steps,
    prepItems,
    spoonacularId: null,
  };
}
