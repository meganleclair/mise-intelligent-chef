# Nutrition Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-ingredient AI swap sheet and dietary-goal batch swaps with a recipe-scoped nutrition chat: a macro card (servings, ingredient swaps, estimated calories/protein/carbs/fat/fiber) backed by an open Claude conversation, with a Done Cooking/Exit save-vs-discard flow and cooked/not-cooked tracking.

**Architecture:** One new Supabase table (`recipe_nutrition_sessions`, one row per recipe per user — the "current version") replaces `recipe_modifications`. A single new API route (`/api/nutrition-chat`) handles every turn of the conversation — both freeform questions and structural changes (swaps, servings) — returning both a reply and the recalculated state in one JSON response, always retried server-side before failing loud. The live conversation itself is never persisted; only the resulting servings/overrides/macros are. This plan assumes [2026-07-22-remove-cook-mode.md](2026-07-22-remove-cook-mode.md) has already landed (Cook Mode's `IngredientSwapSheet` usage inside `cook-mode-client.tsx` is gone, so this plan only has to update the recipe detail page's usage of it).

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase (Postgres + RLS), `@anthropic-ai/sdk` (`claude-haiku-4-5`), shadcn `Sheet` (`@base-ui/react/dialog`), Vitest.

---

### Task 1: Database migration — drop `recipe_modifications`, add `recipe_nutrition_sessions`, extend `recipes`

**Files:**
- Create: `supabase/migrations/20260722000001_nutrition_sessions.sql`
- Modify: `supabase/complete-schema.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Replaces the single-ingredient swap model (recipe_modifications) with a
-- recipe-scoped nutrition chat: one "current version" per recipe per user.
drop table if exists public.recipe_modifications;

alter table public.recipes add column if not exists has_cooked boolean not null default false;
alter table public.recipes add column if not exists first_cooked_at timestamptz;

create table if not exists public.recipe_nutrition_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  servings integer not null,
  ingredient_overrides jsonb not null default '[]'::jsonb,
  macros jsonb,
  updated_at timestamptz not null default now(),
  unique (user_id, recipe_id)
);

alter table public.recipe_nutrition_sessions enable row level security;

create policy "Nutrition sessions own row" on public.recipe_nutrition_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists recipe_nutrition_sessions_updated_at on public.recipe_nutrition_sessions;
create trigger recipe_nutrition_sessions_updated_at
  before update on public.recipe_nutrition_sessions
  for each row execute function public.set_updated_at();

grant all on public.recipe_nutrition_sessions to authenticated;
```

Save as `supabase/migrations/20260722000001_nutrition_sessions.sql`.

- [ ] **Step 2: Update `supabase/complete-schema.sql` to match**

Remove the `-- ── recipe_modifications ──` section entirely. Add `has_cooked` and `first_cooked_at` columns to the `recipes` table definition. Add a new `-- ── recipe_nutrition_sessions ──` section with the same `create table`/RLS/trigger block as Step 1. Update the grants list at the bottom: remove `grant all on public.recipe_modifications to authenticated;`, add `grant all on public.recipe_nutrition_sessions to authenticated;`.

- [ ] **Step 3: Apply the migration to your Supabase project**

Open your Mise Supabase project → SQL Editor → New query → paste the full migration from Step 1 → Run.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260722000001_nutrition_sessions.sql supabase/complete-schema.sql
git commit -m "Add recipe_nutrition_sessions table, drop recipe_modifications, extend recipes with has_cooked"
```

---

### Task 2: New types for overrides and macros

**Files:**
- Modify: `src/lib/types/recipe.ts`

- [ ] **Step 1: Add `IngredientOverride`, `MacroEstimate`, and `ChatTurn` types**

Add to the end of `src/lib/types/recipe.ts`:

```ts
export type IngredientOverride = {
  original: string;
  replacement: string;
};

export type MacroEstimate = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
};

export type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};
```

- [ ] **Step 2: Verify the app still builds**

Run: `npm run build`
Expected: succeeds (new types are additive, nothing consumes them yet).

- [ ] **Step 3: Commit**

```bash
git add src/lib/types/recipe.ts
git commit -m "Add IngredientOverride, MacroEstimate, and ChatTurn types"
```

---

### Task 3: Replace the ingredient-merge logic (`mergeIngredientsWithMods` → `applyIngredientOverrides`)

**Files:**
- Modify: `src/lib/recipes/display.ts`
- Create: `src/lib/__tests__/display.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/display.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { applyIngredientOverrides } from "@/lib/recipes/display";
import type { Ingredient, IngredientOverride } from "@/lib/types/recipe";

const INGREDIENTS: Ingredient[] = [
  { id: "1", name: "White beans", quantity: "2", unit: "cup" },
  { id: "2", name: "Olive oil", quantity: "1/3", unit: "cup" },
  { id: "3", name: "Garlic", quantity: "2", unit: "clove" },
];

