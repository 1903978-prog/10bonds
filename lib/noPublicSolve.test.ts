import { describe, expect, it, vi } from "vitest";

// Owner rule (28/10/2026): no public interaction solves. A list that is not stored is answered "being prepared"; the solver is never started.
const spy = vi.hoisted(() => ({ live: vi.fn(), highs: vi.fn() }));
vi.mock("@/lib/netSpread/live", () => ({ liveSpecList: spy.live }));
vi.mock("./netSpread/live", () => ({ liveSpecList: spy.live }));
vi.mock("@/lib/highsSolver", async (orig) => {
  const a = await orig<Record<string, unknown>>();
  return Object.fromEntries(Object.entries(a).map(([k, v]) => [k, typeof v === "function" ? spy.highs : v]));
});
vi.mock("@/lib/auth", async (orig) => ({ ...(await orig<object>()), currentUser: async () => null }));
vi.mock("@/lib/bonds", async (orig) => ({ ...(await orig<object>()), loadBondsFor: async () => ({ bonds: [], source: "live", asOf: "2026-10-28T00:00:00.000Z" }) }));
vi.mock("@/lib/riskBandsStore", async (orig) => ({ ...(await orig<object>()), loadStoredBands: async () => null }));

describe("public requests never call the solver", () => {
  for (const q of ["duration=2&band=5", "duration=4&band=15", "duration=10&band=30", "duration=7&band=9", "duration=2&band=5&stream=1"]) {
    it(`/api/bonds?${q} with no stored list starts no solve`, async () => {
      const { answer } = await import("@/lib/bondsAnswer");
      const res = await answer(new Request(`http://localhost/api/bonds?${q}`));
      expect([403, 503]).toContain(res.status); // 403 = an exact year is a Plus feature; neither starts a solve
      expect(spy.live).not.toHaveBeenCalled();
      expect(spy.highs).not.toHaveBeenCalled();
    });
  }
});
