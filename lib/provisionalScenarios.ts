// Admin only (the owner, 25/10/2026): provisional IR / BR / Risk Pay values for 10 bonds, from a GPT scenario run.
// Stored exactly as given (low-high ranges, text outcomes) in app.gpt_ratings. They are scenario calculations, not
// validated credit-risk estimates, and are NEVER used in any ranking or portfolio selection.

export const SCENARIO_SOURCE = "Provisional GPT scenario, not validated · 25 Oct 2026";
export const SCENARIO_CAVEAT = "Scenario calculation, not a validated credit-risk estimate. The 10bonds risk grade must not be read as an agency rating.";
export const LINDE_PRICE_NOTE = "The Linde price from the Deutsche Börse file may be wrong (see thread \"Find root cause of wrong bond prices\").";

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

export type Candidate = { isin: string; name: string | null; issuer: string | null; currency: string | null; maturity: string };
export type MatchResult = { scenario: Scenario; isin: string | null; problem: "none" | "ambiguous" | null; candidates: Candidate[] };

/** One unique ISIN per scenario (issuer words + exact maturity, EUR); never a guess: none or several is reported. */
export function matchScenarios(cands: Candidate[]): MatchResult[] {
  return SCENARIOS.map((s) => {
    const hits = cands.filter((c) => c.maturity === s.maturity && (c.currency ?? "EUR") === "EUR" && s.match.test(`${c.issuer ?? ""} ${c.name ?? ""}`));
    const given = s.isin ? hits.filter((c) => c.isin === s.isin) : [];
    const pick = given.length === 1 ? given : hits;
    return pick.length === 1 ? { scenario: s, isin: pick[0].isin, problem: null, candidates: pick } : { scenario: s, isin: null, problem: pick.length ? "ambiguous" : "none", candidates: pick };
  });
}

/** The row saved in app.gpt_ratings for one scenario. */
export function scenarioRow(s: Scenario) {
  return { rating: s.br, issuerRating: s.ir, riskPay: s.riskPay, basis: `${SCENARIO_SOURCE} · ${s.notes}` };
}
