import { describe, expect, it } from "vitest";
import { CONTENT, brokerPath, countryOfPath, sectionPath } from "./content";
import { PROFILES, SEED_TARIFFS } from "./data";
import { describeRule, purchaseCost, ruleFee } from "./fees";
import { scoreCountry } from "./score";
import { brokerMetadata, brokerSitemapEntries, methodologyMetadata, sectionMetadata } from "./seo";
import { currentOf, type PublicData } from "./store";
import { COUNTRIES, DEFAULT_METHODOLOGY, type BrokerProfile, type FeeRule, type Tariff, type TariffData } from "./types";
import { tariffProblems, profileProblems } from "./validate";
import { brokerLink, countryView } from "./view";

const src = { evidence: "quote", sourceUrl: "https://example.com/tariff.pdf" };

function tariff(over: Partial<TariffData> = {}): TariffData {
  return {
    eligible: true,
    accountType: "Standard",
    govBonds: { available: true, markets: "MOT", ...src },
    corpBonds: { available: true, markets: "MOT", ...src },
    foreignCurrencyBonds: { available: true, markets: "OTC", ...src },
    commissions: [{ appliesTo: ["domestic_gov", "eu_gov", "eu_corp", "fx_bond"], venue: "MOT", rule: { type: "percent", pct: 0.2, min: 5, max: null }, venueFee: null, venueFeeUncounted: null, conditions: null, bondSpecific: true, promo: null, ...src }],
    thirdPartyFees: [],
    custodyFee: { text: "None", annualEur: 0, ...src },
    accountFee: { text: "None", annualEur: 0, ...src },
    fxFee: { text: "0.25%", pct: 0.25, ...src },
    otherFees: null,
    minInvestment: null,
    taxAgent: { value: true, ...src },
    venues: ["MOT"],
    tariffDocUrl: "https://example.com/tariff.pdf",
    unverified: [],
    notes: null,
    ...over,
  };
}

const profile = (id: string, over: Partial<BrokerProfile["affiliate"]> = {}): BrokerProfile => ({
  id,
  name: id.toUpperCase(),
  website: `https://${id}.example`,
  regulator: null,
  affiliate: { program: "unverified", status: "none", url: null, model: null, trackingParams: null, contract: { start: null, end: null, notes: null }, sponsored: [], ...over },
});

