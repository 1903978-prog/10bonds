import type { PublicBond } from "./types";
import { bondRisk } from "./ratings";
import { couponTypeLabel, seniorityLabel } from "./bondFacts";
import { fmtMin } from "./fmtMin";
import type { FocusCompany } from "./companiesInFocus";

/**
 * The Bond Intelligence Report model. It only re-arranges what the nightly bond copy (PublicBond) and the curated
 * research (lib/companiesInFocus.ts) already hold: no new calculation, no invented value. Anything missing is a
 * `Fig` with status "not_verified". Customer-facing: no agency names or grades, no supplier names.
 */
export type Status = "verified" | "provisional" | "not_verified";
/** What kind of number it is, so history, forecasts, model output and assumptions are never mixed. */
export type Kind = "observed" | "model" | "assumption" | "forecast";

/** One material figure: value, unit (inside the text), date, source and verification status. */
export type Fig = { text: string; status: Status; kind?: Kind; asOf?: string; source?: string };

export const NOT_VERIFIED: Fig = { text: "Not verified", status: "not_verified" };
export const fig = (text: string | null | undefined, status: Status, extra: Partial<Fig> = {}): Fig =>
  text ? { text, status, ...extra } : NOT_VERIFIED;

export type Row = { label: string; fig: Fig };

export type Report = {
  isin: string;
  issuer: string;
  name: string;
  maturityYear: string | null;
  currency: string | null;
  seniority: string | null;
  couponType: string | null;
  country: string | null;
  /** Newest data date shown on the page and whether it is old enough to flag. */
  freshness: { label: string; stale: boolean };
  risk: number | null;
  /** Curated research present: scoring, view, financials. Without it the research parts show "Not verified". */
  researched: boolean;
  free: boolean;
  kpis: { score: Fig; ret: Fig; wht: Fig; maturity: Fig; maturityNote: string };
  netReturn: Fig;
  conclusion: {
    view: Fig;
    /** −10..+10, null if not rated. */
    outlook: number | null;
    outlookNote: string;
    summary: string | null;
    strengths: string[];
    risks: [string, string][];
    analyst: string | null;
    status: string;
  };
  scorecard: { label: string; note: string; score: number }[];
  scorecardNote: string;
  capital: [string, string, string][];
  financials: { header: string[]; rows: string[][]; note: string } | null;
  terms: Row[];
  tax: { text: string | null; rows: Row[] };
  sources: { source: string; date: string; price: string; ret: string }[];
  sourcesNote: string;
  unavailable: string[];
};

const MONTH_MS = 86_400_000;
const STALE_DAYS = 5;

export function ageDays(iso: string | null | undefined, now = Date.now()): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? Math.floor((now - t) / MONTH_MS) : null;
}

