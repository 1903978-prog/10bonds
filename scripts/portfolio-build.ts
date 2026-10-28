// The nightly build of every stored list a visitor can reach (docs/PORTFOLIO_SPEC.md): 4 filters (EUR/USD x All/1k-10k) x 15 horizons (the terms are years 2, 4 and 10)
// x 30 positions = 1,800 keys. Runs on a runner in the idle window, strictly one horizon at a time (concurrency 1), never in the website process.
//   - a list already saved for exactly these prices and this spec version is skipped (incremental, and the checkpoint: a stopped run resumes where it stopped);
//   - between horizons it waits while the website is busy (more than 2 events a second) and records the time paused;
//   - it records keys built / skipped / failed, peak memory and runtime in app.portfolio_builds (/admin/nightly-build).
// Needs the Bond Efficiency run of the current prices (the Portfolio Efficiency job makes it first). Usage: npx vite-node -c vitest.config.ts scripts/portfolio-build.ts
process.env.ALLOW_LIVE_SOLVE = "1";
import { loadAllShown, loadBondsFor } from "@/lib/bonds";
import { EXACT_YEARS, TERMS } from "@/lib/limits";
import { batchIdOf } from "@/lib/bes/store";
import { accountsSql } from "@/lib/accounts";
import { bandsKey } from "@/lib/riskBandsServe";
import { loadStoredBands } from "@/lib/riskBandsStore";
import { buildHorizon, horizonOfYear } from "@/lib/netSpread/build";
import { specConfig } from "@/lib/netSpread/config";
import { dominatedPositions, publishHorizon } from "@/lib/netSpread/publishBands";
import { loadBes } from "@/lib/netSpread/store";
import { SPEC_VERSION } from "@/lib/portfolioSpec";
import { POSITIONS as MATRIX_POSITIONS } from "@/lib/riskAnchors";
import { BUSY_PER_MINUTE, buildTablesReady, recentTraffic } from "@/lib/portfolioBuild";
import type { BondFilter } from "@/lib/bondFilter";

// PB_TERMS_ONLY=1 builds just the three term lists (2, 4 and 10 years) of the filters the 90-row snapshot needs, for the Efficient Database job.
const TERMS_ONLY = process.env.PB_TERMS_ONLY === "1";
const FILTERS: BondFilter[] = [{ currency: "EUR", size: "100k" }, { currency: "EUR", size: "1k" }, { currency: "USD", size: "100k" }, { currency: "USD", size: "1k" }].filter((f) => !TERMS_ONLY || f.currency !== "EUR" || f.size !== "100k") as BondFilter[];
const YEARS = TERMS_ONLY ? EXACT_YEARS.filter((y) => TERMS.some((t) => t.duration === y)) : EXACT_YEARS;
const MAX_PAUSE_MS = 30 * 60_000;
const mb = () => Math.round(process.memoryUsage().rss / 1048576);

await buildTablesReady();
const s = await accountsSql();
const t0 = Date.now();
const everything = (await loadAllShown()).bonds;
const batch = batchIdOf(everything);
const bes = await loadBes(batch);
if (!bes) { console.log("FAILED: no Bond Efficiency run for this price batch (run the Portfolio Efficiency job first)."); process.exit(1); }
const cfg = specConfig();
const [run] = await s`insert into app.portfolio_builds (trigger, status, price_batch, spec_version, keys_total) values (${process.env.PE_TRIGGER ?? "script"}, 'running', ${batch}, ${SPEC_VERSION}, ${FILTERS.length * YEARS.length * MATRIX_POSITIONS}) returning id`;
const id = Number(run.id);
let built = 0, skipped = 0, failed = 0, paused = 0, peak = mb();
const detail: Record<string, unknown>[] = [];
const save = (status: string, note: string | null = null) => s`update app.portfolio_builds set status = ${status}, keys_built = ${built}, keys_skipped = ${skipped}, keys_failed = ${failed}, paused_ms = ${paused}, peak_rss_mb = ${peak}, runtime_ms = ${Date.now() - t0}, finished_at = ${status === "running" ? null : new Date()}, note = ${note}, detail = ${s.json(detail as never)} where id = ${id}`;

/** Waits while visitors are busy (never longer than 30 minutes in total). */
async function throttle(): Promise<void> {
  while (paused < MAX_PAUSE_MS && (await recentTraffic().catch(() => 0)) > BUSY_PER_MINUTE) {
    console.log("  website busy: waiting 30 s");
    await new Promise((r) => setTimeout(r, 30_000));
    paused += 30_000;
  }
}

try {
  for (const f of FILTERS) {
    const src = await loadBondsFor(f);
    if (src.source !== "live") { console.log(`${f.currency}/${f.size}: no live bond data, skipped`); failed += YEARS.length * MATRIX_POSITIONS; continue; }
    for (const y of YEARS) {
      const key = bandsKey(src, f, y, cfg);
      const saved = await loadStoredBands(key);
      if (saved && !saved.stale && process.env.PB_FORCE !== "1") { skipped += MATRIX_POSITIONS; continue; }
      await throttle();
      const h0 = Date.now();
      try {
        const results = await buildHorizon({ bonds: src.bonds, bes: bes.bonds, seedKey: key, light: true }, horizonOfYear(y), y, 1);
        await publishHorizon(src, f, y, results);
        const count = (st: string) => results.filter((r) => r.status === st).length;
        const bad = count("error");
        built += MATRIX_POSITIONS - bad; failed += bad;
        peak = Math.max(peak, mb());
        const line = { filter: `${f.currency}/${f.size}`, year: y, lists: count("optimal") + count("uncertified"), infeasible: count("infeasible"), adjusted: results.filter((r) => (r.step ?? 0) >= 1).length, dominated: dominatedPositions(results).length, errors: bad, seconds: Math.round((Date.now() - h0) / 1000), rssMb: mb() };
        detail.push(line);
        console.log(JSON.stringify(line));
      } catch (e) {
        failed += MATRIX_POSITIONS;
        detail.push({ filter: `${f.currency}/${f.size}`, year: y, error: (e as Error).message.slice(0, 200) });
        console.log(`${f.currency}/${f.size} year ${y}: not solved (${(e as Error).message})`);
      }
      await save("running");
      if (global.gc) global.gc();
    }
  }
  await save(failed ? "partial" : "done");
  console.log(`\n${failed ? "PARTIAL" : "DONE"}: built ${built}, skipped ${skipped}, failed ${failed} of ${FILTERS.length * YEARS.length * MATRIX_POSITIONS} keys; peak memory ${peak} MB; runtime ${Math.round((Date.now() - t0) / 1000)} s; paused ${Math.round(paused / 1000)} s.`);
} catch (e) {
  await save("failed", (e as Error).message.slice(0, 300));
  console.log(`FAILED: ${(e as Error).message}`);
  process.exit(1);
}
await new Promise((done) => setTimeout(done, 2000));
process.exit(failed ? 1 : 0);
