import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { curveFrom, parseEcbCsv, policyFrom } from "./ecb";
import { B_FIELDS, A_FIELDS, chooseVersion, eligibleBonds, isValidIsin, scanOutput, type BondInput } from "./gate";
import { buildIssue, issueWeek } from "./issue";
import { FIELD_RIGHTS, NEWSLETTER_FACTS } from "./rights";

const fx = (n: string) => readFileSync(path.join(__dirname, "fixtures", n), "utf8");
const curveCsv = fx("ecb-yc.csv"), depositCsv = fx("ecb-dfr.csv"), hicpCsv = fx("ecb-hicp.csv");
const NOW = new Date("2026-10-27T06:30:00Z"); // Tuesday after the last ECB value (26 Oct)
const UNSUB = "https://10bonds.com/api/newsletter/unsubscribe?t=x";
const base = { now: NOW, curveCsv, depositCsv, unsubscribe: UNSUB, base: "https://10bonds.com", retrievedAt: "2026-10-27T06:30:00Z" };

function isin(body: string): string {
  const digits = [...body].map((c) => (/\d/.test(c) ? c : String(c.charCodeAt(0) - 55))).join("");
  for (let d = 0; d < 10; d++) if (isValidIsin(body + d)) return body + d;
  throw new Error(digits);
}
const sample = (i: number, over: Partial<BondInput> = {}): BondInput => ({
  isin: isin(`XS00000000${i}`.slice(0, 11)), issuer: `Sample Issuer ${String.fromCharCode(65 + i)}`, currency: "EUR", coupon: 3 + i / 4, maturity: "2031-05-15", issueDate: "2026-10-22",
  primary: { url: "https://example.org/prospectus", label: "Issuer prospectus (sample)", retrievedAt: "2026-10-27T05:00:00Z" }, provenance: "sample", returnPerYear: 7.77 + i / 100, ...over,
});
const samples = Array.from({ length: 6 }, (_, i) => sample(i));
const ALL_BOND_FIELDS = A_FIELDS;

describe("rights register", () => {
  it("has unique fields and evidence for every GREEN row", () => {
    expect(new Set(FIELD_RIGHTS.map((f) => f.id)).size).toBe(FIELD_RIGHTS.length);
    for (const f of FIELD_RIGHTS) {
      expect(f.evidence.length).toBeGreaterThan(f.cls === "GREEN" ? 20 : 5);
      if (f.cls === "GREEN") {
        expect(f.evidence).toMatch(/https:\/\//);
        expect(f.approval).toBe("");
      } else expect(f.approval.length).toBeGreaterThan(5);
    }
  });
  it("never marks unknown, vendor, price, rating or ranking fields GREEN", () => {
    const green = new Set(FIELD_RIGHTS.filter((f) => f.cls === "GREEN").map((f) => f.id));
    for (const id of [...ALL_BOND_FIELDS, "bond_price", "bond_52w", "agency_rating", "own_risk_score", "own_ranking", "hicp", "db_aggregate_stats"] as const) expect(green.has(id)).toBe(false);
    expect(FIELD_RIGHTS.filter((f) => f.cls === "GREEN").every((f) => f.origin.includes("ECB") || f.origin.includes("Own arithmetic") || f.origin.includes("ecb.europa.eu"))).toBe(true);
  });
  it("keeps every legal fact open until someone confirms it", () => {
    expect(Object.values(NEWSLETTER_FACTS).every((v) => v === false)).toBe(true);
  });
});

describe("ECB data checks", () => {
  it("reads the curve and a week-earlier value", () => {
    const r = curveFrom(parseEcbCsv(curveCsv), "2026-10-27");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.curve.asOf).toBe("2026-10-26");
    expect(r.curve.priorDate).toBe("2026-10-19");
    const t10 = r.curve.rows.find((x) => x.tenor === 10)!;
    expect(t10.now).toBeCloseTo(3.37355, 4);
    expect(t10.changeBp).toBeCloseTo(-9.55, 1);
  });
  it("rejects stale data", () => {
    expect(curveFrom(parseEcbCsv(curveCsv), "2026-11-10").ok).toBe(false);
    expect(curveFrom(parseEcbCsv(hicpCsv), "2026-10-27").ok).toBe(false);
  });
  it("rejects a missing tenor or a missing week-earlier value", () => {
    const noThirty = curveCsv.split("\n").filter((l) => !l.includes("SR_30Y")).join("\n");
    expect(curveFrom(parseEcbCsv(noThirty), "2026-10-27").ok).toBe(false);
    const noPrior = curveCsv.split("\n").filter((l) => !/2026-10-(19|16|15|20)/.test(l)).join("\n");
    expect(curveFrom(parseEcbCsv(noPrior), "2026-10-27").ok).toBe(false);
  });
  it("finds the deposit rate in force", () => {
    const p = policyFrom(parseEcbCsv(depositCsv), "2026-10-27");
    expect(p.ok && p.policy.rate).toBe(2.5);
    expect(p.ok && p.policy.since).toBe("2026-09-16");
  });
  it("refuses a CSV without the expected columns", () => {
    expect(() => parseEcbCsv("A,B\n1,2")).toThrow();
  });
});

