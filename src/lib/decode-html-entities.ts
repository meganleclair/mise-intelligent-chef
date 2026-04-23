/**
 * Decodes numeric, hex, and common named HTML entities so imported recipe text
 * (e.g. &#8217; → ’) displays correctly instead of showing raw codes.
 */
const NAMED: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: "\u00a0",
  rsquo: "\u2019",
  lsquo: "\u2018",
  rdquo: "\u201d",
  ldquo: "\u201c",
  ndash: "\u2013",
  mdash: "\u2014",
  hellip: "\u2026",
  pound: "\u00a3",
  copy: "\u00a9",
  reg: "\u00ae",
  trade: "\u2122",
};

function decodeOnce(text: string): string {
  let t = text.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
    String.fromCharCode(Number.parseInt(hex, 16)),
  );
  t = t.replace(/&#(\d{1,7});/g, (_, dec) =>
    String.fromCharCode(Number.parseInt(dec, 10)),
  );
  t = t.replace(
    /&([a-zA-Z][a-zA-Z0-9]+);/g,
    (full, name: string) => NAMED[name.toLowerCase()] ?? full,
  );
  return t;
}

export function decodeHtmlEntities(text: string): string {
  if (!text) return text;
  let prev = "";
  let result = text;
  let guard = 0;
  while (result !== prev && guard < 8) {
    prev = result;
    result = decodeOnce(result);
    guard += 1;
  }
  return result;
}
