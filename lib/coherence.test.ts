import { describe, expect, it } from "vitest";
import type { PublicBond } from "./types";
import { checkList, cleanPolicy, creditProfile, DEFAULT_POLICY, factsOf, policyChanges, policySignature, setPolicy, withoutListEdits, type CoherenceFacts } from "./coherence";
import { groupInfo, issuerGroupOf } from "./issuerGroups";
import { sectorOf, UNCLASSIFIED } from "./sectors";

// Acceptance table of the rating coherence rules (the owner, 25/10/2026), on synthetic lists: each row builds the ten
// bonds' facts directly, so one rule group can pass while another fails.
const SECTORS = ["Industrials", "Health care", "Utilities", "Energy", "Materials", "Consumer staples", "Technology", "Communication services", "Real estate", "Consumer discretionary"];
type Spec = { cls: number; n: number; weak?: boolean; pd?: number };
function list(specs: Spec[], opts: { sectors?: string[]; groups?: string[]; pds?: number[] } = {}): CoherenceFacts[] {
  const out: CoherenceFacts[] = [];
  for (const s of specs) for (let i = 0; i < s.n; i++) out.push({ cls: s.cls, weak: !!s.weak, pd: s.pd ?? 1, group: `g${out.length}`, sector: SECTORS[out.length % SECTORS.length] });
  opts.sectors?.forEach((s, i) => { out[i].sector = s; });
  opts.groups?.forEach((g, i) => { out[i].group = g; });
  opts.pds?.forEach((p, i) => { out[i].pd = p; });
  return out;
}
const ok = (f: CoherenceFacts[], rules: string[], ceiling = 10) => checkList(f, DEFAULT_POLICY, ceiling).filter((c) => rules.includes(c.rule)).every((c) => c.ok);
const RATING = ["window", "core", "worst", "weak"];
const all = (f: CoherenceFacts[], ceiling = 10) => checkList(f, DEFAULT_POLICY, ceiling).every((c) => c.ok);

describe("rating rules (A, B, C, D)", () => {
  it("3 AA + 6 A + 1 BBB- is rejected", () => expect(ok(list([{ cls: 2, n: 3 }, { cls: 3, n: 6 }, { cls: 6, n: 1 }]), RATING)).toBe(false));
  it("8 BBB+ + 2 BBB- is rejected", () => expect(ok(list([{ cls: 4, n: 8 }, { cls: 6, n: 2 }]), RATING)).toBe(false));
  it("2 BBB+ + 5 BBB + 3 BBB- passes the rating rules", () => expect(ok(list([{ cls: 4, n: 2 }, { cls: 5, n: 5 }, { cls: 6, n: 3 }]), RATING)).toBe(true));
  it("5 AA + 5 A passes", () => expect(ok(list([{ cls: 2, n: 5 }, { cls: 3, n: 5 }]), RATING)).toBe(true));
  it("10 AAA passes (boundary of the scale)", () => expect(ok(list([{ cls: 1, n: 10 }]), RATING)).toBe(true));
  it("10 CC/C passes the window and core rules at the other boundary, but not the B+ limit", () => {
    const f = list([{ cls: 10, n: 10, weak: true }]);
    expect(ok(f, ["window", "core", "worst"])).toBe(true);
    expect(ok(f, ["weak"])).toBe(false);
  });
  it("9 A + 1 BBB- is rejected", () => expect(ok(list([{ cls: 3, n: 9 }, { cls: 6, n: 1 }]), RATING)).toBe(false));
  it("a single worst-class bond is rejected (rule C)", () => {
    const f = list([{ cls: 5, n: 9 }, { cls: 6, n: 1 }]);
    expect(ok(f, ["window", "core"])).toBe(true);
    expect(ok(f, ["worst"])).toBe(false);
  });
  it("three B+ or lower bonds break the B+ limit even inside the window", () => {
    expect(ok(list([{ cls: 8, n: 7, weak: false }, { cls: 8, n: 3, weak: true }]), ["weak"])).toBe(false);
    expect(ok(list([{ cls: 8, n: 8, weak: false }, { cls: 8, n: 2, weak: true }]), ["weak"])).toBe(true);
  });
});

describe("concentration rules (E, F, G)", () => {
  it("10 BBB with four bonds from one issuer group is rejected", () => {
    const f = list([{ cls: 5, n: 10 }], { groups: ["x", "x", "x", "x"] });
    expect(ok(f, RATING)).toBe(true);
    expect(ok(f, ["issuer"])).toBe(false);
    expect(all(f)).toBe(false);
  });
  it("10 A with six Financials bonds is rejected", () => {
    const f = list([{ cls: 3, n: 10 }], { sectors: Array(6).fill("Financials") });
    expect(ok(f, ["sector"])).toBe(false);
  });
  it("three Financials pass the sector limit; four from another sector fail", () => {
    expect(ok(list([{ cls: 3, n: 10 }], { sectors: ["Financials", "Financials", "Financials"] }), ["sector"])).toBe(true);
    expect(ok(list([{ cls: 3, n: 10 }], { sectors: Array(4).fill("Utilities") }), ["sector"])).toBe(false);
  });
  it("a bond carrying 32% of the expected loss is rejected, 24% passes", () => {
    // nine bonds of 1 and one of x: share = x / (9 + x)
    const f = (x: number) => list([{ cls: 5, n: 10 }], { pds: [x, 1, 1, 1, 1, 1, 1, 1, 1, 1] });
    expect(ok(f(9 * 0.32 / 0.68), ["loss"])).toBe(false);
    expect(ok(f(9 * 0.24 / 0.76), ["loss"])).toBe(true);
  });
  it("a list with zero total expected loss does not divide by zero", () => expect(ok(list([{ cls: 1, n: 10, pd: 0 }]), ["loss"])).toBe(true));
  it("passing one group of rules does not imply the others", () => {
    const f = list([{ cls: 3, n: 10 }], { sectors: Array(6).fill("Financials") });
    expect(ok(f, RATING)).toBe(true);
    expect(all(f)).toBe(false);
  });
  it("the risk ceiling is a maximum, not an obligation: a coherent A list under a BBB- ceiling is accepted", () => expect(all(list([{ cls: 3, n: 10 }]), 6)).toBe(true));
  it("a list worse than the ceiling is rejected", () => expect(ok(list([{ cls: 6, n: 10 }]), ["ceiling"], 5)).toBe(false));
  it("a list that is not ten bonds is rejected", () => expect(ok(list([{ cls: 3, n: 9 }]), ["count"])).toBe(false));
});

