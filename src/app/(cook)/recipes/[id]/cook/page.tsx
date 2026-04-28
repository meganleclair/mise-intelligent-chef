import { notFound } from "next/navigation";
import { CookModeClient } from "@/components/cook-mode-client";
import { SignInPrompt } from "@/components/sign-in-prompt";
import { decodeHtmlEntities } from "@/lib/decode-html-entities";
import { mergeIngredientsWithMods } from "@/lib/recipes/display";
import {
  getCookSessionForRecipe,
  getModifications,
  getRecipeForUser,
} from "@/lib/data/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ id: string }> };

export default async function CookPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return (
      <SignInPrompt
        nextPath={`/recipes/${id}/cook`}
        description="Sign in to use cook mode with your saved recipes."
      />
    );
  }

  const recipe = await getRecipeForUser(id);
  if (!recipe) notFound();

  const [mods, session] = await Promise.all([
    getModifications(id),
    getCookSessionForRecipe(id),
  ]);

  const ingredients = mergeIngredientsWithMods(recipe.ingredients, mods);

  return (
    <CookModeClient
      recipeId={id}
      title={decodeHtmlEntities(recipe.title)}
      steps={recipe.steps}
      ingredients={ingredients}
      initialStepIndex={session?.currentStepIndex ?? 0}
      initialTimer={session?.timerState ?? null}
    />
  );
}
