"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { importRecipeFromUrl } from "@/lib/recipes/importRecipe";
import { generateRecipeSummary } from "@/lib/recipes/generate-summary";
import { normalizeImageUrl } from "@/lib/images";

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
    console.error("[importAndSaveRecipe] import pipeline failed:", result.error);
    return result;
  }

  const r = result.recipe;

  const { data: existing } = await supabase
    .from("recipes")
    .select("id")
    .eq("user_id", user.id)
    .eq("source_url", r.sourceUrl)
    .maybeSingle();

  if (existing) {
    return { ok: true as const, recipeId: existing.id, duplicate: true as const };
  }

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

  if (error) {
    // Unique violation on (user_id, source_url) — a concurrent import of the
    // same URL won the race. Treat it the same as finding it up front.
    if (error.code === "23505") {
      const { data: existingAfterRace } = await supabase
        .from("recipes")
        .select("id")
        .eq("user_id", user.id)
        .eq("source_url", r.sourceUrl)
        .maybeSingle();
      if (existingAfterRace) {
        return { ok: true as const, recipeId: existingAfterRace.id, duplicate: true as const };
      }
    }
    console.error("[importAndSaveRecipe] insert failed:", error.message);
    return { ok: false as const, error: error.message };
  }

  if (!data) {
    return { ok: false as const, error: "Could not save recipe." };
  }

  revalidatePath("/");
  revalidatePath("/kitchen");
  return { ok: true as const, recipeId: data.id, source: result.source };
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
