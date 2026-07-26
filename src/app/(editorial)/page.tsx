import Image from "next/image";
import { ImportRecipeForm } from "@/components/import-recipe-form";
import { RecentImportsCards } from "@/components/recent-imports-cards";
import { getRecentImports } from "@/lib/data/queries";
import { GetStartedDemoCards } from "@/components/get-started-demo-cards";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Home hero (pick one): unsplash.com/photos/d9jcPTRD9fo • MqT0asuoIcU • pHeX8H9WQpY */
const HOME_HERO_IMAGE =
  "https://images.unsplash.com/photo-1611270629569-8b357cb88da9?auto=format&fit=crop&w=2560&q=90";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const recentForCards = await getRecentImports(6);

  return (
    <div className="mx-auto max-w-5xl px-6 pb-20 pt-10">
      <section className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-14">
        <div className="space-y-6">
          <p className="font-wordmark text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Mise
          </p>
          <h1 className="font-heading text-4xl leading-tight text-text-heading sm:text-5xl">
            A calmer way to cook the internet.
          </h1>
          <p className="max-w-md text-lg leading-relaxed text-muted-foreground">
            Import a recipe, see what needs to happen before you start, then chat
            with Sous to make it healthier—without losing what makes it good.
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

      <section className="mt-20 rounded-2xl border border-border bg-muted/20 px-6 py-10 sm:px-10">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-14">
          <div className="space-y-4">
            <p className="font-wordmark text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Meet Sous
            </p>
            <h2 className="font-heading text-3xl text-text-heading">
              Your cooking companion, right inside every recipe.
            </h2>
            <p className="text-base leading-relaxed text-muted-foreground">
              Ask Sous anything—swap an ingredient, change the serving size, ask
              what&apos;s actually in it—and get a real answer plus an updated
              calorie, protein, carb, fat, and fiber estimate. One honest
              conversation, not a canned list of substitutions.
            </p>
          </div>
          <div className="space-y-2 rounded-xl border border-border bg-card p-4 sm:p-5">
            <p className="ml-auto max-w-[85%] rounded-lg bg-primary/10 px-3 py-2 text-sm">
              What if I used chickpeas instead of white beans?
            </p>
            <p className="mr-auto max-w-[85%] rounded-lg bg-muted px-3 py-2 text-sm">
              Chickpeas work great here—slightly firmer bite, about 40 more
              grams of protein per batch. Want the macros at 6 servings
              instead of 4?
            </p>
          </div>
        </div>
      </section>

      <section className="mt-20 border-t border-border pt-14">
        <div className="mb-8 space-y-2">
          <h2 className="font-heading text-2xl text-text-heading">
            Recently Imported
          </h2>
          <p className="text-sm text-muted-foreground">
            Your latest saves, ready to open or cook.
          </p>
        </div>
        <RecentImportsCards recipes={recentForCards} isLoggedIn={Boolean(user)} />
      </section>

      <section className="mt-20 border-t border-border pt-14">
        <div className="mb-8 space-y-2">
          <h2 className="font-heading text-2xl text-text-heading">
            Try a Recipe
          </h2>
          <p className="text-sm text-muted-foreground">
            No upload needed—open a full recipe and start cooking whenever you like.
          </p>
        </div>
        <GetStartedDemoCards />
      </section>
    </div>
  );
}
