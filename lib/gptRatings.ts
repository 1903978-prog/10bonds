// Admin only (the owner, 24/10/2026): the ISINs of the list are copied into GPT with a prompt, and GPT's answer
// (a table of ISIN, rating and basis) is pasted back, saved (app.gpt_ratings) and shown in the "GPT rate" column.
// Never sent to customers.

export const GPT_PROMPT = [
  "Analyze all these bonds with $bonds and give each one a credit rating.",
  "Reply with ONLY the table below, no other text before or after it, one row per ISIN, every ISIN listed once:",
  "ISIN | IR | BR | Basis",
  "IR = issuer rating, BR = rating of this specific bond (its seniority and structure).",
  "IR and BR: S&P-style scale only (AAA, AA+, AA, AA-, A+, A, A-, BBB+, BBB, BBB-, BB+, BB, BB-, B+, B, B-, CCC+, CCC, CCC-, CC, C, D), or NR if you cannot rate it.",
  "Basis: one short phrase (at most 10 words) on what the ratings rest on.",
  "Example row: XS0000000000 | BBB+ | BBB | Issuer BBB+, senior subordinated bond",
  "The ISINs:",
].join("\n");

/** The ISINs, one per line; with the prompt on top when `prompt` is set. */
export function isinText(isins: (string | null | undefined)[], prompt = false): string {
  const list = isins.filter((s): s is string => !!s).join("\n");
  return prompt ? `${GPT_PROMPT}\n${list}` : list;
}

/** `rating` is the bond rating (BR); `issuerRating` the issuer rating (IR). Old 3-column pastes (ISIN | Rating | Basis) fill BR only. */
export type GptRating = { rating: string | null; issuerRating?: string | null; riskPay?: string | null; basis: string | null };

const ISIN = /\b([A-Z]{2}[A-Z0-9]{9}[0-9])\b/g;
// S&P / Fitch style (AA-, BBB+) or Moody's style (Baa1, Aa2), plus NR. Single letters only when a whole table cell.
const GRADE = /^(AAA|AA[+-]?|A[+-]?|BBB[+-]?|BB[+-]?|B[+-]?|CCC[+-]?|CC|C|D|SD|RD|Aaa|Aa[123]|A[123]|Baa[123]|Ba[123]|B[123]|Caa[123]|Ca|NR|WR)$/;
const GRADE_IN_TEXT = /(?:^|[\s(:/])(AAA|AA[+-]?|A[+-]|BBB[+-]?|BB[+-]?|B[+-]|CCC[+-]?|Aaa|Aa[123]|A[123]|Baa[123]|Ba[123]|B[123]|Caa[123])(?=$|[\s),;/|])/;

const clean = (s: string) => s.replace(/[*_`"]/g, "").trim();

/**
 * ISIN -> issuer rating (IR), bond rating (BR) and basis from GPT's pasted answer. The prompt asks for "ISIN | IR | BR | Basis";
 * the older "ISIN | Rating | Basis" (one grade = BR) works too, as do markdown tables, tab or CSV rows and plain sentences:
 * the first cell after the ISIN that is a grade (a second grade right after it is the BR), else the first clear
 * grade in the rest of the line; the basis is the next cell. Lines without a grade (the header, the example) are skipped.
 */
export function parseGptRatings(text: string): Record<string, GptRating> {
  const out: Record<string, GptRating> = {};
  for (const line of text.split(/\r?\n/)) {
    const hits = [...line.matchAll(ISIN)];
    if (!hits.length) continue;
    const isin = hits[0][1];
    if (/^XS0{10}$/.test(isin)) continue;
    const rest = line.slice(hits[0].index! + isin.length);
    const cells = rest.split(/[|\t;]|,(?=\s*\S)/).map(clean).filter(Boolean);
    const at = cells.findIndex((c) => GRADE.test(c));
    let rating: string | null = at >= 0 ? cells[at] : null;
    let issuerRating: string | null = null;
    let next = at + 1;
    if (at >= 0 && GRADE.test(cells[at + 1] ?? "")) { issuerRating = cells[at]; rating = cells[at + 1]; next = at + 2; }
    let basis: string | null = at >= 0 && cells[next] ? cells.slice(next).join(", ") : null;
    if (!rating) {
      const m = clean(rest).match(GRADE_IN_TEXT);
      rating = m ? m[1] : null;
      basis = null;
    }
    if (rating && !out[isin]) out[isin] = { rating, issuerRating, basis: basis ? basis.slice(0, 200) : null };
  }
  return out;
}
