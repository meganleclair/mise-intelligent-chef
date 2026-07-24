"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { RecipeRatingSection } from "@/components/recipe-rating-section";
import { saveNutritionSession } from "@/lib/actions/nutrition";
import { applyIngredientOverrides } from "@/lib/recipes/display";
import { decodeHtmlEntities } from "@/lib/decode-html-entities";
import type {
  ChatTurn,
  Ingredient,
  IngredientOverride,
  MacroEstimate,
} from "@/lib/types/recipe";

type WorkingState = {
  servings: number;
  overrides: IngredientOverride[];
  macros: MacroEstimate | null;
};

type Props = {
  recipeId: string;
  recipeTitle: string;
  ingredients: Ingredient[];
  initialState: WorkingState;
  initialRating: number | null;
};

async function sendChatMessage(params: {
  recipeId: string;
  state: WorkingState;
  history: ChatTurn[];
  userMessage: string;
}): Promise<{ reply: string; state: WorkingState } | { error: string }> {
  const res = await fetch("/api/nutrition-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) {
    return { error: data.error ?? "Something went wrong." };
  }
  return data;
}

export function NutritionPanel({
  recipeId,
  recipeTitle,
  ingredients,
  initialState,
  initialRating,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [working, setWorking] = useState<WorkingState>(initialState);
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRating, setShowRating] = useState(false);

  function resetForOpen(nextOpen: boolean) {
    if (nextOpen) {
      setWorking(initialState);
      setMessages([]);
      setError(null);
      setShowRating(false);
    }
    setOpen(nextOpen);
  }

  async function send(text: string, opts?: { skipAppend?: boolean }) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setError(null);

    const nextMessages: ChatTurn[] = opts?.skipAppend
      ? messages
      : [...messages, { role: "user", content: trimmed }];
    if (!opts?.skipAppend) {
      setMessages(nextMessages);
      setInput("");
    }

    try {
      const result = await sendChatMessage({
        recipeId,
        state: working,
        history: opts?.skipAppend ? messages.slice(0, -1) : messages,
        userMessage: trimmed,
      });

      if ("error" in result) {
        setError(result.error);
        return;
      }

      setWorking(result.state);
      setMessages([...nextMessages, { role: "assistant", content: result.reply }]);
    } catch {
      setError("Something went wrong reaching the nutrition chat. Try again.");
    } finally {
      setSending(false);
    }
  }

  function retryLast() {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    void send(lastUser.content, { skipAppend: true });
  }

  function adjustServings(delta: number) {
    const next = Math.max(1, working.servings + delta);
    void send(`Recalculate for ${next} servings.`);
  }

  function askAboutSwap(ingredientName: string) {
    setInput(`What's a good swap for ${ingredientName}?`);
  }

  async function doneCooking() {
    setSending(true);
    setError(null);
    try {
      const res = await saveNutritionSession(recipeId, working);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setShowRating(true);
    } catch {
      setError("Something went wrong saving your changes. Try again.");
    } finally {
      setSending(false);
    }
  }

  function finishAfterRating() {
    resetForOpen(false);
    router.refresh();
  }

  const displayIngredients = applyIngredientOverrides(ingredients, working.overrides);

  return (
    <Sheet open={open} onOpenChange={resetForOpen}>
      <SheetTrigger
        render={<Button size="lg" className="min-h-12 w-full justify-center sm:w-auto" />}
      >
        Cook with Claude
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{decodeHtmlEntities(recipeTitle)}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-4">
          {showRating ? (
            <div className="space-y-4 py-6 text-center">
              <p className="font-serif text-lg text-text-heading">Nice work!</p>
              <RecipeRatingSection recipeId={recipeId} initialRating={initialRating} />
              <Button size="lg" className="mt-4 min-h-12 w-full" onClick={finishAfterRating}>
                Done
              </Button>
            </div>
          ) : (
            <>
              <section className="space-y-3 rounded-lg border border-border p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-text-heading">Servings</p>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={sending || working.servings <= 1}
                      onClick={() => adjustServings(-1)}
                    >
                      −
                    </Button>
                    <span className="w-6 text-center text-sm">{working.servings}</span>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={sending}
                      onClick={() => adjustServings(1)}
                    >
                      +
                    </Button>
                  </div>
                </div>

                {working.macros ? (
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="text-xs text-muted-foreground">Calories</dt>
                      <dd>{working.macros.calories}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Protein</dt>
                      <dd>{working.macros.protein}g</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Carbs</dt>
                      <dd>{working.macros.carbs}g</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Fat</dt>
                      <dd>{working.macros.fat}g</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Fiber</dt>
                      <dd>{working.macros.fiber}g</dd>
                    </div>
                  </dl>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Ask a question below to get an estimate for this recipe.
                  </p>
                )}

                <ul className="space-y-1.5 text-sm">
                  {displayIngredients.map((ing) => (
                    <li key={ing.id} className="flex items-center justify-between gap-2">
                      <span>{decodeHtmlEntities(ing.name)}</span>
                      <button
                        type="button"
                        className="shrink-0 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
                        onClick={() => askAboutSwap(ing.swapBasisName ?? ing.name)}
                      >
                        Swap
                      </button>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="space-y-3">
                <ul className="space-y-2">
                  {messages.map((m, i) => (
                    <li
                      key={i}
                      className={
                        m.role === "user"
                          ? "ml-auto max-w-[85%] rounded-lg bg-primary/10 px-3 py-2 text-sm"
                          : "mr-auto max-w-[85%] rounded-lg bg-muted px-3 py-2 text-sm"
                      }
                    >
                      {m.content}
                    </li>
                  ))}
                </ul>

                {error ? (
                  <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm">
                    <p className="text-destructive">{error}</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={retryLast}
                      disabled={sending}
                    >
                      Retry
                    </Button>
                  </div>
                ) : null}
              </section>
            </>
          )}
        </div>

        {!showRating ? (
          <SheetFooter className="gap-2 border-t border-border">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send(input);
                  }
                }}
                placeholder="What if I used chickpeas instead?"
                disabled={sending}
                className="border-input bg-background h-11 flex-1 rounded-md border px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Button type="button" disabled={sending || !input.trim()} onClick={() => send(input)}>
                Send
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                disabled={sending}
                onClick={() => resetForOpen(false)}
              >
                Exit
              </Button>
              <Button type="button" className="flex-1" disabled={sending} onClick={doneCooking}>
                Done Cooking
              </Button>
            </div>
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
