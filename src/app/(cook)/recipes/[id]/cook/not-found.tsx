import Link from "next/link";

export default function CookNotFound() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">Cook mode</p>
      <h1 className="font-serif text-2xl text-text-heading">Recipe not found</h1>
      <p className="text-sm text-muted-foreground">
        This recipe doesn&apos;t exist or you don&apos;t have access to it.
      </p>
      <Link
        href="/"
        className="text-sm font-medium text-primary underline underline-offset-4 hover:text-primary/80"
      >
        Back to home
      </Link>
    </div>
  );
}
