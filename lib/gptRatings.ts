// Admin only (the owner, 24/10/2026): the ISINs of the list are copied into GPT with a prompt, and GPT's answer
// (a table of ISIN and rating) is pasted back; the ratings found are shown next to each bond. Never sent to customers.

export const GPT_PROMPT = "Analyze all these with $bonds and return table with ratings";

/** The ISINs, one per line; with the prompt on top when `prompt` is set. */
export function isinText(isins: (string | null | undefined)[], prompt = false): string {
  const list = isins.filter((s): s is string => !!s).join("\n");
  return prompt ? `${GPT_PROMPT}\n\n${list}` : list;
}

const ISIN = /\b([A-Z]{2}[A-Z0-9]{9}[0-9])\b/g;
// S&P / Fitch style (AA-, BBB+) or Moody's style (Baa1, Aa2), plus NR. Single letters only when a whole table cell.
const GRADE = /^(AAA|AA[+-]?|A[+-]?|BBB[+-]?|BB[+-]?|B[+-]?|CCC[+-]?|CC|C|D|SD|RD|Aaa|Aa[123]|A[123]|Baa[123]|Ba[123]|B[123]|Caa[123]|Ca|NR|WR)$/;
const GRADE_IN_TEXT = /(?:^|[\s(:/])(AAA|AA[+-]?|A[+-]|BBB[+-]?|BB[+-]?|B[+-]|CCC[+-]?|Aaa|Aa[123]|A[123]|Baa[123]|Ba[123]|B[123]|Caa[123])(?=$|[\s),;/|])/;

const clean = (s: string) => s.replace(/[*_`]/g, "").trim();

/**
 * ISIN -> rating from GPT's pasted answer: each line with an ISIN, the first table cell after it that is a grade
 * (a markdown or tab table), else the first clear grade written in the rest of the line. Lines without a grade are skipped.
 */
export function parseGptRatings(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const hits = [...line.matchAll(ISIN)];
    if (!hits.length) continue;
    const isin = hits[0][1];
    const rest = line.slice(hits[0].index! + isin.length);
    const cells = rest.split(/[|\t;,]/).map(clean).filter(Boolean);
    let grade = cells.find((c) => GRADE.test(c)) ?? null;
    if (!grade) {
      const m = clean(rest).match(GRADE_IN_TEXT);
      grade = m ? m[1] : null;
    }
    if (grade && !out[isin]) out[isin] = grade;
  }
  return out;
}
