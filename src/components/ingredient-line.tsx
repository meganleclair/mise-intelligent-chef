import { formatIngredientLine } from "@/lib/recipes/display";
import type { Ingredient } from "@/lib/types/recipe";

type Props = { ingredient: Ingredient };

export function IngredientLine({ ingredient }: Props) {
  return (
    <span className="break-words text-base text-text-heading">
      {formatIngredientLine(ingredient)}
    </span>
  );
}
