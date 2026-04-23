import type { CleanRecipe } from "@/lib/types/recipe";
import type { Ingredient, PrepItem, Step } from "@/lib/types/recipe";

type SpoonacularExtracted = {
  title?: string;
  image?: string;
  servings?: number;
  sourceUrl?: string;
  extendedIngredients?: Array<{
    original?: string;
    name?: string;
    amount?: number;
    unit?: string;
  }>;
  analyzedInstructions?: Array<{
    steps?: Array<{ step?: string }>;
  }>;
  summary?: string;
};

function mapIngredients(raw: SpoonacularExtracted): Ingredient[] {
  const list = raw.extendedIngredients ?? [];
  return list.map((ing, i) => {
    const original = ing.original?.trim() ?? "";
    const name = (ing.name || "").trim();
    const unit = ing.unit?.trim();
    const unitLower = unit?.toLowerCase() ?? "";

    // Spoonacular often mangles ranges like "¼ to ½ teaspoon X" into amount=0.25, unit="to".
    // That yields a broken line ("0.25 to") in the UI — prefer the full original string.
    const badUnit = unitLower === "to" || unitLower === "or";
    const looksLikeRange =
      original.includes(" to ") && /[\d¼½⅓⅔⅛⅜⅝⅞.]/.test(original);

    if (original && (badUnit || (looksLikeRange && original.length > 12))) {
      return {
        id: `sp-ing-${i}`,
        name: original,
      };
    }

    return {
      id: `sp-ing-${i}`,
      name: name || original || "Ingredient",
      quantity: ing.amount != null ? String(ing.amount) : undefined,
      unit,
    };
  });
}

function mapSteps(raw: SpoonacularExtracted): Step[] {
  const blocks = raw.analyzedInstructions ?? [];
  const out: Step[] = [];
  let order = 0;
  for (const block of blocks) {
    for (const s of block.steps ?? []) {
      if (s.step) {
        out.push({ id: `sp-st-${order}`, text: s.step, order });
        order += 1;
      }
    }
  }
  if (out.length === 0) {
    out.push({
      id: "sp-st-0",
      text: "Follow the instructions from your source recipe.",
      order: 0,
    });
  }
  return out;
}

function inferPrepFromSteps(steps: Step[]): PrepItem[] {
  const text = steps.map((s) => s.text.toLowerCase()).join(" ");
  const prep: PrepItem[] = [];
  let sort = 0;
  if (text.includes("overnight") || text.includes("soak")) {
    prep.push({
      id: "prep-infer-1",
      text: "Check whether anything needs soaking or resting overnight.",
      leadTimeMinutes: 720,
      urgency: "overnight",
      sortOrder: sort++,
    });
  }
  if (text.includes("room temperature") || text.includes("soften butter")) {
    prep.push({
      id: "prep-infer-2",
      text: "Pull cold ingredients to room temperature before you start.",
      leadTimeMinutes: 30,
      urgency: "before_start",
      sortOrder: sort++,
    });
  }
  if (prep.length === 0) {
    prep.push({
      id: "prep-infer-default",
      text: "Read the full recipe once before you begin.",
      urgency: "before_start",
      sortOrder: 0,
    });
  }
  return prep;
}

export async function importRecipeSpoonacular(url: string): Promise<CleanRecipe> {
  const key = process.env.SPOONACULAR_API_KEY;
  if (!key) {
    throw new Error("SPOONACULAR_API_KEY is not set");
  }

  const endpoint = new URL(
    "https://api.spoonacular.com/recipes/extract",
  );
  endpoint.searchParams.set("apiKey", key);
  endpoint.searchParams.set("url", url);

  const res = await fetch(endpoint.toString(), { next: { revalidate: 0 } });
  if (!res.ok) {
    throw new Error(`Spoonacular error ${res.status}`);
  }

  const data = (await res.json()) as SpoonacularExtracted & { id?: number };
  const steps = mapSteps(data);
  const prepItems = inferPrepFromSteps(steps);

  return {
    title: data.title?.trim() || "Imported recipe",
    summary:
      (data.summary?.replace(/<[^>]+>/g, "") || "").slice(0, 280) ||
      "Imported from the web and cleaned for cooking.",
    imageUrl: data.image || null,
    sourceUrl: data.sourceUrl || url,
    servings: data.servings || 4,
    ingredients: mapIngredients(data),
    steps,
    prepItems,
    spoonacularId: data.id ?? null,
  };
}