describe("ruleFee", () => {
  it("applies the brief's example: MAX(amount x 0.20%, 5 EUR)", () => {
    const r = { type: "percent", pct: 0.2, min: 5, max: null } as const;
    expect(ruleFee(r, 1_000)).toBe(5);
    expect(ruleFee(r, 5_000)).toBe(10);
    expect(ruleFee(r, 50_000)).toBe(100);
  });
  it("caps at the maximum", () => {
    expect(ruleFee({ type: "percent", pct: 0.19, min: 2.95, max: 19 }, 50_000)).toBe(19);
    expect(ruleFee({ type: "percent", pct: 0.19, min: 2.95, max: 19 }, 1_000)).toBe(2.95);
  });
  it("handles fixed, fixed plus percent and tiers", () => {
    expect(ruleFee({ type: "fixed", fee: 1 }, 10_000)).toBe(1);
    expect(ruleFee({ type: "fixed_plus_percent", fee: 4.9, pct: 0.25, min: 9.9, max: 59.9 }, 1_000)).toBe(9.9);
    expect(ruleFee({ type: "fixed_plus_percent", fee: 4.9, pct: 0.25, min: 9.9, max: 59.9 }, 10_000)).toBe(29.9);
    expect(ruleFee({ type: "fixed_plus_percent", fee: 4.9, pct: 0.25, min: 9.9, max: 59.9 }, 50_000)).toBe(59.9);
    const tiers: FeeRule = { type: "tiered", tiers: [{ upTo: 500, fee: 1.99 }, { upTo: null, pct: 0.6 }] };
    expect(ruleFee(tiers, 500)).toBe(1.99);
    expect(ruleFee(tiers, 10_000)).toBe(60);
    expect(ruleFee({ type: "tiered", tiers: [{ upTo: 1_000, fee: 5.5 }, { upTo: null, pct: 0.48, min: 8.95 }] }, 1_200)).toBe(8.95);
  });
  it("treats orders above a tariff's published ceiling as not disclosed", () => {
    const t = tariff({ commissions: [{ appliesTo: ["domestic_gov"], venue: "Euronext", rule: { type: "tiered", tiers: [{ upTo: 8_000, fee: 13 }, { upTo: 50_000, pct: 0.2 }] }, venueFee: null, venueFeeUncounted: null, conditions: null, bondSpecific: true, promo: null, ...src }] });
    expect(purchaseCost(t, "domestic_gov", 50_000).total).toBe(100);
    expect(purchaseCost(t, "domestic_gov", 60_000).status).toBe("not_disclosed");
  });
  it("charges marginal brackets slice by slice (IBKR-style)", () => {
    const r: FeeRule = { type: "marginal", tiers: [{ upTo: 10_000, pct: 0.1 }, { upTo: null, pct: 0.025 }], min: null, max: null };
    expect(ruleFee(r, 5_000)).toBe(5);
    expect(ruleFee(r, 10_000)).toBe(10);
    expect(ruleFee(r, 50_000)).toBe(20);
  });
  it("rounds to the cent and refuses non-positive amounts", () => {
    expect(ruleFee({ type: "percent", pct: 0.123, min: null, max: null }, 1_001)).toBe(1.23);
    expect(() => ruleFee({ type: "fixed", fee: 1 }, 0)).toThrow();
  });
  it("describes rules in words", () => {
    const eur = (n: number) => `€${n}`;
    const pct = (n: number) => `${n}%`;
    expect(describeRule({ type: "percent", pct: 0.19, min: 2.95, max: 19 }, eur, pct, { min: "min", max: "max", upTo: "up to", above: "above" })).toBe("0.19%, min €2.95, max €19");
  });
});

describe("purchaseCost", () => {
  it("separates commission, third-party charges and FX", () => {
    const t = tariff({ thirdPartyFees: [{ description: "Venue fee", amount: "€2", rule: { type: "fixed", fee: 2 }, appliesTo: ["fx_bond", "eu_corp"], ...src }] });
    const c = purchaseCost(t, "fx_bond", 10_000);
    expect(c).toMatchObject({ status: "ok", commission: 20, thirdParty: 2, fx: 25, total: 47, totalPct: 0.47 });
    expect(purchaseCost(t, "domestic_gov", 10_000).total).toBe(20);
  });
  it("never estimates what is not published", () => {
    expect(purchaseCost(tariff({ commissions: [] }), "domestic_gov", 10_000).status).toBe("not_disclosed");
    expect(purchaseCost(tariff({ fxFee: { text: null, pct: null, ...src } }), "fx_bond", 10_000).status).toBe("not_disclosed");
    expect(purchaseCost(tariff({ govBonds: { available: null, markets: null, ...src } }), "domestic_gov", 10_000).status).toBe("not_disclosed");
  });
  it("marks categories the broker does not offer, and non-resident brokers", () => {
    expect(purchaseCost(tariff({ corpBonds: { available: false, markets: null, ...src } }), "eu_corp", 10_000).status).toBe("not_offered");
    expect(purchaseCost(tariff({ eligible: false }), "domestic_gov", 10_000).status).toBe("not_eligible");
  });
  it("adds the venue charge of the chosen venue and picks the cheapest venue overall", () => {
    const base = { appliesTo: ["domestic_gov" as const], conditions: null, bondSpecific: true, promo: null, ...src };
    const t = tariff({
      commissions: [
        { ...base, venue: "Xetra", rule: { type: "fixed", fee: 4 }, venueFee: { type: "percent", pct: 0.01, min: 1.5, max: null }, venueFeeUncounted: null },
        { ...base, venue: "Frankfurt", rule: { type: "fixed", fee: 4 }, venueFee: null, venueFeeUncounted: "Maklercourtage" },
      ],
    });
    // Frankfurt has an unquantified charge, so the fully published Xetra price is used.
    expect(purchaseCost(t, "domestic_gov", 50_000)).toMatchObject({ venue: "Xetra", commission: 4, thirdParty: 5, total: 9 });
    const x = tariff({ commissions: [t.commissions[1]] });
    expect(purchaseCost(x, "domestic_gov", 50_000)).toMatchObject({ venue: "Frankfurt", total: 4, thirdPartyUncounted: ["Maklercourtage"] });
  });
  it("lists published third-party charges it cannot compute", () => {
    const t = tariff({ thirdPartyFees: [{ description: "Exchange fee by venue", amount: "varies", rule: null, appliesTo: ["domestic_gov"], ...src }] });
    const c = purchaseCost(t, "domestic_gov", 5_000);
    expect(c.thirdPartyUncounted).toEqual(["Exchange fee by venue"]);
    expect(c.total).toBe(10);
  });
  it("never uses promotional rates, and picks the cheapest standard plan per order size", () => {
    const t = tariff({
      commissions: [
        { appliesTo: ["domestic_gov"], venue: "MOT", rule: { type: "fixed", fee: 0 }, venueFee: null, venueFeeUncounted: null, conditions: null, bondSpecific: true, promo: { description: "Free until year end", expires: "2026-12-31" }, ...src },
        { appliesTo: ["domestic_gov"], venue: "MOT", rule: { type: "fixed", fee: 19 }, venueFee: null, venueFeeUncounted: null, conditions: null, bondSpecific: true, promo: null, ...src },
        { appliesTo: ["domestic_gov"], venue: "MOT", rule: { type: "percent", pct: 0.19, min: 2.95, max: 19 }, venueFee: null, venueFeeUncounted: null, conditions: null, bondSpecific: false, promo: null, ...src },
      ],
    });
    expect(purchaseCost(t, "domestic_gov", 5_000)).toMatchObject({ total: 9.5, bondSpecific: false });
    expect(purchaseCost(t, "domestic_gov", 50_000)).toMatchObject({ total: 19, bondSpecific: true });
  });
});

