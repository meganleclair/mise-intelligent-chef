import { decodeHtmlEntities } from "@/lib/decode-html-entities";

/**
 * Break long imported step text into readable chunks for Cook Mode.
 * Splits on sentence boundaries first; for very long single blocks, tries semicolons.
 */
export function splitStepForDisplay(text: string): string[] {
  const raw = decodeHtmlEntities(text).trim();
  if (!raw) return [];

  const bySentence = raw
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (bySentence.length > 1) {
    return bySentence;
  }

  if (raw.length > 200 && raw.includes(";")) {
    const byClause = raw
      .split(/\s*;\s*/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (byClause.length > 1) {
      return byClause.map((c) => (c.endsWith(".") ? c : `${c}.`));
    }
  }

  return [raw];
}
