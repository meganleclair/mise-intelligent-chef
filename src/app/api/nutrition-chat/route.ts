import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { getRecipeForUser } from "@/lib/data/queries";
import {
  runNutritionChat,
  NutritionChatError,
  type NutritionChatState,
} from "@/lib/nutrition/chat";
import type { ChatTurn, Ingredient } from "@/lib/types/recipe";

type RequestBody = {
  recipeId?: string;
  recipeTitle?: string;
  ingredients?: Ingredient[];
  state?: NutritionChatState;
  history?: ChatTurn[];
  userMessage?: string;
};

function isValidState(state: unknown): state is NutritionChatState {
  return (
    typeof state === "object" &&
    state !== null &&
    typeof (state as NutritionChatState).servings === "number" &&
    Array.isArray((state as NutritionChatState).overrides)
  );
}

function isValidIngredientList(value: unknown): value is Ingredient[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (i) =>
        typeof i === "object" &&
        i !== null &&
        typeof (i as Ingredient).name === "string",
    )
  );
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

/**
 * Demo/"Try a Recipe" visitors aren't signed in and have no recipeId in the
 * database — the client already has the full recipe (title + ingredients)
 * from the static demo catalog and sends it inline instead. This path never
 * touches Supabase auth or the `recipes`/`recipe_nutrition_sessions` tables;
 * it only ever forwards data the client already had to `runNutritionChat`.
 * Rate-limited per client IP (rather than per user.id, since there's no
 * authenticated user) so anonymous traffic can't hammer the paid Claude API.
 */
async function handleDemoRequest(request: NextRequest, body: RequestBody) {
  const ip = getClientIp(request);
  const { allowed, resetMs } = checkRateLimit(`nutrition-chat-demo:${ip}`, 10, 60_000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(resetMs / 1000)) } },
    );
  }

  const { recipeTitle, ingredients, state, history, userMessage } = body;

  if (
    !recipeTitle ||
    typeof recipeTitle !== "string" ||
    !isValidIngredientList(ingredients) ||
    !isValidState(state) ||
    !userMessage ||
    typeof userMessage !== "string"
  ) {
    return NextResponse.json(
      { error: "recipeTitle, ingredients, state, and userMessage are required." },
      { status: 400 },
    );
  }

  try {
    const result = await runNutritionChat({
      recipeTitle,
      ingredients,
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

/** Signed-in path — unchanged behavior: auth required, per-user rate limit, DB lookup. */
async function handleSignedInRequest(recipeId: string, body: RequestBody) {
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

  const { state, history, userMessage } = body;

  if (
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

export async function POST(request: NextRequest) {
  const body = (await request.json()) as RequestBody;

  // Branch on which identifying field the request supplies. A real recipeId
  // always routes through the signed-in path (auth + DB lookup), regardless
  // of anything else in the body — a signed-in recipeId can never be
  // downgraded into the unauthenticated demo path. Only requests with NO
  // recipeId, carrying inline recipeTitle/ingredients instead, take the demo
  // path, which never queries `recipes` or `recipe_nutrition_sessions`.
  if (typeof body.recipeId === "string" && body.recipeId) {
    return handleSignedInRequest(body.recipeId, body);
  }

  if (
    typeof body.recipeTitle === "string" &&
    body.recipeTitle &&
    Array.isArray(body.ingredients)
  ) {
    return handleDemoRequest(request, body);
  }

  return NextResponse.json(
    { error: "recipeId, or recipeTitle and ingredients, are required." },
    { status: 400 },
  );
}
