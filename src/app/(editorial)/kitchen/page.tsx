import Link from "next/link";
import { ContinueCookingBanner } from "@/components/continue-cooking-banner";
import { DeleteRecipeButton } from "@/components/delete-recipe-button";
import { RemoveFromRecentButton } from "@/components/remove-from-recent-button";
import { StarRatingDisplay } from "@/components/star-rating";
import {
  getActiveCookSession,
  getFavoriteRecipes,
  getRecentImports,
} from "@/lib/data/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function KitchenPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [active, recent, favorites] = await Promise.all([
    getActiveCookSession(),
    getRecentImports(8),
    getFavoriteRecipes(),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-10 space-y-2">
        <h1 className="font-serif text-3xl text-text-heading">My kitchen</h1>
        <p className="text-muted-foreground">
          A quiet shelf for what you&apos;re cooking—not a crowded dashboard.
        </p>
      </header>

      {user ? null : (
        <p className="mb-10 rounded-md border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          <Link
            href="/login?next=/kitchen"
            className="font-medium text-text-heading underline underline-offset-4"
          >
            Sign in
          </Link>{" "}
          to see imported recipes and favorites here.
        </p>
      )}

      {active ? (
        <ContinueCookingBanner
          recipeId={active.recipeId}
          recipeTitle={active.recipeTitle}
          currentStepIndex={active.currentStepIndex}
          heading="Continue cooking"
          ctaLabel="Resume"
        />
      ) : null}

      <section className="mb-12">
        <h2 className="mb-4 font-serif text-xl text-text-heading">
          Recently imported
        </h2>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {user
              ? "Nothing here yet—import a recipe from home."
              : "Sign in to load recipes you’ve imported."}
          </p>
        ) : (
          <ul className="divide-y divide-border border border-border">
            {recent.map((r) => (
              <li
                key={r.id}
                className="flex items-center gap-2 px-2 py-1 sm:px-4 sm:py-2"
              >
                <Link
                  href={`/recipes/${r.id}`}
                  className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3 py-3 pl-2 transition-colors hover:bg-muted/50 sm:py-4 sm:pl-0"
                >
                  <span className="font-medium text-text-heading">{r.title}</span>
                  <div className="flex flex-wrap items-center gap-3">
                    {typeof r.rating === "number" ? (
                      <StarRatingDisplay value={r.rating} size="sm" />
                    ) : null}
                    {r.favorite ? (
                      <span className="text-xs text-muted-foreground">Saved</span>
                    ) : null}
                  </div>
                </Link>
                <RemoveFromRecentButton recipeId={r.id} recipeTitle={r.title} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {favorites.length > 0 ? (
        <section>
          <h2 className="mb-4 font-serif text-xl text-text-heading">Favorites</h2>
          <ul className="divide-y divide-border border border-border">
            {favorites.map((r) => (
              <li
                key={r.id}
                className="flex items-center gap-2 px-2 py-1 sm:px-4 sm:py-2"
              >
                <Link
                  href={`/recipes/${r.id}`}
                  className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3 py-3 pl-2 transition-colors hover:bg-muted/50 sm:py-4 sm:pl-0"
                >
                  <span className="font-medium text-text-heading">{r.title}</span>
                  {typeof r.rating === "number" ? (
                    <StarRatingDisplay value={r.rating} size="sm" />
                  ) : null}
                </Link>
                <DeleteRecipeButton recipeId={r.id} recipeTitle={r.title} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
