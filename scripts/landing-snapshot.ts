// Stores the landing's "top 10 bonds" slide as a fixed snapshot (lib/landingBonds.json), so the page needs no request.
// Same list as the home comparison card: EUR, 5 years, the benchmark's slider position. Run by the "Landing snapshot" workflow.
// Usage: npx vite-node -c vitest.config.ts scripts/landing-snapshot.ts
import { writeFileSync } from "node:fs";
import { benchmarkMatch } from "@/lib/benchmarkPortfolio";
import { getEtf } from "@/lib/etfBenchmark";
import { DEFAULT_FILTER } from "@/lib/bondFilter";
import { loadBondsFor } from "@/lib/bonds";
import { bestTableFor, curveAt } from "@/lib/bestTable";
import { RISK_LEVELS } from "@/lib/limits";
import { shapeCurve } from "@/lib/singleBond";
import { dominatedLevels, dropDominated } from "@/lib/curveFilter";

const etf = await getEtf();
// The slider lists are worked out in the background and can be empty on a cold start: try again for a few minutes.
let p = await benchmarkMatch(etf);
for (let i = 0; i < 20 && (!p || p.bonds.length < 10); i++) {
  await new Promise((r) => setTimeout(r, 15000));
  p = await benchmarkMatch(etf);
}
if (!p || p.bonds.length < 10) throw new Error(`No full top 10 yet (${p?.bonds.length ?? 0} bonds)`);
if (p.bonds.some((b) => b.risk == null || b.ytm == null || b.year == null)) throw new Error("A bond is missing risk, return or maturity");
const out = { asOf: p.asOf ?? new Date().toISOString().slice(0, 10), position: p.position ?? etf.position, term: p.term ?? null, ytm: p.ytm, avgRisk: p.avgRisk, duration: p.duration, etf: { risk: etf.risk, duration: etf.duration }, bonds: p.bonds.slice(0, 10) };
writeFileSync("lib/landingBonds.json", JSON.stringify(out, null, 2) + "\n");
console.log(JSON.stringify(out));

// The "one bond" slide (the owner, 26/10/2026): the finder's chart (best return per risk level at the short horizon, risk 8 to 1) and one
// real bond's card, from the same tables as /api/bonds/curve. Stored in lib/landingOneBond.json.
const DURATION = 2;
const [data, table] = await Promise.all([loadBondsFor(DEFAULT_FILTER), bestTableFor(DEFAULT_FILTER)]);
const curve = shapeCurve(curveAt(table, DURATION).map((c) => ({ ...c, label: RISK_LEVELS[c.level - 1].label })), "plus");
const onLine = dropDominated(curve).filter((c) => c.ytm !== null).map((c) => c.level);
const top = Math.min(7, Math.max(2, ...onLine));
const all = curve.filter((c) => c.level <= Math.min(top, 7)); // landing curve stops at risk 7 (owner, 27/10/2026)
const ghosts = new Set(dominatedLevels(all).map((c) => c.level));
const kept = dropDominated(all).filter((c) => c.ytm !== null);
// The example is the kept step closest to risk 4, so it is a typical middle bond.
const pick = [...kept].sort((a, b) => Math.abs(a.level - 4) - Math.abs(b.level - 4) || a.level - b.level)[0];
const o = pick?.options[0];
if (!pick || !o || !o.isin || o.coupon == null || !o.maturity || o.duration == null || o.risk == null) throw new Error("No complete example bond for the one-bond slide");
const one = {
  asOf: data.asOf ?? new Date().toISOString().slice(0, 10),
  duration: DURATION,
  points: all.map((c) => ({ level: c.level, ytm: c.ytm === null ? null : Math.round(c.ytm * 100) / 100, ghost: ghosts.has(c.level) })),
  bond: { level: pick.level, issuer: o.issuer, name: o.name ?? o.issuer, isin: o.isin, coupon: o.coupon, maturity: o.maturity, ytm: Math.round(o.ytm * 100) / 100, duration: Math.round(o.duration * 10) / 10, risk: o.risk, minInvestment: o.minInvestment ?? null, currency: o.currency ?? "EUR" },
};
writeFileSync("lib/landingOneBond.json", JSON.stringify(one, null, 2) + "\n");
console.log(JSON.stringify(one));
