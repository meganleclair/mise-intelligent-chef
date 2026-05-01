"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faWandMagicSparkles } from "@fortawesome/free-solid-svg-icons";
import { regenerateRecipeSummary } from "@/lib/actions/recipes";
import { cn } from "@/lib/utils";

type Props = { recipeId: string };

export function RegenerateSummaryButton({ recipeId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function regenerate() {
    setError(null);
    setDone(false);
    startTransition(async () => {
      const res = await regenerateRecipeSummary(recipeId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDone(true);
      router.refresh();
    });
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={regenerate}
        disabled={pending}
        title="Rewrite description with Claude"
        className={cn(
          "inline-flex items-center gap-1.5 text-xs text-muted-foreground underline-offset-4",
          "hover:text-foreground hover:underline transition-colors",
          pending && "opacity-50 cursor-wait",
        )}
      >
        <FontAwesomeIcon
          icon={faWandMagicSparkles}
          className={cn("h-3 w-3 shrink-0", pending && "animate-spin")}
          aria-hidden
        />
        {pending ? "Rewriting…" : done ? "Done" : "Rewrite with Claude"}
      </button>
      {error ? (
        <span className="text-xs text-destructive" role="alert">
          {error}
        </span>
      ) : null}
    </span>
  );
}
