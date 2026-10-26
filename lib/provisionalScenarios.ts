// Admin only (the owner, 25/10/2026): provisional IR / BR / Risk Pay values for 10 bonds, from a GPT scenario run.
// Stored exactly as given (low-high ranges, text outcomes) in app.gpt_ratings. They are scenario calculations, not
// validated credit-risk estimates, and are NEVER used in any ranking or portfolio selection.

import { LINDE_PRICE_NOTE, SCENARIO_SOURCE } from "./scenarioText";
export { LINDE_PRICE_NOTE, SCENARIO_CAVEAT, SCENARIO_SOURCE } from "./scenarioText";

export type Scenario = {
  key: string;
  label: string;
  /** Issuer words the bond's issuer or name must contain. */
  match: RegExp;
  maturity: string; // YYYY-MM-DD
  isin?: string; // when the owner gave it
  ir: string;
  br: string;
  riskPay: string;
  /** Outcome labels and key figures, kept as text in the basis. */
  notes: string;
  /** The consolidated-comparison columns, as the owner wrote them (markers like ~ * † ‡ kept). */
  detail?: Detail;
};

/** Admin only: the recommendation label is never sent to customers. */
export type Detail = {
  coupon: string; maturity: string; agency: string; ytm: string; dur: string; spread: string; el: string; net: string;
  at1: string; t2: string; snp: string; cln: string; reco: string;
};

export const SCENARIOS: Scenario[] = [
  { key: "dometic", label: "Dometic Group AB 11 Sep 2030", match: /dometic/i, maturity: "2030-09-11", ir: "44–57", br: "42–56", riskPay: "1.1–3.8×", notes: "IR WEAK · BR HIGH RISK · Risk Pay LOW/MODERATE · net +34 to +231 bp, EL 83–280 bp · agency BB−/Ba3 to reconcile · check price" },
  { key: "eqt", label: "EQT AB 14 May 2031", match: /\beqt\b/i, maturity: "2031-05-14", isin: "XS2338570331", ir: "78–87", br: "77–86", riskPay: "5.0–23.2×", notes: "IR GOOD · BR GOOD · Risk Pay PROMISING · net +93 to +111 bp, EL 5–23 bp · agency A− to reconcile" },
  { key: "linde", label: "Linde Finance 21 Oct 2030", match: /linde/i, maturity: "2030-10-21", isin: "XS1309526405", ir: "86–94", br: "84–93", riskPay: "11.5–57.5×", notes: `IR STRONG · BR STRONG · Risk Pay HIGH SCENARIO VALUE · net +105 to +113 bp, EL 2–10 bp · guarantee to verify · ${LINDE_PRICE_NOTE}` },
  { key: "unibail", label: "Unibail-Rodamco 15 Apr 2030", match: /unibail/i, maturity: "2030-04-15", ir: "70–82", br: "68–81", riskPay: "2.1–9.3×", notes: "IR MODERATE · BR CONSIDER · Risk Pay MODERATE · net +59 to +99 bp, EL 12–52 bp · agency BBB+/Baa1 to reconcile" },
  { key: "dz", label: "DZ BANK credit-linked note 9 Jul 2031", match: /dz\s*bank/i, maturity: "2031-07-09", ir: "84–92", br: "0–84", riskPay: "Not quantifiable", notes: "IR STRONG (issuer only) · BR UNRESOLVED (reference credit not established) · Risk Pay BLOCKED (EL unknown) · DO NOT RANK YET · the issuer risk grade is not a proxy for the reference exposure" },
  { key: "helaba", label: "Helaba 2 Sep 2031", match: /helaba|landesbank hessen/i, maturity: "2031-09-02", ir: "76–86", br: "75–87", riskPay: "3.1–20.0×", notes: "IR GOOD · BR CONDITIONAL (step-rate and call provisions) · Risk Pay CONDITIONAL · net +68 to +95 bp, EL 5–32 bp · yield not validated as yield-to-worst" },
  { key: "bcge", label: "Banque Cantonale de Genève 7 Jul 2031", match: /cantonale de gen|bcge/i, maturity: "2031-07-07", ir: "78–89", br: "76–88", riskPay: "4.6–32.3×", notes: "IR GOOD · BR GOOD · Risk Pay PROMISING · net +76 to +94 bp, EL 3–21 bp · no unconditional cantonal guarantee" },
  { key: "deka", label: "DekaBank 10 May 2030", match: /deka/i, maturity: "2030-05-10", ir: "80–90", br: "80–90", riskPay: "5.6–30.0×", notes: "IR STRONG · BR STRONG · Risk Pay PROMISING · net +74 to +87 bp, EL 3–16 bp" },
  { key: "bosch", label: "Robert Bosch 2 Jun 2030", match: /bosch/i, maturity: "2030-06-02", ir: "76–87", br: "75–87", riskPay: "3.2–13.8×", notes: "IR GOOD · BR GOOD · Risk Pay MODERATE · net +57 to +77 bp, EL 6–26 bp · agency A to reconcile" },
  { key: "latvia", label: "Republic of Latvia 17 Mar 2031 (zero coupon)", match: /latvia/i, maturity: "2031-03-17", ir: "69–82", br: "69–82", riskPay: "1.7–12.2×", notes: "IR MODERATE · BR MODERATE · Risk Pay MODERATE · net +31 to +67 bp, EL 6–42 bp · agency A/A3/A− to reconcile" },
];

