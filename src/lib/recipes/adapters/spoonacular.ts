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
  /** Full instruction HTML when analyzed steps are thin or truncated. */
  instructions?: string;
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

function stepsFromAnalyzed(raw: SpoonacularExtracted): Step[] {
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
  return out;
}

function extractOrderedListTexts(html: string): string[] {
  const items: string[] = [];
  const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let m: RegExpExecArray | null;
  while ((m = liRe.exec(html)) !== null) {
    const inner = m[1]
      ?.replace(/<a[^>]*>[\s\S]*?<\/a>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (inner && inner.length > 10) items.push(inner);
  }
  return items;
}

function stepsFromInstructionsHtml(html: string): Step[] {
  const listTexts = extractOrderedListTexts(html);
  if (listTexts.length >= 2) {
    return listTexts.map((text, order) => ({
      id: `sp-st-${order}`,
      text,
      order,
    }));
  }

  const plain = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|div|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  const lines = plain
    .split(/\n+/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length > 2);

  const chunks: string[] = [];
  for (const line of lines) {
    const splitNumbered = line
      .split(/(?=\s*(?:step\s*)?\d+[\.)]\s+)/i)
      .map((s) => s.trim())
      .filter(Boolean);
    if (splitNumbered.length > 1) {
      chunks.push(...splitNumbered);
    } else {
      chunks.push(line);
    }
  }

  return chunks.map((text, order) => ({
    id: `sp-st-${order}`,
    text,
    order,
  }));
}

function stepBodiesTotalLen(steps: Step[]): number {
  return steps.reduce((n, s) => n + s.text.length, 0);
}

function renumberSteps(steps: Step[]): Step[] {
  return steps.map((s, order) => ({
    ...s,
    id: `sp-st-${order}`,
    order,
  }));
}

/** Prefer fuller instruction text when Spoonacular’s analyzed steps look truncated. */
function pickBestSteps(data: SpoonacularExtracted): Step[] {
  const fromAnalyzed = stepsFromAnalyzed(data);
  const analyzedLen = stepBodiesTotalLen(fromAnalyzed);

  let fromInstr: Step[] = [];
  if (data.instructions?.trim()) {
    fromInstr = stepsFromInstructionsHtml(data.instructions);
  }
  const instrLen = stepBodiesTotalLen(fromInstr);

  if (fromInstr.length > 0 && instrLen > analyzedLen + 120) {
    return renumberSteps(fromInstr);
  }
  if (fromAnalyzed.length > 0) {
    return fromAnalyzed;
  }
  if (fromInstr.length > 0) {
    return renumberSteps(fromInstr);
  }
  return [
    {
      id: "sp-st-0",
      text: "Follow the instructions from your source recipe.",
      order: 0,
    },
  ];
}

/** When Recipe Information API returns fuller analyzed instructions (e.g. cooking meat), prefer it. */
function preferRicherSteps(extractSteps: Step[], infoSteps: Step[]): Step[] {
  const lenA = stepBodiesTotalLen(extractSteps);
  const lenB = stepBodiesTotalLen(infoSteps);
  if (extractSteps.length === 0) return infoSteps.length ? renumberSteps(infoSteps) : extractSteps;
  if (infoSteps.length === 0) return extractSteps;
  if (lenB > lenA + 60) return renumberSteps(infoSteps);
  if (infoSteps.length > extractSteps.length && lenB >= lenA * 0.85) {
    return renumberSteps(infoSteps);
  }
  if (lenB > lenA) return renumberSteps(infoSteps);
  return extractSteps;
}

async function fetchRecipeInformationPayload(
  recipeId: number,
  apiKey: string,
): Promise<SpoonacularExtracted | null> {
  try {
    const u = new URL(
      `https://api.spoonacular.com/recipes/${recipeId}/information`,
    );
    u.searchParams.set("apiKey", apiKey);
    u.searchParams.set("includeNutrition", "false");
    const res = await fetch(u.toString(), { next: { revalidate: 0 } });
    if (!res.ok) return null;
    return (await res.json()) as SpoonacularExtracted;
  } catch {
    return null;
  }
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

/** Plain text from Spoonacular HTML summary + drop popularity / social tails (not a social product). */
function summaryFromSpoonacularHtml(html: string): string {
  let s = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  // Trailing stats / engagement Spoonacular often appends after nutrition sentences
  s = s.replace(/\s*[\d,]+\s+likes?\.?$/i, "");
  s = s.replace(/\s*\d+\s+people\s+(?:have\s+)?(?:made|cooked|liked)\s+this\.?$/i, "");
  s = s.replace(
    /\s*\d+\s+person(?:s)?(?:\s+is|\s+are)?\s+cooking\s+this\.?$/i,
    "",
  );
  s = s.replace(/\s*\d+\s+perso[^.!?]*[.!?]?$/i, "");
  // Last sentence: digits + person/people + likes-style noise
  const sentences = s.split(/(?<=[.!?])\s+/).filter(Boolean);
  const dropSocial = (line: string) => {
    const t = line.trim().toLowerCase();
    if (/^\d+[,.]?\d*\s*(likes?|people|person)\b/.test(t)) return true;
    if (/\b(person|people)\s+(is|are)\s+cooking\b/.test(t)) return true;
    if (/^\d+\s+people\s+have\s+(made|cooked)\b/.test(t)) return true;
    return false;
  };
  while (sentences.length && dropSocial(sentences[sentences.length - 1]!)) {
    sentences.pop();
  }
  return sentences.join(" ").trim();
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
  let steps = pickBestSteps(data);
  if (typeof data.id === "number") {
    const info = await fetchRecipeInformationPayload(data.id, key);
    if (info) {
      const infoSteps = pickBestSteps(info);
      steps = preferRicherSteps(steps, infoSteps);
    }
  }
  const prepItems = inferPrepFromSteps(steps);

  const summaryPlain = data.summary
    ? summaryFromSpoonacularHtml(data.summary)
    : "";

  return {
    title: data.title?.trim() || "Imported recipe",
    summary:
      summaryPlain ||
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
