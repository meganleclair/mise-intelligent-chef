"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { faUtensils } from "@fortawesome/pro-duotone-svg-icons";
import { DuotoneIcon } from "@/components/duotone-icon";
import { setRecipeCooked } from "@/lib/actions/recipes";
import { cn } from "@/lib/utils";

type Props = { recipeId: string; initialCooked: boolean };

/** Compact cooked toggle for the kitchen list rows — mirrors KitchenFavoriteButton. */
export function CookedToggleButton({ recipeId, initialCooked }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      await setRecipeCooked(recipeId, !initialCooked);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={toggle}
      aria-label={initialCooked ? "Mark as not yet cooked" : "Mark as cooked"}
      title={initialCooked ? "Mark as not yet cooked" : "Mark as cooked"}
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded transition-colors",
        "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        pending && "opacity-50",
      )}
    >
      <DuotoneIcon
        icon={faUtensils}
        className={cn(
          "h-4 w-4",
          initialCooked ? "text-emerald-600" : "text-muted-foreground",
        )}
        aria-hidden
      />
    </button>
  );
}
