import { type NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

const ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/svg+xml",
];

// Max image size we'll proxy: 8 MB
const MAX_BYTES = 8 * 1024 * 1024;

export async function GET(request: NextRequest) {
  // Rate limit: 60 image requests per minute per IP.
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const { allowed } = checkRateLimit(`image-proxy:${ip}`, 60, 60_000);
  if (!allowed) {
    return new NextResponse("Too many requests", { status: 429 });
  }

  const { searchParams } = request.nextUrl;
  const url = searchParams.get("url");

  if (!url) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  // Only proxy http/https URLs
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return new NextResponse("Invalid URL", { status: 400 });
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return new NextResponse("Only http/https URLs are allowed", { status: 400 });
  }

  // Block requests to private/internal IP ranges (SSRF protection).
  // Covers IPv4 private ranges, link-local (including AWS/GCP metadata endpoint),
  // loopback, and IPv6 equivalents.
  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, ""); // strip IPv6 brackets
  if (
    hostname === "localhost" ||
    hostname === "0.0.0.0" ||
    hostname === "::1" ||
    hostname.endsWith(".local") ||
    hostname.startsWith("127.") ||
    hostname.startsWith("10.") ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("172.16.") ||
    hostname.startsWith("172.17.") ||
    hostname.startsWith("172.18.") ||
    hostname.startsWith("172.19.") ||
    hostname.startsWith("172.20.") ||
    hostname.startsWith("172.21.") ||
    hostname.startsWith("172.22.") ||
    hostname.startsWith("172.23.") ||
    hostname.startsWith("172.24.") ||
    hostname.startsWith("172.25.") ||
    hostname.startsWith("172.26.") ||
    hostname.startsWith("172.27.") ||
    hostname.startsWith("172.28.") ||
    hostname.startsWith("172.29.") ||
    hostname.startsWith("172.30.") ||
    hostname.startsWith("172.31.") ||
    hostname.startsWith("169.254.") || // link-local — includes AWS/GCP metadata (169.254.169.254)
    hostname.startsWith("100.64.") ||  // carrier-grade NAT
    hostname.startsWith("fe80:") ||    // IPv6 link-local
    hostname.startsWith("fc") ||       // IPv6 unique local
    hostname.startsWith("fd")          // IPv6 unique local
  ) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const response = await fetch(url, {
      headers: {
        // Appear as a normal browser request — bypasses hotlink protection
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        // Send the recipe site as its own referer — satisfies same-domain referer checks
        Referer: `${parsed.protocol}//${parsed.hostname}/`,
      },
      // Don't follow too many redirects
      redirect: "follow",
    });

    if (!response.ok) {
      return new NextResponse(`Upstream error: ${response.status}`, {
        status: 502,
      });
    }

    const contentType = response.headers.get("content-type") ?? "";
    const baseType = contentType.split(";")[0]?.trim().toLowerCase() ?? "";

    if (!ALLOWED_CONTENT_TYPES.includes(baseType)) {
      return new NextResponse("Not an image", { status: 415 });
    }

    const buffer = await response.arrayBuffer();

    if (buffer.byteLength > MAX_BYTES) {
      return new NextResponse("Image too large", { status: 413 });
    }

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": baseType,
        // private: browser-only caching — CDN must NOT cache this route because
        // Netlify's edge ignores the `url` query param in its cache key, causing
        // different images to be served from the same cached response.
        "Cache-Control": "private, max-age=86400",
        "Content-Length": String(buffer.byteLength),
      },
    });
  } catch (err) {
    console.error("[image-proxy] fetch failed:", err);
    return new NextResponse("Failed to fetch image", { status: 502 });
  }
}
