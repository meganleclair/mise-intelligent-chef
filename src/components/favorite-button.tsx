"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setRecipeFavorite } from "@/lib/actions/recipes";
import { Button } from "@/components/ui/button";

type Props = { recipeId: string; initialFavorite: boolean };

export function FavoriteButton({ recipeId, initialFavorite }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    setError(null);
    startTransition(async () => {
      const result = await setRecipeFavorite(recipeId, !initialFavorite);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={toggle}
      >
        {initialFavorite ? "Remove from My Kitchen" : "Save to My Kitchen"}
      </Button>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
