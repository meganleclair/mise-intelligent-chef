import {
  formatIngredientLine,
  getIngredientPrimaryLine,
  parseSwapNote,
} from "@/lib/recipes/display";
import type { Ingredient } from "@/lib/types/recipe";

type Props = { ingredient: Ingredient };

export function IngredientLine({ ingredient }: Props) {
  const swap = parseSwapNote(ingredient.note);

  if (!swap) {
    return (
      <span className="break-words text-base text-text-heading">
        {formatIngredientLine(ingredient)}
      </span>
    );
  }

  return (
    <div className="min-w-0 space-y-2">
      <p className="break-words text-base font-medium text-text-heading">
        {getIngredientPrimaryLine(ingredient)}
      </p>
      <div className="rounded-md border border-border bg-muted/40 px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Swap
          </span>
          {swap.shift ? (
            <span className="rounded-full border border-border bg-background px-2 py-0.5 text-xs text-text-heading">
              {swap.shift}
            </span>
          ) : null}
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          {swap.detail}
        </p>
      </div>
    </div>
  );
}
