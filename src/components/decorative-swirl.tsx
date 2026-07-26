import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

/**
 * Thin single-stroke swirl/ellipse line art, used as a low-opacity background
 * accent behind hero sections and empty states. Purely decorative — always
 * `aria-hidden`, absolutely positioned by the caller via `className`.
 */
export function DecorativeSwirl({ className }: Props) {
  return (
    <svg
      viewBox="0 0 180 180"
      className={cn("pointer-events-none text-text-heading/20", className)}
      aria-hidden
    >
      <ellipse
        cx="90"
        cy="90"
        rx="70"
        ry="90"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      />
    </svg>
  );
}
