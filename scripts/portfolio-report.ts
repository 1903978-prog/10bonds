// Rebuilds the three term horizons (Short, Medium, Long) of one currency x minimum order with the anchored-band engine, stores them (same stored-list path the
// website reads) and prints, per horizon, R1, R30 and the 30 rows with the ten bonds of each, as one line per row between markers.
// Usage: FILTER=EUR:100k npx vite-node -c vitest.config.ts scripts/portfolio-report.ts      (100k = "All", 1k = "1k-10k")
process.env.ALLOW_LIVE_SOLVE = "1";
import { loadAllShown, loadBondsFor } from "@/lib/bonds";
import { TERMS } from "@/lib/limits";
import { batchIdOf } from "@/lib/bes/store";
import { buildHorizon, HORIZON_NAMES } from "@/lib/netSpread/build";
import { publishHorizon } from "@/lib/netSpread/publishBands";
import { monotonicBreaks } from "@/lib/netSpread/publishBands";
import { loadBes } from "@/lib/netSpread/store";
import { bandLabel } from "@/lib/riskAnchors";
import type { BondFilter } from "@/lib/bondFilter";

const [currency, size] = (process.env.FILTER ?? "EUR:100k").split(":");
const f = { currency, size } as BondFilter;
const t0 = Date.now();
const everything = (await loadAllShown()).bonds;
const bes = await loadBes(batchIdOf(everything));
if (!bes) { console.log("FAILED: no Bond Efficiency run for this price batch."); process.exit(1); }
const src = await loadBondsFor(f);
if (src.source !== "live") { console.log("FAILED: no live bond data."); process.exit(1); }
const by = new Map(src.bonds.map((b) => [b.isin, b]));
console.log(`REPORT_START ${JSON.stringify({ filter: process.env.FILTER ?? "EUR:100k", bonds: src.bonds.length, asOf: src.asOf })}`);
for (const t of TERMS) {
  const h0 = Date.now();
  const results = await buildHorizon({ bonds: src.bonds, bes: bes.bonds, seedKey: "report", light: true }, HORIZON_NAMES[t.key], t.duration, 1);
  await publishHorizon(src, f, t.duration, results);
  const r = results[0];
  console.log(`HORIZON ${JSON.stringify({ horizon: HORIZON_NAMES[t.key], duration: t.duration, r1: r.r1 === null ? null : r.r1 / 10, r30: r.r30 === null ? null : r.r30 / 10, seconds: Math.round((Date.now() - h0) / 1000), breaks: monotonicBreaks(results) })}`);
  const seen = new Map<string, number>();
  for (const p of results) {
    const key = p.isins.join(",");
    const same = p.isins.length && seen.has(key) ? seen.get(key)! : null;
    if (p.isins.length && same === null) seen.set(key, p.position);
    console.log(`ROW ${JSON.stringify({
      horizon: HORIZON_NAMES[t.key], position: p.position, band: bandLabel(p.band), classes: `${p.band.classLo}-${p.band.classHi}`, step: p.step, status: p.status, sameAs: same, reason: p.failure,
      avgRisk: p.metrics?.avgRisk ?? null, riskMin: p.metrics?.minRisk ?? null, riskMax: p.metrics?.maxRisk ?? null, net: p.metrics?.netSpreadBp ?? null, gross: p.metrics?.grossSpreadBp ?? null, loss: p.metrics?.creditLossBp ?? null, dur: p.metrics?.duration ?? null, ytm: p.metrics?.ytm ?? null,
      bonds: p.bonds.map((b) => ({ isin: b.isin, issuer: by.get(b.isin)?.issuer ?? null, cls: b.cls, dur: b.dur, ns: b.ns, sector: b.sector })),
    })}`);
  }
}
console.log(`REPORT_END ${JSON.stringify({ seconds: Math.round((Date.now() - t0) / 1000), rssMb: Math.round(process.memoryUsage().rss / 1048576) })}`);
process.exit(0);
