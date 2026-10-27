// The content-safety gate for the redesigned weekly e-mail. It decides which version may be built from the rights
// register (rights.ts) and the open legal facts, strips any field that is not GREEN, and scans the finished text for
// known-bad patterns. Passing means "no known-bad pattern found and every field has a recorded right", never "legally
// compliant". This module never sends anything.
import { FIELD_RIGHTS, NEWSLETTER_FACTS, RIGHTS, type FieldId } from "./rights";

export type Version = "A" | "B" | "C";

export type BondInput = {
  isin: string;
  issuer: string;
  currency: string;
  coupon: number | null;
  maturity: string | null; // YYYY-MM-DD
  issueDate: string | null;
  /** Where the terms were checked: the issuer's prospectus or an official register. Null = only the vendor copy. */
  primary: { url: string; label: string; retrievedAt: string } | null;
  provenance: "primary" | "vendor-copy" | "sample";
  /** Version A only: gross return per year from the vendor copy. */
  returnPerYear?: number | null;
};

export type GateOptions = {
  /** Layout previews only: treat these fields (and facts) as cleared. The result is then never sendable. */
  assumeGreen?: FieldId[];
  assumeFacts?: boolean;
  facts?: typeof NEWSLETTER_FACTS;
};

export const B_FIELDS: FieldId[] = ["bond_isin", "bond_issuer", "bond_currency", "bond_coupon", "bond_maturity"];
export const A_FIELDS: FieldId[] = [...B_FIELDS, "bond_ytm"];
export const MIN_BONDS = 5;
export const MAX_BONDS = 10;

export function greenSet(o: GateOptions = {}): Set<FieldId> {
  const s = new Set(FIELD_RIGHTS.filter((f) => f.cls === "GREEN").map((f) => f.id));
  for (const id of o.assumeGreen ?? []) s.add(id);
  return s;
}

const missing = (need: FieldId[], g: Set<FieldId>) => need.filter((id) => !g.has(id));

/** ISO 6166 check digit (letters count as two digits, then Luhn). */
export function isValidIsin(isin: string): boolean {
  if (!/^[A-Z]{2}[A-Z0-9]{9}\d$/.test(isin)) return false;
  const digits = [...isin].map((c) => (/\d/.test(c) ? c : String(c.charCodeAt(0) - 55))).join("");
  let sum = 0, dbl = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number(digits[i]);
    if (dbl) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

/** A bond may be listed only with a primary source and no sample data (unless the whole issue is a preview). */
export function eligibleBonds(bonds: BondInput[], preview: boolean): BondInput[] {
  return bonds
    .filter((b) => isValidIsin(b.isin) && b.issuer.trim() && b.currency && b.maturity && b.coupon !== null)
    .filter((b) => preview || (b.provenance === "primary" && b.primary && b.primary.url.startsWith("https://")))
    .filter((b) => (preview ? true : b.provenance !== "sample"));
}

export type Decision = { version: Version | "none"; reasons: string[]; sendable: boolean; bonds: BondInput[] };

/** Picks the richest version the recorded rights support; missing rights downgrade, never get assumed. */
export function chooseVersion(input: { ecbOk: boolean; bonds: BondInput[] }, o: GateOptions = {}): Decision {
  const facts = o.assumeFacts ? { conflictsDisclosureApproved: true, counselClearedNamedSecurities: true, vendorConfirmedTerms: true, vendorConfirmedPriceDerived: true } : (o.facts ?? NEWSLETTER_FACTS);
  const g = greenSet(o);
  const preview = !!(o.assumeGreen?.length || o.assumeFacts);
  const reasons: string[] = [];
  if (!input.ecbOk) return { version: "none", reasons: ["ECB data failed the freshness check: nothing is built (a thin e-mail is worse than none)."], sendable: false, bonds: [] };

  const bonds = eligibleBonds(input.bonds, preview);
  const namedOk = facts.conflictsDisclosureApproved && facts.counselClearedNamedSecurities;
  if (!namedOk) reasons.push("Named securities blocked: conflicts-of-interest disclosure and counsel clearance are not both confirmed.");
  if (bonds.length < MIN_BONDS) reasons.push(`Fewer than ${MIN_BONDS} bonds with a primary source (${bonds.length}).`);

  const bMissing = missing(B_FIELDS, g);
  const aMissing = missing(A_FIELDS, g);
  if (bMissing.length) reasons.push(`Bond fields without a verified right: ${bMissing.join(", ")}.`);
  if (aMissing.includes("bond_ytm")) reasons.push("Return per year (derived from the vendor price) has no verified right.");

  const bondsOk = namedOk && bonds.length >= MIN_BONDS && !bMissing.length;
  if (bondsOk && !aMissing.length && facts.vendorConfirmedPriceDerived === true) return { version: "A", reasons, sendable: !preview, bonds: bonds.slice(0, MAX_BONDS) };
  if (bondsOk) return { version: "B", reasons, sendable: !preview, bonds: bonds.slice(0, MAX_BONDS) };
  reasons.push("Falling back to Version C: verified public information only.");
  return { version: "C", reasons, sendable: !preview, bonds: [] };
}

export type Violation = { rule: string; sample: string };

const RULES: { rule: string; re: RegExp }[] = [
  { rule: "customer wording: no YTM", re: /\bYTM\b|yield to maturity/i },
  { rule: "no agency or data-provider names", re: /S&P|S&amp;P|Standard (?:&|and) Poor|Moody|Fitch|Morningstar|Bloomberg|Refinitiv|\bLSEG\b|Euronext|Livio/i },
  { rule: "no recommendation or promotional wording", re: /\bbest bonds?\b|\bno fees?\b|\btop[ -]?\d+\b|\bwe recommend\b|\byou should\b|\bbuy\b|\bsell\b|\boutperform|\bsafe(?:st)?\b|\bguaranteed (?:return|yield|income)/i },
  { rule: "no unfilled placeholders", re: /\{\{|\bundefined\b|\bNaN\b|\[object/ },
  { rule: "no 'Pareto-efficient' or 'optimized' wording", re: /Pareto-efficient|\boptimi[sz]ed\b|Build my portfolio/i },
];
const ISIN = /\b[A-Z]{2}[A-Z0-9]{9}\d\b/;
const PRICE_WORDS = /\b(price|yield|return|spread|expected|fair value|rating|risk score)\b/i;

/** Scans a finished e-mail. `figures` are the numbers the renderer produced from sourced data; any other % or bp number is a violation. */
export function scanOutput(m: { subject: string; html: string; text: string }, version: Version, figures: string[]): Violation[] {
  const out: Violation[] = [];
  const all = `${m.subject}\n${m.text}`;
  for (const r of RULES) {
    const hit = all.match(r.re);
    if (hit) out.push({ rule: r.rule, sample: hit[0] });
  }
  if (version === "C" && ISIN.test(all)) out.push({ rule: "Version C names no securities", sample: all.match(ISIN)![0] });
  if (version === "B") {
    const sec = m.html.match(/<!--bonds-->([\s\S]*?)<!--\/bonds-->/)?.[1] ?? "";
    const plain = sec.replace(/<[^>]+>/g, " ");
    const p = plain.match(PRICE_WORDS);
    if (p) out.push({ rule: "Version B shows no price-dependent value", sample: p[0] });
  }
  const allowed = new Set(figures);
  for (const n of all.match(/-?\d+(?:\.\d+)?(?:%| bp)/g) ?? []) if (!allowed.has(n)) out.push({ rule: "figure without a source record", sample: n });
  return out;
}

export { RIGHTS };
