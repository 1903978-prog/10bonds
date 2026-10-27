import { describe, expect, it } from "vitest";
import { loadSolver } from "./highsSolver";

// A big solve makes the solver replace its worker thread (the WebAssembly memory never shrinks). Solves queued behind it
// must still all be answered, by the fresh worker.
const bigLp = (n: number, base: number) => {
  const vars = Array.from({ length: n }, (_, i) => `x${i}`);
  return ["Minimize", ` obj: ${vars.map((v, i) => `${base + (i % 7)} ${v}`).join(" + ")}`, "Subject To", ` c1: ${vars.join(" + ")} >= 1`, "Bounds", ...vars.map((v) => ` 0 <= ${v} <= 1`), "End"].join("\n");
};
const smallLp = "Minimize\n obj: 2 a + 3 b\nSubject To\n c1: a + b >= 4\nBounds\n 0 <= a <= 10\n 0 <= b <= 10\nEnd";

describe("solver worker", () => {
  it("answers every queued solve across the replacement of its worker after a big one", async () => {
    const solver = await loadSolver();
    const lp = bigLp(8000, 3);
    expect(lp.length).toBeGreaterThan(100_000);
    const [a, b, c, d] = await Promise.all([solver.solve(lp), solver.solve(smallLp), solver.solve(bigLp(8000, 5)), solver.solve(smallLp)]);
    expect(a.Status).toBe("Optimal");
    expect(a.ObjectiveValue).toBeCloseTo(3, 6);
    expect(b.ObjectiveValue).toBeCloseTo(8, 6);
    expect(c.ObjectiveValue).toBeCloseTo(5, 6);
    expect(d.ObjectiveValue).toBeCloseTo(8, 6);
    expect((await solver.solve(smallLp)).Status).toBe("Optimal");
  }, 60_000);
});
