"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRightLeft, faRotateLeft } from "@fortawesome/free-solid-svg-icons";
import type { Ingredient } from "@/lib/types/recipe";
import {
  applyIngredientSwap,
  clearIngredientSwap,
} from "@/lib/actions/swaps";
import { decodeHtmlEntities } from "@/lib/decode-html-entities";
import { getSwapOptionsForIngredient } from "@/lib/swap-catalog";
import { isManualIngredientSwap } from "@/lib/recipes/display";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type SwapOption = { label: string; impactNote: string };

type Props = {
  recipeId: string;
  ingredient: Ingredient;
  recipeName?: string;
  allIngredientNames?: string[];
};

function ManualSwapReset({
  recipeId,
  ingredient,
}: {
  recipeId: string;
  ingredient: Ingredient;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setError(null);
    startTransition(async () => {
      const res = await clearIngredientSwap(recipeId, ingredient.id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className={cn(
          "gap-1.5 border border-border px-2.5 py-1 text-xs font-semibold text-text-heading shadow-sm",
          "hover:bg-muted/80"
        )}
        disabled={pending}
        onClick={reset}
      >
        <FontAwesomeIcon
          icon={faRotateLeft}
          className="h-3 w-3 shrink-0"
          aria-hidden
        />
        Reset
      </Button>
      {error ? (
        <span
          className="max-w-[12rem] text-right text-xs text-destructive"
          role="alert"
        >
          {error}
        </span>
      ) : null}
    </div>
  );
}

export function IngredientSwapSheet({
  recipeId,
  ingredient,
  recipeName,
  allIngredientNames,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [options, setOptions] = useState<SwapOption[]>([]);
  const [loading, setLoading] = useState(false);

  const catalogName = ingredient.swapBasisName ?? ingredient.name;

  // Fetch AI swaps when dialog opens; fall back to static catalog
  useEffect(() => {
    if (!open) return;

    setLoading(true);

    fetch("/api/swaps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ingredientName: catalogName,
        recipeName: recipeName ?? "",
        ingredientNames: allIngredientNames ?? [],
      }),
    })
      .then((r) => r.json())
      .then((data: { options?: SwapOption[] }) => {
        const aiOptions = (data.options ?? []).filter(
          (o) =>
            o.label.trim().toLowerCase() !==
            ingredient.name.trim().toLowerCase()
        );

        if (aiOptions.length > 0) {
          setOptions(aiOptions);
          return;
        }

        // No AI results — fall back to static catalog
        const catalog = getCatalogOptions(catalogName, ingredient.name);
        setOptions(catalog);
      })
      .catch(() => {
        const catalog = getCatalogOptions(catalogName, ingredient.name);
        setOptions(catalog);
      })
      .finally(() => setLoading(false));
  }, [open, catalogName, ingredient.name, recipeName, allIngredientNames]);

  if (isManualIngredientSwap(ingredient.note)) {
    return <ManualSwapReset recipeId={recipeId} ingredient={ingredient} />;
  }

  function choose(label: string, impact: string) {
    startTransition(async () => {
      await applyIngredientSwap(recipeId, ingredient.id, label, impact);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="shrink-0 gap-1.5 border border-primary/40 px-2.5 py-1 text-xs font-semibold text-text-heading shadow-sm hover:border-primary/60 hover:bg-secondary/90"
        >
          <FontAwesomeIcon
            icon={faRightLeft}
            className="h-3 w-3 shrink-0"
            aria-hidden
          />
          Swap
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">
            Swap {decodeHtmlEntities(ingredient.name)}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Suggested substitutes—honest tradeoffs for this recipe.
        </p>
        <ul className="mt-4 space-y-2">
          {loading ? (
            // Loading skeleton
            <>
              {[1, 2, 3].map((i) => (
                <li
                  key={i}
                  className="h-[68px] animate-pulse rounded-lg border border-border bg-muted/30"
                />
              ))}
            </>
          ) : options.length === 0 ? (
            <li className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
              This ingredient is pretty essential as-is — no good substitutions for this one.
            </li>
          ) : (
            options.map((o) => (
              <li key={o.label}>
                <button
                  type="button"
                  disabled={pending}
                  className="hover:bg-accent/80 w-full rounded-lg border border-border bg-card px-4 py-3 text-left text-sm transition-colors"
                  onClick={() => choose(o.label, o.impactNote)}
                >
                  <span className="font-medium text-text-heading">
                    {o.label}
                  </span>
                  <span className="mt-1 block text-muted-foreground">
                    {o.impactNote}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

function getCatalogOptions(
  catalogName: string,
  ingredientName: string
): SwapOption[] {
  return getSwapOptionsForIngredient(catalogName).filter(
    (o) =>
      o.label.trim().toLowerCase() !== ingredientName.trim().toLowerCase()
  );
}