describe("tariff effective dates", () => {
  const v = (effectiveFrom: string, fee: number, status: Tariff["status"] = "published", version = 1): Tariff => ({
    brokerId: "x", country: "it", effectiveFrom, verifiedAt: effectiveFrom, status, version,
    data: tariff({ commissions: [{ appliesTo: ["domestic_gov"], venue: "MOT", rule: { type: "fixed", fee }, venueFee: null, venueFeeUncounted: null, conditions: null, bondSpecific: true, promo: null, ...src }] }),
  });
  it("uses the latest published version already in force", () => {
    const versions = [v("2026-01-01", 5, "published", 1), v("2026-11-01", 7, "published", 2), v("2026-10-01", 6, "draft", 3)];
    expect(currentOf(versions, "2026-10-18")?.effectiveFrom).toBe("2026-01-01");
    expect(currentOf(versions, "2026-11-01")?.effectiveFrom).toBe("2026-11-01");
    expect(currentOf([v("2027-01-01", 1)], "2026-10-18")).toBeNull();
  });
  it("ignores drafts and archived versions", () => {
    expect(currentOf([v("2026-01-01", 1, "draft"), v("2026-01-01", 1, "archived")], "2026-10-18")).toBeNull();
  });
});

describe("scoring", () => {
  const rows = [
    { brokerId: "cheap", data: tariff({ commissions: [{ appliesTo: ["domestic_gov", "eu_corp"], venue: "MOT", rule: { type: "fixed", fee: 1 }, venueFee: null, venueFeeUncounted: null, conditions: null, bondSpecific: true, promo: null, ...src }] }) },
    { brokerId: "dear", data: tariff() },
    { brokerId: "abroad", data: tariff({ eligible: false }) },
  ];
  it("gives the cheapest broker the full cost score and leaves out ineligible brokers", () => {
    const s = scoreCountry(rows, DEFAULT_METHODOLOGY);
    expect(s.map((x) => x.brokerId)).toEqual(["cheap", "dear"]);
    expect(s[0].criteria.cost).toBe(100);
    expect(s[1].criteria.cost).toBe(0);
    expect(s[0].overall).toBeGreaterThan(s[1].overall);
  });
  it("is deterministic and bounded 0-100", () => {
    const a = scoreCountry(rows, DEFAULT_METHODOLOGY);
    expect(scoreCountry(rows, DEFAULT_METHODOLOGY)).toEqual(a);
    for (const x of a) for (const v of [x.overall, ...Object.values(x.criteria)]) expect(v >= 0 && v <= 100).toBe(true);
  });
  it("lowers transparency for unverified fees", () => {
    const s = scoreCountry([{ brokerId: "a", data: tariff({ unverified: ["custodyFee", "fxFee"] }) }], DEFAULT_METHODOLOGY);
    expect(s[0].criteria.transparency).toBe(75);
  });
});

