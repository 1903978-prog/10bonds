import { describe, expect, it, vi } from "vitest";
import { copyRecords, rankingRecords, rankingTruth, reportNewCopy, sendToSecval } from "./secvalQuality";

const raw = [
  { isin: "XS0000000015", name: "A 2031", issuer: "A", currency: "EUR", coupon: "3.000", maturity: new Date("2031-06-01T00:00:00Z"), gross_ytm: "3.5", modified_duration: "4.2", ytm_as_of: new Date("2026-11-05T06:00:00Z") },
  { isin: " xs0000000023", name: "B", issuer: null, currency: "EUR", coupon: null, maturity: null, gross_ytm: null, modified_duration: null, ytm_as_of: null },
];
const bond = { isin: "XS0000000015", grossYtm: 3.5, modifiedDuration: 4.2, rank: 1, score: 3.3 };

describe("secval data quality check", () => {
  it("sends the copy as stored, numbers as numbers, dates as ISO, with its source", () => {
    const [a, b] = copyRecords(raw, "2026-11-05T10:00:00.000Z");
    expect(a).toMatchObject({ isin: "XS0000000015", coupon: 3, gross_ytm: 3.5, maturity: "2031-06-01T00:00:00.000Z", ytm_as_of: "2026-11-05T06:00:00.000Z", source: "lm-op-model" });
    expect(a!.years_to_maturity).toBeCloseTo(4.57, 1);
    // Not cleaned up: a bad ISIN must reach secval as it is.
    expect(b).toMatchObject({ isin: " xs0000000023", coupon: null, maturity: null, years_to_maturity: null });
  });

  it("checks the stored ranking against the copy it was built from", () => {
    const recs = rankingRecords([{ duration: "5", level: 3, bond: JSON.stringify(bond) }], "2026-11-05T06:00:00Z");
    expect(recs[0]).toMatchObject({ duration: 5, level: 3, rank: 1, isin: "XS0000000015", loss_adjusted_yield: 3.3, as_of: "2026-11-05T06:00:00.000Z" });
    expect(rankingTruth(recs, [bond])).toEqual({ "5|3|XS0000000015": { gross_ytm: 3.5, modified_duration: 4.2 } });
  });

  it("does nothing without the token, sends both datasets with it", async () => {
    const deps = { rawCopy: async () => raw, storedRanking: async () => [{ duration: 5, level: 3, bond }] };
    const send = vi.fn(async (b: unknown) => (b as { dataset: string }).dataset);
    expect(await reportNewCopy({ bonds: [bond], asOf: null }, "sig", "2026-11-05T09:00:00Z", { ...deps, send, env: {} as Record<string, string | undefined> })).toEqual([]);
    expect(send).not.toHaveBeenCalled();
    const out = await reportNewCopy({ bonds: [bond], asOf: "2026-11-05T06:00:00Z" }, "sig", "2026-11-05T09:00:00Z", { ...deps, send, env: { SECVAL_QUALITY_TOKEN: "k" } as Record<string, string | undefined> });
    expect(out).toEqual(["10bonds.public_bonds", "10bonds.best_bonds"]);
    const best = send.mock.calls[1]![0] as { references: { public_bonds: string[] }; kind: string; app: string };
    expect(best.app).toBe("10bonds");
    expect(best.kind).toBe("recompute");
    expect(best.references.public_bonds).toEqual(["XS0000000015", "XS0000000023"]);
  });

  it("never throws when secval is down", async () => {
    const fail = (async () => { throw new Error("offline"); }) as unknown as typeof fetch;
    expect(await sendToSecval({}, { SECVAL_QUALITY_TOKEN: "k" } as Record<string, string | undefined>, fail)).toBe("not sent: offline");
    const ok = (async (url: string, init: RequestInit) => {
      expect(url).toBe("https://secval.onrender.com/api/quality/validate");
      expect((init.headers as Record<string, string>).authorization).toBe("Bearer k");
      return new Response(JSON.stringify({ dataset: "d", outcome: "PASS", score: 97 }));
    }) as unknown as typeof fetch;
    expect(await sendToSecval({}, { SECVAL_QUALITY_TOKEN: "k" } as Record<string, string | undefined>, ok)).toBe("d: PASS 97");
  });
});
