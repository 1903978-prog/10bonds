import type { PublicBond } from "./types";
import { issuerClass } from "./seo/classify";

// Cumulative default chances of national governments (foreign-currency sovereign debt), in %, by letter rating band and
// years since issue. Supplied by the owner 27/10/2026 (S&P Global Ratings, 1975-2025, Table 16); the source stays internal:
// on the site it is only ever "based on public historical default studies". Used for bonds whose issuer is a government
// by name (lib/seo/classify.ts issuerClass); agencies, supranationals and regions keep the corporate table.
export const SOVEREIGN_YEARS = [1, 2, 3, 4, 5, 7, 10, 15] as const;
export const SOVEREIGN_RATES: [band: string, pct: number[]][] = [
  ["AAA", [0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00]],
  ["AA", [0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00]],
  ["A", [0.00, 0.00, 0.20, 0.62, 1.05, 1.96, 3.50, 6.29]],
  ["BBB", [0.16, 0.67, 1.38, 1.94, 2.32, 3.17, 4.65, 8.34]],
  ["BB", [0.33, 1.19, 1.72, 2.28, 3.61, 6.43, 9.75, 12.25]],
  ["B", [2.54, 6.25, 9.99, 13.49, 16.74, 22.45, 29.68, 40.12]],
  ["CCC / CC", [29.41, 37.40, 42.10, 43.91, 46.06, 57.21, 57.21, 61.49]],
];
// Totals from the same study (not used for pricing; a notch always has its own band): investment grade and speculative grade.
export const SOVEREIGN_TOTALS: [band: string, pct: number[]][] = [
  ["All investment grade", [0.04, 0.18, 0.40, 0.64, 0.84, 1.25, 1.94, 3.33]],
  ["All speculative grade", [3.19, 5.95, 8.39, 10.56, 12.92, 17.48, 22.64, 29.03]],
];

// Notch (AAA = 0) -> table row: AAA; AA+..AA-; A+..A-; BBB+..BBB-; BB+..BB-; B+..B-; CCC+ and below.
const ROW_OF_NOTCH = [0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5];

/** The sovereign table row for a notch (anything from CCC+ down is the last row). */
export function sovereignRow(notch: number): number[] {
  const n = Math.max(0, Math.round(notch));
  return SOVEREIGN_RATES[n < ROW_OF_NOTCH.length ? ROW_OF_NOTCH[n] : SOVEREIGN_RATES.length - 1][1];
}

/** Cumulative default chance in % for a sovereign notch, linear between the published years like the corporate table. */
export function sovereignCumulative(notch: number, years: number): number {
  const row = sovereignRow(notch);
  const ys = SOVEREIGN_YEARS as readonly number[];
  if (years <= ys[0]) return row[0];
  for (let i = 1; i < ys.length; i++) {
    if (years <= ys[i]) return row[i - 1] + ((row[i] - row[i - 1]) * (years - ys[i - 1])) / (ys[i] - ys[i - 1]);
  }
  return (row[row.length - 1] * years) / ys[ys.length - 1];
}

// A government is recognised by name for EVERY country: the issuer name, with words like "Republic of", "Kingdom of", "Federative",
// "Government" taken off, must be exactly a country's name ("Federative Republic of Brazil", "Republic of Poland", "Mexico").
// Agencies, supranationals, regions, cities and companies never reduce to a bare country name, so they stay on the corporate table.
// Territories that are not sovereign states (Hong Kong, Puerto Rico, ...) are left out on purpose.
const NOT_STATES = new Set(["HK", "MO", "PR", "GU", "VI", "AS", "MP", "AI", "AW", "BM", "KY", "CW", "SX", "FO", "GL", "GI", "GG", "JE", "IM", "NC", "PF", "TW", "XK", "AX", "BL", "BQ", "CC", "CK", "CX", "EH", "FK", "GF", "GP", "HM", "IO", "MF", "MQ", "MS", "NF", "NU", "PM", "PN", "RE", "SH", "SJ", "TC", "TF", "TK", "UM", "VG", "WF", "YT", "AQ", "BV", "GS", "PS", "EU", "UN", "EZ", "QO", "ZZ"]);
const FILLER = /\b(the|republic|kingdom|federal|federative|state|states|of|and|government|govt|sultanate|emirate|emirates|grand|duchy|commonwealth|peoples|democratic|socialist|sovereign|hashemite|oriental|bolivarian|arab|islamic|plurinational|principality|union|sovereign|international|bonds?|notes?|treasury|global|intl)\b/g;
const squash = (x: string) => x.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/'/g, "").replace(/[^a-z0-9]+/g, " ").replace(FILLER, " ").replace(/\s+/g, " ").trim();
const ALIASES = ["turkey", "korea", "russia", "uae", "ivory coast", "cote divoire", "czech", "slovak", "hellenic", "greece", "united mexican", "united states america", "usa", "uk", "great britain", "vietnam", "viet nam", "brunei", "laos", "burma", "swaziland", "macedonia", "holy see", "cabo verde", "cape verde", "congo", "east timor", "timor leste", "bahamas", "gambia"];
const COUNTRIES: Set<string> = (() => {
  const set = new Set<string>(ALIASES.map(squash).filter(Boolean));
  const names = new Intl.DisplayNames(["en"], { type: "region" });
  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (const a of A) for (const b of A) {
    const code = a + b;
    if (NOT_STATES.has(code)) continue;
    let n: string | undefined;
    try { n = names.of(code); } catch { continue; }
    if (!n || n === code) continue;
    set.add(squash(n.replace(/\(.*?\)/g, " ").replace(/ - /g, " ")));
    set.add(squash(n)); // e.g. "Congo - Kinshasa", "Myanmar (Burma)"
    if (n.includes("(")) set.add(squash(n.replace(/\)/g, "").split("(").pop() ?? ""));
  }
  set.delete("");
  return set;
})();
// "Georgia" the country versus the US state: a US state bond reads "State of Georgia" or "Georgia (State of)".
const AMBIGUOUS_STATE = /^(state of (georgia)|georgia \(state of\))/i;

/** True when the issuer name is a national government of any country. */
export function isGovernmentName(issuer: string | null | undefined): boolean {
  const raw = (issuer ?? "").trim();
  if (!raw || AMBIGUOUS_STATE.test(raw)) return false;
  const k = squash(raw);
  if (!k) return false;
  if (COUNTRIES.has(k)) return true;
  return /^[a-z]{2} sovereign$/i.test(raw.trim()) ? COUNTRIES.size > 0 : false;
}

const cache = new Map<string, boolean>();
/** True when the issuer is a national government by name (not an agency, supranational, region or company). */
export function isSovereignBond(b: Pick<PublicBond, "issuer" | "isin" | "country">): boolean {
  const key = `${b.issuer ?? ""}|${b.country ?? ""}`;
  let hit = cache.get(key);
  if (hit === undefined) {
    hit = issuerClass(b) === "sovereign" || isGovernmentName(b.issuer);
    cache.set(key, hit);
  }
  return hit;
}
