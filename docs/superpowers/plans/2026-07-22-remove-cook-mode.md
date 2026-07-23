# Remove Cook Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Delete step-by-step Cook Mode entirely (the `(cook)` route group, its client component, the `cook_sessions` table, and the step-ingredient matching heuristic), since the recipe detail page already provides a full continuous instructions read-through and an original-recipe link — Cook Mode's step-by-step navigation duplicates that with far more fragile machinery, and user research confirmed it isn't actually used.

**Architecture:** Pure subtraction, no new features. Each task removes one layer of the dependency chain (UI entry points → route/component files → data-layer functions → database table), keeping the app buildable after every task. The recipe detail page (`src/app/(editorial)/recipes/[id]/page.tsx`) and demo page (`src/app/(editorial)/demo/[slug]/page.tsx`) already render full instructions via `<RecipeStepsReader>` and an "Original link" — no replacement UI needs to be built.

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase (Postgres + RLS), Vitest.

---

### Task 1: Remove Cook Mode entry points from user-facing pages

**Files:**
- Modify: `src/app/(editorial)/page.tsx`
- Modify: `src/app/(editorial)/kitchen/page.tsx`
- Modify: `src/app/(editorial)/recipes/[id]/page.tsx`
- Modify: `src/app/(editorial)/demo/[slug]/page.tsx`

- [ ] **Step 1: Remove the "Continue cooking" banner and its data fetch from the home page**

In `src/app/(editorial)/page.tsx`, remove the `ContinueCookingBanner` import and usage, and stop fetching `getActiveCookSession`:

```tsx
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
          <h2 className="font-serif text-2xl text-text-heading">
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
```

- [ ] **Step 2: Remove the "Continue cooking" banner and its data fetch from the Kitchen page**

In `src/app/(editorial)/kitchen/page.tsx`:

```tsx
import Link from "next/link";
import { KitchenRecipeLists } from "@/components/kitchen-recipe-lists";
import { ImportRecipeForm } from "@/components/import-recipe-form";
import { getFavoriteRecipes, getRecentImports } from "@/lib/data/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function KitchenPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [recent, favorites] = await Promise.all([
    getRecentImports(50),
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

      {user ? (
        <section className="mb-12 rounded-xl border border-border bg-muted/20 px-4 py-5 sm:px-6">
          <h2 className="mb-3 font-serif text-xl text-text-heading">Import a recipe</h2>
          <ImportRecipeForm />
        </section>
      ) : null}

      <KitchenRecipeLists
        recent={recent}
        favorites={favorites}
        isLoggedIn={Boolean(user)}
      />
    </div>
  );
}
```

- [ ] **Step 3: Remove the "Start cooking" link from the recipe detail page**

In `src/app/(editorial)/recipes/[id]/page.tsx`, replace the two-button footer (lines 121–140) with just the "Before you start" link, and update the Instructions subtitle (lines 111–116) to drop the "cook mode" reference:

```tsx
      <div className="mt-12 space-y-12">
        <RecipeGoalSwaps recipeId={id} />

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
```

(Leave everything above this footer — hero, header, rating, source link, ingredients, `RecipeGoalSwaps` — untouched; those are out of scope for this plan.)

- [ ] **Step 4: Remove the "Start cooking" link from the demo recipe page**

In `src/app/(editorial)/demo/[slug]/page.tsx`, replace the two-button footer (lines 134–158) with just "Before you start" (no longer conditional on a second button existing), and update the Instructions subtitle (lines 126–129):

