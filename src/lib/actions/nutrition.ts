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
