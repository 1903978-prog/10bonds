// Prints the exact 10 bonds of one stored slider position (default: Medium, position 15 = row 45) for EUR and USD, All sizes, from the stored lists.
// Read-only. Usage: POSITION=15 TERM=1 npx vite-node -c vitest.config.ts scripts/show-portfolio.ts
import { loadBondsFor } from "@/lib/bonds";
import { loadStoredBands } from "@/lib/riskBandsStore";
import { specConfig } from "@/lib/netSpread/config";
import { bandsKey } from "@/lib/riskBandsServe";
import { TERMS } from "@/lib/limits";
import { bondRisk } from "@/lib/ratings";
import type { BondFilter } from "@/lib/bondFilter";

const position = Number(process.env.POSITION ?? 15);
const term = Number(process.env.TERM ?? 1);
const t = TERMS[term];
for (const currency of ["EUR", "USD"] as const) {
  const bf = { currency, size: "100k" } as BondFilter;
  const src = await loadBondsFor(bf);
  const got = await loadStoredBands(bandsKey(src, bf, t.duration, specConfig()));
  console.log(`\n## ${t.key ?? term} ${currency} All, position ${position} (row ${term * 30 + position}); price data ${src.asOf}; stored lists ${got ? (got.stale ? "STALE" : "current") : "MISSING"}`);
  const sb = got?.data.bands[position - 1];
  if (!sb || sb.status !== "ok") { console.log(`no list: ${sb?.reason ?? "not stored"}`); continue; }
  const by = new Map(src.bonds.map((b) => [b.isin, b]));
  console.log(`return ${sb.ytm?.toFixed(2)}%/yr · avg risk ${sb.avgRisk} · duration ${sb.avgDur?.toFixed(2)} y · expected loss ${sb.el?.toFixed(2)}% · ladder ${sb.ladder ?? 0} · optimal ${sb.optimal}` + (sb.eff ? ` · gross ${sb.eff.grossBp} bp, loss ${sb.eff.lossBp} bp, net ${sb.eff.netBp} bp` : ""));
  console.log("\n| # | ISIN | Issuer | Coupon % | Maturity | Rating | Risk | Yield % | Duration | Weight |\n|---:|---|---|---:|---|---|---:|---:|---:|---:|");
  [...sb.isins].forEach((i, n) => {
    const b = by.get(i);
    console.log(`| ${n + 1} | ${i} | ${b?.issuer ?? b?.name ?? "?"} | ${b?.coupon ?? "–"} | ${b?.maturity ?? "–"} | ${b?.ratingResolved ?? "–"} | ${b ? bondRisk(b) : "–"} | ${b?.grossYtm?.toFixed(2) ?? "–"} | ${b?.modifiedDuration?.toFixed(2) ?? "–"} | 10% |`);
  });
}
process.exit(0);
