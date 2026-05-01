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

  // Block requests to private/internal IP ranges
  const hostname = parsed.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname.startsWith("127.") ||
    hostname.startsWith("10.") ||
    hostname.startsWith("192.168.") ||
    hostname === "0.0.0.0" ||
    hostname.endsWith(".local")
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