describe("applyIngredientOverrides", () => {
  it("returns ingredients unchanged when there are no overrides", () => {
    const result = applyIngredientOverrides(INGREDIENTS, []);
    expect(result).toEqual(INGREDIENTS);
  });

  it("replaces the name of a matching ingredient", () => {
    const overrides: IngredientOverride[] = [
      { original: "White beans", replacement: "Chickpeas" },
    ];
    const result = applyIngredientOverrides(INGREDIENTS, overrides);
    expect(result[0]!.name).toBe("Chickpeas");
    expect(result[0]!.swapBasisName).toBe("White beans");
    expect(result[1]!.name).toBe("Olive oil");
  });

  it("matches case-insensitively", () => {
    const overrides: IngredientOverride[] = [
      { original: "olive oil", replacement: "Avocado oil" },
    ];
    const result = applyIngredientOverrides(INGREDIENTS, overrides);
    expect(result[1]!.name).toBe("Avocado oil");
  });

  it("leaves ingredients with no matching override untouched", () => {
    const overrides: IngredientOverride[] = [
      { original: "Something not in the recipe", replacement: "X" },
    ];
    const result = applyIngredientOverrides(INGREDIENTS, overrides);
    expect(result).toEqual(INGREDIENTS);
  });

  it("applies multiple overrides independently", () => {
    const overrides: IngredientOverride[] = [
      { original: "White beans", replacement: "Chickpeas" },
      { original: "Garlic", replacement: "Garlic powder" },
    ];
    const result = applyIngredientOverrides(INGREDIENTS, overrides);
    expect(result[0]!.name).toBe("Chickpeas");
    expect(result[2]!.name).toBe("Garlic powder");
    expect(result[1]!.name).toBe("Olive oil");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/__tests__/display.test.ts`
Expected: FAIL — `applyIngredientOverrides` is not exported from `@/lib/recipes/display`.

- [ ] **Step 3: Replace the swap-specific exports in `display.ts`**

Replace `ModRow` and `mergeIngredientsWithMods` (the last 26 lines of the current file) with `applyIngredientOverrides`, and remove the now-unused `isManualIngredientSwap`, `parseSwapNote`, and the `"Swap:"`-note branch inside `formatIngredientLine` (that annotation scheme belonged to the old swap model). The full new contents of `src/lib/recipes/display.ts`:

```ts
import { decodeHtmlEntities } from "@/lib/decode-html-entities";
import type { Ingredient, IngredientOverride } from "@/lib/types/recipe";

/** Quantity + unit + name only (replacement line after a swap). */
export function getIngredientPrimaryLine(ing: Ingredient): string {
  const qty = ing.quantity?.trim();
  const unit = ing.unit?.trim();
  const unitLower = unit?.toLowerCase() ?? "";
  const name = (ing.name || "").trim();

  // Legacy bad parses: amount + unit "to" + empty name (Spoonacular range bug). Re-import fixes it.
  if (unitLower === "to" && !name && qty) {
    return decodeHtmlEntities(
      `Amount unclear (${qty} …). Re-import this recipe from home to refresh the full line.`,
    );
  }

  const structured = [qty, unit, name]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return decodeHtmlEntities(structured || name);
}

/**
 * One readable line for an ingredient: avoids duplicating Spoonacular-style
 * "amount + unit + name" next to the full original string.
 */
export function formatIngredientLine(ing: Ingredient): string {
  const qty = ing.quantity?.trim();
  const unit = ing.unit?.trim();
  const unitLower = unit?.toLowerCase() ?? "";
  const name = (ing.name || "").trim();
  const note = ing.note?.trim();

  // Legacy bad parses: amount + unit "to" + empty name (Spoonacular range bug). Re-import fixes it.
  if (unitLower === "to" && !name && qty) {
    return decodeHtmlEntities(
      `Amount unclear (${qty} …). Re-import this recipe from home to refresh the full line.`,
    );
  }

  const structured = [qty, unit, name]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  if (!note) {
    return decodeHtmlEntities(structured || name);
  }

  const n = note.toLowerCase();
  const head = structured.slice(0, Math.min(16, structured.length)).toLowerCase();
  if (head && n.includes(head) && note.length >= structured.length * 0.75) {
    return decodeHtmlEntities(note);
  }

  if (
    name &&
    n.includes(name.toLowerCase()) &&
    note.length > name.length + 12 &&
    /[\d¼½⅓]|teaspoon|tablespoon|cup\b/i.test(note)
  ) {
    return decodeHtmlEntities(note);
  }

  return decodeHtmlEntities(
    structured ? `${structured} — ${note}` : note,
  );
}

/** Applies the current nutrition-chat swaps to a recipe's ingredient list for display. */
export function applyIngredientOverrides(
  ingredients: Ingredient[],
  overrides: IngredientOverride[],
): Ingredient[] {
  const map = new Map(
    overrides.map((o) => [o.original.trim().toLowerCase(), o] as const),
  );
  return ingredients.map((ing) => {
    const match = map.get(ing.name.trim().toLowerCase());
    if (!match) return ing;
    return {
      ...ing,
      name: match.replacement,
      swapBasisName: ing.name,
    };
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/__tests__/display.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Verify no other file still imports the removed exports**

Run: `grep -rln "mergeIngredientsWithMods\|isManualIngredientSwap\|parseSwapNote\|ModRow" src`
Expected: matches only in files this plan will delete in Task 7 (`ingredient-swap-sheet.tsx`) or update in Task 8 (the recipe detail page) — nothing else.

- [ ] **Step 6: Commit**

```bash
git add src/lib/recipes/display.ts src/lib/__tests__/display.test.ts
git commit -m "Replace mergeIngredientsWithMods with applyIngredientOverrides for the nutrition-session model"
```

---

### Task 4: Claude nutrition-chat module with retry-then-fail-loud error handling

**Files:**
- Create: `src/lib/nutrition/chat.ts`
- Create: `src/lib/__tests__/nutrition-chat.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/__tests__/nutrition-chat.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreate = vi.fn();

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}));

async function importChat() {
  vi.resetModules();
  return await import("@/lib/nutrition/chat");
}

const BASE_PARAMS = {
  recipeTitle: "Marinated White Beans",
  ingredients: [
    { id: "1", name: "White beans", quantity: "2", unit: "cup" },
    { id: "2", name: "Olive oil", quantity: "1/2", unit: "cup" },
  ],
  state: { servings: 4, overrides: [], macros: null },
  history: [],
  userMessage: "What if I used 1/3 cup olive oil instead?",
};

const VALID_REPLY = JSON.stringify({
  reply: "That cuts about 65 calories per batch.",
  servings: 4,
  overrides: [{ original: "Olive oil", replacement: "1/3 cup olive oil" }],
  macros: { calories: 1200, protein: 60, carbs: 90, fat: 40, fiber: 20 },
});

function textResponse(text: string) {
  return { content: [{ type: "text", text }] };
}

describe("runNutritionChat", () => {
  beforeEach(() => {
    mockCreate.mockReset();
    process.env.ANTHROPIC_API_KEY = "test-key";
  });

  it("returns the parsed reply and state on success", async () => {
    mockCreate.mockResolvedValueOnce(textResponse(VALID_REPLY));
    const { runNutritionChat } = await importChat();

    const result = await runNutritionChat(BASE_PARAMS);

    expect(result.reply).toBe("That cuts about 65 calories per batch.");
    expect(result.state.servings).toBe(4);
    expect(result.state.overrides).toEqual([
      { original: "Olive oil", replacement: "1/3 cup olive oil" },
    ]);
    expect(result.state.macros.calories).toBe(1200);
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it("retries on failure and succeeds once a retry works", async () => {
    mockCreate
      .mockRejectedValueOnce(new Error("network blip"))
      .mockResolvedValueOnce(textResponse(VALID_REPLY));
    const { runNutritionChat } = await importChat();

    const result = await runNutritionChat(BASE_PARAMS);

    expect(result.reply).toBe("That cuts about 65 calories per batch.");
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it("throws NutritionChatError after exhausting all retries", async () => {
    mockCreate.mockRejectedValue(new Error("persistent failure"));
    const { runNutritionChat, NutritionChatError } = await importChat();

    await expect(runNutritionChat(BASE_PARAMS)).rejects.toThrow(NutritionChatError);
    expect(mockCreate).toHaveBeenCalledTimes(3);
  });

  it("throws NutritionChatError when the response has no JSON object", async () => {
    mockCreate.mockResolvedValueOnce(textResponse("Sorry, I can't help with that."));
    const { runNutritionChat, NutritionChatError } = await importChat();

    await expect(runNutritionChat(BASE_PARAMS)).rejects.toThrow(NutritionChatError);
  });

  it("throws NutritionChatError when required fields are missing", async () => {
    mockCreate.mockResolvedValueOnce(
      textResponse(JSON.stringify({ reply: "Sure." })),
    );
    const { runNutritionChat, NutritionChatError } = await importChat();

    await expect(runNutritionChat(BASE_PARAMS)).rejects.toThrow(NutritionChatError);
  });

  it("throws NutritionChatError when ANTHROPIC_API_KEY is unset", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const { runNutritionChat, NutritionChatError } = await importChat();

    await expect(runNutritionChat(BASE_PARAMS)).rejects.toThrow(NutritionChatError);
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/__tests__/nutrition-chat.test.ts`
Expected: FAIL — `src/lib/nutrition/chat.ts` does not exist yet.

- [ ] **Step 3: Write the implementation**

Create `src/lib/nutrition/chat.ts`:

```ts
import Anthropic from "@anthropic-ai/sdk";
import type {
  ChatTurn,
  Ingredient,
  IngredientOverride,
  MacroEstimate,
} from "@/lib/types/recipe";

export type NutritionChatState = {
  servings: number;
  overrides: IngredientOverride[];
  macros: MacroEstimate | null;
};

export type NutritionChatResult = {
  reply: string;
  state: NutritionChatState;
};

export class NutritionChatError extends Error {}

const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [300, 900];

async function withRetries<T>(fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_ATTEMPTS - 1) {
        await new Promise((resolve) => setTimeout(resolve, BACKOFF_MS[attempt]));
      }
    }
  }
  throw new NutritionChatError(
    `Claude call failed after ${MAX_ATTEMPTS} attempts: ${
      lastErr instanceof Error ? lastErr.message : String(lastErr)
    }`,
  );
}

function buildPrompt(
  recipeTitle: string,
  ingredients: Ingredient[],
  state: NutritionChatState,
  history: ChatTurn[],
  userMessage: string,
): string {
  const ingredientList = ingredients
    .map((i) => [i.quantity, i.unit, i.name].filter(Boolean).join(" "))
    .join("\n");

  const overridesList = state.overrides.length
    ? state.overrides.map((o) => `${o.original} → ${o.replacement}`).join("\n")
    : "none";

  const historyText = history
    .map((h) => `${h.role === "user" ? "User" : "You"}: ${h.content}`)
    .join("\n");

  return `You are a practical home cook helping someone make a recipe healthier without losing taste. This is an ongoing conversation about ONE recipe — answer naturally, like a knowledgeable friend, not a nutrition database.

Recipe: "${recipeTitle}"
Original ingredients:
${ingredientList}

Current servings: ${state.servings}
Current ingredient swaps: ${overridesList}
${historyText ? `\nConversation so far:\n${historyText}\n` : ""}
User: ${userMessage}

Reply with ONLY a valid JSON object — no markdown, no explanation outside the JSON:
{
  "reply": "Your conversational answer to the user's message.",
  "servings": 0,
  "overrides": [{ "original": "ingredient name as it appears in the recipe", "replacement": "swapped-in ingredient" }],
  "macros": { "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "fiber": 0 }
}

Rules:
- "servings" is the current serving count after this message — unchanged unless the user asked to change it.
- "overrides" must be the FULL current list of swaps, not just new ones — include everything still in effect, and drop anything the user asked to undo.
- Macros are estimates for the WHOLE recipe at "servings" (not per-serving) unless the user explicitly asked for per-serving numbers — in that case, say so in "reply" and still fill in whole-recipe numbers in "macros".
- Rough estimates are fine — this isn't a tracking app. Don't caveat every number; just answer directly.
- If the user's message doesn't call for a swap, serving change, or macro question, keep servings/overrides/macros the same as they already are and just answer conversationally in "reply".`;
}

export async function runNutritionChat(params: {
  recipeTitle: string;
  ingredients: Ingredient[];
  state: NutritionChatState;
  history: ChatTurn[];
  userMessage: string;
}): Promise<NutritionChatResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new NutritionChatError("ANTHROPIC_API_KEY is not configured.");
  }

  const client = new Anthropic({ apiKey });
  const prompt = buildPrompt(
    params.recipeTitle,
    params.ingredients,
    params.state,
    params.history,
    params.userMessage,
  );

  const message = await withRetries(() =>
    client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    }),
  );

  const text =
    message.content[0].type === "text" ? message.content[0].text.trim() : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new NutritionChatError("Claude's response wasn't in the expected format.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    throw new NutritionChatError("Claude's response wasn't valid JSON.");
  }

  const p = parsed as Partial<{
    reply: string;
    servings: number;
    overrides: IngredientOverride[];
    macros: MacroEstimate;
  }>;

  if (
    typeof p.reply !== "string" ||
    typeof p.servings !== "number" ||
    !Array.isArray(p.overrides) ||
    !p.macros ||
    typeof p.macros.calories !== "number"
  ) {
    throw new NutritionChatError("Claude's response was missing required fields.");
  }

  return {
    reply: p.reply,
    state: {
      servings: p.servings,
      overrides: p.overrides,
      macros: p.macros,
    },
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/__tests__/nutrition-chat.test.ts`
Expected: PASS (6 tests). The retry-exhaustion test takes ~1.2s (real backoff delays) — that's expected, not a hang.

- [ ] **Step 5: Commit**

```bash
git add src/lib/nutrition/chat.ts src/lib/__tests__/nutrition-chat.test.ts
git commit -m "Add nutrition-chat Claude module with retry-then-fail-loud error handling"
```

---

### Task 5: `/api/nutrition-chat` route

**Files:**
- Create: `src/app/api/nutrition-chat/route.ts`

- [ ] **Step 1: Write the route**

```ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { getRecipeForUser } from "@/lib/data/queries";
import {
  runNutritionChat,
  NutritionChatError,
  type NutritionChatState,
} from "@/lib/nutrition/chat";
import type { ChatTurn } from "@/lib/types/recipe";

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Sign in to use the nutrition chat." },
      { status: 401 },
    );
  }

  const { allowed, resetMs } = checkRateLimit(
    `nutrition-chat:${user.id}`,
    20,
    60_000,
  );
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(resetMs / 1000)) } },
    );
  }

  const body = await request.json();
  const { recipeId, state, history, userMessage } = body as {
    recipeId?: string;
    state?: NutritionChatState;
    history?: ChatTurn[];
    userMessage?: string;
  };

  if (
    !recipeId ||
    typeof recipeId !== "string" ||
    !state ||
    typeof state.servings !== "number" ||
    !Array.isArray(state.overrides) ||
    !userMessage ||
    typeof userMessage !== "string"
  ) {
    return NextResponse.json(
      { error: "recipeId, state, and userMessage are required." },
      { status: 400 },
    );
  }

  const recipe = await getRecipeForUser(recipeId);
  if (!recipe) {
    return NextResponse.json({ error: "Recipe not found." }, { status: 404 });
  }

  try {
    const result = await runNutritionChat({
      recipeTitle: recipe.title,
      ingredients: recipe.ingredients,
      state,
      history: history ?? [],
      userMessage,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof NutritionChatError) {
      console.error("[nutrition-chat] Claude call failed:", error.message);
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    console.error("[nutrition-chat] unexpected error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify the app builds**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/nutrition-chat/route.ts
git commit -m "Add /api/nutrition-chat route"
```

---

### Task 6: Data layer + server actions for the nutrition session

**Files:**
- Modify: `src/lib/data/queries.ts`
- Create: `src/lib/actions/nutrition.ts`
- Modify: `src/lib/actions/recipes.ts`

- [ ] **Step 1: Add `RecipeRow` fields and a `getNutritionSession` query**

In `src/lib/data/queries.ts`, update `RecipeRow` to include the new columns, remove `ModificationRow`/`getModifications` (their only purpose was the now-dropped `recipe_modifications` table), and add `getNutritionSession`:

```ts
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Ingredient, IngredientOverride, MacroEstimate, PrepItem, Step } from "@/lib/types/recipe";

export type RecipeRow = {
  id: string;
  title: string;
  summary: string | null;
  image_url: string | null;
  source_url: string;
  servings: number;
  ingredients: Ingredient[];
  steps: Step[];
  prep_items: PrepItem[];
  favorite: boolean;
  rating: number | null;
  has_cooked: boolean;
  first_cooked_at: string | null;
};

export type NutritionSessionRow = {
  servings: number;
  ingredient_overrides: IngredientOverride[];
  macros: MacroEstimate | null;
};

export async function getRecipeForUser(recipeId: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("recipes")
    .select("*")
    .eq("id", recipeId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) return null;
  return data as RecipeRow;
}

export async function getNutritionSession(recipeId: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("recipe_nutrition_sessions")
    .select("servings, ingredient_overrides, macros")
    .eq("recipe_id", recipeId)
    .eq("user_id", user.id)
    .maybeSingle();

  return (data as NutritionSessionRow | null) ?? null;
}

export async function getRecentImports(limit = 6) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("recipes")
    .select("id, title, image_url, created_at, favorite, rating, has_cooked")
    .eq("user_id", user.id)
    .is("hidden_from_recent_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[getRecentImports] query failed:", error.message);
    return [];
  }

  return data ?? [];
}

export async function getFavoriteRecipes() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("recipes")
    .select("id, title, image_url, created_at, rating, has_cooked")
    .eq("user_id", user.id)
    .eq("favorite", true)
    .order("created_at", { ascending: false })
    .limit(50);

  return data ?? [];
}

export async function getFeaturedRecipe() {
  const rows = await getRecentImports(1);
  return rows[0] ?? null;
}
```

- [ ] **Step 2: Add `saveNutritionSession` server action**

Create `src/lib/actions/nutrition.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { IngredientOverride, MacroEstimate } from "@/lib/types/recipe";

export type SaveNutritionSessionInput = {
  servings: number;
  overrides: IngredientOverride[];
  macros: MacroEstimate | null;
};

/**
 * Persists the current working copy as the recipe's "current version" and
 * marks the recipe cooked — this is what the Done Cooking action calls.
 * The live chat conversation itself is never persisted; only this resulting state is.
 */
export async function saveNutritionSession(
  recipeId: string,
  state: SaveNutritionSessionInput,
) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false as const, error: "Sign in required." };
  }

  const { error: upsertErr } = await supabase
    .from("recipe_nutrition_sessions")
    .upsert(
      {
        user_id: user.id,
        recipe_id: recipeId,
        servings: state.servings,
        ingredient_overrides: state.overrides,
        macros: state.macros,
      },
      { onConflict: "user_id,recipe_id" },
    );

  if (upsertErr) {
    return { ok: false as const, error: upsertErr.message };
  }

  const { data: existing, error: fetchErr } = await supabase
    .from("recipes")
    .select("first_cooked_at")
    .eq("id", recipeId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchErr) {
    return { ok: false as const, error: fetchErr.message };
  }

  const { error: recipeErr } = await supabase
    .from("recipes")
    .update({
      has_cooked: true,
      first_cooked_at: existing?.first_cooked_at ?? new Date().toISOString(),
    })
    .eq("id", recipeId)
    .eq("user_id", user.id);

  if (recipeErr) {
    return { ok: false as const, error: recipeErr.message };
  }

  revalidatePath(`/recipes/${recipeId}`);
  revalidatePath("/");
  revalidatePath("/kitchen");
  return { ok: true as const };
}
```

- [ ] **Step 3: Add `setRecipeCooked` alongside the existing favorite/rating actions**

In `src/lib/actions/recipes.ts`, add this function after `setRecipeFavorite` (do not modify anything else in the file):

```ts
/** Manually mark a recipe cooked/not-cooked without opening the nutrition panel. */
export async function setRecipeCooked(recipeId: string, cooked: boolean) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false as const, error: "Sign in required." };
  }

  const id = recipeId.trim();
  if (!id) {
    return { ok: false as const, error: "Missing recipe." };
  }

  const { data: existing, error: fetchErr } = await supabase
    .from("recipes")
    .select("first_cooked_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchErr) {
    return { ok: false as const, error: fetchErr.message };
  }

  const { data, error } = await supabase
    .from("recipes")
    .update({
      has_cooked: cooked,
      first_cooked_at: cooked
        ? (existing?.first_cooked_at ?? new Date().toISOString())
        : (existing?.first_cooked_at ?? null),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id");

  if (error) {
    return { ok: false as const, error: error.message };
  }
  if (!data?.length) {
    return {
      ok: false as const,
      error: "Couldn't update this recipe. Refresh the page and try again.",
    };
  }

  revalidatePath("/");
  revalidatePath("/kitchen");
  revalidatePath(`/recipes/${id}`);
  return { ok: true as const };
}
```

- [ ] **Step 4: Verify the app builds**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/lib/data/queries.ts src/lib/actions/nutrition.ts src/lib/actions/recipes.ts
git commit -m "Add nutrition-session data layer and saveNutritionSession/setRecipeCooked actions"
```

---

### Task 7: Delete the old swap infrastructure

**Files:**
- Delete: `src/components/ingredient-swap-sheet.tsx`
- Delete: `src/components/recipe-goal-swaps.tsx`
- Delete: `src/lib/actions/swaps.ts`
- Delete: `src/app/api/swaps/route.ts`
- Delete: `src/lib/swap-catalog.ts`

**Note:** after Task 8 rewires the recipe detail page, nothing will import these five files. Do this deletion in the same task as Task 8's rewrite (not before) so the app isn't left mid-build with dangling imports — treat Tasks 7 and 8 as one commit.

- [ ] **Step 1: Delete the files**

```bash
git rm src/components/ingredient-swap-sheet.tsx
git rm src/components/recipe-goal-swaps.tsx
git rm src/lib/actions/swaps.ts
git rm src/app/api/swaps/route.ts
git rm src/lib/swap-catalog.ts
```

(Continue directly to Task 8 before building/committing — the recipe detail page still imports these until that task's edit lands.)

---

### Task 8: Build the Nutrition Panel and wire it into the recipe detail page

**Files:**
- Create: `src/components/nutrition-panel.tsx`
- Modify: `src/app/(editorial)/recipes/[id]/page.tsx`

- [ ] **Step 1: Build the Nutrition Panel component**

Create `src/components/nutrition-panel.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { RecipeRatingSection } from "@/components/recipe-rating-section";
import { saveNutritionSession } from "@/lib/actions/nutrition";
import { applyIngredientOverrides } from "@/lib/recipes/display";
import { decodeHtmlEntities } from "@/lib/decode-html-entities";
import type {
  ChatTurn,
  Ingredient,
  IngredientOverride,
  MacroEstimate,
} from "@/lib/types/recipe";

type WorkingState = {
  servings: number;
  overrides: IngredientOverride[];
  macros: MacroEstimate | null;
};

type Props = {
  recipeId: string;
  recipeTitle: string;
  ingredients: Ingredient[];
  initialState: WorkingState;
  initialRating: number | null;
};

async function sendChatMessage(params: {
  recipeId: string;
  state: WorkingState;
  history: ChatTurn[];
  userMessage: string;
}): Promise<{ reply: string; state: WorkingState } | { error: string }> {
  const res = await fetch("/api/nutrition-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) {
    return { error: data.error ?? "Something went wrong." };
  }
  return data;
}

export function NutritionPanel({
  recipeId,
  recipeTitle,
  ingredients,
  initialState,
  initialRating,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [working, setWorking] = useState<WorkingState>(initialState);
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRating, setShowRating] = useState(false);

  function resetForOpen(nextOpen: boolean) {
    if (nextOpen) {
      setWorking(initialState);
      setMessages([]);
      setError(null);
      setShowRating(false);
    }
    setOpen(nextOpen);
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setError(null);
    const nextMessages: ChatTurn[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setInput("");

    const result = await sendChatMessage({
      recipeId,
      state: working,
      history: messages,
      userMessage: trimmed,
    });

    setSending(false);

    if ("error" in result) {
      setError(result.error);
      return;
    }

    setWorking(result.state);
    setMessages([...nextMessages, { role: "assistant", content: result.reply }]);
  }

  function retryLast() {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    setMessages((prev) => prev.slice(0, -1));
    void send(lastUser.content);
  }

  function adjustServings(delta: number) {
    const next = Math.max(1, working.servings + delta);
    void send(`Recalculate for ${next} servings.`);
  }

  function askAboutSwap(ingredientName: string) {
    setInput(`What's a good swap for ${ingredientName}?`);
  }

  async function doneCooking() {
    setSending(true);
    setError(null);
    const res = await saveNutritionSession(recipeId, working);
    setSending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setShowRating(true);
  }

  function finishAfterRating() {
    resetForOpen(false);
    router.refresh();
  }

  const displayIngredients = applyIngredientOverrides(ingredients, working.overrides);

  return (
    <Sheet open={open} onOpenChange={resetForOpen}>
      <SheetTrigger
        render={<Button size="lg" className="min-h-12 w-full justify-center sm:w-auto" />}
      >
        Cook with Claude
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{decodeHtmlEntities(recipeTitle)}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-4">
          {showRating ? (
            <div className="space-y-4 py-6 text-center">
              <p className="font-serif text-lg text-text-heading">Nice work!</p>
              <RecipeRatingSection recipeId={recipeId} initialRating={initialRating} />
              <Button size="lg" className="mt-4 min-h-12 w-full" onClick={finishAfterRating}>
                Done
              </Button>
            </div>
          ) : (
            <>
              <section className="space-y-3 rounded-lg border border-border p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-text-heading">Servings</p>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={sending || working.servings <= 1}
                      onClick={() => adjustServings(-1)}
                    >
                      −
                    </Button>
                    <span className="w-6 text-center text-sm">{working.servings}</span>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={sending}
                      onClick={() => adjustServings(1)}
                    >
                      +
                    </Button>
                  </div>
                </div>

                {working.macros ? (
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="text-xs text-muted-foreground">Calories</dt>
                      <dd>{working.macros.calories}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Protein</dt>
                      <dd>{working.macros.protein}g</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Carbs</dt>
                      <dd>{working.macros.carbs}g</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Fat</dt>
                      <dd>{working.macros.fat}g</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Fiber</dt>
                      <dd>{working.macros.fiber}g</dd>
                    </div>
                  </dl>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Ask a question below to get an estimate for this recipe.
                  </p>
                )}

                <ul className="space-y-1.5 text-sm">
                  {displayIngredients.map((ing) => (
                    <li key={ing.id} className="flex items-center justify-between gap-2">
                      <span>{decodeHtmlEntities(ing.name)}</span>
                      <button
                        type="button"
                        className="shrink-0 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
                        onClick={() => askAboutSwap(ing.swapBasisName ?? ing.name)}
                      >
                        Swap
                      </button>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="space-y-3">
                <ul className="space-y-2">
                  {messages.map((m, i) => (
                    <li
                      key={i}
                      className={
                        m.role === "user"
                          ? "ml-auto max-w-[85%] rounded-lg bg-primary/10 px-3 py-2 text-sm"
                          : "mr-auto max-w-[85%] rounded-lg bg-muted px-3 py-2 text-sm"
                      }
                    >
                      {m.content}
                    </li>
                  ))}
                </ul>

                {error ? (
                  <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm">
                    <p className="text-destructive">{error}</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={retryLast}
                      disabled={sending}
                    >
                      Retry
                    </Button>
                  </div>
                ) : null}
              </section>
            </>
          )}
        </div>

        {!showRating ? (
          <SheetFooter className="gap-2 border-t border-border">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send(input);
                  }
                }}
                placeholder="What if I used chickpeas instead?"
                disabled={sending}
                className="border-input bg-background h-11 flex-1 rounded-md border px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Button type="button" disabled={sending || !input.trim()} onClick={() => send(input)}>
                Send
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                disabled={sending}
                onClick={() => resetForOpen(false)}
              >
                Exit
              </Button>
              <Button type="button" className="flex-1" disabled={sending} onClick={doneCooking}>
                Done Cooking
              </Button>
            </div>
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 2: Wire it into the recipe detail page, remove the old swap UI**

Replace the full contents of `src/app/(editorial)/recipes/[id]/page.tsx`:

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { FavoriteButton } from "@/components/favorite-button";
import { RecipeRatingSection } from "@/components/recipe-rating-section";
import { NutritionPanel } from "@/components/nutrition-panel";
import { RecipeStepsReader } from "@/components/recipe-steps-reader";
import { applyIngredientOverrides } from "@/lib/recipes/display";
import { IngredientLine } from "@/components/ingredient-line";
import { decodeHtmlEntities } from "@/lib/decode-html-entities";
import { getNutritionSession, getRecipeForUser } from "@/lib/data/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SignInPrompt } from "@/components/sign-in-prompt";
import { RecipeImageFallback } from "@/components/recipe-image-fallback";
import { normalizeImageUrl } from "@/lib/images";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ id: string }> };

export default async function RecipeDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return <SignInPrompt nextPath={`/recipes/${id}`} />;
  }

  const recipe = await getRecipeForUser(id);
  if (!recipe) notFound();

  const session = await getNutritionSession(id);
  const workingState = {
    servings: session?.servings ?? recipe.servings,
    overrides: session?.ingredient_overrides ?? [],
    macros: session?.macros ?? null,
  };
  const ingredients = applyIngredientOverrides(recipe.ingredients, workingState.overrides);

  const heroSrc = recipe.image_url
    ? normalizeImageUrl(recipe.image_url)
    : null;

  return (
    <article className="mx-auto max-w-3xl px-6 py-10">
      {heroSrc ? (
        <div className="relative mb-10 h-48 w-full overflow-hidden rounded-sm bg-muted sm:h-56">
          <RecipeImageFallback
            src={heroSrc}
            className="absolute inset-0 h-full w-full"
            loading="eager"
            size="lg"
          />
        </div>
      ) : null}

      <header className="space-y-4">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Recipe
        </p>
        <h1 className="font-serif text-4xl text-text-heading">
          {decodeHtmlEntities(recipe.title)}
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-muted-foreground">
            Serves {workingState.servings}
          </span>
          <FavoriteButton recipeId={id} initialFavorite={recipe.favorite} />
        </div>
        <RecipeRatingSection
          key={`${id}-rating-${recipe.rating ?? "none"}`}
          recipeId={id}
          initialRating={recipe.rating ?? null}
        />
        {recipe.source_url ? (
          <p className="text-sm text-muted-foreground">
            Source:{" "}
            <a
              href={recipe.source_url}
              className="underline underline-offset-4 hover:text-foreground"
              target="_blank"
              rel="noreferrer"
            >
              Original link
            </a>
          </p>
        ) : null}
      </header>

      <section className="mt-12 space-y-4">
        <h2 className="font-serif text-2xl text-text-heading">Ingredients</h2>
        <ul className="space-y-3 text-base leading-relaxed">
          {ingredients.map((ing) => (
            <li key={ing.id}>
              <IngredientLine ingredient={ing} />
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-12 space-y-12">
        <NutritionPanel
          recipeId={id}
          recipeTitle={recipe.title}
          ingredients={recipe.ingredients}
          initialState={workingState}
          initialRating={recipe.rating ?? null}
        />

        <section className="space-y-4">
          <h2 className="font-serif text-2xl text-text-heading">Instructions</h2>
          <p className="text-sm text-muted-foreground">
            Full steps, right where you&apos;re already reading.
          </p>
          <RecipeStepsReader steps={recipe.steps} />
        </section>
      </div>

      <div className="mt-14">
        <Link
          href={`/recipes/${id}/prep`}
          className={cn(
            buttonVariants({ size: "lg" }),
            "min-h-12 w-full justify-center sm:w-auto",
          )}
        >
          Before you start
        </Link>
      </div>
    </article>
  );
}
```

- [ ] **Step 3: Verify no stray references remain, then build**

Run: `grep -rln "ingredient-swap-sheet\|recipe-goal-swaps\|actions/swaps\|swap-catalog\|api/swaps" src`
Expected: no output.

Run: `npm run build`
Expected: succeeds.

Run: `npm test`
Expected: passes.

- [ ] **Step 4: Commit (Tasks 7 and 8 together)**

```bash
git add -A
git commit -m "Replace ingredient swap sheet and goal swaps with the Nutrition Panel"
```

---

### Task 9: Cooked/not-cooked toggle and Kitchen filter

**Files:**
- Create: `src/components/cooked-toggle-button.tsx`
- Modify: `src/components/kitchen-recipe-lists.tsx`

- [ ] **Step 1: Build the standalone cooked toggle, mirroring `KitchenFavoriteButton`**

Create `src/components/cooked-toggle-button.tsx`:

```tsx
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUtensils } from "@fortawesome/free-solid-svg-icons";
import { setRecipeCooked } from "@/lib/actions/recipes";
import { cn } from "@/lib/utils";

type Props = { recipeId: string; initialCooked: boolean };

/** Compact cooked toggle for the kitchen list rows — mirrors KitchenFavoriteButton. */
export function CookedToggleButton({ recipeId, initialCooked }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      await setRecipeCooked(recipeId, !initialCooked);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={toggle}
      aria-label={initialCooked ? "Mark as not yet cooked" : "Mark as cooked"}
      title={initialCooked ? "Mark as not yet cooked" : "Mark as cooked"}
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded transition-colors",
        "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        pending && "opacity-50",
      )}
    >
      <FontAwesomeIcon
        icon={faUtensils}
        className={cn(
          "h-4 w-4",
          initialCooked ? "text-emerald-600" : "text-muted-foreground",
        )}
        aria-hidden
      />
    </button>
  );
}
```

- [ ] **Step 2: Add the cooked filter and toggle to the Kitchen recipe lists**

In `src/components/kitchen-recipe-lists.tsx`: add `has_cooked` to both row types, import `CookedToggleButton`, add a `cookedFilter` state with a small button group above the search box, and filter both lists by it before the existing search filter, and render `<CookedToggleButton>` next to `<KitchenFavoriteButton>` in the Recently Imported row (Favorites rows don't currently render `KitchenFavoriteButton` either, so mirror that: only add it to the Recently Imported row, matching existing structure).

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import { KitchenFavoriteButton } from "@/components/kitchen-favorite-button";
import { CookedToggleButton } from "@/components/cooked-toggle-button";
import { RemoveFromRecentButton } from "@/components/remove-from-recent-button";
import { DeleteRecipeButton } from "@/components/delete-recipe-button";
import { StarRatingDisplay } from "@/components/star-rating";
import { RecipeImageFallback } from "@/components/recipe-image-fallback";
import { normalizeImageUrl } from "@/lib/images";
import { cn } from "@/lib/utils";

type RecentRecipe = {
  id: string;
  title: string;
  image_url: string | null;
  favorite: boolean | null;
  rating: number | null;
  has_cooked: boolean;
};

type FavoriteRecipe = {
  id: string;
  title: string;
  image_url: string | null;
  rating: number | null;
  has_cooked: boolean;
};

type Props = {
  recent: RecentRecipe[];
  favorites: FavoriteRecipe[];
  isLoggedIn: boolean;
};

const RECENT_PAGE = 8;
const FAVORITES_PAGE = 12;

type CookedFilter = "all" | "not_cooked" | "cooked";

export function KitchenRecipeLists({ recent, favorites, isLoggedIn }: Props) {
  const [query, setQuery] = useState("");
  const [cookedFilter, setCookedFilter] = useState<CookedFilter>("all");
  const [recentLimit, setRecentLimit] = useState(RECENT_PAGE);
  const [favoritesLimit, setFavoritesLimit] = useState(FAVORITES_PAGE);
  const q = query.toLowerCase().trim();

  function matchesCookedFilter(hasCooked: boolean) {
    if (cookedFilter === "all") return true;
    if (cookedFilter === "cooked") return hasCooked;
    return !hasCooked;
  }

  const filteredRecent = recent
    .filter((r) => matchesCookedFilter(r.has_cooked))
    .filter((r) => (q ? r.title.toLowerCase().includes(q) : true));
  const filteredFavorites = favorites
    .filter((r) => matchesCookedFilter(r.has_cooked))
    .filter((r) => (q ? r.title.toLowerCase().includes(q) : true));

  // When searching, show all results; otherwise respect the pagination limit
  const visibleRecent = q ? filteredRecent : filteredRecent.slice(0, recentLimit);
  const visibleFavorites = q ? filteredFavorites : filteredFavorites.slice(0, favoritesLimit);

  const hasAny = recent.length > 0 || favorites.length > 0;

  return (
    <>
      {hasAny ? (
        <div className="mb-6 flex gap-2">
          {(["all", "not_cooked", "cooked"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setCookedFilter(f)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                cookedFilter === f
                  ? "border-primary bg-primary/10 text-text-heading"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {f === "all" ? "All" : f === "not_cooked" ? "Not yet cooked" : "Cooked"}
            </button>
          ))}
        </div>
      ) : null}

      {hasAny ? (
        <div className="relative mb-8">
          <FontAwesomeIcon
            icon={faMagnifyingGlass}
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your recipes…"
            aria-label="Search recipes"
            className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring h-11 w-full rounded-md border py-2 pl-9 pr-4 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          />
        </div>
      ) : null}

      {favorites.length > 0 ? (
        <section className="mb-12">
          <h2 className="mb-4 font-serif text-xl text-text-heading">
            Favorites
          </h2>
          {filteredFavorites.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing here for this filter.
            </p>
          ) : (
            <>
            <ul className="divide-y divide-border border border-border">
              {visibleFavorites.map((r) => {
                const src = r.image_url ? normalizeImageUrl(r.image_url) : null;
                return (
                  <li
                    key={r.id}
                    className="flex items-center gap-3 px-2 py-2 sm:px-4"
                  >
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-muted sm:h-14 sm:w-14">
                      <RecipeImageFallback
                        src={src}
                        className="absolute inset-0 h-full w-full"
                        size="sm"
                      />
                    </div>
                    <Link
                      href={`/recipes/${r.id}`}
                      className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3 py-2 transition-colors hover:opacity-80"
                    >
                      <span className="font-medium text-text-heading">
                        {r.title}
                      </span>
                      {typeof r.rating === "number" ? (
                        <StarRatingDisplay value={r.rating} size="sm" />
                      ) : null}
                    </Link>
                    <CookedToggleButton recipeId={r.id} initialCooked={r.has_cooked} />
                    <DeleteRecipeButton recipeId={r.id} recipeTitle={r.title} />
                  </li>
                );
              })}
            </ul>
            {!q && filteredFavorites.length > favoritesLimit ? (
              <button
                type="button"
                onClick={() => setFavoritesLimit((n) => n + FAVORITES_PAGE)}
                className="mt-3 flex w-full items-center justify-center gap-2 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <FontAwesomeIcon icon={faChevronDown} className="h-3 w-3" aria-hidden />
                Show {Math.min(FAVORITES_PAGE, filteredFavorites.length - favoritesLimit)} more
              </button>
            ) : null}
            </>
          )}
        </section>
      ) : null}

      <section className="mb-12">
        <h2 className="mb-4 font-serif text-xl text-text-heading">
          Recently Imported
        </h2>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {isLoggedIn
              ? "Nothing here yet—import a recipe above."
              : "Sign in to load recipes you've imported."}
          </p>
        ) : filteredRecent.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing here for this filter.
          </p>
        ) : (
          <>
          <ul className="divide-y divide-border border border-border">
            {visibleRecent.map((r) => {
              const src = r.image_url ? normalizeImageUrl(r.image_url) : null;
              return (
                <li
                  key={r.id}
                  className="flex items-center gap-3 px-2 py-2 sm:px-4"
                >
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-muted sm:h-14 sm:w-14">
                    <RecipeImageFallback
                      src={src}
                      className="absolute inset-0 h-full w-full"
                      size="sm"
                    />
                  </div>
                  <Link
                    href={`/recipes/${r.id}`}
                    className="flex min-w-0 flex-1 items-center gap-3 py-2 transition-colors hover:opacity-80"
                  >
                    <span className="min-w-0 flex-1 font-medium text-text-heading">
                      {r.title}
                    </span>
                    {typeof r.rating === "number" ? (
                      <StarRatingDisplay value={r.rating} size="sm" />
                    ) : null}
                  </Link>
                  <CookedToggleButton recipeId={r.id} initialCooked={r.has_cooked} />
                  <KitchenFavoriteButton
                    recipeId={r.id}
                    initialFavorite={r.favorite ?? false}
                  />
                  <RemoveFromRecentButton recipeId={r.id} recipeTitle={r.title} />
                </li>
              );
            })}
          </ul>
          {!q && filteredRecent.length > recentLimit ? (
            <button
              type="button"
              onClick={() => setRecentLimit((n) => n + RECENT_PAGE)}
              className="mt-3 flex w-full items-center justify-center gap-2 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <FontAwesomeIcon icon={faChevronDown} className="h-3 w-3" aria-hidden />
              Show {Math.min(RECENT_PAGE, filteredRecent.length - recentLimit)} more
            </button>
          ) : null}
          </>
        )}
      </section>
    </>
  );
}
```

- [ ] **Step 3: Verify the app builds**

Run: `npm run build`
Expected: succeeds — `getRecentImports`/`getFavoriteRecipes` (Task 6) already select `has_cooked`, matching the new prop types.

- [ ] **Step 4: Commit**

```bash
git add src/components/cooked-toggle-button.tsx src/components/kitchen-recipe-lists.tsx
git commit -m "Add cooked/not-cooked toggle and Kitchen filter"
```

---

### Task 10: Docs and final verification

**Files:**
- Modify: `.env.example`
- Modify: `README.md`

- [ ] **Step 1: Add the missing `ANTHROPIC_API_KEY` to `.env.example`**

Add to `.env.example` (all three Anthropic call sites already depend on this — it was previously undocumented):

```
# Anthropic API key (server-side only) — powers recipe summaries and the nutrition chat
# Get yours at https://console.anthropic.com/
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

- [ ] **Step 2: Update the README**

In `README.md`, replace the "Cook mode" and "AI ingredient swaps" bullets under "What it does" with:

```markdown
**Editorial mode** — Import any URL, browse your kitchen, plan what to cook.

**Nutrition chat (Claude)** — A recipe-scoped chat, backed by Claude Haiku: ask "what if I used chickpeas instead?" or "what's this at 6 servings?" and get an updated macro estimate (calories, protein, carbs, fat, fiber) alongside a conversational answer — the same back-and-forth you'd have with a general chat AI, but grounded in the actual recipe. Rough estimates, not tracking-app precision — swap suggestions and serving-size math happen in the same conversation instead of two separate tools.
```

Remove the "Session model" bullet under Architecture (Cook Mode's `cook_sessions` no longer exists) and replace it with:

```markdown
### Nutrition session model

One "current version" per recipe persists to Supabase (`recipe_nutrition_sessions`) — servings, active ingredient swaps, and the last-estimated macros. The live conversation itself isn't persisted; only this resulting state is, restored the next time you open the recipe.
```

Remove the "Step-ingredient matching" bullet entirely (that heuristic no longer exists).

- [ ] **Step 3: Full verification sweep**

```bash
npm run lint
npm test
npm run build
```
Expected: all three pass.

- [ ] **Step 4: Manually confirm in the browser**

Start the dev server (`npm run dev`), sign in, open a recipe, and confirm:
- "Cook with Claude" opens a side panel with servings, ingredients, and a chat box.
- Sending a message (e.g. "what if I used chickpeas instead of white beans?") gets a reply and updates the ingredient list/macros.
- Clicking a "Swap" next to an ingredient pre-fills the chat input.
- "Exit" closes the panel and reopening it shows the same state as before you touched anything (nothing unsaved persisted).
- "Done Cooking" shows a rating prompt, then closes and the Kitchen page shows the recipe under "Cooked."
- The Kitchen page's "Not yet cooked" / "Cooked" filter buttons work, and the cooked-toggle icon can mark a recipe cooked without opening the panel.

- [ ] **Step 5: Commit**

```bash
git add .env.example README.md
git commit -m "Update docs for the nutrition-chat refactor"
```
