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
import { SHIFT_GOAL_LABEL } from "@/lib/swap-catalog";
import { Button } from "@/components/ui/button";
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

  function toggleGoal(goal: SwapGoal) {
    setSelectedGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal],
    );
  }

  function runApply(goalsOverride?: SwapGoal[]) {
    const goals = goalsOverride ?? selectedGoals;
    setMessage(null);
    startTransition(async () => {
      const res = await applyGoalSwaps(recipeId, goals);
      if (!res.ok) {
        setMessage(res.error);
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
      router.refresh();
    });
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
          onClick={() => runApply()}
        >
          {pending ? "Applying…" : "Apply selected shifts"}
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
  );
}