```tsx
        <section className="space-y-4">
          <h2 className="font-serif text-2xl text-text-heading">Instructions</h2>
          <p className="text-sm text-muted-foreground">
            Full steps, right where you&apos;re already reading.
          </p>
          <RecipeStepsReader steps={recipe.steps} />
        </section>
      </div>

      {prepOrdered.length > 0 ? (
        <div className="mt-14">
          <Link
            href={`/demo/${slug}#prep`}
            className={cn(
              buttonVariants({ size: "lg" }),
              "min-h-12 w-full justify-center sm:w-auto",
            )}
          >
            Before you start
          </Link>
        </div>
      ) : null}
    </article>
  );
}
```

- [ ] **Step 5: Verify the app still builds**

Run: `npm run build`
Expected: build succeeds with no type errors. (Cook Mode routes/components still exist on disk but are now unreachable from the UI — that's expected at this point, Task 2 deletes them.)

- [ ] **Step 6: Commit**

```bash
git add src/app/\(editorial\)/page.tsx src/app/\(editorial\)/kitchen/page.tsx "src/app/(editorial)/recipes/[id]/page.tsx" "src/app/(editorial)/demo/[slug]/page.tsx"
git commit -m "Remove Cook Mode entry points from home, kitchen, recipe, and demo pages"
```

---

### Task 2: Delete the Cook Mode route group and its components

**Files:**
- Delete: `src/app/(cook)/layout.tsx`
- Delete: `src/app/(cook)/demo/[slug]/cook/page.tsx`
- Delete: `src/app/(cook)/recipes/[id]/cook/page.tsx`
- Delete: `src/app/(cook)/recipes/[id]/cook/not-found.tsx`
- Delete: `src/components/cook-mode-client.tsx`
- Delete: `src/components/cook-finish-dialog.tsx`
- Delete: `src/components/continue-cooking-banner.tsx`
- Delete: `src/lib/recipes/step-ingredients.ts`
- Delete: `src/lib/__tests__/step-ingredients.test.ts`

- [ ] **Step 1: Verify nothing outside this deletion set still references these files**

Run:
```bash
grep -rln "cook-mode-client\|cook-finish-dialog\|continue-cooking-banner\|step-ingredients" src --include="*.ts" --include="*.tsx" | grep -v -E "cook-mode-client\.tsx|cook-finish-dialog\.tsx|continue-cooking-banner\.tsx|step-ingredients\.ts|step-ingredients\.test\.ts|app/\(cook\)"
```
Expected: no output (everything referencing these lives inside the files being deleted, or was already cleared out in Task 1).

- [ ] **Step 2: Delete the files**

```bash
git rm -r "src/app/(cook)"
git rm src/components/cook-mode-client.tsx
git rm src/components/cook-finish-dialog.tsx
git rm src/components/continue-cooking-banner.tsx
git rm src/lib/recipes/step-ingredients.ts
git rm src/lib/__tests__/step-ingredients.test.ts
```

- [ ] **Step 3: Verify the app still builds and tests pass**

Run: `npm run build`
Expected: build succeeds — no remaining imports of the deleted files.

Run: `npm test`
Expected: remaining test suite passes (the deleted `step-ingredients.test.ts` no longer runs; `rate-limit.test.ts` and `summary.test.ts` are untouched and pass).

- [ ] **Step 4: Commit**

```bash
git commit -m "Delete Cook Mode route group and its supporting components"
```

---

### Task 3: Remove `cook_sessions` from the data layer

**Files:**
- Modify: `src/lib/data/queries.ts`
- Delete: `src/lib/actions/sessions.ts`

- [ ] **Step 1: Verify `src/lib/actions/sessions.ts` has no remaining importers**

Run: `grep -rln "actions/sessions" src`
Expected: no output (Task 2 already deleted its only three importers: `cook-mode-client.tsx`, `cook-finish-dialog.tsx`, `continue-cooking-banner.tsx`).

- [ ] **Step 2: Delete `src/lib/actions/sessions.ts`**

```bash
git rm src/lib/actions/sessions.ts
```

- [ ] **Step 3: Remove `cook_sessions` query functions and the now-dead `parseTimerState`/`TimerState` import from `queries.ts`**

Replace the full contents of `src/lib/data/queries.ts` with:

```ts
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Ingredient, PrepItem, Step } from "@/lib/types/recipe";

export type RecipeRow = {
  id: string;
  title: string;
  summary: string | null;
  image_url: string | null;
  source_url: string;
  servings: number;
  ingredients: Ingredient[];
  steps: Step[];
  prep_items: PrepItem[];
  favorite: boolean;
  rating: number | null;
};

