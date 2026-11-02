// Evidence-backed extraction of bank figures from the text of an official report. The local model may SUGGEST values, but a value is accepted only
// if its quoted sentence is found verbatim in the document text and that sentence contains the number. Nothing is inferred: no match = missing.

export type Extracted = { parameter: string; value: number; unit: string; quote: string; offset: number };

const num = (s: string) => Number(s.replace(/,/g, "").replace(/\s/g, ""));

type Rule = { parameter: string; unit: string; re: RegExp; scale?: number };
// Each rule needs the label and a number in the same sentence. Decimal commas (German) and points are both read.
const N = "(\\d{1,3}(?:[.,]\\d+)?)";
export const BANK_RULES: Rule[] = [
  { parameter: "cet1Pct", unit: "%", re: new RegExp(`(?:CET\\s?1|common equity tier 1)[^.;\\n]{0,60}?${N}\\s?(?:%|per ?cent)`, "i") },
  // NPE (exposures) and NPL (loans) are different published metrics: one is never relabelled as the other.
  { parameter: "npePct", unit: "%", re: new RegExp(`(?:non-?performing exposures?|\\bNPE\\b)[^.;\\n]{0,60}?${N}\\s?(?:%|per ?cent)`, "i") },
  { parameter: "nplPct", unit: "%", re: new RegExp(`(?:non-?performing loans?|\\bNPL\\b)[^.;\\n]{0,60}?${N}\\s?(?:%|per ?cent)`, "i") },
  { parameter: "roePct", unit: "%", re: new RegExp(`(?:return on equity|\\bRoE\\b)[^.;\\n]{0,60}?${N}\\s?(?:%|per ?cent)`, "i") },
  { parameter: "costIncomePct", unit: "%", re: new RegExp(`cost[/ -]?(?:to[- ])?income ratio[^.;\\n]{0,60}?${N}\\s?(?:%|per ?cent)`, "i") },
  { parameter: "totalCapitalPct", unit: "%", re: new RegExp(`total capital ratio[^.;\\n]{0,60}?${N}\\s?(?:%|per ?cent)`, "i") },
  { parameter: "pretaxProfitEurM", unit: "EUR m", re: new RegExp(`(?:pre-?tax (?:profit|result)|profit before tax)[^.;\\n]{0,60}?(?:EUR|€)\\s?${N}\\s?(?:m\\b|million)`, "i") },
];

/** The sentence around a match, as written in the document. Sentences end at ". " before a capital letter, or a line break (decimal points do not end one). */
function sentenceAround(text: string, start: number, end: number): { quote: string; offset: number } {
  const bounds = [0];
  for (const m of text.matchAll(/(?<=[.!?])\s+(?=[A-Z€(])|\n+/g)) bounds.push(m.index! + m[0].length);
  bounds.push(text.length);
  let i = 0;
  while (i + 1 < bounds.length - 1 && bounds[i + 1] <= start) i++;
  let j = i;
  while (j + 1 < bounds.length - 1 && bounds[j + 1] < end) j++;
  const a = bounds[i], z = bounds[j + 1];
  return { quote: text.slice(a, z).replace(/\s+/g, " ").trim(), offset: a };
}

export function extractBankFigures(text: string): { found: Extracted[]; missing: string[] } {
  const found: Extracted[] = [];
  for (const r of BANK_RULES) {
    const m = r.re.exec(text);
    if (!m) continue;
    const { quote, offset } = sentenceAround(text, m.index, m.index + m[0].length);
    found.push({ parameter: r.parameter, value: num(m[1].replace(",", ".")), unit: r.unit, quote, offset });
  }
  const have = new Set(found.map((f) => f.parameter));
  return { found, missing: BANK_RULES.map((r) => r.parameter).filter((p) => !have.has(p)) };
}

/** True only if the claimed quote is in the document text (whitespace-insensitive) and contains the claimed number. Used for values the model proposes. */
export function quoteSupports(text: string, quote: string, value: number): boolean {
  const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
  if (!quote || !norm(text).includes(norm(quote))) return false;
  const forms = new Set([String(value), value.toFixed(1), value.toFixed(1).replace(".", ","), String(value).replace(".", ",")]);
  return [...forms].some((f) => new RegExp(`(^|[^\\d.,])${f.replace(".", "\\.")}(?![\\d])`).test(quote));
}
