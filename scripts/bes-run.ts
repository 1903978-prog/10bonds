// Bond Efficiency Score run (lib/bes). Runs on a GitHub runner, never in the web process. Skips a price batch that is already calculated,
// unless an admin asked for a recalculation (a 'requested' row) or --force is given. Usage: npx vite-node -c vitest.config.ts scripts/bes-run.ts [--force]
import { loadAllShown } from "@/lib/bonds";
import { runBes } from "@/lib/bes/store";
import { accountsSql } from "@/lib/accounts";

// Price coverage of the WHOLE bond copy (read-only), so missing prices can be traced to the data feed.
async function coverage(shown: number) {
  const url = process.env.DATABASE_URL;
  if (!url) return;
  const { default: postgres } = await import("postgres");
  const { cleanPgUrl } = await import("@/lib/pgUrl");
  const db = postgres(cleanPgUrl(url), { ssl: "require", max: 1, prepare: false, onnotice: () => {} });
  try {
    // The copy's columns differ between exports, so only count what exists.
    const cols = new Set((await db`select column_name from information_schema.columns where table_name = 'public_bonds'`).map((r) => r.column_name as string));
    const age = (lo: string | null, hi: string | null) => `count(*) filter (where ytm_as_of is not null${hi ? ` and ytm_as_of >= (select newest from n) - interval '${hi} days'` : ""}${lo ? ` and ytm_as_of < (select newest from n) - interval '${lo} days'` : ""})::int`;
    const parts: [string, string, string?][] = [
      ["no_ytm", "count(*) filter (where gross_ytm is null)::int", "gross_ytm"],
      ["no_duration", "count(*) filter (where modified_duration is null)::int", "modified_duration"],
      ["no_ytm_date", "count(*) filter (where ytm_as_of is null)::int", "ytm_as_of"],
      ["age_0_3", age(null, "3"), "ytm_as_of"],
      ["age_3_10", age("3", "10"), "ytm_as_of"],
      ["age_10_30", age("10", "30"), "ytm_as_of"],
      ["age_30_plus", age("30", null), "ytm_as_of"],
      ["no_clean_price", "count(*) filter (where clean_price is null)::int", "clean_price"],
      ["matured", "count(*) filter (where maturity <= current_date)::int", "maturity"],
      ["dormant", "count(*) filter (where dormant is true)::int", "dormant"],
      ["structure_not_modelled", "count(*) filter (where structure_modelled is false)::int", "structure_modelled"],
    ];
    const use = parts.filter(([, , col]) => !col || cols.has(col));
    const [c] = await db.unsafe(`with n as (select max(ytm_as_of) newest from public_bonds) select count(*)::int total, ${use.map(([k, e]) => `${e} ${k}`).join(", ")} from public_bonds`);
    console.log("\n### Price coverage of the whole bond copy (" + c.total + " bonds; " + shown + " shown on the site and scored)");
    for (const [k, v] of Object.entries(c)) console.log(`- ${k}: ${v}`);
  } finally { await db.end(); }
}

