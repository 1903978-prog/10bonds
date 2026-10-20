import { describe, expect, it } from "vitest";
import type { PublicBond } from "../types";
import { bondAlternates, bondPagePath, bondPageUrls, bondTitle, isIsin, peerRank, relatedBonds } from "./bondPages";

const bond = (o: Partial<PublicBond>): PublicBond => ({
  isin: "DE000LB39CB2", name: "LBBW 3.802% 2031", issuer: "Landesbank Baden-Württemberg", country: "DE", currency: "EUR", coupon: 3.802, maturity: "2031-02-27",
  ratingSp: null, ratingMoodys: "A2", ratingFitch: null, ratingResolved: null, grossYtm: 3.1, modifiedDuration: 4, ytmAsOf: "2026-10-19T00:00:00Z", minInvestment: 1000, ...o,
});

describe("bond pages by ISIN", () => {
  it("recognises ISINs", () => {
    expect(isIsin("DE000LB39CB2")).toBe(true);
    expect(isIsin("IT0005398406")).toBe(true);
    expect(isIsin("de000lb39cb2")).toBe(false);
    expect(isIsin("btp-italia")).toBe(false);
  });
  it("puts the ISIN in the address and title in every language", () => {
    const b = bond({});
    expect(bondPagePath("en", b.isin)).toBe("/bonds/DE000LB39CB2");
    expect(bondPagePath("it", b.isin)).toBe("/it/obbligazioni/DE000LB39CB2");
    expect(bondTitle("en", b)).toBe("Landesbank Baden-Württemberg 3.802% Feb 2031 EUR Bond | DE000LB39CB2");
    expect(bondTitle("de", b)).toContain("DE000LB39CB2");
    const alt = bondAlternates("fr", b.isin)!;
    expect(alt.canonical).toBe("/fr/obligations/DE000LB39CB2");
    expect(Object.keys(alt.languages!)).toEqual(["en", "it-IT", "fr-FR", "de-DE", "x-default"]);
  });
  it("lists four addresses per bond in the sitemap", () => {
    expect(bondPageUrls("https://10bonds.com", ["DE000LB39CB2", "bad", "DE000LB39CB2"]).map((e) => e.url)).toEqual([
      "https://10bonds.com/bonds/DE000LB39CB2", "https://10bonds.com/it/obbligazioni/DE000LB39CB2", "https://10bonds.com/fr/obligations/DE000LB39CB2", "https://10bonds.com/de/anleihen/DE000LB39CB2",
    ]);
  });
  it("ranks among similar bonds and links one bond per other issuer", () => {
    const b = bond({});
    const all = [b, bond({ isin: "XS0000000001", issuer: "Other", grossYtm: 4 }), bond({ isin: "XS0000000002", issuer: "Other", grossYtm: 2 }), bond({ isin: "XS0000000003", issuer: "Far", modifiedDuration: 9, grossYtm: 9 }), bond({ isin: "DE0000000004", maturity: "2033-01-01" })];
    const r = peerRank(b, all)!;
    expect(r.rank).toBe(2);
    expect(r.of).toBe(4);
    const rel = relatedBonds(b, all);
    expect(rel.sameIssuer.map((x) => x.isin)).toEqual(["DE0000000004"]);
    expect(rel.similar.map((x) => x.issuer)).toEqual(["Other", "Far"]);
  });
});
