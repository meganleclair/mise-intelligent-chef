import type { Ingredient } from "@/lib/types/recipe";

export type SwapGoal =
  | "high_protein"
  | "lower_calorie"
  | "lower_carb"
  | "higher_fiber"
  | "lower_sodium"
  | "dairy_free";

export type SwapOption = {
  label: string;
  impactNote: string;
  /** When set, this pick aligns with a batch “recipe shift” goal. */
  goals?: SwapGoal[];
};

function normalizeKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\s+/g, " ");
}

/** Strip leading amounts so “2 tbsp olive oil” matches “olive oil”. */
export function normalizeIngredientLookup(name: string): string {
  let s = normalizeKey(name);
  s = s.replace(
    /^\s*[\d¼½⅓⅔⅛⅜⅝⅞\/.\s-]+(?:tbsp|tablespoons?|tsp|teaspoons?|cups?|oz|ounces?|lb|lbs|pounds?|g|grams?|kg|ml|cloves?|large|medium|small|whole)?\s*/i,
    "",
  );
  return s.trim();
}

const HEAVY_CREAM: SwapOption[] = [
  {
    label: "Half & half",
    impactNote: "A little lighter; the sauce may be slightly thinner.",
    goals: ["lower_calorie"],
  },
  {
    label: "Coconut milk (unsweetened)",
    impactNote: "Silky and dairy-free; simmer a minute longer for sauce body.",
    goals: ["lower_calorie", "dairy_free"],
  },
  {
    label: "Greek yogurt (whole-milk)",
    impactNote: "Much higher protein; stir off heat so it doesn’t curdle.",
    goals: ["high_protein", "lower_calorie"],
  },
];

const OLIVE_OIL: SwapOption[] = [
  {
    label: "Butter",
    impactNote: "Richer and softer aromatic; mind browning if you want it pale.",
    goals: ["lower_calorie"],
  },
  {
    label: "Grapeseed or avocado oil",
    impactNote: "Neutral and easy at high heat—similar calories, often feels lighter.",
    goals: ["lower_calorie"],
  },
];

const SOY_SAUCE: SwapOption[] = [
  {
    label: "Reduced-sodium soy sauce",
    impactNote: "Same savor, less salt—taste before adding more.",
    goals: ["lower_sodium"],
  },
  {
    label: "Coconut aminos",
    impactNote: "Sweeter and usually lower sodium; thin with a splash of water if needed.",
    goals: ["lower_sodium", "lower_calorie"],
  },
];

const SALT: SwapOption[] = [
  {
    label: "Half the salt + citrus zest or herbs",
    impactNote: "Brightness without relying on sodium.",
    goals: ["lower_sodium"],
  },
];

const BUTTER: SwapOption[] = [
  {
    label: "Olive oil (use ~¾ the volume of butter)",
    impactNote: "Less saturated fat; sauces stay loose rather than creamy.",
    goals: ["lower_calorie", "dairy_free"],
  },
  {
    label: "Vegan butter stick (1:1)",
    impactNote: "Closest to dairy butter for baking and sautéing when you need that behavior.",
    goals: ["dairy_free", "lower_calorie"],
  },
];

const SOUR_CREAM: SwapOption[] = [
  {
    label: "Plain Greek yogurt",
    impactNote: "Much more protein; tangy—finish off heat.",
    goals: ["high_protein", "lower_calorie"],
  },
  {
    label: "Light sour cream",
    impactNote: "Small calorie trim with familiar tang.",
    goals: ["lower_calorie"],
  },
];

const MAYO: SwapOption[] = [
  {
    label: "Plain Greek yogurt",
    impactNote: "Big protein bump; thinner—thin with lemon or water.",
    goals: ["high_protein", "lower_calorie"],
  },
  {
    label: "Light mayonnaise",
    impactNote: "Easiest 1:1 swap when texture matters most.",
    goals: ["lower_calorie"],
  },
];

const MILK: SwapOption[] = [
  {
    label: "Unsweetened almond or oat milk",
    impactNote: "Dairy-free; oat is creamiest for sauces.",
    goals: ["dairy_free", "lower_calorie"],
  },
  {
    label: "Unsweetened soy milk",
    impactNote: "Dairy-free with more protein than most alt milks.",
    goals: ["dairy_free", "high_protein", "lower_calorie"],
  },
  {
    label: "Skim milk",
    impactNote: "Still dairy flavor with less fat.",
    goals: ["lower_calorie"],
  },
];

