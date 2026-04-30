"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStar as faStarSolid } from "@fortawesome/free-solid-svg-icons";
import { faStar as faStarOutline } from "@fortawesome/free-regular-svg-icons";
import { setRecipeFavorite } from "@/lib/actions/recipes";
import { cn } from "@/lib/utils";

type Props = { recipeId: string; initialFavorite: boolean };

/** Compact star toggle for the kitchen list rows — saves/unsaves without leaving the page. */
export function KitchenFavoriteButton({ recipeId, initialFavorite }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      await setRecipeFavorite(recipeId, !initialFavorite);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={toggle}
      aria-label={initialFavorite ? "Remove from favorites" : "Save to favorites"}
      title={initialFavorite ? "Remove from favorites" : "Save to favorites"}
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded transition-colors",
        "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        pending && "opacity-50",
      )}
    >
      <FontAwesomeIcon
        icon={initialFavorite ? faStarSolid : faStarOutline}
        className={cn(
          "h-4 w-4",
          initialFavorite ? "text-amber-500" : "text-muted-foreground",
        )}
        aria-hidden
      />
    </button>
  );
}
