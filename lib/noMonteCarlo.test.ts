import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

// Monte Carlo was removed from 10bonds (owner decision 27/10/2026): no engine, no figures, no wording on any page, in any language.
const ROOTS = ["app", "components", "lib", "public"];
const TEXT = /\.(ts|tsx|json|md|txt|html|css)$/;
const SKIP = [/\.test\.ts$/, /^lib[\\/]noMonteCarlo/, /^lib[\\/]correlatedLoss\.ts$/, /^lib[\\/]seo[\\/]contentScores\.ts$/, /^components[\\/]seo[\\/]admin[\\/]/, /^lib[\\/]brokers[\\/]seed\.json$/];
const WORDS = /monte[ -]?carlo|simulazion|simulation|simulierte|\bsimulated (paths|scenarios)\b|portfolio_sim_|montecarlo/i;

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (TEXT.test(e.name)) out.push(p);
  }
  return out;
}

describe("no Monte Carlo anywhere", () => {
  it("no page, text or code file mentions it", () => {
    const hits: string[] = [];
    for (const f of ROOTS.filter((r) => fs.existsSync(r)).flatMap((r) => walk(r))) {
      if (SKIP.some((re) => re.test(f))) continue;
      fs.readFileSync(f, "utf8").split("\n").forEach((l, i) => { if (WORDS.test(l)) hits.push(`${f}:${i + 1}`); });
    }
    expect(hits).toEqual([]);
  });
  it("the engine file is gone", () => {
    expect(fs.existsSync("lib/monteCarlo.ts")).toBe(false);
  });
});
