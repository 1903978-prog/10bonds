import { describe, expect, it } from "vitest";
import { buildManifest, dataHash } from "./runManifest";
import type { BondSource } from "./bonds";
import { engineSignature } from "./enginePolicy";

const bond = (isin: string, y: number) => ({ isin, grossYtm: y, modifiedDuration: 4, maturity: "2030-01-01", ratingSp: "A" }) as never;
const src = (ys: number[]): BondSource => ({ source: "live", asOf: "2026-10-27", bonds: ys.map((y, i) => bond(`XS${i}`, y)) });

describe("run manifest", () => {
  it("names the data, engine, policy, solver and portfolio of a run", () => {
    const m = buildManifest({ src: src([3, 4]), inputs: { duration: 4, ytm: 4, risk: 10, filter: {} }, status: "READY", isins: ["XS0"], outputs: { ytm: 3, duration: 4, expectedLossPct: 0.5 } });
    expect(m.data).toMatchObject({ source: "live", asOf: "2026-10-27", bonds: 2 });
    expect(m.engine.signature).toBe(engineSignature());
    for (const k of ["policy", "tables", "models", "solver", "portfolio", "computedAt"]) expect(m).toHaveProperty(k);
    expect(m.solver.status).toBe("READY");
    expect(m.models.tailRisk).toBe("CVaR off");
  });
  it("changes the data hash when any price changes", () => {
    expect(dataHash(src([3, 4]))).toBe(dataHash(src([3, 4])));
    expect(dataHash(src([3, 4.01]))).not.toBe(dataHash(src([3, 4])));
  });
});
