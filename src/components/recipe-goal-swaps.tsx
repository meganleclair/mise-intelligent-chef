"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBolt,
  faBreadSlice,
  faLeaf,
  faMortarPestle,
  faMugHot,
  faRotateLeft,
  faSeedling,
} from "@fortawesome/free-solid-svg-icons";
import {
  applyGoalSwaps,
  clearRecipeSwaps,
  type SwapGoal,
} from "@/lib/actions/swaps";
import {
  CONFLICT_RESOLUTION_PRIORITY,
  SHIFT_GOAL_LABEL,
  type BatchSwapConflict,
} from "@/lib/swap-catalog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Props = { recipeId: string };

const GOALS: {
  goal: SwapGoal;
  label: string;
  icon: typeof faBolt;
}[] = [
  { goal: "high_protein", label: "Higher protein", icon: faBolt },
  { goal: "lower_calorie", label: "Lower calorie", icon: faLeaf },
  { goal: "lower_carb", label: "Lower carb", icon: faBreadSlice },
  { goal: "higher_fiber", label: "Higher fiber", icon: faSeedling },
  { goal: "lower_sodium", label: "Lower sodium", icon: faMortarPestle },
  { goal: "dairy_free", label: "Dairy-free", icon: faMugHot },
];

function goalLabel(goal: SwapGoal): string {
  return GOALS.find((g) => g.goal === goal)?.label ?? SHIFT_GOAL_LABEL[goal];
}

export function RecipeGoalSwaps({ recipeId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [selectedGoals, setSelectedGoals] = useState<SwapGoal[]>([]);
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [pendingConflicts, setPendingConflicts] = useState<BatchSwapConflict[]>(
    [],
  );
  const [goalsAwaitingConfirm, setGoalsAwaitingConfirm] = useState<SwapGoal[]>(
    [],
  );

  function toggleGoal(goal: SwapGoal) {
    setSelectedGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal],
    );
  }

  function runApply(acknowledgeConflicts: boolean, goalsOverride?: SwapGoal[]) {
    const goals = goalsOverride ?? selectedGoals;
    setMessage(null);
    startTransition(async () => {
      const res = await applyGoalSwaps(recipeId, goals, {
        acknowledgeConflicts,
      });
      if (!res.ok) {
        setMessage(res.error);
        return;
      }
      if ("needsConfirmation" in res) {
        setPendingConflicts(res.conflicts);
        setGoalsAwaitingConfirm(goals);
        setConflictDialogOpen(true);
        return;
      }
      if (res.applied === 0) {
        setMessage(
          "Nothing in our swap list matched these ingredient lines for your selection—try a manual Swap, or another combination.",
        );
        return;
      }
      const labels = [...new Set(goals)].map((g) => goalLabel(g)).join(", ");
      setMessage(
        `Applied ${res.applied} swap${res.applied === 1 ? "" : "s"} for: ${labels}. Lines you changed by hand stay put until you reset.`,
      );
      setConflictDialogOpen(false);
      setPendingConflicts([]);
      setGoalsAwaitingConfirm([]);
      router.refresh();
    });
  }

  function confirmConflicts() {
    runApply(true, goalsAwaitingConfirm);
  }

  function clearAutomaticOnly() {
    setMessage(null);
    setSelectedGoals([]);
    startTransition(async () => {
      const res = await applyGoalSwaps(recipeId, []);
      if (!res.ok) {
        setMessage(res.error);
        return;
      }
      setMessage("Automatic shifts cleared—manual line swaps are unchanged.");
      router.refresh();
    });
  }

  function reset() {
    setMessage(null);
    setSelectedGoals([]);
    startTransition(async () => {
      const res = await clearRecipeSwaps(recipeId);
      if (!res.ok) {
        setMessage(res.error);
        return;
      }
      setMessage("All swaps cleared—back to the original ingredient lines.");
      router.refresh();
    });
  }

  return (
    <>
      <section className="rounded-xl border border-border bg-muted/30 px-4 py-5 sm:px-6">
        <h2 className="font-serif text-xl text-text-heading">Shift the recipe</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Pick one or more dietary goals and Claude will read your ingredient
          list and apply the most practical swaps—grounded in the actual dish,
          not a generic lookup. Manual swaps you&apos;ve already chosen stay put.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {GOALS.map(({ goal, label, icon }) => {
            const on = selectedGoals.includes(goal);
            return (
              <Button
                key={goal}
                type="button"
                variant={on ? "default" : "secondary"}
                className={cn(
                  "min-h-12 justify-start gap-2 text-left text-sm",
                  on && "ring-2 ring-primary/30",
                )}
                disabled={pending}
                onClick={() => toggleGoal(goal)}
                aria-pressed={on}
              >
                <FontAwesomeIcon
                  icon={icon}
                  className="h-4 w-4 shrink-0"
                  aria-hidden
                />
                <span className="min-w-0 leading-snug">{label}</span>
              </Button>
            );
          })}
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Button
            type="button"
            className="min-h-12"
            disabled={pending || selectedGoals.length === 0}
            onClick={() => runApply(false)}
          >
            Apply selected shifts
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-12"
            disabled={pending}
            onClick={() => clearAutomaticOnly()}
          >
            Clear automatic shifts
          </Button>
        </div>
        <div className="mt-3 flex justify-start">
          <Button
            type="button"
            variant="outline"
            className="min-h-12 gap-2"
            disabled={pending}
            onClick={() => reset()}
          >
            <FontAwesomeIcon icon={faRotateLeft} className="h-4 w-4" aria-hidden />
            Reset all swaps
          </Button>
        </div>
        {message ? (
          <p className="mt-4 text-sm text-muted-foreground" role="status">
            {message}
          </p>
        ) : null}
      </section>

      <Dialog open={conflictDialogOpen} onOpenChange={setConflictDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg" showCloseButton>
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-text-heading">
              Some shifts disagree on the same line
            </DialogTitle>
            <DialogDescription className="space-y-3 text-left text-muted-foreground">
              <p>
                For each ingredient below, your selected shifts suggest different
                substitutes. If you continue, we&apos;ll use the higher-priority shift
                (see order on the recipe card).
              </p>
              <ul className="list-none space-y-4 border-t border-border pt-3">
                {pendingConflicts.map((c) => (
                  <li key={c.ingredientKey}>
                    <p className="font-medium text-text-heading">
                      {c.ingredientName}
                    </p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                      {c.alternatives.map((a) => (
                        <li key={a.goal}>
                          <span className="text-foreground">
                            {goalLabel(a.goal)}:
                          </span>{" "}
                          {a.label}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 text-sm text-foreground">
                      We&apos;ll use <strong>{goalLabel(c.winningGoal)}</strong> (
                      {c.winningLabel}).
                    </p>
                  </li>
                ))}
              </ul>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setConflictDialogOpen(false);
                setPendingConflicts([]);
                setGoalsAwaitingConfirm([]);
              }}
            >
              Cancel
            </Button>
            <Button type="button" disabled={pending} onClick={confirmConflicts}>
              {pending ? "Applying…" : "Use these picks"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
