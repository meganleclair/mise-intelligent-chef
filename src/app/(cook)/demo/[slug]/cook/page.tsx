import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CookModeClient } from "@/components/cook-mode-client";
import { decodeHtmlEntities } from "@/lib/decode-html-entities";
import { DEMO_LIST, getDemoRecipe } from "@/lib/demo-recipes/catalog";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return DEMO_LIST.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const demo = getDemoRecipe(slug);
  if (!demo) return { title: "Cook" };
  return {
    title: `Cook — ${decodeHtmlEntities(demo.recipe.title)}`,
  };
}

export default async function DemoCookPage({ params }: Props) {
  const { slug } = await params;
  const demo = getDemoRecipe(slug);
  if (!demo) notFound();

  const { recipe } = demo;

  return (
    <CookModeClient
      recipeId={`demo:${slug}`}
      title={decodeHtmlEntities(recipe.title)}
      steps={recipe.steps}
      ingredients={recipe.ingredients}
      servings={recipe.servings}
      initialStepIndex={0}
      initialTimer={null}
      demoExitHref={`/demo/${slug}`}
    />
  );
}
