export type SwapOption = { label: string; impactNote: string };

const HEAVY_CREAM: SwapOption[] = [
  {
    label: "Half & half",
    impactNote: "A little lighter; the sauce may be slightly thinner.",
  },
  {
    label: "Coconut milk",
    impactNote: "Adds gentle sweetness; simmer 2–3 minutes longer to thicken.",
  },
  {
    label: "Greek yogurt",
    impactNote: "Tangier and thicker; stir off heat so it doesn’t curdle.",
  },
];

const OLIVE_OIL: SwapOption[] = [
  {
    label: "Butter",
    impactNote: "Richer; watch heat so it doesn’t brown unless you want it.",
  },
  {
    label: "Grapeseed oil",
    impactNote: "Neutral; use the same amount with slightly less aroma.",
  },
];

const lookup: Record<string, SwapOption[]> = {
  "heavy cream": HEAVY_CREAM,
  "extra-virgin olive oil": OLIVE_OIL,
  "olive oil": OLIVE_OIL,
};

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

export function getSwapOptionsForIngredient(name: string): SwapOption[] {
  const key = normalizeName(name);
  return lookup[key] ?? [];
}
