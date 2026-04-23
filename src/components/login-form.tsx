"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/password-input";
import { cn } from "@/lib/utils";

type Props = { nextPath: string };

type Mode = "signin" | "signup" | "forgot";

export function LoginForm({ nextPath }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function signIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    if (!email || !password) return;
    setPending(true);
    const supabase = createSupabaseBrowserClient();
    const { error: err } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setPending(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.push(nextPath);
    router.refresh();
  }

  async function signUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    const confirm = String(fd.get("confirm") ?? "");
    if (!email || !password) return;
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setPending(true);
    const supabase = createSupabaseBrowserClient();
    const origin = window.location.origin;
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    });
    setPending(false);
    if (err) {
      setError(err.message);
      return;
    }
    if (data.session) {
      router.push(nextPath);
      router.refresh();
      return;
    }
    setInfo(
      "Check your email to confirm your account, then sign in here.",
    );
  }

  async function forgot(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    if (!email) return;
    setPending(true);
    const supabase = createSupabaseBrowserClient();
    const origin = window.location.origin;
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/auth/update-password")}`,
    });
    setPending(false);
    if (err) {
      setError(err.message);
      return;
    }
    setInfo(
      "If an account exists for that email, you’ll get a link to reset your password.",
    );
  }

  if (mode === "forgot") {
    return (
      <div className="space-y-6">
        <form onSubmit={forgot} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="forgot-email">Email</Label>
            <Input
              id="forgot-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
            />
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          {info ? (
            <p className="text-sm text-muted-foreground" role="status">
              {info}
            </p>
          ) : null}
          <button
            type="submit"
            className={cn(buttonVariants(), "w-full")}
            disabled={pending}
          >
            {pending ? "Sending…" : "Send reset link"}
          </button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          <button
            type="button"
            className="text-foreground underline underline-offset-4"
            onClick={() => {
              setMode("signin");
              setError(null);
              setInfo(null);
            }}
          >
            Back to sign in
          </button>
        </p>
      </div>
    );
  }

  if (mode === "signup") {
    return (
      <div className="space-y-6">
        <form onSubmit={signUp} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="signup-email">Email</Label>
            <Input
              id="signup-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signup-password">Password</Label>
            <PasswordInput
              id="signup-password"
              name="password"
              autoComplete="new-password"
              required
              minLength={6}
              placeholder="At least 6 characters"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signup-confirm">Confirm password</Label>
            <PasswordInput
              id="signup-confirm"
              name="confirm"
              autoComplete="new-password"
              required
              minLength={6}
            />
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          {info ? (
            <p className="text-sm text-muted-foreground" role="status">
              {info}
            </p>
          ) : null}
          <button
            type="submit"
            className={cn(buttonVariants(), "w-full")}
            disabled={pending}
          >
            {pending ? "Creating account…" : "Create account"}
          </button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <button
            type="button"
            className="text-foreground underline underline-offset-4"
            onClick={() => {
              setMode("signin");
              setError(null);
              setInfo(null);
            }}
          >
            Sign in
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={signIn} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="password">Password</Label>
            <button
              type="button"
              className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
              onClick={() => {
                setMode("forgot");
                setError(null);
                setInfo(null);
              }}
            >
              Forgot password?
            </button>
          </div>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            required
          />
        </div>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          className={cn(buttonVariants(), "w-full")}
          disabled={pending}
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        New here?{" "}
        <button
          type="button"
          className="text-foreground underline underline-offset-4"
          onClick={() => {
            setMode("signup");
            setError(null);
            setInfo(null);
          }}
        >
          Create an account
        </button>
      </p>
    </div>
  );
}
