import Anthropic from "@anthropic-ai/sdk";
import type { Ingredient } from "@/lib/types/recipe";

const client = new Anthropic();

/**
 * Use Claude Haiku to write a clean 2-3 sentence recipe description.
 * Replaces the garbage marketing copy from Spoonacular or scraped descriptions.
 * Returns null if Claude is unavailable — caller should keep the existing summary.
 */
export async function generateRecipeSummary(
  title: string,
  servings: number,
  ingredients: Ingredient[],
): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  const ingredientNames = ingredients
    .map((i) => [i.quantity, i.unit, i.name].filter(Boolean).join(" "))
    .slice(0, 20) // cap at 20 so the prompt stays small
    .join(", ");

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 150,
      messages: [
        {
          role: "user",
          content: `Write a 2-sentence description of this recipe for a home cooking app.

Rules:
- Describe what the dish is, its key flavors or textures, and when you'd want to make it
- No nutrition stats, price-per-serving, health scores, or social proof
- No mentions of the original recipe source
- Plain, warm language — like a knowledgeable cook recommending it to a friend
- 40–70 words maximum

Recipe: "${title}"
Serves: ${servings}
Ingredients: ${ingredientNames}

Write only the description, no preamble.`,
        },
      ],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text.trim() : "";
    return text || null;
  } catch {
    return null;
  }
}
