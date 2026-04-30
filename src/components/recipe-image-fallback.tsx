"use client";

import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faImage } from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/lib/utils";

/** Route external recipe images through our server-side proxy to bypass hotlink protection. */
function toProxiedSrc(src: string): string {
  // Already a relative or data URL — serve as-is
  if (src.startsWith("/") || src.startsWith("data:")) return src;
  return `/api/image-proxy?url=${encodeURIComponent(src)}`;
}

const iconSize = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-14 w-14",
} as const;

type Props = {
  src: string | null;
  alt?: string;
  className?: string;
  imageClassName?: string;
  loading?: "eager" | "lazy";
  size?: keyof typeof iconSize;
};

/**
 * Recipe hero/card image with a neutral placeholder if the URL is missing or the request fails.
 */
export function RecipeImageFallback({
  src,
  alt = "",
  className,
  imageClassName,
  loading = "lazy",
  size = "md",
}: Props) {
  const [failed, setFailed] = useState(false);
  const showPlaceholder = !src || failed;
  const caption = failed ? "Image unavailable" : "No photo";

  return (
    <div className={cn("relative bg-muted", className)}>
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element -- proxied through /api/image-proxy
        <img
          src={toProxiedSrc(src)}
          alt={alt}
          className={cn(
            "absolute inset-0 h-full w-full object-cover",
            imageClassName,
          )}
          loading={loading}
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : null}
      {showPlaceholder ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
          <FontAwesomeIcon
            icon={faImage}
            className={cn(iconSize[size], "text-muted-foreground/45")}
            aria-hidden
          />
          <span className="text-xs text-muted-foreground">{caption}</span>
        </div>
      ) : null}
    </div>
  );
}
