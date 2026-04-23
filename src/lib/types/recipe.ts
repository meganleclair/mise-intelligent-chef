export type PrepUrgency = "before_start" | "same_day" | "overnight";

export type PrepItem = {
  id: string;
  text: string;
  leadTimeMinutes?: number;
  urgency?: PrepUrgency;
  sortOrder: number;
};

export type Ingredient = {
  id: string;
  name: string;
  quantity?: string;
  unit?: string;
  note?: string;
  /** Original recipe line name—used to look up swap options after a substitution. */
  swapBasisName?: string;
};

export type Step = {
  id: string;
  text: string;
  order: number;
};

export type CleanRecipe = {
  title: string;
  summary: string;
  imageUrl: string | null;
  sourceUrl: string;
  servings: number;
  ingredients: Ingredient[];
  steps: Step[];
  prepItems: PrepItem[];
  spoonacularId?: number | null;
};

export type TimerState = {
  label: string | null;
  endsAt: string;
} | null;