describe("version choice (missing rights downgrade, never assumed)", () => {
  it("production default is Version C even when vendor bonds are offered", () => {
    const vendor = samples.map((b) => ({ ...b, provenance: "vendor-copy" as const }));
    const issue = buildIssue({ ...base, bonds: vendor });
    expect(issue.version).toBe("C");
    expect(issue.decision.reasons.join(" ")).toMatch(/Falling back to Version C/);
    expect(issue.html + issue.text).not.toMatch(/\b[A-Z]{2}[A-Z0-9]{9}\d\b/);
    expect(issue.html).not.toContain("Sample Issuer");
  });
  it("builds nothing when the market data is stale", () => {
    const issue = buildIssue({ ...base, now: new Date("2026-11-20T06:30:00Z") });
    expect(issue.version).toBe("none");
    expect(issue.sendable).toBe(false);
    expect(issue.html).toBe("");
  });
  it("needs both the legal facts and the field rights for named bonds", () => {
    expect(chooseVersion({ ecbOk: true, bonds: samples }, { assumeGreen: B_FIELDS }).version).toBe("C"); // facts still open
    const facts = { conflictsDisclosureApproved: true, counselClearedNamedSecurities: true, vendorConfirmedTerms: true, vendorConfirmedPriceDerived: true };
    expect(chooseVersion({ ecbOk: true, bonds: samples }, { facts }).version).toBe("C"); // rights still AMBER
    expect(chooseVersion({ ecbOk: true, bonds: samples }, { assumeGreen: B_FIELDS, facts }).version).toBe("B");
    expect(chooseVersion({ ecbOk: true, bonds: samples }, { assumeGreen: A_FIELDS, facts }).version).toBe("A");
    expect(chooseVersion({ ecbOk: true, bonds: samples.slice(0, 3) }, { assumeGreen: A_FIELDS, facts }).version).toBe("C"); // too few
  });
  it("only lists bonds with a valid ISIN and a primary https source", () => {
    expect(isValidIsin("US0378331005")).toBe(true);
    expect(isValidIsin("US0378331006")).toBe(false);
    const vendor = { ...samples[0], provenance: "vendor-copy" as const };
    const badIsin = { ...samples[1], isin: "XS0000000000", provenance: "primary" as const };
    const noUrl = { ...samples[2], provenance: "primary" as const, primary: { url: "http://x", label: "x", retrievedAt: "2026-10-27T00:00:00Z" } };
    const good = { ...samples[3], provenance: "primary" as const };
    expect(eligibleBonds([vendor, badIsin, noUrl, good, samples[4]], false)).toEqual([good]);
  });
});

describe("Version C (production default): real ECB figures", () => {
  const issue = buildIssue(base);
  it("is sendable with a changing, concrete subject", () => {
    expect(issue.version).toBe("C");
    expect(issue.violations).toEqual([]);
    expect(issue.sendable).toBe(true);
    expect(issue.subject).toBe("Euro AAA government yields fell 10 bp this week: 10-year at 3.37% · 26 Oct");
    const next = buildIssue({ ...base, curveCsv: curveCsv.replaceAll("2026-10-26", "2026-10-27").replaceAll("3.3735503672", "3.60"), now: new Date("2026-10-28T06:30:00Z") });
    expect(next.subject).not.toBe(issue.subject);
  });
  it("shows only figures that come from the sourced data", () => {
    expect(issue.text).toContain("3.37%");
    expect(issue.text).toContain("2.50%");
    expect(issue.text).toContain("53 bp");
    for (const n of issue.text.match(/-?\d+(?:\.\d+)?(?:%| bp)/g) ?? []) expect(issue.figures).toContain(n);
  });
  it("carries sources, timestamp, definitions, disclosure, sender and unsubscribe", () => {
    for (const s of ["data-api.ecb.europa.eu", "usage_policy", "Retrieved 2026-10-27", "Published 27 Oct 2026", "Information only, not advice or an offer", "10BONDS", UNSUB, "same e-mail for every subscriber", "Coupon:", "Realised return:", "Spot rate:"]) expect(issue.html + issue.text).toContain(s);
  });
  it("is valid for mobile and uses https links only", () => {
    expect(issue.html).toContain('name="viewport"');
    expect(issue.html).toMatch(/max-width:600px/);
    expect(issue.html).toContain('<table width="100%"');
    for (const m of issue.html.matchAll(/href="([^"]+)"/g)) expect(m[1]).toMatch(/^https:\/\//);
  });
  it("uses the customer wording rules", () => {
    expect(issue.html + issue.text + issue.subject).not.toMatch(/\bYTM\b|yield to maturity|S&P|Moody|Fitch|best bonds|no fees|Livio/i);
  });
  it("is identical for every subscriber except the unsubscribe link", () => {
    const other = buildIssue({ ...base, unsubscribe: "https://10bonds.com/api/newsletter/unsubscribe?t=other" });
    expect(other.html.replace("t=other", "t=x")).toBe(issue.html);
  });
  it("is not sendable without an unsubscribe link", () => {
    expect(buildIssue({ ...base, unsubscribe: null }).sendable).toBe(false);
  });
  it("is the same issue key when rebuilt in the same week", () => {
    expect(buildIssue({ ...base, now: new Date("2026-10-28T12:00:00Z") }).issueKey).toBe(issue.issueKey);
    expect(issue.issueKey).toBe("2026-W44-C");
    expect(issueWeek(new Date("2026-10-26T00:00:00Z"))).toBe("2026-W44");
    expect(issueWeek(new Date("2026-11-02T00:00:00Z"))).toBe("2026-W45");
  });
});

