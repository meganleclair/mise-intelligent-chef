"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Ingredient, Step } from "@/lib/types/recipe";
import type { TimerState } from "@/lib/types/recipe";
import {
  startOrResumeCookSession,
  updateCookStep,
  updateCookTimer,
} from "@/lib/actions/sessions";
import { CookFinishDialog } from "@/components/cook-finish-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { IngredientSwapSheet } from "@/components/ingredient-swap-sheet";
import { decodeHtmlEntities } from "@/lib/decode-html-entities";
import { IngredientLine } from "@/components/ingredient-line";
import { getIngredientsForStep } from "@/lib/recipes/step-ingredients";
import { splitStepForDisplay } from "@/lib/recipes/split-step-display";

type Props = {
  recipeId: string;
  title: string;
  steps: Step[];
  ingredients: Ingredient[];
  initialStepIndex: number;
  initialTimer: TimerState;
  /** Local-only cook mode: no session sync; exit & finish use this path. */
  demoExitHref?: string;
};

function formatRemaining(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

function initialRemaining(timer: TimerState) {
  if (!timer) return 0;
  return Math.max(
    0,
    (new Date(timer.endsAt).getTime() - Date.now()) / 1000,
  );
}

export function CookModeClient({
  recipeId,
  title,
  steps,
  ingredients,
  initialStepIndex,
  initialTimer,
  demoExitHref,
}: Props) {
  const isDemo = Boolean(demoExitHref);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [finishOpen, setFinishOpen] = useState(false);
  const orderedSteps = useMemo(
    () => [...steps].sort((a, b) => a.order - b.order),
    [steps],
  );

  const [stepIndex, setStepIndex] = useState(() =>
    Math.min(initialStepIndex, Math.max(0, orderedSteps.length - 1)),
  );

  const [timer, setTimer] = useState<TimerState>(initialTimer);
  const [remainingSec, setRemainingSec] = useState(() =>
    initialRemaining(initialTimer),
  );
  const [minutes, setMinutes] = useState(10);

  useEffect(() => {
    if (!timer) {
      return;
    }
    const endsAt = timer.endsAt;
    function tick() {
      const sec = Math.max(
        0,
        (new Date(endsAt).getTime() - Date.now()) / 1000,
      );
      setRemainingSec(sec);
      if (sec <= 0) {
        clearInterval(id);
        setTimer(null);
        if (isDemo) {
          return;
        }
        startTransition(async () => {
          await updateCookTimer(recipeId, null);
          router.refresh();
        });
      }
    }
    const id = window.setInterval(tick, 1000);
    tick();
    return () => window.clearInterval(id);
  }, [timer, recipeId, router, isDemo]);


  useEffect(() => {
    if (isDemo) return;
    startTransition(async () => {
      await startOrResumeCookSession(recipeId);
    });
  }, [recipeId, isDemo]);

  const current = orderedSteps[stepIndex];
  const stepText = decodeHtmlEntities(current?.text ?? "");

  const { list: stepIngredients, narrowed } = useMemo(
    () => getIngredientsForStep(stepText, ingredients),
    [stepText, ingredients],
  );

  const stepParts = useMemo(
    () => splitStepForDisplay(stepText),
    [stepText],
  );

  function go(delta: number) {
    const next = Math.min(
      orderedSteps.length - 1,
      Math.max(0, stepIndex + delta),
    );
    setStepIndex(next);
    if (isDemo) return;
    startTransition(async () => {
      await updateCookStep(recipeId, next);
      router.refresh();
    });
  }

  function startTimer() {
    const endsAt = new Date(
      Date.now() + minutes * 60 * 1000,
    ).toISOString();
    const next: TimerState = {
      label: `Step ${stepIndex + 1}`,
      endsAt,
    };
    setTimer(next);
    setRemainingSec(minutes * 60);
    if (isDemo) return;
    startTransition(async () => {
      await updateCookTimer(recipeId, next);
      router.refresh();
    });
  }

  function clearTimer() {
    setTimer(null);
    setRemainingSec(0);
    if (isDemo) return;
    startTransition(async () => {
      await updateCookTimer(recipeId, null);
      router.refresh();
    });
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background text-foreground">
      <header className="flex items-center justify-between gap-4 border-b border-border px-4 py-4 sm:px-6">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Cook mode
          </p>
          <h1 className="truncate font-serif text-lg text-text-heading">{title}</h1>
        </div>
        <Link
          href={demoExitHref ?? `/recipes/${recipeId}`}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          Exit
        </Link>
      </header>

      <div className="flex flex-1 flex-col px-4 py-8 sm:px-6">
        <p className="text-center text-sm text-muted-foreground">
          Step {stepIndex + 1} of {orderedSteps.length}
        </p>

        <div className="mx-auto mt-8 w-full max-w-xl flex-1">
          {stepParts.length > 1 ? (
            <ol
              className="list-decimal space-y-4 pl-5 font-serif text-xl leading-relaxed text-text-heading sm:text-2xl [&>li]:whitespace-pre-wrap [&>li]:break-words [&>li]:pl-2"
              aria-label="Instructions for this step"
            >
              {stepParts.map((part, i) => (
                <li key={i}>{part}</li>
              ))}
            </ol>
          ) : (
            <p className="font-serif text-2xl leading-relaxed whitespace-pre-wrap break-words text-text-heading sm:text-3xl">
              {stepParts[0] ?? ""}
            </p>
          )}

          <div className="mt-10 space-y-3">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {narrowed ? "For this step" : "Ingredients"}
              </p>
              {!narrowed ? (
                <p className="text-xs text-muted-foreground">
                  We couldn&apos;t match this step to specific lines on your list by
                  name, so here&apos;s everything—still handy to have in view.
                </p>
              ) : null}
            </div>
            <ul className="space-y-2 text-base leading-relaxed">
              {stepIngredients.map((ing) => (
                <li key={ing.id} className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <IngredientLine ingredient={ing} />
                  </div>
                  {isDemo ? null : (
                    <div className="shrink-0 pt-0.5">
                      <IngredientSwapSheet
                        recipeId={recipeId}
                        ingredient={ing}
                      />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mx-auto mt-10 w-full max-w-xl rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-medium text-text-heading">Kitchen timer</p>
          <p className="mt-1 text-xs text-muted-foreground">
            One timer, kept in sync so you can step away and come back.
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="mins" className="text-xs text-muted-foreground">
                Minutes
              </label>
              <input
                id="mins"
                type="number"
                min={1}
                max={180}
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value) || 1)}
                className="border-input bg-background ring-offset-background focus-visible:ring-ring h-11 w-24 rounded-md border px-3 text-lg focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              />
            </div>
            <Button
              type="button"
              size="lg"
              className="min-h-12 flex-1 sm:flex-none"
              onClick={startTimer}
              disabled={pending}
            >
              {timer ? "Restart timer" : "Start timer"}
            </Button>
            {timer ? (
              <Button
                type="button"
                variant="secondary"
                size="lg"
                className="min-h-12"
                onClick={clearTimer}
              >
                Clear
              </Button>
            ) : null}
          </div>
          {timer ? (
            <p
              className="mt-4 text-center font-mono text-4xl tabular-nums text-text-heading"
              aria-live="polite"
            >
              {formatRemaining(remainingSec)}
            </p>
          ) : null}
        </div>

        <div className="mx-auto mt-10 flex w-full max-w-xl flex-wrap gap-3 pb-8">
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="min-h-14 min-w-[44px] flex-1 text-base"
            onClick={() => go(-1)}
            disabled={stepIndex === 0 || pending}
          >
            Back
          </Button>
          {stepIndex < orderedSteps.length - 1 ? (
            <Button
              type="button"
              size="lg"
              className="min-h-14 min-w-[44px] flex-1 text-base"
              onClick={() => go(1)}
              disabled={pending}
            >
              Next
            </Button>
          ) : (
            <Button
              type="button"
              size="lg"
              className="min-h-14 min-w-[44px] flex-1 text-base"
              onClick={() => setFinishOpen(true)}
              disabled={pending}
            >
              Finish cooking
            </Button>
          )}
        </div>
      </div>

      <CookFinishDialog
        recipeId={recipeId}
        open={finishOpen}
        onOpenChange={setFinishOpen}
        demoReturnHref={demoExitHref}
      />
    </div>
  );
}
