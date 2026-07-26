"use client";

import { faRightFromBracket } from "@fortawesome/pro-duotone-svg-icons";
import { DuotoneIcon } from "@/components/duotone-icon";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function SignOutButton() {
  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.assign("/");
  }

  return (
    <button
      type="button"
      onClick={() => void signOut()}
      className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <DuotoneIcon icon={faRightFromBracket} className="h-4 w-4" aria-hidden />
      Sign out
    </button>
  );
}
