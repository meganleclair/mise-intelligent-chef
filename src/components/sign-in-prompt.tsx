import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  nextPath: string;
  title?: string;
  description?: string;
};

export function SignInPrompt({
  nextPath,
  title = "Sign in to continue",
  description = "Your saved recipes are tied to your account. Sign in to open this page.",
}: Props) {
  const href = `/login?next=${encodeURIComponent(nextPath)}`;
  return (
    <div className="mx-auto max-w-md px-6 py-20 text-center">
      <h1 className="font-serif text-2xl text-text-heading">{title}</h1>
      <p className="mt-3 text-sm text-muted-foreground">{description}</p>
      <Link href={href} className={cn(buttonVariants(), "mt-6 inline-flex")}>
        Sign in
      </Link>
    </div>
  );
}
