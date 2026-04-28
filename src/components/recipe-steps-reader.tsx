import { decodeHtmlEntities } from "@/lib/decode-html-entities";
import type { Step } from "@/lib/types/recipe";

type Props = { steps: Step[] };

export function RecipeStepsReader({ steps }: Props) {
  const ordered = [...steps].sort((a, b) => a.order - b.order);

  return (
    <ol className="list-none space-y-8 border-t border-border pt-10">
      {ordered.map((step, index) => (
        <li key={step.id} className="flex gap-5 sm:gap-8">
          <span
            className="font-serif text-2xl tabular-nums text-muted-foreground sm:text-3xl"
            aria-hidden
          >
            {index + 1}
          </span>
          <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-base leading-relaxed text-text-heading sm:text-lg">
            {decodeHtmlEntities(step.text)}
          </p>
        </li>
      ))}
    </ol>
  );
}