const CREAM_CHEESE: SwapOption[] = [
  {
    label: "Cashew cream cheese-style spread",
    impactNote: "Dairy-free; mild and creamy—season to taste.",
    goals: ["dairy_free"],
  },
  {
    label: "Neufchâtel (⅓-less-fat cream cheese)",
    impactNote: "Very close texture with a modest calorie trim.",
    goals: ["lower_calorie"],
  },
  {
    label: "Whipped low-fat cream cheese",
    impactNote: "Airy texture; slightly easier to spread thin.",
    goals: ["lower_calorie"],
  },
];

const SUGAR: SwapOption[] = [
  {
    label: "Half the sugar + vanilla or spice bump",
    impactNote: "Cuts sweetness calories while keeping aroma.",
    goals: ["lower_calorie"],
  },
  {
    label: "Monk fruit blend (follow package 1:1 guidance)",
    impactNote: "Near-zero-cal sweetness—can taste slightly different when cooked.",
    goals: ["lower_calorie", "lower_carb"],
  },
];

const HONEY: SwapOption[] = [
  {
    label: "Pure maple syrup (slightly less volume)",
    impactNote: "Different flavor; still calorie-dense—use sparingly.",
    goals: ["lower_calorie"],
  },
  {
    label: "Apple sauce (in baking batters)",
    impactNote: "Natural sweetness + moisture with modest calorie savings in cakes/muffins.",
    goals: ["lower_calorie"],
  },
];

const RICE: SwapOption[] = [
  {
    label: "Cauliflower rice",
    impactNote: "Much lower carb/cal for volume—watch moisture in the pan.",
    goals: ["lower_calorie", "lower_carb"],
  },
  {
    label: "Quinoa",
    impactNote: "More fiber and protein than white rice; nuttier bite.",
    goals: ["high_protein", "higher_fiber"],
  },
  {
    label: "Brown rice",
    impactNote: "More fiber than white; cooks longer—add splash of liquid if swapping mid-recipe.",
    goals: ["higher_fiber"],
  },
];

const PASTA: SwapOption[] = [
  {
    label: "Chickpea or lentil pasta",
    impactNote: "More protein and fiber; firmer bite—check package cook time.",
    goals: ["high_protein", "higher_fiber"],
  },
  {
    label: "Spiralized zucchini or hearts of palm pasta",
    impactNote: "Very low carb and light—quick cook; drain well.",
    goals: ["lower_calorie", "lower_carb", "higher_fiber"],
  },
  {
    label: "Whole-wheat pasta",
    impactNote: "More fiber than white pasta; earthy flavor.",
    goals: ["higher_fiber"],
  },
];

const GROUND_BEEF: SwapOption[] = [
  {
    label: "Ground turkey breast (93/7)",
    impactNote: "Leaner—add a splash of broth so it doesn’t dry out.",
    goals: ["lower_calorie", "high_protein"],
  },
  {
    label: "Extra-lean ground beef (93/7)",
    impactNote: "Still beefy with less fat than typical 80/20.",
    goals: ["lower_calorie"],
  },
];

const BACON: SwapOption[] = [
  {
    label: "Canadian bacon or ham",
    impactNote: "Much leaner; adjust salt since cured meats vary.",
    goals: ["lower_calorie", "high_protein"],
  },
  {
    label: "Turkey bacon",
    impactNote: "Lower fat; crisp differently—watch heat.",
    goals: ["lower_calorie"],
  },
];

const CHICKEN_THIGH: SwapOption[] = [
  {
    label: "Boneless skinless chicken breast",
    impactNote: "Leaner protein; cooks faster—don’t overcook.",
    goals: ["lower_calorie", "high_protein"],
  },
];

const BREADCRUMBS: SwapOption[] = [
  {
    label: "Crushed cornflakes (unsweetened)",
    impactNote: "Light crunch with less oil absorption—season well.",
    goals: ["lower_calorie"],
  },
  {
    label: "Almond flour",
    impactNote: "Low-carb crunch; browns fast—use gentle heat.",
    goals: ["lower_calorie", "lower_carb"],
  },
];

const PARMESAN: SwapOption[] = [
  {
    label: "Nutritional yeast (start small)",
    impactNote: "Savory “cheesy” flavor with minimal calories—won’t melt like parm.",
    goals: ["lower_calorie"],
  },
  {
    label: "Part-skim grated mozzarella",
    impactNote: "Melts nicely with less fat than aged hard cheeses (context-dependent).",
    goals: ["lower_calorie"],
  },
];

const COCONUT_MILK: SwapOption[] = [
  {
    label: "Light coconut milk",
    impactNote: "Thinner with fewer calories—less creamy mouthfeel.",
    goals: ["lower_calorie"],
  },
  {
    label: "Evaporated skim milk + coconut extract",
    impactNote: "Much lighter; optional tiny splash of oil for mouthfeel.",
    goals: ["lower_calorie"],
  },
];

