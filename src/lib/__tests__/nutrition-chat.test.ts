import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreate = vi.fn();

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(function () {
    return { messages: { create: mockCreate } };
  }),
}));

async function importChat() {
  vi.resetModules();
  return await import("@/lib/nutrition/chat");
}

const BASE_PARAMS = {
  recipeTitle: "Marinated White Beans",
  ingredients: [
    { id: "1", name: "White beans", quantity: "2", unit: "cup" },
    { id: "2", name: "Olive oil", quantity: "1/2", unit: "cup" },
  ],
  state: { servings: 4, overrides: [], macros: null },
  history: [],
  userMessage: "What if I used 1/3 cup olive oil instead?",
};

const VALID_REPLY = JSON.stringify({
  reply: "That cuts about 65 calories per batch.",
  servings: 4,
  overrides: [{ original: "Olive oil", replacement: "1/3 cup olive oil" }],
  macros: { calories: 1200, protein: 60, carbs: 90, fat: 40, fiber: 20 },
});

function textResponse(text: string) {
  return { content: [{ type: "text", text }] };
}

describe("runNutritionChat", () => {
  beforeEach(() => {
    mockCreate.mockReset();
    process.env.ANTHROPIC_API_KEY = "test-key";
  });

  it("returns the parsed reply and state on success", async () => {
    mockCreate.mockResolvedValueOnce(textResponse(VALID_REPLY));
    const { runNutritionChat } = await importChat();

    const result = await runNutritionChat(BASE_PARAMS);

    expect(result.reply).toBe("That cuts about 65 calories per batch.");
    expect(result.state.servings).toBe(4);
    expect(result.state.overrides).toEqual([
      { original: "Olive oil", replacement: "1/3 cup olive oil" },
    ]);
    expect(result.state.macros.calories).toBe(1200);
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it("retries on failure and succeeds once a retry works", async () => {
    mockCreate
      .mockRejectedValueOnce(new Error("network blip"))
      .mockResolvedValueOnce(textResponse(VALID_REPLY));
    const { runNutritionChat } = await importChat();

    const result = await runNutritionChat(BASE_PARAMS);

    expect(result.reply).toBe("That cuts about 65 calories per batch.");
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it("throws NutritionChatError after exhausting all retries", async () => {
    mockCreate.mockRejectedValue(new Error("persistent failure"));
    const { runNutritionChat, NutritionChatError } = await importChat();

    await expect(runNutritionChat(BASE_PARAMS)).rejects.toThrow(NutritionChatError);
    expect(mockCreate).toHaveBeenCalledTimes(3);
  });

  it("throws NutritionChatError when the response has no JSON object", async () => {
    mockCreate.mockResolvedValueOnce(textResponse("Sorry, I can't help with that."));
    const { runNutritionChat, NutritionChatError } = await importChat();

    await expect(runNutritionChat(BASE_PARAMS)).rejects.toThrow(NutritionChatError);
  });

  it("throws NutritionChatError when required fields are missing", async () => {
    mockCreate.mockResolvedValueOnce(
      textResponse(JSON.stringify({ reply: "Sure." })),
    );
    const { runNutritionChat, NutritionChatError } = await importChat();

    await expect(runNutritionChat(BASE_PARAMS)).rejects.toThrow(NutritionChatError);
  });

  it("throws NutritionChatError when ANTHROPIC_API_KEY is unset", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const { runNutritionChat, NutritionChatError } = await importChat();

    await expect(runNutritionChat(BASE_PARAMS)).rejects.toThrow(NutritionChatError);
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
