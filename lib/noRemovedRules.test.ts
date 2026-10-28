import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { activeMethodology, methodologyFor } from "./methodologyChoice";
import { METHODOLOGIES } from "./methodologyList";

// Rules that were removed from the production engine (owner, 28/10/2026) must not come back. The production engine is the portfolio spec:
// lib/portfolioSpec.ts, lib/riskMatrix.ts, lib/netSpread/*, the snapshot (lib/sliderSnapshot*.ts) and the stored-list path that serves it.
const ENGINE = [
  "lib/portfolioSpec.ts", "lib/riskMatrix.ts", "lib/riskClassBands.ts",
  ...fs.readdirSync("lib/netSpread").filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts")).map((f) => `lib/netSpread/${f}`),
  "lib/sliderSnapshot.ts", "lib/sliderSnapshotBuild.ts", "lib/sliderSnapshotClient.ts",
  "lib/riskBandsServe.ts", "lib/riskBandsLive.ts", "lib/riskBandsAnswer.ts", "lib/methodologyChoice.ts",
  "app/api/slider-snapshot/route.ts", "scripts/precompute-bands.ts", "scripts/portfolio-efficiency.ts", "scripts/build-slider-snapshot.ts",
];
const read = (f: string) => fs.readFileSync(f, "utf8").split("\n").filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");

describe("removed rules stay removed", () => {
  it("the production engine has no 'max 2 weak bonds' rule, no coherence policy, no average-risk band slider, no sector lifting", () => {
    const bad = /maxWeak|MAX_WEAK|isWeak|frontierGuard|activePolicy|defaultBands|sectorCapLifted|perSector: 10|perSector: LIST_SIZE/;
    expect(ENGINE.filter((f) => bad.test(read(f)))).toEqual([]);
    // The editable average-risk bands (Methodology 3) are read only by the admin-only paths, never by the engine's own files.
    const m3 = ENGINE.filter((f) => /loadBandConfig\(\)/.test(read(f))).sort();
    expect(m3).toEqual(["lib/methodologyChoice.ts", "lib/riskBandsAnswer.ts", "lib/riskBandsServe.ts", "scripts/precompute-bands.ts"]);
  });
  it("no simulation anywhere in the engine files, and the simulation files are gone", () => {
    const sim = /monte[ -]?carlo|cvar|correlatedLoss|generateScenarios|simulat/i;
    expect(ENGINE.filter((f) => sim.test(read(f)))).toEqual([]);
    for (const gone of ["lib/correlatedLoss.ts", "lib/monteCarlo.ts", "scripts/quant-cvar-budgets.ts", "scripts/quant-correlation-impact.ts"]) expect(fs.existsSync(gone)).toBe(false);
    expect(read("lib/coherentFrontier.ts")).not.toMatch(/cvar|generateScenarios/i);
  });
  it("the public site runs Methodology 4 only; Methodologies 1 to 3 are admin-only, on demand", async () => {
    expect(await activeMethodology()).toBe(4);
    expect(await methodologyFor("1", false)).toBe(4);
    expect(await methodologyFor("3", false)).toBe(4);
    expect(await methodologyFor("5", false)).toBe(4);
    expect(await methodologyFor("5", true)).toBe(4);
    expect(await methodologyFor("2", true)).toBe(2);
    expect(await methodologyFor(null, true)).toBe(4);
    expect(METHODOLOGIES.filter((m) => m.production).map((m) => m.n)).toEqual([4]);
    expect(METHODOLOGIES.map((m) => m.n)).toEqual([1, 2, 3, 4]);
  });
  it("the nightly job and the admin rebuild read the same spec as the validator", () => {
    expect(read("lib/netSpread/build.ts")).toContain("specRules");
    expect(read("lib/netSpread/solve.ts")).toContain("PORTFOLIO_SPEC");
    expect(read("lib/netSpread/check.ts")).toContain("PORTFOLIO_SPEC");
    expect(read("lib/sliderSnapshotBuild.ts")).toContain("checkNsList");
    expect(read("lib/sliderSnapshot.ts")).toContain("specConfig");
    expect(read("scripts/precompute-bands.ts")).toContain("buildHorizon");
  });
});
