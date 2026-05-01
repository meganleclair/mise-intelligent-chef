"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { importRecipeFromUrl } from "@/lib/recipes/importRecipe";
import { generateRecipeSummary } from "@/lib/recipes/generate-summary";
import { normalizeImageUrl } from "@/lib/images";
import type { Ingredient, PrepItem } from "@/lib/types/recipe";

export async function importAndSaveRecipe(url: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false as const, error: "Sign in to import recipes." };
  }

  console.log(`[importAndSaveRecipe] user=${user.id.slice(0, 8)}… url=${url.slice(0, 60)}`);

  const result = await importRecipeFromUrl(url);
  if (!result.ok) {
    console.error("[importAndSaveRecipe] import pipeline failed:", result.error);
    return result;
  }

  console.log(`[importAndSaveRecipe] pipeline ok (${result.source}): "${result.recipe.title}"`);

  const r = result.recipe;

  // Replace adapter summary (often Spoonacular marketing copy) with a
  // Claude-written description grounded in the actual title and ingredients.
  const claudeSummary = await generateRecipeSummary(
    r.title,
    r.servings,
    r.ingredients,
  );

  const { data, error } = await supabase
    .from("recipes")
    .insert({
      user_id: user.id,
      title: r.title,
      summary: claudeSummary ?? r.summary,
      image_url: normalizeImageUrl(r.imageUrl),
      source_url: r.sourceUrl,
      servings: r.servings,
      ingredients: r.ingredients,
      steps: r.steps,
      prep_items: r.prepItems,
      spoonacular_id: r.spoonacularId,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[importAndSaveRecipe] insert failed:", error?.message);
    return { ok: false as const, error: error?.message ?? "Could not save recipe." };
  }

  console.log(`[importAndSaveRecipe] saved recipeId=${data.id}`);
  revalidatePath("/");
  revalidatePath("/kitchen");
  return { ok: true as const, recipeId: data.id, source: result.source };
}

export async function updatePrepItems(recipeId: string, prepItems: PrepItem[]) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false as const, error: "Sign in required." };
  }

  const { error } = await supabase
    .from("recipes")
    .update({ prep_items: prepItems })
    .eq("id", recipeId)
    .eq("user_id", user.id);

  if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidatePath(`/recipes/${recipeId}`);
  revalidatePath(`/recipes/${recipeId}/prep`);
  return { ok: true as const };
}

export async function setRecipeRating(recipeId: string, rating: number | null) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false as const, error: "Sign in required." };
  }

  if (rating !== null && (rating < 1 || rating > 5 || !Number.isInteger(rating))) {
    return { ok: false as const, error: "Rating must be between 1 and 5." };
  }

  const { error } = await supabase
    .from("recipes")
    .update({ rating })
    .eq("id", recipeId)
    .eq("user_id", user.id);

  if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidatePath("/kitchen");
  revalidatePath(`/recipes/${recipeId}`);
  return { ok: true as const };
}

export async function setRecipeFavorite(recipeId: string, favorite: boolean) {
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

  const { data, error } = await supabase
    .from("recipes")
    .update({ favorite })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id");

  if (error) {
    return { ok: false as const, error: error.message };
  }
  if (!data?.length) {
    return {
      ok: false as const,
      error:
        "We couldn’t update this recipe. Refresh the page and make sure you’re signed in.",
    };
  }

  revalidatePath("/");
  revalidatePath("/kitchen");
  revalidatePath(`/recipes/${id}`);
  return { ok: true as const };
}

/** Stops showing the recipe on “Recently imported” (home + kitchen). Does not delete it. */
export async function dismissRecipeFromRecentImports(recipeId: string) {
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

  const { data, error } = await supabase
    .from("recipes")
    .update({ hidden_from_recent_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id");

  if (error) {
    return { ok: false as const, error: error.message };
  }
  if (!data?.length) {
    return {
      ok: false as const,
      error: "Couldn’t update that recipe. Try refreshing the page.",
    };
  }

  revalidatePath("/");
  revalidatePath("/kitchen");
  return { ok: true as const };
}

/** Regenerate the recipe summary using Claude based on the saved title and ingredients. */
export async function regenerateRecipeSummary(recipeId: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false as const, error: "Sign in required." };
  }

  const { data: row, error: fetchErr } = await supabase
    .from("recipes")
    .select("title, servings, ingredients")
    .eq("id", recipeId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchErr || !row) {
    return { ok: false as const, error: "Recipe not found." };
  }

  const summary = await generateRecipeSummary(
    row.title as string,
    row.servings as number,
    row.ingredients as Ingredient[],
  );

  if (!summary) {
    return { ok: false as const, error: "Couldn't generate a description right now. Try again in a moment." };
  }

  const { error: updateErr } = await supabase
    .from("recipes")
    .update({ summary })
    .eq("id", recipeId)
    .eq("user_id", user.id);

  if (updateErr) {
    return { ok: false as const, error: updateErr.message };
  }

  revalidatePath(`/recipes/${recipeId}`);
  return { ok: true as const, summary };
}

export async function deleteRecipe(recipeId: string) {
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

  const { data, error } = await supabase
    .from("recipes")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id");

  if (error) {
    return { ok: false as const, error: error.message };
  }
  if (!data?.length) {
    return {
      ok: false as const,
      error: "Couldn’t remove that recipe. Try refreshing the page.",
    };
  }

  revalidatePath("/");
  revalidatePath("/kitchen");
  return { ok: true as const };
}
