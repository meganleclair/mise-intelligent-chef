"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { importRecipeFromUrl } from "@/lib/recipes/importRecipe";
import { normalizeImageUrl } from "@/lib/images";
import type { PrepItem } from "@/lib/types/recipe";

export async function importAndSaveRecipe(url: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false as const, error: "Sign in to import recipes." };
  }

  const result = await importRecipeFromUrl(url);
  if (!result.ok) {
    return result;
  }

  const r = result.recipe;
  const { data, error } = await supabase
    .from("recipes")
    .insert({
      user_id: user.id,
      title: r.title,
      summary: r.summary,
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
    return { ok: false as const, error: error?.message ?? "Could not save recipe." };
  }

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
