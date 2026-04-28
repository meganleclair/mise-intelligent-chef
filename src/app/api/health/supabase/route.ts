import { NextResponse } from "next/server";

/**
 * Debug helper: confirms env vars exist (without leaking secrets) and that
 * Supabase Auth is reachable from the deployment (same network as SSR).
 * Open GET /api/health/supabase on your Netlify URL after deploying.
 */
export async function GET() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  const baseUrl = rawUrl.replace(/\/$/, "");

  const envOk = Boolean(rawUrl && key);
  let host: string | null = null;
  try {
    if (rawUrl) host = new URL(rawUrl).host;
  } catch {
    host = null;
  }

  let authReachable = false;
  let authHttpStatus: number | null = null;
  let fetchError: string | null = null;

  if (envOk && baseUrl.startsWith("https://")) {
    try {
      const res = await fetch(`${baseUrl}/auth/v1/health`, {
        signal: AbortSignal.timeout(10_000),
        headers: { Accept: "application/json" },
      });
      authHttpStatus = res.status;
      authReachable = res.ok;
    } catch (e) {
      fetchError = e instanceof Error ? e.message : String(e);
    }
  }

  const hint = !envOk
    ? "Missing or empty NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. Set them in Netlify → Environment variables, then redeploy (Next.js bakes PUBLIC env at build time)."
    : !baseUrl.startsWith("https://")
      ? "SUPABASE_URL should be https://…supabase.co — fix the value and redeploy."
      : !authReachable
        ? "Auth API not reachable from this server. Check project URL, firewall, or Supabase status. Login/signup from the browser will also fail if the URL/key are wrong."
        : null;

  return NextResponse.json({
    ok: envOk && authReachable,
    env: {
      hasSupabaseUrl: Boolean(rawUrl),
      hasAnonKey: Boolean(key),
      /** Length only — anon key is public but we avoid echoing it. */
      anonKeyCharCount: key.length,
      urlHost: host,
      urlLooksLikeSupabase: host?.endsWith(".supabase.co") ?? false,
    },
    authApiFromServer: {
      reachable: authReachable,
      httpStatus: authHttpStatus,
      error: fetchError,
    },
    hint,
  });
}
