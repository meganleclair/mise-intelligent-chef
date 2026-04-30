import Image from "next/image";
import { ContinueCookingBanner } from "@/components/continue-cooking-banner";
import { ImportRecipeForm } from "@/components/import-recipe-form";
import { RecentImportsCards } from "@/components/recent-imports-cards";
import {
  getActiveCookSession,
  getRecentImports,
} from "@/lib/data/queries";
import { GetStartedDemoCards } from "@/components/get-started-demo-cards";

/** Home hero (pick one): unsplash.com/photos/d9jcPTRD9fo • MqT0asuoIcU • pHeX8H9WQpY */
const HOME_HERO_IMAGE =
  "https://images.unsplash.com/photo-1611270629569-8b357cb88da9?auto=format&fit=crop&w=2560&q=90";

export default async function HomePage() {
  const [active, recentForCards] = await Promise.all([
    getActiveCookSession(),
    getRecentImports(6),
  ]);

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
          <Image
            src={HOME_HERO_IMAGE}
            alt=""
            fill
            className="object-cover"
            priority
            quality={92}
            sizes="(max-width: 1024px) 100vw, min(528px, 42vw)"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-6">
            <p className="text-center text-sm leading-relaxed text-white/95">
              Room to breathe—clear steps when you&apos;re ready to cook.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-20 border-t border-border pt-14">
        <div className="mb-8 space-y-2">
          <h2 className="font-serif text-2xl text-text-heading">
            Try a recipe
          </h2>
          <p className="text-sm text-muted-foreground">
            No upload needed—open a full recipe and jump into prep or cook mode whenever
            you like.
          </p>
        </div>
        <GetStartedDemoCards />
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
