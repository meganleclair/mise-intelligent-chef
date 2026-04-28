/** Fix legacy summaries truncated mid-word at import + strip dangling engagement fragments. */
export function tidyRecipeSummaryForDisplay(raw: string): string {
  let s = raw.trim();
  s = s.replace(/\s+\d+\s*perso\w*$/i, "");
  s = s.replace(/\s*[\d,]+\s+likes?\.?$/i, "");
  return s.trim();
}
