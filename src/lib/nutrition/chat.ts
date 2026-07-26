import Anthropic from "@anthropic-ai/sdk";
import type {
  ChatTurn,
  Ingredient,
  IngredientOverride,
  MacroEstimate,
} from "@/lib/types/recipe";

export type NutritionChatState = {
  servings: number;
  overrides: IngredientOverride[];
  macros: MacroEstimate | null;
};

export type NutritionChatResult = {
  reply: string;
  state: NutritionChatState;
};

export class NutritionChatError extends Error {}

const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [300, 900];

// Client errors that will never succeed on retry — the request itself is
// invalid (bad key, bad payload, wrong permissions, missing resource, or a
// request the API understood but rejected as unprocessable). Retrying these
// just burns the backoff on something that can't recover.
const NON_RETRYABLE_ERROR_CLASSES = [
  Anthropic.AuthenticationError,
  Anthropic.BadRequestError,
  Anthropic.PermissionDeniedError,
  Anthropic.NotFoundError,
  Anthropic.UnprocessableEntityError,
];

function isNonRetryableApiError(err: unknown): boolean {
  return NON_RETRYABLE_ERROR_CLASSES.some((cls) => err instanceof cls);
}

async function withRetries<T>(fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (isNonRetryableApiError(err)) {
        throw new NutritionChatError(
          err instanceof Error ? err.message : String(err),
        );
      }
      lastErr = err;
      if (attempt < MAX_ATTEMPTS - 1) {
        await new Promise((resolve) => setTimeout(resolve, BACKOFF_MS[attempt]));
      }
    }
  }
  throw new NutritionChatError(
    lastErr instanceof Error ? lastErr.message : String(lastErr),
  );
}

function buildPrompt(
  recipeTitle: string,
  ingredients: Ingredient[],
  state: NutritionChatState,
  history: ChatTurn[],
  userMessage: string,
): string {
  const ingredientList = ingredients
    .map((i) => [i.quantity, i.unit, i.name].filter(Boolean).join(" "))
    .join("\n");

  const overridesList = state.overrides.length
    ? state.overrides.map((o) => `${o.original} → ${o.replacement}`).join("\n")
    : "none";

  const historyText = history
    .map((h) => `${h.role === "user" ? "User" : "You"}: ${h.content}`)
    .join("\n");

  return `You are a practical home cook helping someone make a recipe healthier without losing taste. This is an ongoing conversation about ONE recipe — answer naturally, like a knowledgeable friend, not a nutrition database.

Recipe: "${recipeTitle}"
Original ingredients:
${ingredientList}

Current servings: ${state.servings}
Current ingredient swaps: ${overridesList}
${historyText ? `\nConversation so far:\n${historyText}\n` : ""}
User: ${userMessage}

Reply with ONLY a valid JSON object — no markdown, no explanation outside the JSON:
{
  "reply": "Your conversational answer to the user's message.",
  "servings": 0,
  "overrides": [{ "original": "ingredient name as it appears in the recipe", "replacement": "swapped-in ingredient" }],
  "macros": { "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "fiber": 0 }
}

Rules:
- "servings" is the current serving count after this message — unchanged unless the user asked to change it.
- "overrides" must be the FULL current list of swaps, not just new ones — include everything still in effect, and drop anything the user asked to undo.
- Macros are estimates for the WHOLE recipe at "servings" (not per-serving) unless the user explicitly asked for per-serving numbers — in that case, say so in "reply" and still fill in whole-recipe numbers in "macros".
- Rough estimates are fine — this isn't a tracking app. Don't caveat every number; just answer directly.
- If the user's message doesn't call for a swap, serving change, or macro question, keep servings/overrides/macros the same as they already are and just answer conversationally in "reply".`;
}

function isPlainOverride(value: unknown): value is IngredientOverride {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Partial<IngredientOverride>).original === "string" &&
    typeof (value as Partial<IngredientOverride>).replacement === "string"
  );
}

function isValidMacroEstimate(value: unknown): value is MacroEstimate {
  if (typeof value !== "object" || value === null) return false;
  const m = value as Partial<MacroEstimate>;
  return (
    typeof m.calories === "number" &&
    typeof m.protein === "number" &&
    typeof m.carbs === "number" &&
    typeof m.fat === "number" &&
    typeof m.fiber === "number"
  );
}

async function requestAndParse(
  client: Anthropic,
  prompt: string,
): Promise<NutritionChatResult> {
  const message = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const block = message.content[0];
  if (!block || block.type !== "text") {
    throw new NutritionChatError("Sous's response wasn't in the expected format.");
  }
  const text = block.text.trim();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new NutritionChatError("Sous's response wasn't in the expected format.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    throw new NutritionChatError("Sous's response wasn't valid JSON.");
  }

  const p = parsed as Partial<{
    reply: string;
    servings: number;
    overrides: unknown[];
    macros: unknown;
  }>;

  if (
    typeof p.reply !== "string" ||
    typeof p.servings !== "number" ||
    !Array.isArray(p.overrides) ||
    !p.overrides.every(isPlainOverride) ||
    !isValidMacroEstimate(p.macros)
  ) {
    throw new NutritionChatError("Sous's response was missing required fields.");
  }

  return {
    reply: p.reply,
    state: {
      servings: p.servings,
      overrides: p.overrides,
      macros: p.macros,
    },
  };
}

export async function runNutritionChat(params: {
  recipeTitle: string;
  ingredients: Ingredient[];
  state: NutritionChatState;
  history: ChatTurn[];
  userMessage: string;
}): Promise<NutritionChatResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new NutritionChatError("ANTHROPIC_API_KEY is not configured.");
  }

  const client = new Anthropic({ apiKey });
  const prompt = buildPrompt(
    params.recipeTitle,
    params.ingredients,
    params.state,
    params.history,
    params.userMessage,
  );

  return withRetries(() => requestAndParse(client, prompt));
}