describe("commercial independence", () => {
  const data = (aff: Partial<BrokerProfile["affiliate"]>): PublicData => ({
    profiles: [profile("cheap"), profile("dear", aff)],
    tariffs: [
      { brokerId: "cheap", country: "it", effectiveFrom: "2026-01-01", verifiedAt: "2026-10-01", status: "published", data: tariff({ commissions: [{ appliesTo: ["domestic_gov", "eu_corp"], venue: "MOT", rule: { type: "fixed", fee: 1 }, venueFee: null, venueFeeUncounted: null, conditions: null, bondSpecific: true, promo: null, ...src }] }) },
      { brokerId: "dear", country: "it", effectiveFrom: "2026-01-01", verifiedAt: "2026-10-01", status: "published", data: tariff() },
    ],
    methodology: DEFAULT_METHODOLOGY,
    countries: { it: { published: true, excluded: [], intro: null }, fr: { published: false, excluded: [], intro: null }, de: { published: false, excluded: [], intro: null } },
    source: "seed",
  });
  it("an active affiliate deal or sponsorship never changes scores or order", () => {
    const plain = countryView(data({}), "it", "2026-10-18");
    const paid = countryView(data({ status: "active", url: "https://track.example/x", model: "cpa", sponsored: ["it"] }), "it", "2026-10-18");
    expect(paid.rows.map((r) => [r.profile.id, r.score])).toEqual(plain.rows.map((r) => [r.profile.id, r.score]));
    expect(paid.sponsored.map((p) => p.id)).toEqual(["dear"]);
    expect(plain.sponsored).toEqual([]);
  });
  it("uses affiliate links only for active agreements, labelled sponsored", () => {
    expect(brokerLink(profile("a", { status: "negotiating", url: "https://t.example" }), "it")).toEqual({ href: "https://a.example", kind: "official", rel: "nofollow noopener" });
    const l = brokerLink(profile("a", { status: "active", url: "https://t.example/r?id=1", trackingParams: "utm_source=10bonds" }), "it");
    expect(l).toEqual({ href: "https://t.example/r?id=1&utm_source=10bonds", kind: "affiliate", rel: "sponsored nofollow noopener" });
  });
  it("flags tariffs older than the verification interval and respects exclusions", () => {
    const d = data({});
    expect(countryView(d, "it", "2026-10-31").rows.every((r) => !r.overdue)).toBe(true);
    expect(countryView(d, "it", "2026-11-01").rows.every((r) => r.overdue)).toBe(true);
    d.countries.it.excluded = [{ id: "dear", reason: "test" }];
    expect(countryView(d, "it", "2026-10-18").rows.map((r) => r.profile.id)).toEqual(["cheap"]);
  });
});

