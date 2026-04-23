import Link from "next/link";
import { notFound } from "next/navigation";
import { PrepEditor } from "@/components/prep-editor";
import { getRecipeForUser } from "@/lib/data/queries";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ id: string }> };

export default async function PrepPage({ params }: Props) {
  const { id } = await params;
  const recipe = await getRecipeForUser(id);
  if (!recipe) notFound();

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Prep
          </p>
          <h1 className="font-serif text-3xl text-text-heading">{recipe.title}</h1>
        </div>
        <Link
          href={`/recipes/${id}`}
          className={cn(
            buttonVariants({ variant: "secondary" }),
            "justify-center",
          )}
        >
          Back to recipe
        </Link>
      </div>

      <PrepEditor recipeId={id} initialItems={recipe.prep_items} />

      <div className="mt-12 border-t border-border pt-8">
        <Link
          href={`/recipes/${id}/cook`}
          className={cn(
            buttonVariants({ size: "lg" }),
            "inline-flex min-h-12 w-full justify-center sm:w-auto",
          )}
        >
          Ready to cook
        </Link>
      </div>
    </div>
  );
}
