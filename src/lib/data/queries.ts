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
