import Link from "next/link";
import { StarRatingDisplay } from "@/components/star-rating";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RecipeImageFallback } from "@/components/recipe-image-fallback";
import { decodeHtmlEntities } from "@/lib/decode-html-entities";
import { normalizeImageUrl } from "@/lib/images";
import { cn } from "@/lib/utils";

export type RecentImportCard = {
  id: string;
  title: string;
  image_url: string | null;
  rating?: number | null;
};

type Props = {
  recipes: RecentImportCard[];
  isLoggedIn?: boolean;
};

export function RecentImportsCards({ recipes, isLoggedIn = true }: Props) {
  if (recipes.length === 0) {
    if (!isLoggedIn) {
      return (
        <p className="text-sm text-muted-foreground">
          <Link href="/login" className="underline underline-offset-2 hover:text-foreground">Sign in</Link> to see your imported recipes.
        </p>
      );
    }
    return (
      <p className="text-sm text-muted-foreground">
        Nothing here yet—paste a recipe URL above and it will land on this shelf.
      </p>
    );
  }

  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {recipes.map((r) => {
        const src = r.image_url ? normalizeImageUrl(r.image_url) : null;
        return (
          <li key={r.id}>
            <Link href={`/recipes/${r.id}`} className="block h-full">
              <Card
                size="sm"
                className={cn(
                  "h-full transition-colors hover:bg-muted/30",
                  "py-0",
                )}
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-xl">
                  <RecipeImageFallback
                    src={src}
                    className="absolute inset-0 h-full w-full"
                    size="sm"
                  />
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="line-clamp-2 font-serif text-base text-text-heading">
                    {decodeHtmlEntities(r.title)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-2 pt-0">
                  {typeof r.rating === "number" ? (
                    <StarRatingDisplay value={r.rating} size="sm" />
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      Not rated yet
                    </span>
                  )}
                </CardContent>
                <CardFooter className="border-t-0 bg-transparent pt-0">
                  <span className="text-sm font-medium text-primary">
                    View recipe
                  </span>
                </CardFooter>
              </Card>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