describe("Versions A and B (layout previews; never sendable until rights are verified)", () => {
  const facts = { assumeFacts: true };
  const prev = (g: typeof A_FIELDS) => buildIssue({ ...base, bonds: samples, conflictsText: "Conflicts of interest: [approved text goes here]." }, { assumeGreen: g, ...facts });
  it("Version B lists terms only and no price-dependent value", () => {
    const b = prev(B_FIELDS);
    expect(b.version).toBe("B");
    expect(b.sendable).toBe(false);
    expect(b.violations).toEqual([]);
    expect(b.html).toContain("Sample Issuer A");
    expect(b.html + b.text).not.toContain("7.77");
    expect(b.html).not.toContain("Return (per year)</th>");
  });
  it("Version A adds the return per year", () => {
    const a = prev(A_FIELDS);
    expect(a.version).toBe("A");
    expect(a.sendable).toBe(false);
    expect(a.violations).toEqual([]);
    expect(a.html).toContain("Return (per year)</th>");
    expect(a.text).toContain("7.77%");
  });
  it("lists bonds alphabetically by issuer, not by return", () => {
    const rev = [...samples].reverse().map((b, i) => ({ ...b, returnPerYear: 1 + i }));
    const a = buildIssue({ ...base, bonds: rev, conflictsText: "Conflicts of interest: x." }, { assumeGreen: A_FIELDS, ...facts });
    const order = [...a.text.matchAll(/^ {2}Sample Issuer ([A-Z]) ·/gm)].map((m) => m[1]);
    expect(order).toEqual([...order].sort());
  });
  it("flags missing conflicts text for any named bond", () => {
    const x = buildIssue({ ...base, bonds: samples }, { assumeGreen: B_FIELDS, ...facts });
    expect(x.violations.map((v) => v.rule).join()).toMatch(/conflicts/);
    expect(x.sendable).toBe(false);
  });
});

describe("output scanner", () => {
  const m = (text: string, html = text) => ({ subject: "s", html, text });
  it("catches restricted wording, identifiers and unsourced figures", () => {
    expect(scanOutput(m("The YTM is high"), "C", []).length).toBeGreaterThan(0);
    expect(scanOutput(m("Rated by Moody's"), "C", []).length).toBeGreaterThan(0);
    expect(scanOutput(m("our best bonds"), "C", []).length).toBeGreaterThan(0);
    expect(scanOutput(m("You should buy"), "C", []).length).toBeGreaterThan(0);
    expect(scanOutput(m("IT0000000001 listed"), "C", []).length).toBeGreaterThan(0);
    expect(scanOutput(m("rate 4.20%"), "C", []).some((v) => v.rule.includes("source"))).toBe(true);
    expect(scanOutput(m("rate 4.20%"), "C", ["4.20%"])).toEqual([]);
    expect(scanOutput(m("x", "<!--bonds-->price 99<!--/bonds-->"), "B", [])[0].rule).toMatch(/Version B/);
    expect(scanOutput(m("{{name}}"), "C", []).length).toBeGreaterThan(0);
  });
});

describe("no accidental sending", () => {
  it("the new modules import no sender, database or scheduler", () => {
    const dir = __dirname;
    for (const f of readdirSync(dir).filter((x) => x.endsWith(".ts") && !x.endsWith(".test.ts"))) {
      const src = readFileSync(path.join(dir, f), "utf8");
      const code = src.replace(/\/\/.*$/gm, "");
      expect(code, f).not.toMatch(/sendEmail|accountsSql|weeklySend|setSetting|resend/i);
      expect(code, f).not.toMatch(/from "\.\.\/(weeklySend|accounts)"/);
    }
  });
  it("the production weekly job is still guarded by the admin switch and the test step", () => {
    const send = readFileSync(path.join(__dirname, "..", "weeklySend.ts"), "utf8");
    expect(send).toContain('(await getSetting(WEEKLY_ON_KEY)) !== "1"');
    expect(send).toContain("if (on && !(await getSetting(WEEKLY_TESTED_KEY))) return false;");
  });
});
