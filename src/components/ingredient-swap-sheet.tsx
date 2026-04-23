"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRightLeft } from "@fortawesome/free-solid-svg-icons";
import type { Ingredient } from "@/lib/types/recipe";
import { applyIngredientSwap } from "@/lib/actions/swaps";
import { decodeHtmlEntities } from "@/lib/decode-html-entities";
import { getSwapOptionsForIngredient } from "@/lib/swap-catalog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Props = {
  recipeId: string;
  ingredient: Ingredient;
};

export function IngredientSwapSheet({ recipeId, ingredient }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const catalogName = ingredient.swapBasisName ?? ingredient.name;
  const allCatalogOptions = getSwapOptionsForIngredient(catalogName);
  const options = allCatalogOptions.filter(
    (o) =>
      o.label.trim().toLowerCase() !== ingredient.name.trim().toLowerCase(),
  );

  function choose(label: string, impact: string) {
    startTransition(async () => {
      await applyIngredientSwap(recipeId, ingredient.id, label, impact);
      setOpen(false);
      router.refresh();
    });
  }

  if (allCatalogOptions.length === 0) {
    return null;
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
          <FontAwesomeIcon icon={faRightLeft} className="h-3 w-3 shrink-0" aria-hidden />
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
          Curated substitutes—no rewritten recipe, just honest tradeoffs.
        </p>
        <ul className="mt-4 space-y-2">
          {options.length === 0 ? (
            <li className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
              No other swaps in the list for this ingredient—you&apos;re already on
              the last option we suggest.
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
                  <span className="font-medium text-text-heading">{o.label}</span>
                  <span className="mt-1 block text-muted-foreground">
                    What changes: {o.impactNote}
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