const NO = { at1: "NO", t2: "NO", snp: "NO", cln: "NO" };
const NA = { at1: "–", t2: "–", snp: "–", cln: "–" };

/** Batch 1 (first 10): figures from the scorecards; coupon and instrument flags were not in that table. */
const BATCH1: Record<string, Detail> = {
  dometic: { coupon: "–", maturity: "11 Sep 2030", agency: "BB−/Ba3", ytm: "6.29%", dur: "3.4", spread: "314", el: "83–280", net: "34–231", ...NA, reco: "HIGH RISK" },
  eqt: { coupon: "–", maturity: "14 May 2031", agency: "A−", ytm: "4.34%", dur: "4.3", spread: "116", el: "5–23", net: "93–111", ...NA, reco: "CONSIDER" },
  linde: { coupon: "–", maturity: "21 Oct 2030", agency: "A/A2", ytm: "4.30%", dur: "3.7", spread: "115", el: "2–10", net: "105–113", ...NA, reco: "STRONG CREDIT" },
  unibail: { coupon: "–", maturity: "15 Apr 2030", agency: "BBB+/Baa1", ytm: "4.27%", dur: "3.2", spread: "111", el: "12–52", net: "59–99", ...NA, reco: "CONSIDER" },
  dz: { coupon: "–", maturity: "9 Jul 2031", agency: "A+/Aa2", ytm: "4.20% conditional", dur: "4.2", spread: "101", el: "unknown", net: "unknown", at1: "NO", t2: "NO", snp: "NO", cln: "YES", reco: "DO NOT RANK YET" },
  helaba: { coupon: "–", maturity: "2 Sep 2031", agency: "AA−/Aa2", ytm: "4.19%", dur: "4.4", spread: "100", el: "5–32", net: "68–95", ...NA, reco: "CHECK CALL TERMS" },
  bcge: { coupon: "–", maturity: "7 Jul 2031", agency: "AA−", ytm: "4.16%", dur: "4.2", spread: "97", el: "3–21", net: "76–94", ...NA, reco: "CONSIDER" },
  deka: { coupon: "–", maturity: "10 May 2030", agency: "A+/Aa1", ytm: "4.06%", dur: "3.2", spread: "90", el: "3–16", net: "74–87", ...NA, reco: "CONSIDER" },
  bosch: { coupon: "–", maturity: "2 Jun 2030", agency: "A", ytm: "3.99%", dur: "3.3", spread: "83", el: "6–26", net: "57–77", ...NA, reco: "CONSIDER" },
  latvia: { coupon: "0% (zero)", maturity: "17 Mar 2031", agency: "A/A3/A−", ytm: "3.92%", dur: "4.2", spread: "73", el: "6–42", net: "31–67", ...NA, reco: "CONSIDER" },
};
for (const sc of SCENARIOS) sc.detail = BATCH1[sc.key];

