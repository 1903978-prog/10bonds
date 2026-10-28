import { NextResponse } from "next/server";
import { currentUser } from "@/lib/currentUser";
import { accountsSql } from "@/lib/accounts";
import { besTablesReady } from "@/lib/bes/store";
import { besLabel } from "@/lib/bes/math";
import { SP_CORPORATE, SP_CORPORATE_SOURCE, SP_CORPORATE_YEARS } from "@/lib/bes/spReference";
import { SOVEREIGN_RATES, SOVEREIGN_YEARS } from "@/lib/sovereign";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };

async function admin() {
  const u = await currentUser();
  return u?.isAdmin && u.adminState === "ok" ? u : null;
}

/** Admin only. No query = dashboard; ?list=1&... = filtered table; ?isin= = one bond in full; ?ref=1 = the reference default tables. */
export async function GET(req: Request) {
  if (!(await admin())) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await besTablesReady();
  const s = await accountsSql();
  const q = new URL(req.url).searchParams;
  const [run] = await s`select * from app.bes_runs where status = 'published' order by id desc limit 1`;
  if (q.get("ref")) {
    return NextResponse.json({ corporate: { source: SP_CORPORATE_SOURCE, years: SP_CORPORATE_YEARS, rows: SP_CORPORATE }, sovereign: { years: SOVEREIGN_YEARS, rows: SOVEREIGN_RATES, note: "foreign-currency, S&P 2025 sovereign study Table 16; local-currency table not loaded" }, interpolation: "linear on survival probability between published horizons, from survival 1 at t = 0; null beyond 15 years" }, { headers: NO_STORE });
  }
  const runs = await s`select id, status, trigger, requested_at, started_at, finished_at, runtime_ms, batch_id, error from app.bes_runs order by id desc limit 8`;
  if (!run) return NextResponse.json({ run: null, runs }, { headers: NO_STORE });
  const isin = q.get("isin");
  if (isin) {
    const [b] = await s`select * from app.bes_bonds where run_id = ${run.id} and (isin = ${isin} or bond_code = ${isin})`;
    return NextResponse.json({ run: { id: run.id, method: run.method, reference: run.reference_version }, bond: b ?? null }, { headers: NO_STORE });
  }
  if (q.get("list")) {
    const where: string[] = []; const vals: unknown[] = [run.id];
    const add = (col: string, v: string | null, op = "=") => { if (v) { vals.push(v); where.push(`${col} ${op} $${vals.length}`); } };
    add("currency", q.get("currency")); add("issuer_type", q.get("issuerType")); add("risk_class", q.get("risk"), "="); add("efficiency_status", q.get("status")); add("sector", q.get("sector"));
    add("years_left", q.get("minYears"), ">="); add("years_left", q.get("maxYears"), "<="); add("efficiency_score", q.get("minBes"), ">="); add("efficiency_score", q.get("maxBes"), "<=");
    const sort = q.get("sort") === "net" ? "credit_adjusted_spread_bp" : "efficiency_score";
    const dir = q.get("dir") === "asc" ? "asc" : "desc";
    const page = Math.max(0, Number(q.get("page") ?? 0) | 0);
    const sqlText = `select isin, bond_code, risk_class, rating_equivalent, currency, issuer_type, sector, years_left, ytm, benchmark_yield, gross_spread_bp, cumulative_pd, annual_expected_loss_bp, credit_adjusted_spread_bp, efficiency_score, efficiency_peer_count, efficiency_status from app.bes_bonds where run_id = $1 ${where.length ? "and " + where.join(" and ") : ""} order by ${sort} ${dir} nulls last, isin limit 50 offset ${page * 50}`;
    const rows = await s.unsafe(sqlText, vals as never[]);
    const [{ n }] = await s.unsafe(`select count(*)::int n from app.bes_bonds where run_id = $1 ${where.length ? "and " + where.join(" and ") : ""}`, vals as never[]);
    return NextResponse.json({ rows, total: n, page }, { headers: NO_STORE });
  }
  const byRisk = await s`select risk_class, count(*)::int n, count(efficiency_score)::int scored, round(avg(efficiency_score), 1) mean_bes, round(avg(credit_adjusted_spread_bp), 1) mean_net from app.bes_bonds where run_id = ${run.id} and risk_class is not null group by 1 order by 1`;
  const byBucket = await s`select width_bucket(years_left::float8, array[2,4,7,10,16]::float8[]) b, count(*)::int n, count(efficiency_score)::int scored, round(avg(efficiency_score), 1) mean_bes, round(avg(credit_adjusted_spread_bp), 1) mean_net from app.bes_bonds where run_id = ${run.id} and years_left is not null group by 1 order by 1`;
  const reasons = await s`select n, count(*)::int c from (select unnest(notes) n from app.bes_bonds where run_id = ${run.id} and efficiency_status <> 'valid') t group by 1 order by 2 desc limit 12`;
  const top = await s`select * from app.bes_bonds where run_id = ${run.id} and efficiency_score is not null order by efficiency_score desc, credit_adjusted_spread_bp desc, isin limit 20`;
  const bottom = await s`select * from app.bes_bonds where run_id = ${run.id} and efficiency_score is not null order by efficiency_score asc, credit_adjusted_spread_bp asc, isin limit 20`;
  const highYtmPoor = await s`select * from app.bes_bonds where run_id = ${run.id} and efficiency_score is not null and efficiency_score < 25 order by ytm desc limit 10`;
  const modYtmStrong = await s`select * from app.bes_bonds where run_id = ${run.id} and efficiency_score >= 80 order by ytm asc limit 10`;
  const filters = await s`select array_agg(distinct currency) c, array_agg(distinct issuer_type) t, array_agg(distinct sector) s from app.bes_bonds where run_id = ${run.id}`;
  const portfolios = await s`
    select h.horizon, p.position, count(*)::int n, count(b.efficiency_score)::int scored, round(avg(b.efficiency_score), 1) avg_bes, min(b.efficiency_score) min_bes, max(b.efficiency_score) max_bes, round(avg(b.credit_adjusted_spread_bp), 1) avg_net
    from app.efficient_portfolio_snapshots sn
    join app.efficient_portfolio_positions p on p.snapshot_id = sn.id
    join app.efficient_portfolio_holdings h on h.snapshot_id = p.snapshot_id and h.portfolio_id = p.portfolio_id and h.horizon = p.horizon
    left join app.bes_bonds b on b.run_id = ${run.id} and b.isin = h.isin
    where sn.id = (select id from app.efficient_portfolio_snapshots where status = 'published' order by id desc limit 1)
    group by h.horizon, p.position order by 1, 2`.catch(() => []);
  return NextResponse.json({ run, runs, byRisk, byBucket, reasons, top, bottom, highYtmPoor, modYtmStrong, filters: filters[0], portfolios, label: besLabel(50) }, { headers: NO_STORE });
}

/** Asks for a recalculation. Nothing is calculated here: the next "Bond Efficiency" runner job (at most 3 hours, or start it by hand) picks the request up. */
export async function POST() {
  const u = await admin();
  if (!u) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await besTablesReady();
  const s = await accountsSql();
  const [open] = await s`select id from app.bes_runs where status = 'requested' limit 1`;
  if (open) return NextResponse.json({ message: `A recalculation is already requested (#${open.id}).` }, { headers: NO_STORE });
  const [r] = await s`insert into app.bes_runs (batch_id, status, trigger, requested_by) values ('', 'requested', 'admin', ${u.email ?? "admin"}) returning id`;
  return NextResponse.json({ message: `Requested (#${r.id}). The background job picks it up within 3 hours.` }, { headers: NO_STORE });
}
