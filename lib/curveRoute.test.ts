import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/currentUser", () => ({ currentUser: async () => null }));

// The one-bond chart and the portfolio expected-loss chart need different data, so each has its own address.
// Regression: the loss chart once took over /api/bonds/curve and the one-bond chart went empty at every horizon.
describe("one-bond curve route", () => {
  it("returns risk steps with bonds, not the expected-loss curve", async () => {
    const { GET } = await import("@/app/api/bonds/curve/route");
    for (const currency of ["EUR", "USD"]) {
      const res = await GET(new Request(`http://x/api/bonds/curve?duration=8&currency=${currency}&size=all`));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body.points)).toBe(true);
      expect(body.points.length).toBeGreaterThan(0);
      for (const p of body.points) {
        expect(typeof p.level).toBe("number");
        expect(Array.isArray(p.options)).toBe(true);
      }
    }
  });
});
