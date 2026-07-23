import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { getRecipeForUser } from "@/lib/data/queries";
import {
  runNutritionChat,
  NutritionChatError,
  type NutritionChatState,
} from "@/lib/nutrition/chat";
import type { ChatTurn } from "@/lib/types/recipe";

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Sign in to use the nutrition chat." },
      { status: 401 },
    );
  }

  const { allowed, resetMs } = checkRateLimit(
    `nutrition-chat:${user.id}`,
    20,
    60_000,
  );
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(resetMs / 1000)) } },
    );
  }

  const body = await request.json();
  const { recipeId, state, history, userMessage } = body as {
    recipeId?: string;
    state?: NutritionChatState;
    history?: ChatTurn[];
    userMessage?: string;
  };

  if (
    !recipeId ||
    typeof recipeId !== "string" ||
    !state ||
    typeof state.servings !== "number" ||
    !Array.isArray(state.overrides) ||
    !userMessage ||
    typeof userMessage !== "string"
  ) {
    return NextResponse.json(
      { error: "recipeId, state, and userMessage are required." },
      { status: 400 },
    );
  }

  const recipe = await getRecipeForUser(recipeId);
  if (!recipe) {
    return NextResponse.json({ error: "Recipe not found." }, { status: 404 });
  }

  try {
    const result = await runNutritionChat({
      recipeTitle: recipe.title,
      ingredients: recipe.ingredients,
      state,
      history: history ?? [],
      userMessage,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof NutritionChatError) {
      console.error("[nutrition-chat] Claude call failed:", error.message);
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    console.error("[nutrition-chat] unexpected error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
