import Link from "next/link";
import { notFound } from "next/navigation";
import { FavoriteButton } from "@/components/favorite-button";
import { RecipeRatingSection } from "@/components/recipe-rating-section";
import { NutritionPanel } from "@/components/nutrition-panel";
import { RecipeStepsReader } from "@/components/recipe-steps-reader";
import { applyIngredientOverrides } from "@/lib/recipes/display";
import { IngredientLine } from "@/components/ingredient-line";
import { decodeHtmlEntities } from "@/lib/decode-html-entities";
import { getNutritionSession, getRecipeForUser } from "@/lib/data/queries";
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

  const session = await getNutritionSession(id);
  const workingState = {
    servings: session?.servings ?? recipe.servings,
    overrides: session?.ingredient_overrides ?? [],
    macros: session?.macros ?? null,
  };
  const ingredients = applyIngredientOverrides(recipe.ingredients, workingState.overrides);

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
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-muted-foreground">
            Serves {workingState.servings}
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
            <li key={ing.id}>
              <IngredientLine ingredient={ing} />
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-12 space-y-12">
        <NutritionPanel
          recipeId={id}
          recipeTitle={recipe.title}
          ingredients={recipe.ingredients}
          initialState={workingState}
          initialRating={recipe.rating ?? null}
        />

        <section className="space-y-4">
          <h2 className="font-serif text-2xl text-text-heading">Instructions</h2>
          <p className="text-sm text-muted-foreground">
            Full steps, right where you&apos;re already reading.
          </p>
          <RecipeStepsReader steps={recipe.steps} />
        </section>
      </div>

      <div className="mt-14">
        <Link
          href={`/recipes/${id}/prep`}
          className={cn(
            buttonVariants({ size: "lg" }),
            "min-h-12 w-full justify-center sm:w-auto",
          )}
        >
          Before you start
        </Link>
      </div>
    </article>
  );
}