export type ModificationRow = {
  ingredient_key: string;
  replacement_label: string;
  impact_note: string | null;
};

export async function getRecipeForUser(recipeId: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("recipes")
    .select("*")
    .eq("id", recipeId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) return null;
  return data as RecipeRow;
}

export async function getModifications(recipeId: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("recipe_modifications")
    .select("ingredient_key, replacement_label, impact_note")
    .eq("recipe_id", recipeId)
    .eq("user_id", user.id);

  return (data ?? []) as ModificationRow[];
}

export async function getRecentImports(limit = 6) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("recipes")
    .select("id, title, image_url, created_at, favorite, rating")
    .eq("user_id", user.id)
    .is("hidden_from_recent_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[getRecentImports] query failed:", error.message);
    return [];
  }

  return data ?? [];
}

export async function getFavoriteRecipes() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("recipes")
    .select("id, title, image_url, created_at, rating")
    .eq("user_id", user.id)
    .eq("favorite", true)
    .order("created_at", { ascending: false })
    .limit(50);

  return data ?? [];
}

export async function getFeaturedRecipe() {
  const rows = await getRecentImports(1);
  return rows[0] ?? null;
}
```

(`getModifications`/`ModificationRow` and `recipe_modifications` itself are untouched here — that table and its replacement are Task-2-of-the-*next*-plan's concern, not this one. This plan only removes `cook_sessions` and everything built on it.)

- [ ] **Step 4: Verify the app still builds and tests pass**

Run: `npm run build`
Expected: succeeds.

Run: `npm test`
Expected: passes.

- [ ] **Step 5: Commit**

```bash
git add src/lib/data/queries.ts
git commit -m "Remove cook_sessions query functions and server actions from the data layer"
```

---

### Task 4: Drop the `cook_sessions` table

**Files:**
- Create: `supabase/migrations/20260722000000_drop_cook_sessions.sql`
- Modify: `supabase/complete-schema.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Cook Mode removed — step-by-step session tracking is no longer needed.
drop table if exists public.cook_sessions;
```

Save as `supabase/migrations/20260722000000_drop_cook_sessions.sql`.

- [ ] **Step 2: Remove the `cook_sessions` section from `supabase/complete-schema.sql`**

Delete the `-- ── cook_sessions ─────────────────────────────────────────────` section (the `create table`, its partial index, `enable row level security`, policy, and `updated_at` trigger — lines 111–139 per the current file) and remove the `grant all on public.cook_sessions to authenticated;` line from the grants section at the bottom.

- [ ] **Step 3: Apply the migration to your Supabase project**

Since this repo has no Supabase CLI project link configured, apply it manually: open your Mise Supabase project → SQL Editor → New query → paste the migration's `drop table if exists public.cook_sessions;` statement → Run.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260722000000_drop_cook_sessions.sql supabase/complete-schema.sql
git commit -m "Drop cook_sessions table"
```

---

### Task 5: Final verification sweep

**Files:** none (verification only)

- [ ] **Step 1: Grep for any remaining reference to removed concepts**

```bash
grep -rn "cook_sessions\|CookModeClient\|CookFinishDialog\|ContinueCookingBanner\|getIngredientsForStep\|getActiveCookSession\|getCookSessionForRecipe\|startOrResumeCookSession\|updateCookStep\|updateCookTimer\|abandonCookSession\|completeCookSession\|finishCookingWithFeedback" src
```
Expected: no output.

- [ ] **Step 2: Run the full verification suite**

```bash
npm run lint
npm test
npm run build
```
Expected: all three pass with no errors.

- [ ] **Step 3: Manually confirm in the browser**

Start the dev server (`npm run dev`), sign in, open a recipe you've imported, and confirm:
- No "Start cooking" button appears (only "Before you start").
- The Instructions section still shows the full recipe steps.
- The home page and Kitchen page load with no "Continue cooking" banner and no console errors.

- [ ] **Step 4: Commit (only if any cleanup was needed in Steps 1–3)**

```bash
git add -A
git commit -m "Final cleanup pass after Cook Mode removal"
```
