import Image from "next/image";
import {
  faHatChef,
  faArrowRightArrowLeft,
  faBowlFood,
  faChartSimple,
  faDownload,
  faClockRotateLeft,
  faBookOpen,
} from "@fortawesome/pro-duotone-svg-icons";
import { DuotoneIcon } from "@/components/duotone-icon";
import { DecorativeSwirl } from "@/components/decorative-swirl";
import { ImportRecipeForm } from "@/components/import-recipe-form";
import { RecentImportsCards } from "@/components/recent-imports-cards";
import { getRecentImports } from "@/lib/data/queries";
import { GetStartedDemoCards } from "@/components/get-started-demo-cards";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Home hero (pick one): unsplash.com/photos/d9jcPTRD9fo • MqT0asuoIcU • pHeX8H9WQpY */
const HOME_HERO_IMAGE =
  "https://images.unsplash.com/photo-1611270629569-8b357cb88da9?auto=format&fit=crop&w=2560&q=90";

const SOUS_CAPABILITIES = [
  {
    icon: faArrowRightArrowLeft,
    title: "Swap anything",
    example: "“What if I used chickpeas instead of white beans?”",
  },
  {
    icon: faBowlFood,
    title: "Resize on the fly",
    example: "“Make this work for 6 servings instead of 4.”",
  },
  {
    icon: faChartSimple,
    title: "Real macros",
    example: "Calories, protein, carbs, fat, fiber—updated as you go.",
  },
] as const;

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const recentForCards = await getRecentImports(6);

  return (
    <div className="mx-auto max-w-5xl px-6 pb-24 pt-10">
      <section className="relative space-y-10 text-center">
        <DecorativeSwirl className="pointer-events-none absolute -top-10 right-10 h-44 w-44" />
        <div className="mx-auto max-w-xl space-y-6">
          <p className="font-wordmark text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Mise
          </p>
          <h1 className="font-heading text-4xl leading-tight text-text-heading sm:text-5xl">
            A calmer way to cook the internet.
          </h1>
          <p className="text-lg leading-relaxed text-muted-foreground">
            Import any recipe, then chat with Sous to make it healthier—without
            losing what makes it good.
          </p>
        </div>
        <div className="relative mx-auto aspect-[21/9] w-full max-w-3xl overflow-hidden rounded-2xl bg-muted">
          <Image
            src={HOME_HERO_IMAGE}
            alt=""
            fill
            className="object-cover"
            priority
            quality={92}
            sizes="(max-width: 1024px) 100vw, 768px"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-6">
            <p className="text-center text-sm leading-relaxed text-white/95">
              Room to breathe—clear steps when you&apos;re ready to cook.
            </p>
          </div>
        </div>
      </section>

      <section className="relative mt-28 overflow-hidden rounded-2xl border border-border bg-muted/20 px-6 py-16 text-center sm:px-10">
        <DecorativeSwirl className="pointer-events-none absolute -bottom-16 -left-10 h-56 w-56" />
        <div className="mx-auto max-w-xl space-y-4">
          <p className="font-wordmark flex items-center justify-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <DuotoneIcon icon={faHatChef} className="h-3.5 w-3.5" aria-hidden />
            Meet Sous
          </p>
          <h2 className="font-heading text-3xl text-text-heading">
            Your AI cooking companion.
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            Not a canned list of substitutions—an actual conversation about your
            recipe, grounded in what you&apos;re really cooking.
          </p>
        </div>

        <div className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-3">
          {SOUS_CAPABILITIES.map(({ icon, title, example }) => (
            <div
              key={title}
              className="space-y-2 rounded-2xl bg-card p-6 text-center"
            >
              <DuotoneIcon icon={icon} className="mx-auto h-6 w-6 text-primary" aria-hidden />
              <p className="font-heading text-sm text-text-heading">{title}</p>
              <p className="text-xs leading-relaxed text-muted-foreground">{example}</p>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-8 max-w-md space-y-2 rounded-2xl bg-primary p-5 text-left">
          <p className="text-[11px] uppercase tracking-[0.1em] text-primary-foreground/70">
            Sous says
          </p>
          <p className="text-sm leading-relaxed text-primary-foreground">
            Chickpeas work great here—slightly firmer bite, about 40 more grams
            of protein per batch. Want the macros at 6 servings instead of 4?
          </p>
        </div>
      </section>

      <section className="mt-28 border-t border-border pt-16 text-center">
        <div className="mx-auto max-w-md space-y-2">
          <p className="flex items-center justify-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <DuotoneIcon icon={faDownload} className="h-3.5 w-3.5" aria-hidden />
            Get started
          </p>
          <h2 className="font-heading text-2xl text-text-heading">
            Import a recipe URL.
          </h2>
        </div>
        <div className="mx-auto mt-6 max-w-md">
          <ImportRecipeForm />
        </div>
      </section>

      <section className="mt-28 border-t border-border pt-16">
        <div className="mb-8 space-y-2">
          <h2 className="flex items-center gap-2 font-heading text-2xl text-text-heading">
            <DuotoneIcon icon={faClockRotateLeft} className="h-5 w-5 text-primary" aria-hidden />
            Recently Imported
          </h2>
          <p className="text-sm text-muted-foreground">
            Your latest saves, ready to open or cook.
          </p>
        </div>
        <RecentImportsCards recipes={recentForCards} isLoggedIn={Boolean(user)} />
      </section>

      <section className="mt-28 border-t border-border pt-16">
        <div className="mb-8 space-y-2">
          <h2 className="flex items-center gap-2 font-heading text-2xl text-text-heading">
            <DuotoneIcon icon={faBookOpen} className="h-5 w-5 text-primary" aria-hidden />
            Try a Recipe
          </h2>
          <p className="text-sm text-muted-foreground">
            No upload needed—three demo recipes, Sous included, no account required.
          </p>
        </div>
        <GetStartedDemoCards />
      </section>
    </div>
  );
}
