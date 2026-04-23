"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { abandonCookSession } from "@/lib/actions/sessions";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  recipeId: string;
  recipeTitle: string;
  currentStepIndex: number;
  /** e.g. kitchen uses “Continue cooking” */
  heading?: string;
  /** Primary link label */
  ctaLabel?: string;
};

export function ContinueCookingBanner({
  recipeId,
  recipeTitle,
  currentStepIndex,
  heading = "Continue where you left off",
  ctaLabel = "Continue cooking",
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function dismiss() {
    startTransition(async () => {
      const res = await abandonCookSession(recipeId);
      if (res.ok) {
        router.refresh();
      }
    });
  }

  return (
    <section className="mb-12 border border-border bg-card/60 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {heading}
        </p>
        <button
          type="button"
          onClick={dismiss}
          disabled={pending}
          className="text-muted-foreground hover:text-foreground hover:bg-muted/80 -m-1 shrink-0 rounded-md p-1.5 transition-colors"
          aria-label="Dismiss — I’m not cooking this right now"
          title="Not now"
        >
          <FontAwesomeIcon icon={faXmark} className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-serif text-xl text-text-heading">{recipeTitle}</p>
          <p className="text-sm text-muted-foreground">
            Step {currentStepIndex + 1} · Pick up in cook mode
          </p>
        </div>
        <Link
          href={`/recipes/${recipeId}/cook`}
          className={cn(
            buttonVariants({ size: "lg" }),
            "min-h-12 shrink-0 justify-center",
          )}
        >
          {ctaLabel}
        </Link>
      </div>
    </section>
  );
}
