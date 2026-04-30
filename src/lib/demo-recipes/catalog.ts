import type { CleanRecipe } from "@/lib/types/recipe";

export type DemoRecipeMeta = {
  slug: string;
  /** Short enticing line under the card title */
  teaser: string;
  /** Badge text (e.g. cook time vibe) */
  badge: string;
};

export type DemoRecipeBundle = DemoRecipeMeta & { recipe: CleanRecipe };

/** Curated built-in recipes—controlled structure so layout and cook mode behave predictably. */
// Rustic tomato-and-bean stew in a wide pot
const UP1 =
  "https://images.unsplash.com/photo-1608135227059-50a5e5a7c1d1?w=1400&q=80";
// Golden sheet-pan chicken thighs with lemon and herbs
const UP2 =
  "https://images.unsplash.com/photo-1598103442097-8b74394b95c1?w=1400&q=80";
// Close-up spaghetti aglio e olio with herbs
const UP3 =
  "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=1400&q=80";

export const DEMO_LIST: DemoRecipeBundle[] = [
  {
    slug: "tomato-white-bean-stew",
    teaser: "One pot, mellow tomatoes, silky broth—perfect for paging through steps.",
    badge: "~45 min",
    recipe: {
      title: "Slow-roasted tomato & white bean stew",
      summary:
        "A quiet, deeply savory dinner in one pot. Ingredients and pacing are tuned so Mise reads clearly end-to-end.",
      imageUrl: UP1,
      sourceUrl:
        "https://example.com/demo/slow-roasted-tomato-white-bean-stew",
      servings: 4,
      ingredients: [
        {
          id: "demo-ing-1",
          name: "Extra-virgin olive oil",
          quantity: "3",
          unit: "tbsp",
        },
        { id: "demo-ing-2", name: "Yellow onion", quantity: "1", unit: "large" },
        { id: "demo-ing-3", name: "Garlic cloves", quantity: "4", unit: "cloves" },
        {
          id: "demo-ing-4",
          name: "Cherry tomatoes",
          quantity: "2",
          unit: "lb",
        },
        {
          id: "demo-ing-5",
          name: "Cooked white beans",
          quantity: "3",
          unit: "cups",
        },
        {
          id: "demo-ing-6",
          name: "Vegetable stock",
          quantity: "3",
          unit: "cups",
        },
        {
          id: "demo-ing-7",
          name: "Heavy cream",
          quantity: "½",
          unit: "cup",
        },
        {
          id: "demo-ing-8",
          name: "Fresh thyme",
          quantity: "6",
          unit: "sprigs",
        },
      ],
      steps: [
        {
          id: "demo-st-1",
          order: 0,
          text: "Warm olive oil over medium heat. Add diced onion with a pinch of salt; stir often until softened, about 8 minutes.",
        },
        {
          id: "demo-st-2",
          order: 1,
          text: "Stir in smashed garlic cloves; cook gently until fragrant, about 60 seconds—the pan should smell sweet, not brown.",
        },
        {
          id: "demo-st-3",
          order: 2,
          text: "Pour in cherry tomatoes, beans, and stock. Scrape anything stuck on the pan; bring barely to a bubble, then dial to a mellow simmer.",
        },
        {
          id: "demo-st-4",
          order: 3,
          text: "Cook partly covered 35–40 minutes until tomatoes burst and thicken the broth. Smash a spoonful against the sides if they need help.",
        },
        {
          id: "demo-st-5",
          order: 4,
          text: "Stir in cream off the heat for a silky finish. Strip thyme leaves, fold in whole, simmer 3 minutes.",
        },
        {
          id: "demo-st-6",
          order: 5,
          text: "Taste loudly for salt and pepper; serve shallow bowls with toasted bread rubbed with garlic.",
        },
      ],
      prepItems: [
        {
          id: "demo-prep-1",
          text: "If using canned beans, rinse and drain. If dried, soak ahead per package timing.",
          leadTimeMinutes: 30,
          urgency: "same_day",
          sortOrder: 0,
        },
      ],
      spoonacularId: null,
    },
  },
  {
    slug: "lemon-rosemary-sheet-pan-chicken",
    teaser: "Clear oven stages—sear, roast vegetables, lemon finish.",
    badge: "~50 min",
    recipe: {
      title: "Lemon rosemary sheet-pan chicken with potatoes",
      summary:
        "Demonstrates sequencing: protein first browning, then veg, then brighten at the end. Great for swipe-through cook mode.",
      imageUrl: UP2,
      sourceUrl: "https://example.com/demo/sheet-pan-lemon-rosemary-chicken",
      servings: 4,
      ingredients: [
        {
          id: "demo-ing-b1",
          name: "Chicken thighs bone-in skin-on",
          quantity: "6",
          unit: "pieces",
        },
        {
          id: "demo-ing-b2",
          name: "Baby potatoes halved",
          quantity: "1½",
          unit: "lb",
        },
        {
          id: "demo-ing-b3",
          name: "Broccoli crowns",
          quantity: "12",
          unit: "oz",
        },
        {
          id: "demo-ing-b4",
          name: "Olive oil",
          quantity: "3",
          unit: "tbsp",
        },
        {
          id: "demo-ing-b5",
          name: "Fresh rosemary chopped",
          quantity: "2",
          unit: "tbsp",
        },
        {
          id: "demo-ing-b6",
          name: "Lemon zest and juice",
          quantity: "1",
          unit: "whole lemon",
        },
        {
          id: "demo-ing-b7",
          name: "Kosher salt and black pepper",
        },
      ],
      steps: [
        {
          id: "demo-st-b1",
          order: 0,
          text: "Heat oven to 425°F / 218°C with a rimmed baking sheet inside for 15 minutes—you want ripping-hot metal for crispy skin.",
        },
        {
          id: "demo-st-b2",
          order: 1,
          text: "Toss thighs with 2 tablespoons oil, half the rosemary, salt, pepper, and half the zest. Arrange skin-side up on sheet; roast alone 28–32 minutes until gold.",
        },
        {
          id: "demo-st-b3",
          order: 2,
          text: "Toss potatoes with remaining tablespoon oil + salt until glossy. Scatter around chicken; roast 22–25 minutes more until potatoes fork-soft.",
        },
        {
          id: "demo-st-b4",
          order: 3,
          text: "Scatter broccoli onto free space; drizzle light oil plus salt—12–15 minutes until tips char but stems still vivid.",
        },
        {
          id: "demo-st-b5",
          order: 4,
          text: "Rest chicken loosely 10 minutes—juices reset and skin stays audible.",
        },
        {
          id: "demo-st-b6",
          order: 5,
          text: "Finish platter with squeezed lemon juice, remaining zest, rosemary, and flaky salt lifted from elbow height.",
        },
      ],
      prepItems: [
        {
          id: "demo-prep-b1",
          text: "Pat chicken skin aggressively dry—the drier skin, crispier browning.",
          urgency: "before_start",
          sortOrder: 0,
        },
      ],
      spoonacularId: null,
    },
  },
  {
    slug: "spaghetti-garlic-olive-oil",
    teaser: "A few pantry staples, one pan rhythm—classic weeknight pacing.",
    badge: "~25 min",
    recipe: {
      title: "Spaghetti aglio e olio with parsley",
      summary:
        "Short ingredient list and clear timing: oil warms gently, pasta finishes al dente, parsley lifts at the end.",
      imageUrl: UP3,
      sourceUrl: "https://example.com/demo/spaghetti-garlic-olive-oil",
      servings: 4,
      ingredients: [
        {
          id: "demo-ing-c1",
          name: "Dried spaghetti",
          quantity: "1",
          unit: "lb",
        },
        {
          id: "demo-ing-c2",
          name: "Extra-virgin olive oil",
          quantity: "⅓",
          unit: "cup",
        },
        {
          id: "demo-ing-c3",
          name: "Garlic cloves thinly sliced",
          quantity: "6",
          unit: "cloves",
        },
        {
          id: "demo-ing-c4",
          name: "Red pepper flakes",
          quantity: "½",
          unit: "tsp",
        },
        {
          id: "demo-ing-c5",
          name: "Kosher salt",
        },
        {
          id: "demo-ing-c6",
          name: "Flat-leaf parsley chopped",
          quantity: "½",
          unit: "cup",
        },
        {
          id: "demo-ing-c7",
          name: "Parmesan shaved (optional)",
        },
        {
          id: "demo-ing-c8",
          name: "Reserved pasta cooking water",
        },
      ],
      steps: [
        {
          id: "demo-st-c1",
          order: 0,
          text: "Bring a tall pot of very salty water to a rolling boil—you want seawater vibes for the pasta.",
        },
        {
          id: "demo-st-c2",
          order: 1,
          text: "Add spaghetti; stir once so strands don&apos;t weld. Reserve 2 cups cloudy water before draining 1 minute shy of package al dente.",
        },
        {
          id: "demo-st-c3",
          order: 2,
          text: "In a wide skillet, warm olive oil over medium-low until shimmering. Add garlic slices and pepper flakes; swirl until garlic turns ivory at edges—not brown.",
        },
        {
          id: "demo-st-c4",
          order: 3,
          text: "Toss drained pasta into skillet; splash in pasta water tablespoon by tablespoon until silky—sauce tightens glossy in the pan.",
        },
        {
          id: "demo-st-c5",
          order: 4,
          text: "Kill heat. Fold parsley, taste for salt, finish with parmesan if using. Eat hot while parsley still whistles bright.",
        },
      ],
      prepItems: [],
      spoonacularId: null,
    },
  },
];

export type DemoCard = DemoRecipeMeta & {
  title: string;
  imageUrl: string | null;
};

export function listDemoCards(): DemoCard[] {
  return DEMO_LIST.map(({ slug, teaser, badge, recipe }) => ({
    slug,
    teaser,
    badge,
    title: recipe.title,
    imageUrl: recipe.imageUrl,
  }));
}

export function getDemoRecipe(slug: string): DemoRecipeBundle | null {
  return DEMO_LIST.find((d) => d.slug === slug) ?? null;
}
