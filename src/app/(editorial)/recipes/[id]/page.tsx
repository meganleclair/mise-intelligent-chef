import Link from "next/link";
import { notFound } from "next/navigation";
import { FavoriteButton } from "@/components/favorite-button";
import { RecipeRatingSection } from "@/components/recipe-rating-section";
import { IngredientSwapSheet } from "@/components/ingredient-swap-sheet";
import { RecipeGoalSwaps } from "@/components/recipe-goal-swaps";
import { RecipeStepsReader } from "@/components/recipe-steps-reader";
import { mergeIngredientsWithMods } from "@/lib/recipes/display";
import { IngredientLine } from "@/components/ingredient-line";
import { decodeHtmlEntities } from "@/lib/decode-html-entities";
import { tidyRecipeSummaryForDisplay } from "@/lib/recipes/summary";
import { getModifications, getRecipeForUser } from "@/lib/data/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SignInPrompt } from "@/components/sign-in-prompt";
import { RecipeImageFallback } from "@/components/recipe-image-fallback";
import { normalizeImageUrl } from "@/lib/images";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ id: string }> };

export default async function RecipeDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return <SignInPrompt nextPath={`/recipes/${id}`} />;
  }

  const recipe = await getRecipeForUser(id);
  if (!recipe) notFound();

  const mods = await getModifications(id);
  const ingredients = mergeIngredientsWithMods(recipe.ingredients, mods);

  const heroSrc = recipe.image_url
    ? normalizeImageUrl(recipe.image_url)
    : null;

  return (
    <article className="mx-auto max-w-3xl px-6 py-10">
      {heroSrc ? (
        <div className="relative mb-10 h-48 w-full overflow-hidden rounded-sm bg-muted sm:h-56">
          <RecipeImageFallback
            src={heroSrc}
            className="absolute inset-0 h-full w-full"
            loading="eager"
            size="lg"
          />
        </div>
      ) : null}

      <header className="space-y-4">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Recipe
        </p>
        <h1 className="font-serif text-4xl text-text-heading">
          {decodeHtmlEntities(recipe.title)}
        </h1>
        {recipe.summary ? (
          <p className="break-words text-lg leading-relaxed text-muted-foreground">
            {decodeHtmlEntities(tidyRecipeSummaryForDisplay(recipe.summary))}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-muted-foreground">
            Serves {recipe.servings}
          </span>
          <FavoriteButton recipeId={id} initialFavorite={recipe.favorite} />
        </div>
        <RecipeRatingSection
          key={`${id}-rating-${recipe.rating ?? "none"}`}
          recipeId={id}
          initialRating={recipe.rating ?? null}
        />
        {recipe.source_url ? (
          <p className="text-sm text-muted-foreground">
            Source:{" "}
            <a
              href={recipe.source_url}
              className="underline underline-offset-4 hover:text-foreground"
              target="_blank"
              rel="noreferrer"
            >
              Original link
            </a>
          </p>
        ) : null}
      </header>

      <section className="mt-12 space-y-4">
        <h2 className="font-serif text-2xl text-text-heading">Ingredients</h2>
        <ul className="space-y-3 text-base leading-relaxed">
          {ingredients.map((ing) => (
            <li key={ing.id} className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <IngredientLine ingredient={ing} />
              </div>
              <div className="shrink-0 pt-0.5">
                <IngredientSwapSheet
                  recipeId={id}
                  ingredient={ing}
                  recipeName={recipe.title}
                  allIngredientNames={ingredients.map((i) => i.name)}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-12 space-y-12">
        <RecipeGoalSwaps recipeId={id} />

        <section className="space-y-4">
          <h2 className="font-serif text-2xl text-text-heading">Instructions</h2>
          <p className="text-sm text-muted-foreground">
            Full steps—same flow you&apos;ll see in cook mode, without splitting one
            screen at a time.
          </p>
          <RecipeStepsReader steps={recipe.steps} />
        </section>
      </div>

      <div className="mt-14 flex flex-col gap-3 sm:flex-row">
        <Link
          href={`/recipes/${id}/prep`}
          className={cn(
            buttonVariants({ size: "lg" }),
            "min-h-12 flex-1 justify-center",
          )}
        >
          Before you start
        </Link>
        <Link
          href={`/recipes/${id}/cook`}
          className={cn(
            buttonVariants({ size: "lg", variant: "secondary" }),
            "min-h-12 flex-1 justify-center",
          )}
        >
          Start cooking
        </Link>
      </div>
    </article>
  );
}
