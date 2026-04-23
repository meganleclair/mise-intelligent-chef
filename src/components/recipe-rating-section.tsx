"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setRecipeRating } from "@/lib/actions/recipes";
import { StarRatingInput } from "@/components/star-rating";

type Props = { recipeId: string; initialRating: number | null };

export function RecipeRatingSection({ recipeId, initialRating }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rating, setRating] = useState<number | null>(initialRating);

  function onChange(next: number | null) {
    setRating(next);
    startTransition(async () => {
      await setRecipeRating(recipeId, next);
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-text-heading">Your rating</p>
      <StarRatingInput
        value={rating}
        onChange={onChange}
        idPrefix="recipe-rate"
        className={pending ? "opacity-70" : undefined}
      />
      <p className="text-xs text-muted-foreground">
        Tap a star to set your score; tap the same star again to remove it.
      </p>
    </div>
  );
}
