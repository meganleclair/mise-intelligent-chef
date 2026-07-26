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
        <h1 className="font-heading text-3xl text-text-heading">My kitchen</h1>
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
          <h2 className="mb-3 font-heading text-xl text-text-heading">Import a recipe</h2>
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