const lookup: Record<string, SwapOption[]> = {
  "heavy cream": HEAVY_CREAM,
  "heavy whipping cream": HEAVY_CREAM,
  "whipping cream": HEAVY_CREAM,

  "extra-virgin olive oil": OLIVE_OIL,
  "olive oil": OLIVE_OIL,
  "vegetable oil": OLIVE_OIL,
  "canola oil": OLIVE_OIL,

  butter: BUTTER,
  "unsalted butter": BUTTER,

  "sour cream": SOUR_CREAM,
  mayonnaise: MAYO,

  milk: MILK,
  "whole milk": MILK,

  "cream cheese": CREAM_CHEESE,

  sugar: SUGAR,
  "brown sugar": SUGAR,
  "granulated sugar": SUGAR,

  honey: HONEY,

  rice: RICE,
  "white rice": RICE,
  "long grain rice": RICE,

  pasta: PASTA,
  spaghetti: PASTA,
  linguine: PASTA,

  "ground beef": GROUND_BEEF,

  bacon: BACON,

  "chicken thighs": CHICKEN_THIGH,
  "chicken thigh": CHICKEN_THIGH,

  breadcrumbs: BREADCRUMBS,
  "bread crumbs": BREADCRUMBS,
  panko: BREADCRUMBS,

  parmesan: PARMESAN,
  "parmesan cheese": PARMESAN,

  "coconut milk": COCONUT_MILK,

  "soy sauce": SOY_SAUCE,
  tamari: SOY_SAUCE,

  salt: SALT,
  "sea salt": SALT,
  "kosher salt": SALT,
};

const SORTED_KEYS = Object.keys(lookup).sort((a, b) => b.length - a.length);

export function getSwapOptionsForIngredient(name: string): SwapOption[] {
  const n = normalizeIngredientLookup(name);
  if (!n) return [];
  if (lookup[n]) return lookup[n];
  for (const key of SORTED_KEYS) {
    if (n.includes(key)) return lookup[key]!;
  }
  if (n.length >= 4) {
    for (const key of SORTED_KEYS) {
      if (key.includes(n)) return lookup[key]!;
    }
  }
  return [];
}

export function getSwapOptionForGoal(
  ingredientLineName: string,
  goal: SwapGoal,
): SwapOption | null {
  const opts = getSwapOptionsForIngredient(ingredientLineName);
  if (opts.length === 0) return null;

  const tagged = opts.filter((o) => o.goals?.includes(goal));
  if (tagged.length > 0) return tagged[0]!;

  if (goal === "lower_calorie") {
    const hinted = opts.find((o) =>
      /lighter|lower|fewer|less fat|skim|light|lean|reduce/i.test(o.impactNote),
    );
    if (hinted) return hinted;
  }
  if (goal === "high_protein") {
    const hinted = opts.find((o) =>
      /protein|greek yogurt|quinoa|lean|turkey breast|chickpea|lentil|soy/i.test(
        o.label + o.impactNote,
      ),
    );
    if (hinted) return hinted;
  }
  if (goal === "lower_carb") {
    const hinted = opts.find((o) =>
      /cauliflower|almond|zucchini|hearts of palm|monk fruit|fiber|whole-wheat(?!\s+sugar)/i.test(
        o.label + o.impactNote,
      ),
    );
    if (hinted) return hinted;
  }
  if (goal === "higher_fiber") {
    const hinted = opts.find((o) =>
      /brown rice|whole-wheat|quinoa|chickpea|lentil|bean|oats|vegetable/i.test(
        o.label + o.impactNote,
      ),
    );
    if (hinted) return hinted;
  }
  if (goal === "lower_sodium") {
    const hinted = opts.find((o) =>
      /salt|soy|sodium|herb|aminos|tamari|citrus/i.test(o.label + o.impactNote),
    );
    if (hinted) return hinted;
  }
  if (goal === "dairy_free") {
    const hinted = opts.find((o) =>
      /oat|almond|coconut milk|cashew|dairy-free|vegan|coconut(?!\s+sugar)/i.test(
        o.label + o.impactNote,
      ),
    );
    if (hinted) return hinted;
  }

  return null;
}

export const SHIFT_GOAL_LABEL: Record<SwapGoal, string> = {
  high_protein: "Higher protein",
  lower_calorie: "Lower calorie",
  lower_carb: "Lower carb",
  higher_fiber: "Higher fiber",
  lower_sodium: "Lower sodium",
  dairy_free: "Dairy-free",
};

