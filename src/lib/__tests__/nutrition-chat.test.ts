import { describe, it, expect, vi, beforeEach } from "vitest";
import Anthropic from "@anthropic-ai/sdk";

const mockCreate = vi.fn();

vi.mock("@anthropic-ai/sdk", async () => {
  const actual =
    await vi.importActual<typeof import("@anthropic-ai/sdk")>("@anthropic-ai/sdk");
  const MockAnthropic = vi.fn().mockImplementation(function () {
    return { messages: { create: mockCreate } };
  }) as unknown as typeof actual.default;
  // Preserve the real error classes (AuthenticationError, BadRequestError, etc.)
  // so `instanceof` checks in chat.ts still work against mocked rejections.
  // These are inherited via the prototype chain on the real class (defined on
  // BaseAnthropic), not own properties, so Object.assign wouldn't copy them —
  // list them explicitly instead.
  const errorClassNames = [
    "AnthropicError",
    "APIError",
    "APIConnectionError",
    "APIConnectionTimeoutError",
    "APIUserAbortError",
    "NotFoundError",
    "ConflictError",
    "RateLimitError",
    "BadRequestError",
    "AuthenticationError",
    "InternalServerError",
    "PermissionDeniedError",
    "UnprocessableEntityError",
  ] as const;
  for (const name of errorClassNames) {
    (MockAnthropic as unknown as Record<string, unknown>)[name] = actual.default[name];
  }
  return { default: MockAnthropic };
});

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

  it("throws NutritionChatError when the response has no JSON object across all retries", async () => {
    mockCreate.mockResolvedValue(textResponse("Sorry, I can't help with that."));
    const { runNutritionChat, NutritionChatError } = await importChat();

    await expect(runNutritionChat(BASE_PARAMS)).rejects.toThrow(NutritionChatError);
    expect(mockCreate).toHaveBeenCalledTimes(3);
  });

  it("throws NutritionChatError when required fields are missing across all retries", async () => {
    mockCreate.mockResolvedValue(textResponse(JSON.stringify({ reply: "Sure." })));
    const { runNutritionChat, NutritionChatError } = await importChat();

    await expect(runNutritionChat(BASE_PARAMS)).rejects.toThrow(NutritionChatError);
    expect(mockCreate).toHaveBeenCalledTimes(3);
  });

  it("recovers after a malformed response on the first attempt", async () => {
    mockCreate
      .mockResolvedValueOnce(textResponse("Sorry, I can't help with that."))
      .mockResolvedValueOnce(textResponse(VALID_REPLY));
    const { runNutritionChat } = await importChat();

    const result = await runNutritionChat(BASE_PARAMS);

    expect(result.reply).toBe("That cuts about 65 calories per batch.");
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it("throws NutritionChatError after exactly one attempt on a non-retryable API error", async () => {
    mockCreate.mockRejectedValue(
      new Anthropic.AuthenticationError(
        401,
        {
          type: "error",
          error: { type: "authentication_error", message: "invalid x-api-key" },
        },
        "invalid x-api-key",
        new Headers(),
      ),
    );
    const { runNutritionChat, NutritionChatError } = await importChat();

    await expect(runNutritionChat(BASE_PARAMS)).rejects.toThrow(NutritionChatError);
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it("throws NutritionChatError when the response has an empty content array", async () => {
    mockCreate.mockResolvedValue({ content: [] });
    const { runNutritionChat, NutritionChatError } = await importChat();

    await expect(runNutritionChat(BASE_PARAMS)).rejects.toThrow(NutritionChatError);
    expect(mockCreate).toHaveBeenCalledTimes(3);
  });

  it("throws NutritionChatError when a macro sub-field has the wrong type", async () => {
    mockCreate.mockResolvedValue(
      textResponse(
        JSON.stringify({
          reply: "That cuts some calories.",
          servings: 4,
          overrides: [],
          macros: { calories: 1200, protein: "sixty", carbs: 90, fat: 40, fiber: 20 },
        }),
      ),
    );
    const { runNutritionChat, NutritionChatError } = await importChat();

    await expect(runNutritionChat(BASE_PARAMS)).rejects.toThrow(NutritionChatError);
    expect(mockCreate).toHaveBeenCalledTimes(3);
  });

  it("throws NutritionChatError when ANTHROPIC_API_KEY is unset", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const { runNutritionChat, NutritionChatError } = await importChat();

    await expect(runNutritionChat(BASE_PARAMS)).rejects.toThrow(NutritionChatError);
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