const b2 = (key: string, label: string, isin: string, maturity: string, ir: string, br: string, riskPay: string, detail: Omit<Detail, "at1" | "t2" | "snp" | "cln"> & Partial<Detail>): Scenario => ({
  key, label, match: /./, maturity, isin, ir, br, riskPay, notes: `Consolidated comparison · ${detail.reco}`, detail: { ...NO, ...detail },
});

/** Batch 2 (second 10, "Consolidated comparison"): matched by ISIN and exact maturity. */
export const BATCH2: Scenario[] = [
  b2("pln", "PLN XS2073758885", "XS2073758885", "2031-11-05", "67–80", "66–80", "4.6–17.4×", { coupon: "1.875%", maturity: "05 Nov 2031", agency: "BBB/Baa2", ytm: "5.29%", dur: "4.5", spread: "209", el: "12–45", net: "164–197", reco: "CONSIDER" }),
  b2("grenke", "Grenke XS3485481157", "XS3485481157", "2031-10-07", "63–76", "62–76", "3.4–10.3×", { coupon: "4.625%", maturity: "07 Oct 2031", agency: "BBB", ytm: "~5.00%*", dur: "~4.2", spread: "~185", el: "18–55", net: "130–167", reco: "SELECTIVE" }),
  b2("lumo", "Lumo XS3022388980", "XS3022388980", "2032-03-12", "68–81", "67–80", "4.5–13.4×", { coupon: "3.875%", maturity: "12 Mar 2032", agency: "Baa2", ytm: "5.16%", dur: "4.0", spread: "~201", el: "15–45", net: "156–186", reco: "CONSIDER" }),
  b2("unicredit", "UniCredit ELN IT0005636797", "IT0005636797", "2031-03-26", "80–91", "69–85", "N/A", { coupon: "3.8% conditional", maturity: "26 Mar 2031", agency: "A−/A3", ytm: "5.29% conditional", dur: "1.23†", spread: "N/A", el: "N/A", net: "N/A", reco: "EXCLUDE" }),
  b2("teleperformance", "Teleperformance FR001400M2G2", "FR001400M2G2", "2031-11-22", "57–73", "54–72", "2.7–8.2×", { coupon: "5.75%", maturity: "22 Nov 2031", agency: "BBB‡", ytm: "5.19%*", dur: "4.1", spread: "~204", el: "25–75", net: "129–179", reco: "CAUTION" }),
  b2("balder", "Balder Finland XS2432565187", "XS2432565187", "2031-01-18", "58–73", "57–73", "1.3–4.4×", { coupon: "2.00%", maturity: "18 Jan 2031", agency: "BBB parent", ytm: "4.02%*", dur: "—", spread: "~87", el: "20–65", net: "22–67", reco: "CAUTION" }),
  b2("globalpayments", "Global Payments XS2597994065", "XS2597994065", "2031-03-17", "66–79", "65–78", "3.6–12.0×", { coupon: "4.875%", maturity: "17 Mar 2031", agency: "BBB−", ytm: "4.62%*", dur: "~3.8", spread: "~144", el: "12–40", net: "104–132", reco: "SELECTIVE" }),
  b2("snf", "SNF Group XS3021201887", "XS3021201887", "2032-03-15", "72–85", "70–83", "3.4–10.0×", { coupon: "4.50%", maturity: "15 Mar 2032", agency: "BBB−", ytm: "4.35%*", dur: "~3.3", spread: "~120", el: "12–35", net: "85–108", reco: "CONSIDER" }),
  b2("fiserv", "Fiserv XS2626288257", "XS2626288257", "2031-05-24", "61–76", "60–74", "3.1–10.3×", { coupon: "4.50%", maturity: "24 May 2031", agency: "BBB/Baa2", ytm: "~4.70%*", dur: "—", spread: "~155", el: "15–50", net: "105–140", reco: "CAUTION" }),
  b2("mileway", "Mileway XS3439307045", "XS3439307045", "2030-07-15", "68–81", "67–80", "3.3–10.9×", { coupon: "3.875%", maturity: "15 Jul 2030", agency: "Baa2", ytm: "4.71%", dur: "3.42", spread: "~164", el: "15–50", net: "114–149", reco: "CONSIDER" }),
];
export const ALL_SCENARIOS: Scenario[] = [...SCENARIOS, ...BATCH2];

