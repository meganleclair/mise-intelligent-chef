import { describe, it, expect, beforeEach, vi } from "vitest";

// Rate limiter uses a module-level Map — re-import fresh each test via vi.resetModules()
describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("allows requests under the limit", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limit");
    const result = checkRateLimit("user:1", 5, 60_000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("blocks when limit is reached", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limit");
    for (let i = 0; i < 3; i++) checkRateLimit("user:2", 3, 60_000);
    const result = checkRateLimit("user:2", 3, 60_000);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("tracks separate keys independently", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limit");
    for (let i = 0; i < 3; i++) checkRateLimit("user:a", 3, 60_000);
    // user:a is exhausted, user:b should still be allowed
    expect(checkRateLimit("user:a", 3, 60_000).allowed).toBe(false);
    expect(checkRateLimit("user:b", 3, 60_000).allowed).toBe(true);
  });

  it("decrements remaining correctly", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limit");
    expect(checkRateLimit("user:3", 5, 60_000).remaining).toBe(4);
    expect(checkRateLimit("user:3", 5, 60_000).remaining).toBe(3);
    expect(checkRateLimit("user:3", 5, 60_000).remaining).toBe(2);
  });

  it("allows again after window expires", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limit");
    const shortWindow = 100; // 100ms window
    for (let i = 0; i < 2; i++) checkRateLimit("user:4", 2, shortWindow);
    expect(checkRateLimit("user:4", 2, shortWindow).allowed).toBe(false);

    // Wait for window to expire
    await new Promise((r) => setTimeout(r, 150));
    expect(checkRateLimit("user:4", 2, shortWindow).allowed).toBe(true);
  });

  it("returns a positive resetMs when blocked", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limit");
    for (let i = 0; i < 2; i++) checkRateLimit("user:5", 2, 60_000);
    const result = checkRateLimit("user:5", 2, 60_000);
    expect(result.allowed).toBe(false);
    expect(result.resetMs).toBeGreaterThan(0);
  });
});
