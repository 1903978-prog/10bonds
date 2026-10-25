// Automated technical compliance checks that run on imported content (no file access), so they work in the release
// tests and live on the admin dashboard. They look for known-bad patterns and missing safeguards. They are NOT a legal
// determination: passing means "no known-bad pattern found", never "legally compliant".
import { buildReport } from "../bondReport";
import { COMPANIES_IN_FOCUS } from "../companiesInFocus";
import { DEFAULT_RATES } from "../seo/defaultRates";
import { DISCLAIMER } from "../disclaimer";
import { LANDING_TEXT } from "../landingText";
import { COMPANY } from "../legal";
import { TERMS_SECTIONS } from "../terms";
import type { PublicBond } from "../types";
import { evidenceProblems } from "./evidence";
import { DATA_SOURCES, FACTS } from "./facts";
import { MODEL_VERSIONS, currentFingerprints } from "./modelVersions";

export type Level = "pass" | "warn" | "fail";
export type CheckResult = { id: string; title: string; level: Level; detail: string; criteria: number[] };

/** Every string inside a value, flattened (customer-facing copy is nested objects of strings). */
export function strings(v: unknown, out: string[] = []): string[] {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => strings(x, out));
  return out;
}

const customerCopy = () => [...strings(LANDING_TEXT), ...strings(DISCLAIMER), ...strings(TERMS_SECTIONS)];

