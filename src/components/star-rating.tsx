"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStar } from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/lib/utils";

type Size = "sm" | "md";

const sizeClass: Record<Size, string> = {
  sm: "h-3.5 w-3.5",
  md: "h-6 w-6",
};

export function StarRatingDisplay({
  value,
  size = "md",
  className,
}: {
  value: number;
  size?: Size;
  className?: string;
}) {
  return (
    <div
      className={cn("flex gap-0.5", className)}
      aria-label={`${value} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <FontAwesomeIcon
          key={n}
          icon={faStar}
          className={cn(
            sizeClass[size],
            n <= value ? "text-primary" : "text-muted-foreground/25",
          )}
          aria-hidden
        />
      ))}
    </div>
  );
}

export function StarRatingInput({
  value,
  onChange,
  size = "md",
  idPrefix = "star",
  className,
}: {
  value: number | null;
  onChange: (next: number | null) => void;
  size?: Size;
  idPrefix?: string;
  className?: string;
}) {
  return (
    <div
      className={cn("flex flex-wrap gap-1", className)}
      role="group"
      aria-label="Rate from 1 to 5 stars"
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const active = value !== null && n <= value;
        return (
          <button
            key={n}
            type="button"
            id={`${idPrefix}-${n}`}
            className={cn(
              "rounded p-1 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              active ? "text-primary" : "text-muted-foreground/35 hover:text-muted-foreground",
            )}
            onClick={() => onChange(value === n ? null : n)}
            aria-pressed={active}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
          >
            <FontAwesomeIcon
              icon={faStar}
              className={cn(sizeClass[size])}
              aria-hidden
            />
          </button>
        );
      })}
    </div>
  );
}
