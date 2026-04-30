"use server";

import { revalidatePath } from "next/cache";
import Anthropic from "@anthropic-ai/sdk";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  buildBatchSwapRows,
  isBatchShiftNote,
  type BatchSwapConflict,
  type SwapGoal,
} from "@/lib/swap-catalog";
import type { Ingredient } from "@/lib/types/recipe";

export type { SwapGoal, BatchSwapConflict } from "@/lib/swap-catalog";

const GOAL_LABEL: Record<SwapGoal, string> = {
  high_protein: "Higher protein",
  lower_calorie: "Lower calorie",
  lower_carb: "Lower carb",
  higher_fiber: "Higher fiber",
  lower_sodium: "Lower sodium",
  dairy_free: "Dairy-free",
};

type ClaudeSwapRow = {
  ingredientId: string;
  replacement: string;
  impactNote: string;
};

async function applyGoalSwapsWithClaude(
  ingredients: Ingredient[],
  goals: SwapGoal[],
  manualIngredientKeys: Set<string>,
  recipeName: string,
): Promise<{ rows: { ingredient_key: string; replacement_label: string; impact_note: string }[] }> {
  const client = new Anthropic();

  const goalsText = goals.map((g) => GOAL_LABEL[g]).join(", ");
  const shiftLabel = goals.map((g) => GOAL_LABEL[g]).join(" + ");

  const eligibleIngredients = ingredients.filter(
    (i) => !manualIngredientKeys.has(i.id),
  );

  const ingredientList = eligibleIngredients
    .map((i) => {
      const parts = [i.quantity, i.unit, i.name].filter(Boolean).join(" ");
      return `id:${i.id} | ${parts}`;
    })
    .join("\n");

  const message = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are a practical home cook applying dietary shifts to a recipe. For each ingredient that can be meaningfully swapped to serve the goals, suggest the single best substitution.

Recipe: "${recipeName}"
Goals: ${goalsText}

Ingredients:
${ingredientList}

Rules:
- Only swap: fats, dairy, proteins, grains, sweeteners, stocks, and cooking oils
- Skip completely: vegetables, aromatics (garlic, onion, shallot, leek), herbs, spices, salt, pepper, acids (lemon juice, vinegar, citrus zest)
- NEVER suggest canola oil, vegetable oil, corn oil, or any cheap neutral oil
- When goals conflict on the same ingredient, pick the swap that serves the most goals simultaneously
- Skip ingredients already well-optimized for all goals (e.g. egg whites for high protein)

Return ONLY a valid JSON array. Omit any ingredient with no meaningful swap:
[
  {
    "ingredientId": "exact id from the list above",
    "replacement": "Substitute name",
    "impactNote": "One honest sentence on what changes"
  }
]`,
      },
    ],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text.trim() : "";
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return { rows: [] };

  const parsed: unknown = JSON.parse(jsonMatch[0]);
  if (!Array.isArray(parsed)) return { rows: [] };

  const claudeRows = (parsed as ClaudeSwapRow[]).filter(
    (r) =>
      typeof r.ingredientId === "string" &&
      typeof r.replacement === "string" &&
      typeof r.impactNote === "string",
  );

  const rows = claudeRows.flatMap((r) => {
    const ingredient = eligibleIngredients.find((i) => i.id === r.ingredientId);
    if (!ingredient) return [];
    return [
      {
        ingredient_key: ingredient.id,
        replacement_label: r.replacement,
        impact_note: `[${shiftLabel} shift] ${r.impactNote}`,
      },
    ];
  });

  return { rows };
}

export type ApplyGoalSwapsResult =
  | { ok: true; applied: number }
  | { ok: true; needsConfirmation: true; conflicts: BatchSwapConflict[] }
  | { ok: false; error: string };

export async function applyIngredientSwap(
  recipeId: string,
  ingredientKey: string,
  replacementLabel: string,
  impactNote: string,
) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false as const, error: "Sign in required." };
  }

  const { error } = await supabase.from("recipe_modifications").upsert(
    {
      user_id: user.id,
      recipe_id: recipeId,
      ingredient_key: ingredientKey,
      replacement_label: replacementLabel,
      impact_note: impactNote,
    },
    { onConflict: "recipe_id,ingredient_key" },
  );

  if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidatePath(`/recipes/${recipeId}`);
  revalidatePath(`/recipes/${recipeId}/cook`);
  return { ok: true as const };
}

/** Clears one manually chosen ingredient swap (not batch recipe shifts). */
export async function clearIngredientSwap(recipeId: string, ingredientKey: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false as const, error: "Sign in required." };
  }

  const { data: row, error: fetchErr } = await supabase
    .from("recipe_modifications")
    .select("impact_note")
    .eq("recipe_id", recipeId)
    .eq("user_id", user.id)
    .eq("ingredient_key", ingredientKey)
    .maybeSingle();

  if (fetchErr) {
    return { ok: false as const, error: fetchErr.message };
  }
  if (!row) {
    return { ok: false as const, error: "Nothing to reset." };
  }
  if (isBatchShiftNote(row.impact_note)) {
    return {
      ok: false as const,
      error:
        "This line was updated by a recipe shift—change shifts above or clear automatic swaps.",
    };
  }

  const { error } = await supabase
    .from("recipe_modifications")
    .delete()
    .eq("recipe_id", recipeId)
    .eq("user_id", user.id)
    .eq("ingredient_key", ingredientKey);

  if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidatePath(`/recipes/${recipeId}`);
  revalidatePath(`/recipes/${recipeId}/prep`);
  revalidatePath(`/recipes/${recipeId}/cook`);
  return { ok: true as const };
}

/**
 * Applies curated swaps for one or more goals (e.g. dairy-free + higher protein).
 * If two goals disagree on the same line, returns `needsConfirmation` unless
 * `acknowledgeConflicts` is true (then priority order applies—see CONFLICT_RESOLUTION_PRIORITY).
 */
export async function applyGoalSwaps(
  recipeId: string,
  goals: SwapGoal[],
  options?: { acknowledgeConflicts?: boolean },
): Promise<ApplyGoalSwapsResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false as const, error: "Sign in required." };
  }

  const { data: row, error: fetchErr } = await supabase
    .from("recipes")
    .select("title, ingredients")
    .eq("id", recipeId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchErr || !row?.ingredients) {
    return {
      ok: false as const,
      error: fetchErr?.message ?? "Recipe not found.",
    };
  }

  const ingredients = row.ingredients as Ingredient[];
  const recipeName = (row.title as string | null) ?? "this dish";

  const { data: existingMods, error: modErr } = await supabase
    .from("recipe_modifications")
    .select("id,ingredient_key,impact_note")
    .eq("recipe_id", recipeId)
    .eq("user_id", user.id);

  if (modErr) {
    return { ok: false as const, error: modErr.message };
  }

  const batchRowIds =
    existingMods?.filter((m) => isBatchShiftNote(m.impact_note)).map((m) => m.id) ??
    [];

  const manualIngredientKeys = new Set(
    existingMods
      ?.filter((m) => !isBatchShiftNote(m.impact_note))
      .map((m) => m.ingredient_key) ?? [],
  );

  const dedupedGoals = [...new Set(goals)];

  const revalidateRecipe = () => {
    revalidatePath(`/recipes/${recipeId}`);
    revalidatePath(`/recipes/${recipeId}/prep`);
    revalidatePath(`/recipes/${recipeId}/cook`);
  };

  if (dedupedGoals.length === 0) {
    if (batchRowIds.length > 0) {
      const { error: delErr } = await supabase
        .from("recipe_modifications")
        .delete()
        .in("id", batchRowIds);
      if (delErr) {
        return { ok: false as const, error: delErr.message };
      }
    }
    revalidateRecipe();
    return { ok: true as const, applied: 0 };
  }

  // Use Claude when the API key is configured; fall back to the static catalog otherwise.
  let batchRows: { ingredient_key: string; replacement_label: string; impact_note: string }[];

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const result = await applyGoalSwapsWithClaude(
        ingredients,
        dedupedGoals,
        manualIngredientKeys,
        recipeName,
      );
      batchRows = result.rows;
    } catch {
      // Claude failed — fall back to static catalog silently
      const fallback = buildBatchSwapRows(
        ingredients,
        dedupedGoals,
        manualIngredientKeys,
        true,
      );
      batchRows = fallback.rows;
    }
  } else {
    const fallback = buildBatchSwapRows(
      ingredients,
      dedupedGoals,
      manualIngredientKeys,
      true,
    );
    batchRows = fallback.rows;
  }

  if (batchRowIds.length > 0) {
    const { error: delErr } = await supabase
      .from("recipe_modifications")
      .delete()
      .in("id", batchRowIds);
    if (delErr) {
      return { ok: false as const, error: delErr.message };
    }
  }

  if (batchRows.length === 0) {
    revalidateRecipe();
    return { ok: true as const, applied: 0 };
  }

  const rows = batchRows.map((r) => ({
    user_id: user.id,
    recipe_id: recipeId,
    ingredient_key: r.ingredient_key,
    replacement_label: r.replacement_label,
    impact_note: r.impact_note,
  }));

  const { error } = await supabase.from("recipe_modifications").upsert(rows, {
    onConflict: "recipe_id,ingredient_key",
  });

  if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidateRecipe();
  return { ok: true as const, applied: batchRows.length };
}

/** Removes all ingredient swaps for this recipe (shift + manual). */
export async function clearRecipeSwaps(recipeId: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false as const, error: "Sign in required." };
  }

  const { error } = await supabase
    .from("recipe_modifications")
    .delete()
    .eq("recipe_id", recipeId)
    .eq("user_id", user.id);

  if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidatePath(`/recipes/${recipeId}`);
  revalidatePath(`/recipes/${recipeId}/prep`);
  revalidatePath(`/recipes/${recipeId}/cook`);
  return { ok: true as const };
}