describe("issuer groups and sectors", () => {
  const dz = (issuer: string): Pick<PublicBond, "issuer" | "isin"> => ({ issuer, isin: "X" + issuer.length });
  it("the two DZ Bank names of the screenshot, and DZ HYP, are one issuer group", () => {
    const a = issuerGroupOf(dz("DZ Bank"));
    expect(issuerGroupOf(dz("DZ BANK AG Deutsche Zentral-Genossenschaftsbank"))).toBe(a);
    expect(issuerGroupOf(dz("DZ HYP"))).toBe(a);
    expect(sectorOf(dz("DZ Bank"))).toBe("Financials");
  });
  it("banks and insurers share the Financials sector", () => {
    expect(sectorOf(dz("Axa"))).toBe("Financials");
    expect(sectorOf(dz("Commerzbank"))).toBe("Financials");
  });
  it("subsidiaries join their parent (Erste, Vonovia, VINCI motorways)", () => {
    expect(issuerGroupOf(dz("Ceska Sporitelna as"))).toBe(issuerGroupOf(dz("Erste Group Bank")));
    expect(issuerGroupOf(dz("Deutsche Wohnen"))).toBe(issuerGroupOf(dz("Vonovia")));
    expect(issuerGroupOf(dz("Autoroutes du Sud de la France"))).toBe(issuerGroupOf(dz("Vinci")));
  });
  it("an issuer not in the table is its own group, unclassified, and never merged by name similarity", () => {
    const a = groupInfo(dz("Brand New Issuer SA")), b = groupInfo(dz("Brand New Issuer Holdings"));
    expect(a.sector).toBeNull();
    expect(sectorOf(dz("Brand New Issuer SA"))).toBe(UNCLASSIFIED);
    expect(a.group).not.toBe(b.group);
    expect(a.known).toBe(true);
  });
  it("a bond with no issuer name is unverified", () => expect(groupInfo({ issuer: null, isin: "DE000TEST001" }).known).toBe(false));
});

describe("policy", () => {
  it("defaults are the seven values of the brief", () => expect(DEFAULT_POLICY).toEqual({ maxDispersion: 2, minCore: 7, minWorst: 2, maxLossShare: 0.25, maxPerSector: 3, maxWeak: 2, maxPerIssuer: 1 }));
  it("editing cannot switch a rule off", () => {
    expect(cleanPolicy({ ...DEFAULT_POLICY, minCore: 0 })).toBeNull();
    expect(cleanPolicy({ ...DEFAULT_POLICY, maxDispersion: 9 })).toBeNull();
    expect(cleanPolicy({ ...DEFAULT_POLICY, maxLossShare: 1 })).toBeNull();
    expect(cleanPolicy({ ...DEFAULT_POLICY, maxPerSector: 10 })).toBeNull();
    expect(cleanPolicy({ ...DEFAULT_POLICY, maxPerIssuer: 2 })).toBeNull();
    expect(cleanPolicy({ ...DEFAULT_POLICY, minCore: 6 })?.minCore).toBe(6);
  });
  it("the signature changes with every value and with the version, and a loosened policy is flagged", () => {
    const a = policySignature(DEFAULT_POLICY);
    setPolicy({ ...DEFAULT_POLICY, maxPerSector: 4 }, "v3");
    expect(policySignature({ ...DEFAULT_POLICY, maxPerSector: 4 })).not.toBe(a);
    expect(policySignature()).toContain("v3");
    expect(policyChanges({ ...DEFAULT_POLICY, maxPerSector: 4 })).toEqual(["Maximum bonds per major sector"]);
    setPolicy(null);
    expect(policySignature()).toBe(a);
  });
  it("swaps and added bonds are not offered under the rules", () => expect(withoutListEdits(["swap", "add_left_out", "loss_chart"])).toEqual(["loss_chart"]));
  it("the credit profile comes from the chosen bonds", () => {
    const p = creditProfile(list([{ cls: 4, n: 2 }, { cls: 5, n: 5 }, { cls: 6, n: 3 }]), 6)!;
    expect([p.low, p.high, p.core, p.ceiling]).toEqual([4, 6, 8, 6]);
  });
  it("factsOf reads real bonds", () => {
    const b: PublicBond = { isin: "A", name: "A", issuer: "Engie", country: null, currency: "EUR", coupon: null, maturity: null, ratingSp: "BBB+", ratingMoodys: "Baa3", ratingFitch: null, ratingResolved: null, grossYtm: 3, modifiedDuration: 4, ytmAsOf: null };
    const f = factsOf(b);
    expect(f.cls).toBe(6); // the worst agency rating counts
    expect(f.sector).toBe("Utilities");
    expect(f.weak).toBe(false);
  });
});
