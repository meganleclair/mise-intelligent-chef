"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
