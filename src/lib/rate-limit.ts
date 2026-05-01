/**
 * Simple sliding-window rate limiter.
 *
 * NOTE: This is in-memory and scoped to a single function invocation.
 * On serverless (Netlify), each cold-start gets a fresh Map, so it won't
 * catch abuse spread across many invocations. For a portfolio project with
 * low traffic, this is fine — it stops dumb loops in a single session.
 * For production scale, replace with Upstash Redis rate limiting.
 */

const store = new Map<string, number[]>();

/** Periodically evict stale entries so the Map doesn't grow forever. */
function evict(windowMs: number) {
  if (store.size < 500) return;
  const cutoff = Date.now() - windowMs;
  for (const [key, timestamps] of store.entries()) {
    if (timestamps.every((t) => t < cutoff)) {
      store.delete(key);
    }
  }
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; remaining: number; resetMs: number } {
  const now = Date.now();
  const cutoff = now - windowMs;

  const prev = store.get(key) ?? [];
  const recent = prev.filter((t) => t > cutoff);

  if (recent.length >= limit) {
    const oldest = recent[0]!;
    return { allowed: false, remaining: 0, resetMs: oldest + windowMs - now };
  }

  recent.push(now);
  store.set(key, recent);
  evict(windowMs);

  return { allowed: true, remaining: limit - recent.length, resetMs: windowMs };
}
