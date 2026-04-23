import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHouse, faUtensils } from "@fortawesome/free-solid-svg-icons";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button";

export async function EditorialHeader() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-b border-border/80 bg-background/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-5">
        <Link href="/" className="font-serif text-xl tracking-tight text-text-heading">
          Mise
        </Link>
        <nav className="flex items-center gap-6 text-sm text-muted-foreground">
          <Link
            href="/"
            className="inline-flex items-center gap-2 transition-colors hover:text-foreground"
          >
            <FontAwesomeIcon icon={faHouse} className="h-4 w-4" aria-hidden />
            Home
          </Link>
          <Link
            href="/kitchen"
            className="inline-flex items-center gap-2 transition-colors hover:text-foreground"
          >
            <FontAwesomeIcon icon={faUtensils} className="h-4 w-4" aria-hidden />
            My kitchen
          </Link>
          {user ? (
            <SignOutButton />
          ) : (
            <Link href="/login" className="hover:text-foreground">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
