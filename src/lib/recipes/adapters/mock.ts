import type { CleanRecipe } from "@/lib/types/recipe";

const DEMO_IMAGE =
  "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=1200&q=80";

/**
 * Fully working mock — returns a cleaned recipe for any URL when no API key / forced mock.
 */
export async function importRecipeMock(url: string): Promise<CleanRecipe> {
  void url;
  return {
    title: "Slow-roasted tomato & white bean stew",
    summary:
      "A quiet, deeply savory one-pot dinner. Mise cleans the steps so you can focus on the cooking.",
    imageUrl: DEMO_IMAGE,
    sourceUrl: url || "https://example.com/recipes/tomato-bean-stew",
    servings: 4,
    ingredients: [
      {
        id: "ing-1",
        name: "Extra-virgin olive oil",
        quantity: "3",
        unit: "tbsp",
      },
      { id: "ing-2", name: "Yellow onion", quantity: "1", unit: "large" },
      { id: "ing-3", name: "Garlic cloves", quantity: "4", unit: "cloves" },
      {
        id: "ing-4",
        name: "Cherry tomatoes",
        quantity: "2",
        unit: "lb",
      },
      {
        id: "ing-5",
        name: "Cooked white beans",
        quantity: "3",
        unit: "cups",
      },
      {
        id: "ing-6",
        name: "Vegetable stock",
        quantity: "3",
        unit: "cups",
      },
      {
        id: "ing-7",
        name: "Heavy cream",
        quantity: "½",
        unit: "cup",
      },
      { id: "ing-8", name: "Fresh thyme", quantity: "6", unit: "sprigs" },
    ],
    steps: [
      {
        id: "st-1",
        order: 0,
        text: "Heat olive oil in a heavy pot over medium heat. Cook onion until soft, 8 minutes.",
      },
      {
        id: "st-2",
        order: 1,
        text: "Add garlic; cook 1 minute until fragrant.",
      },
      {
        id: "st-3",
        order: 2,
        text: "Add tomatoes, beans, and stock. Bring to a gentle simmer.",
      },
      {
        id: "st-4",
        order: 3,
        text: "Cover partly; simmer 35–40 minutes until tomatoes collapse and broth deepens.",
      },
      {
        id: "st-5",
        order: 4,
        text: "Stir in cream and thyme. Simmer 3 minutes. Taste for salt.",
      },
      {
        id: "st-6",
        order: 5,
        text: "Serve warm, with good bread alongside.",
      },
    ],
    prepItems: [
      {
        id: "prep-1",
        text: "Soak beans overnight if using dried (or use canned and skip).",
        leadTimeMinutes: 720,
        urgency: "overnight",
        sortOrder: 0,
      },
      {
        id: "prep-2",
        text: "Set cream and stock on the counter 20 minutes before cooking.",
        leadTimeMinutes: 20,
        urgency: "before_start",
        sortOrder: 1,
      },
      {
        id: "prep-3",
        text: "Halve the cherry tomatoes while the onion softens.",
        urgency: "same_day",
        sortOrder: 2,
      },
    ],
    spoonacularId: null,
  };
}
