"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash } from "@fortawesome/free-solid-svg-icons";
import { deleteRecipe } from "@/lib/actions/recipes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  recipeId: string;
  recipeTitle: string;
  className?: string;
};

export function DeleteRecipeButton({ recipeId, recipeTitle, className }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setError(null);
    const ok = window.confirm(
      `Remove “${recipeTitle}” from Mise? This can’t be undone.`,
    );
    if (!ok) return;

    startTransition(async () => {
      const result = await deleteRecipe(recipeId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className={cn("flex flex-col items-end gap-1", className)}>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="text-muted-foreground hover:text-destructive shrink-0"
        disabled={pending}
        onClick={handleClick}
        aria-label={`Delete ${recipeTitle}`}
        title="Remove recipe"
      >
        <FontAwesomeIcon icon={faTrash} className="h-4 w-4" aria-hidden />
      </Button>
      {error ? (
        <p className="max-w-[12rem] text-right text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
