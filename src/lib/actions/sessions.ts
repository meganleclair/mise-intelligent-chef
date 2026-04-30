"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TimerState } from "@/lib/types/recipe";

function timerToJson(state: TimerState | null) {
  if (!state) return null;
  return {
    label: state.label,
    ends_at: state.endsAt,
  };
}

export async function startOrResumeCookSession(recipeId: string, servings?: number) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false as const, error: "Sign in required." };
  }

  const { data: existing } = await supabase
    .from("cook_sessions")
    .select("id")
    .eq("user_id", user.id)
    .eq("recipe_id", recipeId)
    .is("completed_at", null)
    .maybeSingle();

  if (existing) {
    revalidatePath(`/recipes/${recipeId}/cook`);
    return { ok: true as const, sessionId: existing.id };
  }

  const { data, error } = await supabase
    .from("cook_sessions")
    .insert({
      user_id: user.id,
      recipe_id: recipeId,
      servings: servings ?? null,
      current_step_index: 0,
      timer_state: null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false as const, error: error?.message ?? "Could not start session." };
  }

  revalidatePath("/");
  revalidatePath("/kitchen");
  revalidatePath(`/recipes/${recipeId}/cook`);
  return { ok: true as const, sessionId: data.id };
}

export async function updateCookStep(recipeId: string, stepIndex: number) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false as const, error: "Sign in required." };
  }

  const { error } = await supabase
    .from("cook_sessions")
    .update({ current_step_index: stepIndex })
    .eq("user_id", user.id)
    .eq("recipe_id", recipeId)
    .is("completed_at", null);

  if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidatePath(`/recipes/${recipeId}/cook`);
  return { ok: true as const };
}

export async function updateCookTimer(recipeId: string, timer: TimerState | null) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false as const, error: "Sign in required." };
  }

  const { error } = await supabase
    .from("cook_sessions")
    .update({ timer_state: timerToJson(timer) })
    .eq("user_id", user.id)
    .eq("recipe_id", recipeId)
    .is("completed_at", null);

  if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidatePath(`/recipes/${recipeId}/cook`);
  return { ok: true as const };
}

/** Remove an in-progress session when the user is done with “continue cooking” (not the same as finishing the recipe in cook mode). */
export async function abandonCookSession(recipeId: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false as const, error: "Sign in required." };
  }

  const { error } = await supabase
    .from("cook_sessions")
    .delete()
    .eq("user_id", user.id)
    .eq("recipe_id", recipeId)
    .is("completed_at", null);

  if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/kitchen");
  revalidatePath(`/recipes/${recipeId}/cook`);
  return { ok: true as const };
}

export async function completeCookSession(recipeId: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false as const, error: "Sign in required." };
  }

  const { error } = await supabase
    .from("cook_sessions")
    .update({ completed_at: new Date().toISOString(), timer_state: null })
    .eq("user_id", user.id)
    .eq("recipe_id", recipeId)
    .is("completed_at", null);

  if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/kitchen");
  revalidatePath(`/recipes/${recipeId}/cook`);
  return { ok: true as const };
}

/** Mark cook session complete and optionally save to My Kitchen (favorite) and set a 1–5 rating. */
export async function finishCookingWithFeedback(
  recipeId: string,
  opts: { saveToKitchen: boolean; rating: number | null },
) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false as const, error: "Sign in required." };
  }

  const rid = recipeId.trim();
  if (!rid) {
    return { ok: false as const, error: "Missing recipe." };
  }

  const r = opts.rating;
  if (r !== null && (r < 1 || r > 5 || !Number.isInteger(r))) {
    return { ok: false as const, error: "Rating must be between 1 and 5." };
  }

  const { error: sessionErr } = await supabase
    .from("cook_sessions")
    .update({ completed_at: new Date().toISOString(), timer_state: null })
    .eq("user_id", user.id)
    .eq("recipe_id", rid)
    .is("completed_at", null);

  if (sessionErr) {
    return { ok: false as const, error: sessionErr.message };
  }

  const { data: updatedRows, error: favoriteErr } = await supabase
    .from("recipes")
    .update({ favorite: opts.saveToKitchen })
    .eq("id", rid)
    .eq("user_id", user.id)
    .select("id");

  if (favoriteErr) {
    return { ok: false as const, error: favoriteErr.message };
  }
  if (!updatedRows?.length) {
    return {
      ok: false as const,
      error:
        "Couldn’t save to My Kitchen. Refresh the page and try again, or use Save to My Kitchen on the recipe page.",
    };
  }

  if (r !== null) {
    const { error: ratingErr } = await supabase
      .from("recipes")
      .update({ rating: r })
      .eq("id", rid)
      .eq("user_id", user.id);

    if (ratingErr) {
      return { ok: false as const, error: ratingErr.message };
    }
  }

  revalidatePath("/");
  revalidatePath("/kitchen");
  revalidatePath(`/recipes/${rid}`);
  revalidatePath(`/recipes/${rid}/cook`);
  return { ok: true as const };
}
