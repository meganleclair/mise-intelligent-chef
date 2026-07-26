import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RecipeStepsReader } from "@/components/recipe-steps-reader";
import { IngredientLine } from "@/components/ingredient-line";
import { decodeHtmlEntities } from "@/lib/decode-html-entities";
import { tidyRecipeSummaryForDisplay } from "@/lib/recipes/summary";
import { RecipeImageFallback } from "@/components/recipe-image-fallback";
import { normalizeImageUrl } from "@/lib/images";
import { DEMO_LIST, getDemoRecipe } from "@/lib/demo-recipes/catalog";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return DEMO_LIST.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const demo = getDemoRecipe(slug);
  if (!demo) return { title: "Recipe" };
  return {
    title: decodeHtmlEntities(demo.recipe.title),
    description: demo.teaser,
  };
}

export default async function DemoRecipePage({ params }: Props) {
  const { slug } = await params;
  const demo = getDemoRecipe(slug);
  if (!demo) notFound();

  const { recipe } = demo;
  const heroSrc = recipe.imageUrl ? normalizeImageUrl(recipe.imageUrl) : null;

  return (
    <article className="mx-auto max-w-3xl px-6 py-10">
      <div className="flex flex-col-reverse gap-8 sm:flex-row sm:items-start">
        <header className="flex-1 space-y-4">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Recipe
          </p>
          <h1 className="font-heading text-4xl text-text-heading">
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
            <span className="rounded-md border border-border bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground">
              No account required
            </span>
          </div>
        </header>
        {heroSrc ? (
          <div className="relative aspect-[4/5] w-full shrink-0 overflow-hidden rounded-sm bg-muted sm:w-48 lg:w-56">
            <RecipeImageFallback
              src={heroSrc}
              className="absolute inset-0 h-full w-full"
              loading="eager"
              size="lg"
              sizes="(max-width: 640px) 100vw, 224px"
              quality={90}
            />
          </div>
        ) : null}
      </div>

      <section className="mt-12 space-y-4">
        <h2 className="font-heading text-2xl text-text-heading">Ingredients</h2>
        <ul className="space-y-3 text-base leading-relaxed">
          {recipe.ingredients.map((ing) => (
            <li key={ing.id}>
              <IngredientLine ingredient={ing} />
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-12 space-y-12">
        <section className="space-y-4">
          <h2 className="font-heading text-2xl text-text-heading">Instructions</h2>
          <p className="text-sm text-muted-foreground">
            Full steps, right where you&apos;re already reading.
          </p>
          <RecipeStepsReader steps={recipe.steps} />
        </section>
      </div>
    </article>
  );
}
