import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Ingredient, PrepItem, Step } from "@/lib/types/recipe";
import type { TimerState } from "@/lib/types/recipe";

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
};

export type ModificationRow = {
  ingredient_key: string;
  replacement_label: string;
  impact_note: string | null;
};

export function parseTimerState(raw: unknown): TimerState {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as { ends_at?: string; label?: string | null };
  if (!o.ends_at) return null;
  return { label: o.label ?? null, endsAt: o.ends_at };
}

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

export async function getModifications(recipeId: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("recipe_modifications")
    .select("ingredient_key, replacement_label, impact_note")
    .eq("recipe_id", recipeId)
    .eq("user_id", user.id);

  return (data ?? []) as ModificationRow[];
}

export async function getActiveCookSession() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: session, error: sErr } = await supabase
    .from("cook_sessions")
    .select("id, recipe_id, current_step_index, timer_state")
    .eq("user_id", user.id)
    .is("completed_at", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (sErr || !session) return null;

  const { data: recipe } = await supabase
    .from("recipes")
    .select("title, image_url")
    .eq("id", session.recipe_id)
    .maybeSingle();

  if (!recipe) return null;

  return {
    sessionId: session.id as string,
    recipeId: session.recipe_id as string,
    currentStepIndex: session.current_step_index as number,
    timerState: parseTimerState(session.timer_state),
    recipeTitle: recipe.title as string,
    recipeImage: recipe.image_url as string | null,
  };
}

export async function getCookSessionForRecipe(recipeId: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("cook_sessions")
    .select("id, current_step_index, timer_state, servings")
    .eq("user_id", user.id)
    .eq("recipe_id", recipeId)
    .is("completed_at", null)
    .maybeSingle();

  if (!data) return null;

  let timerState = parseTimerState(data.timer_state);
  if (timerState && new Date(timerState.endsAt) <= new Date()) {
    timerState = null;
    await supabase
      .from("cook_sessions")
      .update({ timer_state: null })
      .eq("id", data.id as string)
      .eq("user_id", user.id);
  }

  return {
    sessionId: data.id as string,
    currentStepIndex: data.current_step_index as number,
    timerState,
    servings: data.servings as number | null,
  };
}

export async function getRecentImports(limit = 6) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("recipes")
    .select("id, title, image_url, created_at, favorite, rating")
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
    .select("id, title, image_url, created_at, rating")
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
