import Link from "next/link";
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
import { listDemoCards } from "@/lib/demo-recipes/catalog";
import { cn } from "@/lib/utils";

export function GetStartedDemoCards() {
  const cards = listDemoCards();

  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((c) => {
        const src = c.imageUrl ? normalizeImageUrl(c.imageUrl) : null;
        return (
          <li key={c.slug}>
            <Link href={`/demo/${c.slug}`} className="block h-full">
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
                  <span className="absolute left-3 top-3 rounded-md bg-background/90 px-2 py-1 text-xs font-medium text-text-heading shadow-sm">
                    {c.badge}
                  </span>
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="line-clamp-2 font-serif text-base text-text-heading">
                    {decodeHtmlEntities(c.title)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-2 pt-0">
                  <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                    {c.teaser}
                  </p>
                </CardContent>
                <CardFooter className="border-t-0 bg-transparent pt-0">
                  <span className="text-sm font-medium text-primary">
                    Open recipe
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
