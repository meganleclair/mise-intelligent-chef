import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecipeStepsReader } from "@/components/recipe-steps-reader";
import { IngredientLine } from "@/components/ingredient-line";
import { decodeHtmlEntities } from "@/lib/decode-html-entities";
import { tidyRecipeSummaryForDisplay } from "@/lib/recipes/summary";
import { RecipeImageFallback } from "@/components/recipe-image-fallback";
import { normalizeImageUrl } from "@/lib/images";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DEMO_LIST, getDemoRecipe } from "@/lib/demo-recipes/catalog";
import type { PrepUrgency } from "@/lib/types/recipe";

type Props = { params: Promise<{ slug: string }> };

function urgencyLabel(u: PrepUrgency | undefined) {
  if (!u) return null;
  if (u === "before_start") return "Before you start";
  if (u === "same_day") return "Same day";
  return "Overnight / ahead";
}

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
  const prepOrdered = [...recipe.prepItems].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );

  return (
    <article className="mx-auto max-w-3xl px-6 py-10">
      {heroSrc ? (
        <div className="relative mb-10 aspect-[16/10] w-full overflow-hidden rounded-sm bg-muted">
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
          <span className="rounded-md border border-border bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground">
            No account required
          </span>
        </div>
      </header>

      <section className="mt-12 space-y-4">
        <h2 className="font-serif text-2xl text-text-heading">Ingredients</h2>
        <ul className="space-y-3 text-base leading-relaxed">
          {recipe.ingredients.map((ing) => (
            <li key={ing.id}>
              <IngredientLine ingredient={ing} />
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-12 space-y-12">
        {prepOrdered.length > 0 ? (
          <section id="prep" className="scroll-mt-24 space-y-4">
            <h2 className="font-serif text-2xl text-text-heading">
              Before you start
            </h2>
            <ul className="space-y-4">
              {prepOrdered.map((item) => {
                const label = urgencyLabel(item.urgency);
                return (
                  <li
                    key={item.id}
                    className="border-l-2 border-border pl-4 text-base leading-relaxed"
                  >
                    {label ? (
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {label}
                      </p>
                    ) : null}
                    <p className="whitespace-pre-wrap text-text-heading">
                      {decodeHtmlEntities(item.text)}
                    </p>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

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
        {prepOrdered.length > 0 ? (
          <Link
            href={`/demo/${slug}#prep`}
            className={cn(
              buttonVariants({ size: "lg" }),
              "min-h-12 flex-1 justify-center",
            )}
          >
            Before you start
          </Link>
        ) : null}
        <Link
          href={`/demo/${slug}/cook`}
          className={cn(
            buttonVariants({
              size: "lg",
              variant: prepOrdered.length > 0 ? "secondary" : "default",
            }),
            "min-h-12 flex-1 justify-center",
          )}
        >
          Start cooking
        </Link>
      </div>
    </article>
  );
}