/** Matches `[Higher protein shift]` or `[Dairy-free + Lower calorie shift]` etc. */
const BATCH_SHIFT_PREFIX = /^\[[^\]]+ shift\]/i;

export function isBatchShiftNote(note: string | null | undefined): boolean {
  return BATCH_SHIFT_PREFIX.test(note ?? "");
}

/**
 * When two selected shifts choose different substitutes for the same ingredient,
 * earlier entries win (e.g. dairy-free beats higher protein on butter vs yogurt).
 */
export const CONFLICT_RESOLUTION_PRIORITY: readonly SwapGoal[] = [
  "dairy_free",
  "lower_sodium",
  "lower_calorie",
  "lower_carb",
  "higher_fiber",
  "high_protein",
] as const;

export type BatchSwapConflict = {
  ingredientKey: string;
  ingredientName: string;
  alternatives: { goal: SwapGoal; label: string }[];
  winningGoal: SwapGoal;
  winningLabel: string;
  winningImpactNote: string;
};

export type BatchSwapRowPayload = {
  ingredient_key: string;
  replacement_label: string;
  impact_note: string;
};

function priorityIndex(g: SwapGoal): number {
  const i = CONFLICT_RESOLUTION_PRIORITY.indexOf(g);
  return i === -1 ? 999 : i;
}

export function pickWinningGoal(goals: SwapGoal[]): SwapGoal {
  const uniq = [...new Set(goals)];
  uniq.sort(
    (a, b) => priorityIndex(a) - priorityIndex(b) || a.localeCompare(b),
  );
  return uniq[0]!;
}

function normalizeReplacementLabel(label: string): string {
  return label.trim().toLowerCase();
}

/**
 * Builds rows for batch shifts. If `resolveConflicts` is false and any ingredient
 * has conflicting picks, returns `{ rows: [], conflicts }` (all-or-nothing preview).
 */
export function buildBatchSwapRows(
  ingredients: Ingredient[],
  goals: SwapGoal[],
  manualKeys: Set<string>,
  resolveConflicts: boolean,
): { rows: BatchSwapRowPayload[]; conflicts: BatchSwapConflict[] } {
  const deduped = [...new Set(goals)];
  const agreementRows: BatchSwapRowPayload[] = [];
  const conflictDetails: BatchSwapConflict[] = [];

  for (const ing of ingredients) {
    if (manualKeys.has(ing.id)) continue;

    const picks: { goal: SwapGoal; opt: SwapOption }[] = [];
    for (const g of deduped) {
      const opt = getSwapOptionForGoal(ing.name, g);
      if (!opt) continue;
      if (
        normalizeReplacementLabel(opt.label) ===
        normalizeReplacementLabel(ing.name)
      ) {
        continue;
      }
      picks.push({ goal: g, opt });
    }

    if (picks.length === 0) continue;

    const uniqueLabels = new Set(
      picks.map((p) => normalizeReplacementLabel(p.opt.label)),
    );

    if (uniqueLabels.size === 1) {
      const contributingGoals = [...new Set(picks.map((p) => p.goal))];
      contributingGoals.sort(
        (a, b) =>
          priorityIndex(a) - priorityIndex(b) || a.localeCompare(b),
      );
      const labelParts = contributingGoals.map((g) => SHIFT_GOAL_LABEL[g]);
      const primary = picks.find((p) => p.goal === contributingGoals[0])!;
      agreementRows.push({
        ingredient_key: ing.id,
        replacement_label: primary.opt.label,
        impact_note: `[${labelParts.join(" + ")} shift] ${primary.opt.impactNote}`,
      });
      continue;
    }

    const altGoals = picks.map((p) => p.goal);
    const winningGoal = pickWinningGoal(altGoals);
    const winningPick =
      picks.find((p) => p.goal === winningGoal) ?? picks[0]!;

    conflictDetails.push({
      ingredientKey: ing.id,
      ingredientName: ing.name,
      alternatives: picks.map((p) => ({
        goal: p.goal,
        label: p.opt.label,
      })),
      winningGoal,
      winningLabel: winningPick.opt.label,
      winningImpactNote: winningPick.opt.impactNote,
    });
  }

  if (conflictDetails.length > 0 && !resolveConflicts) {
    return { rows: [], conflicts: conflictDetails };
  }

  const rows: BatchSwapRowPayload[] = [...agreementRows];
  for (const c of conflictDetails) {
    rows.push({
      ingredient_key: c.ingredientKey,
      replacement_label: c.winningLabel,
      impact_note: `[${SHIFT_GOAL_LABEL[c.winningGoal]} shift] ${c.winningImpactNote}`,
    });
  }

  return { rows, conflicts: [] };
}
