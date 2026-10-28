// Weekly Bund benchmark refresh (lib/bundCurve). Runs on a GitHub runner, never in the web process.
// Usage: npx vite-node -c vitest.config.ts scripts/bund-import.ts [--scheduled]   (--scheduled: only act when it is Monday 09:xx in Berlin)
import { fetchOfficial } from "@/lib/bundCurve/fetch";
import { ingest, getBundCurve } from "@/lib/bundCurve/store";
import { isBerlinMonday9 } from "@/lib/bundCurve/core";

async function main() {
  const scheduled = process.argv.includes("--scheduled");
  if (scheduled && !isBerlinMonday9(new Date())) { console.log("Not Monday 09:xx in Berlin; the other cron (DST) handles it."); return; }
  const r = await ingest(await fetchOfficial(), scheduled ? "weekly" : "manual-run");
  console.log(r.ok ? "OK" : "FAILED", r.message);
  for (const t of ["ZAR", "ZST"] as const) {
    const c = await getBundCurve(t);
    if (!c) continue;
    console.log(`\n### ${t} ${c.asOf} (previous week ${c.previousAsOf ?? "none saved yet"})\n| Years | Yield % | Change bp |\n|---|---|---|`);
    for (const p of c.points) console.log(`| ${p.years} | ${p.yield.toFixed(2)} | ${p.changeBp ?? "–"} |`);
  }
  if (!r.ok) process.exit(1);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