// Sanity report printed into the job summary: reasons, distributions, top and bottom 20.
async function report(run: number) {
  const s = await accountsSql();
  const line = (b: Record<string, unknown>) => `| ${b.bond_code ?? b.isin} | ${b.risk_class} | ${b.currency} | ${b.issuer_type} | ${Number(b.years_left).toFixed(1)} | ${Number(b.ytm).toFixed(2)} | ${Number(b.benchmark_yield).toFixed(2)} | ${Number(b.gross_spread_bp).toFixed(0)} | ${(Number(b.cumulative_pd) * 100).toFixed(2)}% | ${Number(b.annual_expected_loss_bp).toFixed(1)} | ${Number(b.credit_adjusted_spread_bp).toFixed(0)} | ${b.efficiency_peer_count} | ${b.efficiency_score} | ${b.efficiency_status} |`;
  const head = "| Code | Risk | Cur | Type | Yrs | YTM | Bench | Gross bp | PD cum | Loss bp/y | Net bp | Peers | BES | Status |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|---|";
  console.log("\n### Why bonds have no full score");
  for (const x of await s`select n, count(*)::int c from (select unnest(notes) n from app.bes_bonds where run_id = ${run} and efficiency_status <> 'valid') t group by 1 order by 2 desc limit 15`) console.log(`- ${x.n}: ${x.c}`);
  console.log("\n### By currency and status");
  for (const x of await s`select currency, efficiency_status st, count(*)::int c from app.bes_bonds where run_id = ${run} group by 1,2 order by 1,2`) console.log(`- ${x.currency} ${x.st}: ${x.c}`);
  console.log("\n### By risk class (bonds / scored / mean BES / mean net bp)");
  for (const x of await s`select risk_class, count(*)::int n, count(efficiency_score)::int sc, round(avg(efficiency_score),1) m, round(avg(credit_adjusted_spread_bp),0) net from app.bes_bonds where run_id = ${run} group by 1 order by 1`) console.log(`- risk ${x.risk_class}: ${x.n} / ${x.sc} / ${x.m} / ${x.net}`);
  console.log("\n### By maturity band (<2,2-4,4-7,7-10,10-16)");
  for (const x of await s`select width_bucket(years_left::float8, array[2,4,7,10,16]::float8[]) b, count(*)::int n, count(efficiency_score)::int sc, round(avg(efficiency_score),1) m, round(avg(credit_adjusted_spread_bp),0) net from app.bes_bonds where run_id = ${run} and years_left is not null group by 1 order by 1`) console.log(`- band ${x.b}: ${x.n} / ${x.sc} / ${x.m} / ${x.net}`);
  const dist = await s`select width_bucket(efficiency_score::float8, 0, 100.0001, 10) b, count(*)::int c from app.bes_bonds where run_id = ${run} and efficiency_score is not null group by 1 order by 1`;
  console.log("\n### BES distribution (deciles): " + dist.map((d) => `${d.b}:${d.c}`).join(" "));
  const nets = (await s`select percentile_cont(array[0,0.05,0.25,0.5,0.75,0.95,1]) within group (order by credit_adjusted_spread_bp) p from app.bes_bonds where run_id = ${run} and credit_adjusted_spread_bp is not null`)[0].p;
  console.log("Net spread bp percentiles (min,5,25,50,75,95,max): " + JSON.stringify(nets));
  const sets: [string, string][] = [["Top 20", "efficiency_score desc, credit_adjusted_spread_bp desc"], ["Bottom 20", "efficiency_score asc, credit_adjusted_spread_bp asc"]];
  for (const [name, ord] of sets) {
    console.log(`\n### ${name}\n${head}`);
    for (const b of await s.unsafe(`select * from app.bes_bonds where run_id = ${run} and efficiency_score is not null order by ${ord}, isin limit 20`)) console.log(line(b));
  }
  console.log(`\n### High YTM, poor BES (BES<25)\n${head}`);
  for (const b of await s`select * from app.bes_bonds where run_id = ${run} and efficiency_score < 25 order by ytm desc limit 10`) console.log(line(b));
  console.log(`\n### Moderate YTM, strong BES (BES>=80)\n${head}`);
  for (const b of await s`select * from app.bes_bonds where run_id = ${run} and efficiency_score >= 80 order by ytm asc limit 10`) console.log(line(b));
}

const force = process.argv.includes("--force");
const { bonds, source } = await loadAllShown();
if (source !== "live") { console.log("FAILED: no live bond data."); process.exit(1); }
console.log(`Bonds shown on the site: ${bonds.length}`);
const r = await runBes(bonds, process.env.BES_TRIGGER ?? "script", force);
console.log(`\n${r.status.toUpperCase()}: ${r.message}`);
if (r.runId && r.status !== "failed") await report(r.runId);
await coverage(bonds.length);
await new Promise((done) => setTimeout(done, 1500));
process.exit(r.status === "failed" ? 1 : 0);
