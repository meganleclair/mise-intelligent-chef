import Image from "next/image";
import Link from "next/link";
import { ContinueCookingBanner } from "@/components/continue-cooking-banner";
import { ImportRecipeForm } from "@/components/import-recipe-form";
import { RecentImportsCards } from "@/components/recent-imports-cards";
import {
  getActiveCookSession,
  getFeaturedRecipe,
  getRecentImports,
} from "@/lib/data/queries";
import { RecipeImageFallback } from "@/components/recipe-image-fallback";
import { decodeHtmlEntities } from "@/lib/decode-html-entities";
import { normalizeImageUrl } from "@/lib/images";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function HomePage() {
  const [featured, active, recentAll] = await Promise.all([
    getFeaturedRecipe(),
    getActiveCookSession(),
    getRecentImports(8),
  ]);

  const recentForCards = recentAll
    .filter((r) => !featured || r.id !== featured.id)
    .slice(0, 6);

  const featuredImageSrc = featured?.image_url
    ? normalizeImageUrl(featured.image_url)
    : null;

  return (
    <div className="mx-auto max-w-5xl px-6 pb-20 pt-10">
      {active ? (
        <ContinueCookingBanner
          recipeId={active.recipeId}
          recipeTitle={active.recipeTitle}
          currentStepIndex={active.currentStepIndex}
        />
      ) : null}

      <section className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-14">
        <div className="space-y-6">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Mise
          </p>
          <h1 className="font-serif text-4xl leading-tight text-text-heading sm:text-5xl">
            A calmer way to cook the internet.
          </h1>
          <p className="max-w-md text-lg leading-relaxed text-muted-foreground">
            Import a recipe, see what needs to happen before you start, then cook
            one clear step at a time—with swaps that stay honest.
          </p>
          <div className="space-y-3">
            <p className="text-sm font-medium text-text-heading">
              Import a recipe URL
            </p>
            <ImportRecipeForm />
          </div>
        </div>
        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-sm bg-muted">
          {featuredImageSrc ? (
            <RecipeImageFallback
              src={featuredImageSrc}
              className="absolute inset-0 h-full w-full"
              loading="eager"
              size="lg"
            />
          ) : (
            <Image
              src="/images/home-hero-default.jpg"
              alt=""
              fill
              className="object-cover"
              priority
              sizes="(max-width: 1024px) 100vw, 40vw"
            />
          )}
          {featured ? (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-6 text-white">
              <p className="font-serif text-xl">
                {decodeHtmlEntities(featured.title)}
              </p>
              <Link
                href={`/recipes/${featured.id}`}
                className={cn(
                  buttonVariants({ variant: "secondary" }),
                  "mt-3 inline-flex",
                )}
              >
                Open recipe
              </Link>
            </div>
          ) : (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-6">
              <p className="text-center text-sm leading-relaxed text-white/95">
                Your imported recipes will feel like this—room to breathe, easy to
                follow.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="mt-20 border-t border-border pt-14">
        <div className="mb-8 space-y-2">
          <h2 className="font-serif text-2xl text-text-heading">
            Recently imported
          </h2>
          <p className="text-sm text-muted-foreground">
            Your latest saves, ready to open or cook.
          </p>
        </div>
        <RecentImportsCards recipes={recentForCards} />
      </section>
    </div>
  );
}
