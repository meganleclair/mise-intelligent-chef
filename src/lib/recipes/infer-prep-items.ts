import type { PrepItem, Step } from "@/lib/types/recipe";

/**
 * Heuristically infer prep items from step text.
 * Shared by the JSON-LD and Spoonacular adapters so the logic stays in sync.
 */
export function inferPrepItems(steps: Step[], idPrefix = "prep"): PrepItem[] {
  const text = steps.map((s) => s.text.toLowerCase()).join(" ");
  const prep: PrepItem[] = [];
  let sort = 0;

  if (text.includes("overnight") || text.includes("soak")) {
    prep.push({
      id: `${idPrefix}-infer-1`,
      text: "Check whether anything needs soaking or resting overnight.",
      leadTimeMinutes: 720,
      urgency: "overnight",
      sortOrder: sort++,
    });
  }

  if (text.includes("room temperature") || text.includes("soften butter")) {
    prep.push({
      id: `${idPrefix}-infer-2`,
      text: "Pull cold ingredients to room temperature before you start.",
      leadTimeMinutes: 30,
      urgency: "before_start",
      sortOrder: sort++,
    });
  }

  if (prep.length === 0) {
    prep.push({
      id: `${idPrefix}-infer-default`,
      text: "Read the full recipe once before you begin.",
      urgency: "before_start",
      sortOrder: 0,
    });
  }

  return prep;
}