/** Phrases that overstate safety or returns, or promise performance. Each has a reason. */
export const BANNED_CLAIMS: { re: RegExp; why: string }[] = [
  { re: /\brisk[- ]free\b/i, why: "implies no risk" },
  { re: /(?<!not )(?<!no )\bguaranteed? (returns?|yields?|profits?|income)\b/i, why: "promises performance" },
  { re: /\bno fees?\b(?! on)/i, why: "unqualified 'no fees' (say: no fund management fee; broker costs apply)" },
  { re: /\bbest bonds\b/i, why: "'best' reads as a recommendation" },
  { re: /\bbeats? the market\b|\boutperform(s|ed)? the market\b/i, why: "performance superiority claim" },
  { re: /\bsafe investment\b|\bcannot lose\b|\bcan't lose\b/i, why: "implies safety of capital" },
  { re: /\bwe recommend\b|\byou should (buy|sell|invest)\b/i, why: "personal recommendation wording" },
  { re: /\b\d+(\.\d+)?\s?% (chance|probability) of (default|loss)\b/i, why: "stand-alone default/loss probability claim" },
];

export function scanClaims(texts: string[]): string[] {
  const hits: string[] = [];
  for (const t of texts) for (const b of BANNED_CLAIMS) if (b.re.test(t)) hits.push(`${b.why}: "${t.slice(0, 80)}"`);
  return hits;
}

const base: PublicBond = {
  isin: "XS0000000001", name: "Test", issuer: "Test AG", country: "DE", currency: "EUR", coupon: 3, maturity: "2031-05-01",
  ratingSp: "A", ratingMoodys: null, ratingFitch: null, ratingResolved: null, grossYtm: 3.5, modifiedDuration: 4, ytmAsOf: "2026-10-24T00:00:00Z",
};

const res = (id: string, title: string, criteria: number[], level: Level, detail: string): CheckResult => ({ id, title, level, detail, criteria });

/** Checks that scan the source tree (lib/legalRisk/sourceChecks.test.ts). They run in the release tests, not on the live site. */
export const SOURCE_CHECKS: { id: string; title: string; criteria: number[] }[] = [
  { id: "no-buy-sell-labels", title: "No new BUY / SELL / AVOID labels in customer-facing code", criteria: [3, 4, 5] },
  { id: "no-suitability-profiling", title: "No investor-profiling questions (risk tolerance, objectives, income) in customer code", criteria: [3, 4] },
  { id: "no-execution-features", title: "No order, trade or execution features", criteria: [8] },
  { id: "api-route-inventory", title: "No new API route that looks like advice, orders or recommendations", criteria: [3, 8] },
  { id: "external-hosts", title: "Only listed external hosts are called (data-feed allowlist)", criteria: [13, 15] },
  { id: "agency-names-baseline", title: "Rating-agency names stay out of customer-facing code", criteria: [14] },
  { id: "llm-separation", title: "LLM / GPT output is admin-only and not in customer routes", criteria: [19] },
  { id: "subscription-ui", title: "Checkout keeps the withdrawal acknowledgement", criteria: [17] },
];

export function benchmarkCheck(etf: { verified: boolean; asOf: string; on: boolean }, now = Date.now()): CheckResult {
  const age = Math.floor((now - Date.parse(`${etf.asOf}T00:00:00Z`)) / 86_400_000);
  const t = "ETF benchmark on the landing card is dated and verified";
  if (!etf.on) return res("benchmark-fresh", t, [6, 16], "pass", "Benchmark card is switched off.");
  if (age > 45) return res("benchmark-fresh", t, [6, 16], "warn", `Benchmark is ${age} days old (limit 45).`);
  if (!etf.verified) return res("benchmark-fresh", t, [6, 16], "warn", `Benchmark is ${age} days old but still provisional (not verified).`);
  return res("benchmark-fresh", t, [6, 16], "pass", `Verified, ${age} days old.`);
}

export function contentChecks(): CheckResult[] {
  const out: CheckResult[] = [];

  // Model versions: every scoring module has a version, and a changed input forces a version bump.
  {
    const fp = currentFingerprints();
    const bad: string[] = [];
    for (const m of MODEL_VERSIONS) {
      if (!m.version || !m.effective || !/^\d{4}-\d{2}-\d{2}$/.test(m.effective)) bad.push(`${m.id}: version or date missing`);
      if (m.id in fp && m.fingerprint !== fp[m.id]) bad.push(`${m.id}: inputs changed (fingerprint ${fp[m.id]}); bump the version in lib/legalRisk/modelVersions.ts`);
    }
    out.push(res("model-versions", "Every scoring model has a version and a fingerprint of its inputs", [1, 11], bad.length ? "fail" : "pass", bad.join("; ") || `${MODEL_VERSIONS.length} models registered.`));
  }

  // Default-rate table must be monotone: more risk or more time never lowers the cumulative default rate.
  {
    const bad: string[] = [];
    DEFAULT_RATES.forEach(([name, , row], i) => {
      row.forEach((v, j) => {
        if (j && v < row[j - 1]) bad.push(`${name}: falls with horizon`);
        if (i && v < DEFAULT_RATES[i - 1][2][j]) bad.push(`${name}: lower than ${DEFAULT_RATES[i - 1][0]}`);
      });
    });
    out.push(res("default-rates-sane", "Default-rate table is mathematically consistent", [11], bad.length ? "fail" : "pass", [...new Set(bad)].join("; ") || "Monotone by notch and by horizon."));
  }

  // A yield older than 5 days is never presented as current; a fresh one carries its date.
  {
    const NOW = Date.parse("2026-10-25T00:00:00Z");
    const fresh = buildReport(base.isin, base, null, NOW)!;
    const old = buildReport(base.isin, { ...base, ytmAsOf: "2026-10-01T00:00:00Z" }, null, NOW)!;
    const none = buildReport(base.isin, { ...base, ytmAsOf: null, grossYtm: 3.5 }, null, NOW)!;
    const ok = fresh.kpis.ret.status === "verified" && !!fresh.kpis.ret.asOf && old.kpis.ret.status !== "verified" && old.freshness.stale && none.kpis.ret.status !== "verified";
    out.push(res("stale-yield", "Stale or undated yields are never shown as current", [10, 20], ok ? "pass" : "fail", ok ? "Fresh yield dated; 24-day-old and undated yields flagged." : "A stale or undated yield is shown as verified."));
  }

  // Net return after tax appears only when the 0% withholding tax is verified.
  {
    const bad: string[] = [];
    const noTax = buildReport(base.isin, base, null)!;
    if (noTax.netReturn.status !== "not_verified") bad.push("net return shown without a tax assumption");
    for (const c of COMPANIES_IN_FOCUS) {
      const r = buildReport(c.isin, null, c);
      if (r && r.netReturn.status !== "not_verified" && r.kpis.wht.text !== "0%") bad.push(`${c.issuer}: net return with withholding tax ${r.kpis.wht.text}`);
    }
    out.push(res("net-return-tax", "Net return is shown only with a verified 0% withholding tax", [20], bad.length ? "fail" : "pass", bad.join("; ") || "Net return stays 'Not verified' without verified tax."));
  }

  // Report figures need evidence (date for observed values, basis for model values).
  {
    const bad: string[] = [];
    for (const c of COMPANIES_IN_FOCUS) {
      const r = buildReport(c.isin, null, c);
      if (r) for (const p of evidenceProblems(r)) bad.push(`${c.issuer}: ${p.path} ${p.problem}`);
    }
    out.push(res("report-evidence", "Issuer-report figures carry a date or basis, or are shown 'Not verified'", [5, 9, 10, 20], bad.length ? "warn" : "pass", bad.length ? `${bad.length} figure(s) lack evidence and are blanked on customer pages: ${bad.slice(0, 3).join("; ")}` : `${COMPANIES_IN_FOCUS.length} curated reports checked.`));
  }

  // Marketing and legal copy: no banned claims in landing, finder, disclaimer, terms.
  {
    const hits = scanClaims(customerCopy());
    out.push(res("marketing-claims", "No banned safety, return or recommendation claims in customer copy", [6, 16], hits.length ? "fail" : "pass", hits.slice(0, 4).join("; ") || "No banned phrase found in landing, disclaimer or terms (finder text is scanned in the release tests)."));
  }

  // Headline comparative claims: allowed only with a qualifier next to them. Warn (not fail) while the owner decides.
  {
    const en = LANDING_TEXT.en as { h1a?: string; h1b?: string };
    const head = `${en.h1a ?? ""} ${en.h1b ?? ""}`;
    const claim = /higher return/i.test(head) && /lower risk/i.test(head);
    out.push(res("comparative-headline", "Comparative headline is qualified next to the claim", [6, 16], claim ? "warn" : "pass", claim ? `Headline "${head.trim()}" has no qualifier beside it (qualifiers sit on /disclaimer). Needs the owner's decision.` : "No unqualified comparative headline."));
  }

  // The score is never described as an agency rating, and 10BONDS never as a rating agency.
  {
    const texts = [...strings(LANDING_TEXT), ...strings(DISCLAIMER), ...strings(TERMS_SECTIONS)];
    const bad = texts.filter((t) => /NRSRO|nationally recognized statistical|registered (credit )?rating agency/i.test(t) || /(?<!not )(?<!not a )\b(10BONDS|we) (is|are) (a )?credit rating agenc/i.test(t));
    const has = TERMS_SECTIONS.some((s) => s.paragraphs.some((p) => /not a credit rating/i.test(p))) || strings(DISCLAIMER.en).some((t) => /not a credit rating/i.test(t));
    out.push(res("no-rating-agency-claims", "Score is never presented as a regulated credit rating", [1, 2, 14], bad.length || !has ? "fail" : "pass", bad[0]?.slice(0, 100) ?? (has ? "'Not a credit rating' statement present." : "The 'not a credit rating' statement is missing.")));
  }

  // Subscription disclosures in the Terms.
  {
    const all = strings(TERMS_SECTIONS).join(" ");
    const need: [string, RegExp][] = [["Plus price", /€9\b/], ["Premium price", /€19\b/], ["Pro price", /€89\b/], ["automatic renewal", /until you cancel/i], ["cancellation", /cancel/i], ["14-day withdrawal", /14 days/i], ["VAT", /VAT/], ["refund rule", /refund/i]];
    const missing = need.filter(([, re]) => !re.test(all)).map(([n]) => n);
    out.push(res("subscription-disclosures", "Terms keep price, renewal, cancellation, withdrawal and refund wording", [17], missing.length ? "fail" : "pass", missing.length ? `Missing: ${missing.join(", ")}` : "All 8 disclosures present."));
  }

  // Legal entity named consistently; the real operator is still to be confirmed.
  {
    const all = strings(TERMS_SECTIONS).join(" ") + strings(DISCLAIMER).join(" ");
    const wrong = /Wyoming|\bLLC\b/.test(all);
    const named = all.includes(COMPANY.legalName);
    if (wrong || !named) out.push(res("entity-consistency", "Legal pages name one operating entity", [7, 18], "fail", wrong ? "Terms or disclaimer mention a different entity type." : "Terms do not name the entity in lib/legal.ts."));
    else if (!FACTS.operatingEntityConfirmed) out.push(res("entity-consistency", "Legal pages name one operating entity", [7, 18], "warn", `All legal pages name ${COMPANY.legalName} (Estonia). The owner expects a Wyoming LLC: operator not confirmed.`));
    else out.push(res("entity-consistency", "Legal pages name one operating entity", [7, 18], "pass", `${COMPANY.legalName}, confirmed by the owner.`));
  }

  // Data licences: every source has a documented licence status; unconfirmed ones are flagged.
  {
    const open = DATA_SOURCES.filter((d) => d.licence === "unconfirmed" && !FACTS.dataLicenceConfirmed);
    out.push(res("data-source-inventory", "Every external data source is inventoried with a licence status", [13, 14, 15], open.length ? "warn" : "pass", open.length ? `${open.length} of ${DATA_SOURCES.length} sources have no documented commercial redistribution right: ${open.map((d) => d.id).join(", ")}.` : "All sources documented."));
  }

  return out;
}
