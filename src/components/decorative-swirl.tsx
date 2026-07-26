import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

/**
 * Thin single-stroke spiral squiggle line art, used as a low-opacity
 * background accent behind hero sections and empty states. Purely
 * decorative — always `aria-hidden`, absolutely positioned by the caller
 * via `className`.
 */
export function DecorativeSwirl({ className }: Props) {
  return (
    <svg
      viewBox="0 0 180 180"
      className={cn("pointer-events-none text-text-heading/20", className)}
      aria-hidden
    >
      <path
        d="M100 30 C130 30, 155 55, 155 90 C155 125, 125 150, 90 150 C60 150, 35 128, 40 100 C44 78, 68 65, 85 78 C98 88, 95 108, 80 112"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
