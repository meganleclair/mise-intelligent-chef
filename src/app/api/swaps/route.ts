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
          content: `You are a practical home cook and nutritionist. Suggest 3–4 realistic substitutions for "${ingredientName}" in the recipe "${recipeName || "this dish"}".${contextLine}

Return ONLY a valid JSON array — no markdown, no explanation:
[
  { "label": "Substitute name", "impactNote": "One honest sentence on what changes: texture, flavor, or technique" }
]

Rules:
- Do not include "${ingredientName}" itself as an option
- Tailor suggestions to this specific recipe's context
- Keep impact notes concise and practical`,
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
