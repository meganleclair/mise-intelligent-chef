import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export type SwapOption = {
  label: string;
  impactNote: string;
};

const client = new Anthropic();

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // No key configured — caller falls back to static catalog
    return NextResponse.json({ options: [] });
  }

  try {
    const body = await request.json();
    const { ingredientName, recipeName, ingredientNames } = body;

    if (!ingredientName || typeof ingredientName !== "string") {
      return NextResponse.json(
        { error: "ingredientName required" },
        { status: 400 }
      );
    }

    const contextLine =
      Array.isArray(ingredientNames) && ingredientNames.length > 0
        ? ` The full recipe also uses: ${ingredientNames.slice(0, 12).join(", ")}.`
        : "";

    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: `You are a practical home cook helping someone make dietary or lifestyle swaps. For "${ingredientName}" in the recipe "${recipeName || "this dish"}",${contextLine} suggest 2–3 substitutions driven by real dietary needs: dairy-free, lower calorie, lower carb, higher protein, or ingredient availability.

Return ONLY a valid JSON array — no markdown, no explanation:
[
  { "label": "Substitute name or combination", "impactNote": "One honest sentence on what changes and why it works" }
]

Rules:
- Only return options if the ingredient is meaningfully swappable (fats, dairy, proteins, grains, sweeteners, stocks). Return [] for vegetables, aromatics, herbs, and spices — those aren't swap candidates.
- Combinations are great (e.g. "Cream cheese + whole milk" as a swap for heavy cream)
- Do not include "${ingredientName}" itself
- Keep impact notes short and practical — mention the tradeoff honestly`,
        },
      ],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text.trim() : "";

    // Extract JSON array robustly
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json({ options: [] });
    }

    const parsed: unknown = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(parsed)) {
      return NextResponse.json({ options: [] });
    }

    const options: SwapOption[] = parsed
      .filter(
        (o): o is SwapOption =>
          typeof (o as SwapOption).label === "string" &&
          typeof (o as SwapOption).impactNote === "string"
      )
      .slice(0, 5);

    return NextResponse.json({ options });
  } catch (error) {
    console.error("Swap API error:", error);
    // Return empty — component falls back to static catalog
    return NextResponse.json({ options: [] });
  }
}