describe("localisation and SEO", () => {
  it("has a page per market under /it, /fr, /de with the requested titles", () => {
    expect(sectionPath("it")).toBe("/it/broker-obbligazioni");
    expect(sectionPath("fr")).toBe("/fr/courtiers-obligations");
    expect(sectionPath("de")).toBe("/de/anleihen-broker");
    expect(CONTENT.it.sectionTitle).toBe("Migliori Broker per Obbligazioni");
    expect(CONTENT.fr.sectionTitle).toBe("Meilleurs Courtiers pour les Obligations");
    expect(CONTENT.de.sectionTitle).toBe("Beste Broker für Anleihen");
    expect(countryOfPath("/de/anleihen-broker/x")).toBe("de");
  });
  it("translates every label in every language", () => {
    const keys = (o: object): string[] => Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" && !Array.isArray(v) ? keys(v).map((x) => `${k}.${x}`) : [k]));
    const base = keys(CONTENT.it.ui).sort();
    for (const c of COUNTRIES) {
      expect(keys(CONTENT[c].ui).sort()).toEqual(base);
      for (const v of Object.values(CONTENT[c].ui)) if (typeof v === "string") expect(v.trim()).not.toBe("");
    }
  });
  it("writes country-specific copy, not the same text translated", () => {
    expect(CONTENT.it.editorial.map((e) => e.h).join(" ")).toMatch(/BTP/);
    expect(CONTENT.fr.editorial.map((e) => e.h).join(" ")).toMatch(/OAT/);
    expect(CONTENT.de.editorial.map((e) => e.h).join(" ")).toMatch(/Bundesanleihen/);
  });
  it("gives unique titles, self canonicals and hreflang between the three pages", () => {
    const titles = new Set(COUNTRIES.map((c) => String(sectionMetadata(c, true).title)));
    expect(titles.size).toBe(3);
    for (const c of COUNTRIES) {
      const m = sectionMetadata(c, true);
      expect(m.alternates?.canonical).toMatch(new RegExp(`${sectionPath(c)}$`));
      expect(Object.keys(m.alternates?.languages ?? {}).sort()).toEqual(["de-DE", "fr-FR", "it-IT", "x-default"]);
      expect(m.robots).toEqual({ index: true, follow: true });
      expect((m.description ?? "").length).toBeGreaterThan(80);
    }
    expect(sectionMetadata("it", false).robots).toEqual({ index: false, follow: false });
    expect(methodologyMetadata("fr", true).alternates?.canonical).toMatch(/\/fr\/courtiers-obligations\/methodologie$/);
  });
  it("links broker profiles only to languages where the broker is listed", () => {
    const m = brokerMetadata("it", "fineco", "Fineco", ["it"], true);
    expect(Object.keys(m.alternates?.languages ?? {})).toEqual(["it-IT"]);
    expect(m.alternates?.canonical).toMatch(new RegExp(`${brokerPath("it", "fineco")}$`));
  });
  it("puts only published markets in the sitemap", () => {
    const e = brokerSitemapEntries({ it: true, fr: false, de: false }, { it: [PROFILES[0].id], fr: [], de: [] });
    expect(e.every((x) => x.url.includes("/it/"))).toBe(true);
    expect(e.length).toBe(3);
  });
});

describe("researched data", () => {
  it("every listed tariff is valid and cites an official https source", () => {
    for (const t of SEED_TARIFFS) {
      expect(tariffProblems(t.data), `${t.brokerId}-${t.country}`).toEqual([]);
      expect(PROFILES.some((p) => p.id === t.brokerId), t.brokerId).toBe(true);
      expect(/^\d{4}-\d{2}-\d{2}$/.test(t.verifiedAt)).toBe(true);
      if (t.data.eligible) expect(t.data.tariffDocUrl, `${t.brokerId}-${t.country}`).toMatch(/^https:\/\//);
    }
  });
  it("profiles are valid and no affiliate link is active before an agreement", () => {
    for (const p of PROFILES) {
      expect(profileProblems(p), p.id).toEqual([]);
      expect(p.affiliate.status).toBe("none");
    }
  });
  it("shows at most ten brokers per market", () => {
    for (const c of COUNTRIES) {
      const v = countryView({ profiles: PROFILES, tariffs: SEED_TARIFFS, methodology: DEFAULT_METHODOLOGY, countries: { it: { published: true, excluded: [], intro: null }, fr: { published: true, excluded: [], intro: null }, de: { published: true, excluded: [], intro: null } }, source: "seed" }, c, "2026-10-18");
      expect(v.rows.length).toBeLessThanOrEqual(10);
      expect(v.rows.length).toBeGreaterThan(0);
    }
  });
});
