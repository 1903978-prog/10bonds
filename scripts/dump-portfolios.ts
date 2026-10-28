// Prints the published Portfolio Efficiency run (90 positions, EUR / All) with the ten bonds of each, as one JSON block between markers, for the admin review page.
// Usage: npx vite-node -c vitest.config.ts scripts/dump-portfolios.ts
import { loadBondsFor } from "@/lib/bonds";
import { DEFAULT_FILTER } from "@/lib/bondFilter";
import { publishedRun, runPositions } from "@/lib/netSpread/store";

const run = await publishedRun();
if (!run) { console.log("No published run."); process.exit(1); }
const src = await loadBondsFor(DEFAULT_FILTER);
const by = new Map(src.bonds.map((b) => [b.isin, b]));
const rows = (await runPositions(Number(run.id))).map((p) => {
  const bonds = ((typeof p.bonds === "string" ? JSON.parse(p.bonds) : p.bonds) ?? []) as { isin: string; cls: number; dur: number; ns: number; ytm: number; sector?: string }[];
  return {
    horizon: p.horizon, position: p.position, allowed: p.allowed, status: p.status, repeatOf: p.repeat_of, reason: p.failure, candidates: p.candidates,
    ytm: p.ytm, duration: p.duration, avgRisk: p.avg_risk, riskMin: p.risk_min, riskMax: p.risk_max, gross: p.gross_spread_bp, loss: p.credit_loss_bp, net: p.net_spread_bp,
    bonds: bonds.map((b) => ({ isin: b.isin, name: by.get(b.isin)?.name ?? b.isin, issuer: by.get(b.isin)?.issuer ?? null, cls: b.cls, dur: b.dur, ns: b.ns, ytm: b.ytm })),
  };
});
console.log("PORTFOLIO_DUMP_START " + JSON.stringify({ run: Number(run.id), asOf: run.price_as_of, spec: run.method }));
for (const r of rows) console.log("PORTFOLIO_ROW " + JSON.stringify(r));
console.log("PORTFOLIO_DUMP_END");
process.exit(0);
