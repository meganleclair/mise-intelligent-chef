"use client";

import Image from "next/image";
import { useState } from "react";
import { faImage } from "@fortawesome/pro-duotone-svg-icons";
import { DuotoneIcon } from "@/components/duotone-icon";
import { cn } from "@/lib/utils";

/** Route external recipe images through our server-side proxy to bypass hotlink protection. */
function toProxiedSrc(src: string): string {
  // Already a relative or data URL — serve as-is
  if (src.startsWith("/") || src.startsWith("data:")) return src;
  // Unsplash CDN is publicly accessible — no proxy needed, serve directly
  if (src.includes("images.unsplash.com")) return src;
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
  sizes?: string;
  quality?: number;
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
  sizes = "100vw",
  quality = 85,
}: Props) {
  const [failed, setFailed] = useState(false);
  const showPlaceholder = !src || failed;
  const caption = failed ? "Image unavailable" : "No photo";

  return (
    <div className={cn("relative bg-muted", className)}>
      {src && !failed ? (
        <Image
          src={toProxiedSrc(src)}
          alt={alt}
          fill
          sizes={sizes}
          quality={quality}
          loading={loading}
          className={cn("object-cover", imageClassName)}
          onError={() => setFailed(true)}
        />
      ) : null}
      {showPlaceholder ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
          <DuotoneIcon
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