export type Candidate = { isin: string; name: string | null; issuer: string | null; currency: string | null; maturity: string; why?: string | null };
export type MatchResult = {
  scenario: Scenario;
  /** The ISIN to store under (the one given, or the unique match); null when there is none. */
  isin: string | null;
  /** "copy" = found in the bond copy; "not-in-copy" = stored under the ISIN given, but the copy has no such bond. */
  where: "copy" | "not-in-copy" | null;
  problem: "none" | "ambiguous" | null;
  /** Why the site does not show the bond (found in the copy but filtered out), or a differing maturity; null when nothing to say. */
  note: string | null;
  candidates: Candidate[];
};

const DAY = 86400000;
const near = (a: string, b: string, days: number) => Math.abs(Date.parse(a) - Date.parse(b)) <= days * DAY;

/**
 * One ISIN per scenario, over the WHOLE bond copy. An ISIN given by the owner is looked up exactly (trimmed, upper case);
 * if the copy has no such bond the values are still stored under that ISIN and marked "not-in-copy". Without an ISIN:
 * issuer words + maturity within 4 days (EUR), and never a guess: none or several is reported.
 */
export function matchScenarios(cands: Candidate[], list: Scenario[] = ALL_SCENARIOS): MatchResult[] {
  return list.map((s) => {
    if (s.isin) {
      const c = cands.find((x) => x.isin.trim().toUpperCase() === s.isin);
      if (!c) return { scenario: s, isin: s.isin, where: "not-in-copy", problem: null, note: "not in the bond copy", candidates: [] };
      const notes = [c.maturity && c.maturity !== s.maturity ? `copy maturity ${c.maturity}` : null, c.why ? `not shown on the site: ${c.why}` : null].filter(Boolean);
      return { scenario: s, isin: s.isin, where: "copy", problem: null, note: notes.length ? notes.join("; ") : null, candidates: [c] };
    }
    const hits = cands.filter((c) => near(c.maturity, s.maturity, 4) && (c.currency ?? "EUR") === "EUR" && s.match.test(`${c.issuer ?? ""} ${c.name ?? ""}`));
    const exact = hits.filter((c) => c.maturity === s.maturity);
    const pick = exact.length === 1 ? exact : hits;
    if (pick.length !== 1) return { scenario: s, isin: null, where: null, problem: pick.length ? "ambiguous" : "none", note: null, candidates: pick };
    const c = pick[0];
    const notes = [c.maturity !== s.maturity ? `copy maturity ${c.maturity}` : null, c.why ? `not shown on the site: ${c.why}` : null].filter(Boolean);
    return { scenario: s, isin: c.isin, where: "copy", problem: null, note: notes.length ? notes.join("; ") : null, candidates: pick };
  });
}

/** The row saved in app.gpt_ratings for one scenario. */
export function scenarioRow(s: Scenario) {
  return { rating: s.br, issuerRating: s.ir, riskPay: s.riskPay, basis: `${SCENARIO_SOURCE} · ${s.notes}`, detail: s.detail ? JSON.stringify(s.detail) : null };
}
