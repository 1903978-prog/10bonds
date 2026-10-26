// Stores the landing's "top 10 bonds" slide as a fixed snapshot (lib/landingBonds.json), so the page needs no request.
// Same list as the home comparison card: EUR, 5 years, the benchmark's slider position. Run by the "Landing snapshot" workflow.
// Usage: npx vite-node -c vitest.config.ts scripts/landing-snapshot.ts
import { writeFileSync } from "node:fs";
import { benchmarkPortfolio } from "@/lib/benchmarkPortfolio";
import { getEtf } from "@/lib/etfBenchmark";

const etf = await getEtf();
// The slider lists are worked out in the background and can be empty on a cold start: try again for a few minutes.
let p = await benchmarkPortfolio(etf.position);
for (let i = 0; i < 20 && (!p || p.bonds.length < 10); i++) {
  await new Promise((r) => setTimeout(r, 15000));
  p = await benchmarkPortfolio(etf.position);
}
if (!p || p.bonds.length < 10) throw new Error(`No full top 10 yet (${p?.bonds.length ?? 0} bonds)`);
if (p.bonds.some((b) => b.risk == null || b.ytm == null || b.year == null)) throw new Error("A bond is missing risk, return or maturity");
const out = { asOf: p.asOf ?? new Date().toISOString().slice(0, 10), position: etf.position, bonds: p.bonds.slice(0, 10) };
writeFileSync("lib/landingBonds.json", JSON.stringify(out, null, 2) + "\n");
console.log(JSON.stringify(out));