const day = (iso: string | null | undefined) =>
  iso ? new Date(iso.length === 10 ? iso + "T00:00:00Z" : iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : null;

/** "−2/10" or "-2/10" or "+3/10" -> number; anything else -> null. */
export function parseOutlook(s: string | null | undefined): number | null {
  const m = s?.replace("−", "-").match(/^\s*([+-]?\d+(?:\.\d+)?)\s*\/\s*10\s*$/);
  if (!m) return null;
  const n = Number(m[1]);
  return n >= -10 && n <= 10 ? n : null;
}

/** First number in a text such as "0% (expected)": used only for withholding tax, from verified/provisional text. */
const pct = (v: number | null | undefined) => (v === null || v === undefined ? null : `${v.toLocaleString("en-GB", { maximumFractionDigits: 3 })}%`);

export function buildReport(isin: string, bond: PublicBond | null, c: FocusCompany | null, now = Date.now()): Report | null {
  if (!bond && !c) return null;
  const unavailable: string[] = [];
  const miss = (what: string) => unavailable.push(what);

  const maturityIso = bond?.maturity ?? null;
  const issuer = bond?.issuer?.trim() || c?.issuer || bond?.name || isin;
  const risk = bond ? bondRisk(bond) : c?.risk ?? null;
  const researched = !!c;

  // Return: the copy's dated value when there is one; the curated indicative range otherwise. Never shown as current when old.
  const age = ageDays(bond?.ytmAsOf, now);
  const old = age !== null && age > STALE_DAYS;
  let ret: Fig;
  if (bond?.grossYtm != null && bond.ytmAsOf) {
    ret = old
      ? { text: `${bond.grossYtm.toFixed(2)}%`, status: "provisional", kind: "observed", asOf: day(bond.ytmAsOf)!, source: "Exchange / broker data (dated, not current)" }
      : { text: `${bond.grossYtm.toFixed(2)}%`, status: "verified", kind: "observed", asOf: day(bond.ytmAsOf)!, source: "Exchange / broker data" };
  } else if (c?.ytm) {
    ret = { text: c.ytm, status: "provisional", kind: "observed", asOf: c.quotes[0]?.[1], source: "Indicative, dated quotes" };
  } else {
    ret = NOT_VERIFIED;
    miss("Current return");
  }

  // Withholding tax: only curated research holds a view; the number is shown only when the text gives one.
  let wht: Fig = NOT_VERIFIED;
  let whtPct: number | null = null;
  if (c?.tax) {
    const m = c.tax.match(/Expected\s+(\d+(?:\.\d+)?)\s*%/i);
    if (m) whtPct = Number(m[1]);
    wht = whtPct !== null ? { text: pct(whtPct)!, status: "provisional", kind: "assumption", asOf: c.updated, source: "10bonds research" } : NOT_VERIFIED;
  }
  if (wht === NOT_VERIFIED) miss("Withholding tax rate");

  // Net return: shown only when it is exactly the gross return (verified 0% tax); otherwise it needs after-tax cash flows.
  const netReturn: Fig =
    whtPct === 0 && ret.status !== "not_verified"
      ? { ...ret, status: "provisional", kind: "model", source: "Gross return, 0% withholding tax assumed" }
      : NOT_VERIFIED;
  if (netReturn === NOT_VERIFIED) miss("Return after withholding tax");

  const matText = maturityIso ? day(maturityIso) : c?.maturity ?? null;
  if (!matText) miss("Maturity date");
  const couponText = bond?.coupon != null ? `${bond.coupon.toLocaleString("en-GB", { maximumFractionDigits: 3 })}% coupon` : null;
  const couponKind = bond?.couponType ? couponTypeLabel("en", bond.couponType) : null;

  const scoreFig: Fig = c
    ? { text: `${c.score}/100`, status: "provisional", kind: "model", asOf: c.updated, source: "10bonds internal score, not a default probability" }
    : NOT_VERIFIED;
  if (!c) miss("Investment score and six-factor credit scorecard");

  const scorecard = c?.scorecard.map(([label, note, score]) => ({ label, note, score })) ?? [];
  const strengths = [...scorecard].sort((a, b) => b.score - a.score).slice(0, 3).map((s) => `${s.label}: ${s.note}`);
  if (!c) {
    for (const w of ["Outlook (−10 to +10)", "Strengths and risks", "Financial results", "Stress scenarios", "Share-price early-warning indicators", "Analyst conclusion"]) miss(w);
  } else {
    for (const w of ["Three years of annual results (only the latest two half-year periods)", "Stress scenarios", "Share-price early-warning indicators", "Prospectus and Final Terms references"]) miss(w);
  }

  const terms: Row[] = [];
  const t = (label: string, f: Fig) => terms.push({ label, fig: f });
  const fromCopy = (text: string | null | undefined) => (text ? fig(text, "verified", { kind: "observed", source: "Issuer terms (data copy)" }) : NOT_VERIFIED);
  t("ISIN", fig(isin, "verified", { kind: "observed" }));
  t("Issue date", bond?.issueDate ? fromCopy(day(bond.issueDate)) : curatedTerm(c, "Issue date"));
  t("Coupon", bond?.coupon != null ? fromCopy(`${couponText}${couponKind ? `, ${couponKind.toLowerCase()}` : ""}`) : curatedTerm(c, "Coupon"));
  t("Coupon type", fromCopy(couponKind));
  t("Payment frequency", curatedTerm(c, "Coupon", /paid\s+([^,]+)/i));
  t("Seniority", fromCopy(bond?.seniority ? seniorityLabel("en", bond.seniority) : c?.seniority));
  t("Currency", fromCopy(bond?.currency));
  t("Call rights", bond?.callable == null ? curatedTerm(c, "Call") : fromCopy(bond.callable ? "Callable: call dates and prices not verified" : "Not callable"));
  t("Minimum denomination", bond?.minInvestment != null ? fromCopy(fmtMin(bond.minInvestment, bond.currency)) : curatedTerm(c, "Minimum"));
  t("Final maturity", matText ? fromCopy(matText) : NOT_VERIFIED);
  t("Redemption", curatedTerm(c, "Maturity"));
  t("Fixed / floating periods and reset formula", NOT_VERIFIED);
  t("Guarantees", NOT_VERIFIED);
  t("Prospectus and Final Terms", NOT_VERIFIED);
  for (const [k, v] of c?.terms ?? []) {
    if (!terms.some((x) => x.label.toLowerCase() === k.toLowerCase()) && !["Issue date", "Coupon", "Maturity", "Minimum", "Seniority", "Call"].includes(k)) {
      terms.push({ label: k, fig: /verif/i.test(v) ? NOT_VERIFIED : fig(v, "provisional", { kind: "observed", source: "10bonds research" }) });
    }
  }
  const floating = bond?.couponType === "floating" || bond?.couponType === "step" || bond?.couponType === "inflation";
  if (floating) miss("Coupon reset formula and exact coupon periods");
  for (const r of terms) if (r.fig.status === "not_verified" && !["Guarantees", "Prospectus and Final Terms", "Fixed / floating periods and reset formula"].includes(r.label)) miss(r.label);

  const asOfIso = bond?.ytmAsOf ?? null;
  const freshness = asOfIso
    ? { label: `Data as of ${day(asOfIso)}${old ? ", not current" : ""}`, stale: old }
    : c ? { label: `Research updated ${c.updated}; no live price`, stale: true } : { label: "No dated data", stale: true };

  return {
    isin,
    issuer,
    name: c?.name ?? bond?.name ?? issuer,
    maturityYear: maturityIso?.slice(0, 4) ?? c?.maturity.match(/\d{4}/)?.[0] ?? null,
    currency: bond?.currency ?? (c ? "EUR" : null),
    seniority: bond?.seniority ? seniorityLabel("en", bond.seniority) : c?.seniority ?? null,
    couponType: couponKind,
    country: bond?.country ?? null,
    freshness,
    risk,
    researched,
    free: c?.free === true,
    kpis: {
      score: scoreFig,
      ret,
      wht,
      maturity: matText ? fig(matText, "verified", { kind: "observed" }) : NOT_VERIFIED,
      maturityNote: couponText ?? "Coupon not verified",
    },
    netReturn,
    conclusion: {
      view: c ? fig(c.view, "provisional", { kind: "model", asOf: c.updated, source: "10bonds research" }) : NOT_VERIFIED,
      outlook: parseOutlook(c?.outlook),
      outlookNote: c?.outlookNote ?? "Not verified",
      summary: c?.summary ?? null,
      strengths,
      risks: c?.risks ?? [],
      analyst: c?.recommendation ?? null,
      status: c ? `Research updated ${c.updated}. Provisional: terms and current price still to be checked.` : "No research completed for this bond yet.",
    },
    scorecard,
    scorecardNote: c?.scorecardNote ?? "Not verified",
    capital: c?.capital ?? [],
    financials: c && c.financials.length > 1 ? { header: c.financials[0], rows: c.financials.slice(1), note: c.financialsNote } : null,
    terms,
    tax: { text: c?.tax ?? null, rows: [] },
    sources: (c?.quotes ?? []).map(([source, date, price, r]) => ({ source, date, price, ret: r })),
    sourcesNote: c?.quotesNote ?? "No dated quotes on file.",
    unavailable: [...new Set(unavailable)],
  };
}

/** A curated term row (optionally narrowed by a pattern) as a provisional figure. */
function curatedTerm(c: FocusCompany | null, key: string, re?: RegExp): Fig {
  const v = c?.terms.find(([k]) => k === key)?.[1];
  if (!v) return NOT_VERIFIED;
  const text = re ? v.match(re)?.[1] : v;
  if (!text) return NOT_VERIFIED;
  if (/verif|indicated/i.test(text)) return NOT_VERIFIED;
  return fig(text, "provisional", { kind: "observed", source: "10bonds research" });
}
