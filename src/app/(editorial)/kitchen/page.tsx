import Link from "next/link";
import { ContinueCookingBanner } from "@/components/continue-cooking-banner";
import { DeleteRecipeButton } from "@/components/delete-recipe-button";
import { RemoveFromRecentButton } from "@/components/remove-from-recent-button";
import { KitchenFavoriteButton } from "@/components/kitchen-favorite-button";
import { StarRatingDisplay } from "@/components/star-rating";
import { RecipeImageFallback } from "@/components/recipe-image-fallback";
import { ImportRecipeForm } from "@/components/import-recipe-form";
import { normalizeImageUrl } from "@/lib/images";
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

      {user ? (
        <section className="mb-12 rounded-xl border border-border bg-muted/20 px-4 py-5 sm:px-6">
          <h2 className="mb-3 font-serif text-xl text-text-heading">Import a recipe</h2>
          <ImportRecipeForm />
        </section>
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
            {recent.map((r) => {
              const src = r.image_url ? normalizeImageUrl(r.image_url) : null;
              return (
                <li
                  key={r.id}
                  className="flex items-center gap-3 px-2 py-2 sm:px-4"
                >
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-muted sm:h-14 sm:w-14">
                    <RecipeImageFallback
                      src={src}
                      className="absolute inset-0 h-full w-full"
                      size="sm"
                    />
                  </div>
                  <Link
                    href={`/recipes/${r.id}`}
                    className="flex min-w-0 flex-1 items-center gap-3 py-2 transition-colors hover:opacity-80"
                  >
                    <span className="min-w-0 flex-1 font-medium text-text-heading">{r.title}</span>
                    {typeof r.rating === "number" ? (
                      <StarRatingDisplay value={r.rating} size="sm" />
                    ) : null}
                  </Link>
                  <KitchenFavoriteButton recipeId={r.id} initialFavorite={r.favorite ?? false} />
                  <RemoveFromRecentButton recipeId={r.id} recipeTitle={r.title} />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {favorites.length > 0 ? (
        <section>
          <h2 className="mb-4 font-serif text-xl text-text-heading">Favorites</h2>
          <ul className="divide-y divide-border border border-border">
            {favorites.map((r) => {
              const src = r.image_url ? normalizeImageUrl(r.image_url) : null;
              return (
                <li
                  key={r.id}
                  className="flex items-center gap-3 px-2 py-2 sm:px-4"
                >
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-muted sm:h-14 sm:w-14">
                    <RecipeImageFallback
                      src={src}
                      className="absolute inset-0 h-full w-full"
                      size="sm"
                    />
                  </div>
                  <Link
                    href={`/recipes/${r.id}`}
                    className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3 py-2 transition-colors hover:opacity-80"
                  >
                    <span className="font-medium text-text-heading">{r.title}</span>
                    {typeof r.rating === "number" ? (
                      <StarRatingDisplay value={r.rating} size="sm" />
                    ) : null}
                  </Link>
                  <DeleteRecipeButton recipeId={r.id} recipeTitle={r.title} />
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
