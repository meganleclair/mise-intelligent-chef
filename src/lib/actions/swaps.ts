"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  buildBatchSwapRows,
  isBatchShiftNote,
  type BatchSwapConflict,
  type SwapGoal,
} from "@/lib/swap-catalog";
import type { Ingredient } from "@/lib/types/recipe";

export type { SwapGoal, BatchSwapConflict } from "@/lib/swap-catalog";

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
    .select("ingredients")
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

  const resolveConflicts = options?.acknowledgeConflicts ?? false;
  const { rows: batchRows, conflicts } = buildBatchSwapRows(
    ingredients,
    dedupedGoals,
    manualIngredientKeys,
    resolveConflicts,
  );

  if (conflicts.length > 0) {
    return { ok: true as const, needsConfirmation: true, conflicts };
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
