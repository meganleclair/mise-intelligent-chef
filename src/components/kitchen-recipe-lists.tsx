"use client";

import { useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import { KitchenFavoriteButton } from "@/components/kitchen-favorite-button";
import { RemoveFromRecentButton } from "@/components/remove-from-recent-button";
import { DeleteRecipeButton } from "@/components/delete-recipe-button";
import { StarRatingDisplay } from "@/components/star-rating";
import { RecipeImageFallback } from "@/components/recipe-image-fallback";
import { normalizeImageUrl } from "@/lib/images";

type RecentRecipe = {
  id: string;
  title: string;
  image_url: string | null;
  favorite: boolean | null;
  rating: number | null;
};

type FavoriteRecipe = {
  id: string;
  title: string;
  image_url: string | null;
  rating: number | null;
};

type Props = {
  recent: RecentRecipe[];
  favorites: FavoriteRecipe[];
  isLoggedIn: boolean;
};

const RECENT_PAGE = 8;
const FAVORITES_PAGE = 12;

export function KitchenRecipeLists({ recent, favorites, isLoggedIn }: Props) {
  const [query, setQuery] = useState("");
  const [recentLimit, setRecentLimit] = useState(RECENT_PAGE);
  const [favoritesLimit, setFavoritesLimit] = useState(FAVORITES_PAGE);
  const q = query.toLowerCase().trim();

  const filteredRecent = q
    ? recent.filter((r) => r.title.toLowerCase().includes(q))
    : recent;
  const filteredFavorites = q
    ? favorites.filter((r) => r.title.toLowerCase().includes(q))
    : favorites;

  // When searching, show all results; otherwise respect the pagination limit
  const visibleRecent = q ? filteredRecent : filteredRecent.slice(0, recentLimit);
  const visibleFavorites = q ? filteredFavorites : filteredFavorites.slice(0, favoritesLimit);

  const hasAny = recent.length > 0 || favorites.length > 0;

  return (
    <>
      {hasAny ? (
        <div className="relative mb-8">
          <FontAwesomeIcon
            icon={faMagnifyingGlass}
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your recipes…"
            aria-label="Search recipes"
            className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring h-11 w-full rounded-md border py-2 pl-9 pr-4 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          />
        </div>
      ) : null}

      <section className="mb-12">
        <h2 className="mb-4 font-serif text-xl text-text-heading">
          Recently imported
        </h2>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {isLoggedIn
              ? "Nothing here yet—import a recipe above."
              : "Sign in to load recipes you've imported."}
          </p>
        ) : filteredRecent.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No recent recipes match &ldquo;{query}&rdquo;.
          </p>
        ) : (
          <>
          <ul className="divide-y divide-border border border-border">
            {visibleRecent.map((r) => {
              const src = r.image_url ? normalizeImageUrl(r.image_url) : null;
              return (
                <li
                  key={r.id}
                  className="flex items-center gap-3 px-2 py-2 sm:px-4"
                >
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-muted sm:h-14 sm:w-14">
                    <RecipeImageFallback
                      src={src}
                      className="absolute inset-0 h-full w-full"
                      size="sm"
                    />
                  </div>
                  <Link
                    href={`/recipes/${r.id}`}
                    className="flex min-w-0 flex-1 items-center gap-3 py-2 transition-colors hover:opacity-80"
                  >
                    <span className="min-w-0 flex-1 font-medium text-text-heading">
                      {r.title}
                    </span>
                    {typeof r.rating === "number" ? (
                      <StarRatingDisplay value={r.rating} size="sm" />
                    ) : null}
                  </Link>
                  <KitchenFavoriteButton
                    recipeId={r.id}
                    initialFavorite={r.favorite ?? false}
                  />
                  <RemoveFromRecentButton recipeId={r.id} recipeTitle={r.title} />
                </li>
              );
            })}
          </ul>
          {!q && filteredRecent.length > recentLimit ? (
            <button
              type="button"
              onClick={() => setRecentLimit((n) => n + RECENT_PAGE)}
              className="mt-3 flex w-full items-center justify-center gap-2 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <FontAwesomeIcon icon={faChevronDown} className="h-3 w-3" aria-hidden />
              Show {Math.min(RECENT_PAGE, filteredRecent.length - recentLimit)} more
            </button>
          ) : null}
          </>
        )}
      </section>

      {favorites.length > 0 ? (
        <section>
          <h2 className="mb-4 font-serif text-xl text-text-heading">
            Favorites
          </h2>
          {filteredFavorites.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No favorites match &ldquo;{query}&rdquo;.
            </p>
          ) : (
            <>
            <ul className="divide-y divide-border border border-border">
              {visibleFavorites.map((r) => {
                const src = r.image_url ? normalizeImageUrl(r.image_url) : null;
                return (
                  <li
                    key={r.id}
                    className="flex items-center gap-3 px-2 py-2 sm:px-4"
                  >
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-muted sm:h-14 sm:w-14">
                      <RecipeImageFallback
                        src={src}
                        className="absolute inset-0 h-full w-full"
                        size="sm"
                      />
                    </div>
                    <Link
                      href={`/recipes/${r.id}`}
                      className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3 py-2 transition-colors hover:opacity-80"
                    >
                      <span className="font-medium text-text-heading">
                        {r.title}
                      </span>
                      {typeof r.rating === "number" ? (
                        <StarRatingDisplay value={r.rating} size="sm" />
                      ) : null}
                    </Link>
                    <DeleteRecipeButton recipeId={r.id} recipeTitle={r.title} />
                  </li>
                );
              })}
            </ul>
            {!q && filteredFavorites.length > favoritesLimit ? (
              <button
                type="button"
                onClick={() => setFavoritesLimit((n) => n + FAVORITES_PAGE)}
                className="mt-3 flex w-full items-center justify-center gap-2 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <FontAwesomeIcon icon={faChevronDown} className="h-3 w-3" aria-hidden />
                Show {Math.min(FAVORITES_PAGE, filteredFavorites.length - favoritesLimit)} more
              </button>
            ) : null}
            </>
          )}
        </section>
      ) : null}
    </>
  );
}
