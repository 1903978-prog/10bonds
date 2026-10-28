// Weekly US Treasury benchmark refresh (lib/usTreasury). Runs on a GitHub runner, never in the web process.
// Usage: npx vite-node -c vitest.config.ts scripts/ust-import.ts [--scheduled]   (--scheduled: only act when it is Monday 09:xx in Berlin)
import { fetchFed, fetchTreasury } from "@/lib/usTreasury/fetch";
import { ingestAll, getUsPar, getUsZero, getTreasurySelected } from "@/lib/usTreasury/store";
import { isBerlinMonday9 } from "@/lib/bundCurve/core";

const err = (e: unknown) => (e instanceof Error ? e : new Error(String(e)));

async function main() {
  const scheduled = process.argv.includes("--scheduled");
  if (scheduled && !isBerlinMonday9(new Date())) { console.log("Not Monday 09:xx in Berlin; the other cron (DST) handles it."); return; }
  const fed = await fetchFed().catch(err), tsy = await fetchTreasury().catch(err);
  const r = await ingestAll(fed, tsy, scheduled ? "weekly" : "manual-run");
  console.log(r.ok ? "OK" : "FAILED", r.message);
  const par = await getUsPar(), zero = await getUsZero(), sel = await getTreasurySelected();
  const zm = new Map((zero?.points ?? []).map((p) => [p.years, p]));
  const tm = new Map((sel?.points ?? []).map((p) => [p.years, p]));
  if (par) {
    console.log(`\n### US Treasury, Federal Reserve fitted par yield ${par.asOf} (previous week ${par.previousAsOf ?? "none saved yet"}); zero-coupon ${zero?.asOf ?? "none"}; Treasury published ${sel?.asOf ?? "none"}\n| Years | Fed par % | Previous week % | Change bp | Fed zero % | Treasury published % |\n|---|---|---|---|---|---|`);
    for (const p of par.points) console.log(`| ${p.years} | ${p.yield.toFixed(4)} | ${p.previous?.toFixed(4) ?? "–"} | ${p.changeBp ?? "–"} | ${zm.get(p.years)?.yield.toFixed(4) ?? "–"} | ${tm.get(p.years)?.yield.toFixed(2) ?? "–"} |`);
  }
  if (!r.ok) process.exit(1);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
