"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { dismissRecipeFromRecentImports } from "@/lib/actions/recipes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  recipeId: string;
  recipeTitle: string;
  className?: string;
};

export function RemoveFromRecentButton({ recipeId, recipeTitle, className }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setError(null);
    const ok = window.confirm(
      `Remove “${recipeTitle}” from Recently imported?\n\nThe recipe stays in your account. Saved recipes remain under Favorites, and you can still open this recipe from its page.`,
    );
    if (!ok) return;

    startTransition(async () => {
      const result = await dismissRecipeFromRecentImports(recipeId);
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
        className="text-muted-foreground shrink-0 hover:text-text-heading"
        disabled={pending}
        onClick={handleClick}
        aria-label={`Remove ${recipeTitle} from recently imported`}
        title="Remove from recently imported"
      >
        <FontAwesomeIcon icon={faXmark} className="h-4 w-4" aria-hidden />
      </Button>
      {error ? (
        <p className="max-w-[12rem] text-right text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
