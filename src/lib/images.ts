/**
 * Ensure recipe image URLs load in the browser (protocol-relative, https).
 */
export function normalizeImageUrl(
  url: string | null | undefined,
): string | null {
  if (url == null || typeof url !== "string") return null;
  const t = url.trim();
  if (!t) return null;
  if (t.startsWith("data:")) return t;
  if (t.startsWith("//")) return `https:${t}`;
  if (t.startsWith("http://") || t.startsWith("https://")) return t;
  return `https://${t}`;
}
