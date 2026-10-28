// Read-only: per published Efficient Database snapshot and horizon, the infeasible positions, adjusted positions, positions beaten by a lower position
// (no more return for more risk) and the live-check table (positions 1, 10, 20, 30: return, loss, duration, average bond BES).
import { accountsSql } from "@/lib/accounts";

const s = await accountsSql();
const snaps = await s`select id, filter_key, published_at from app.efficient_portfolio_snapshots where status = 'published' order by filter_key`;
const num = (x: unknown) => (x === null || x === undefined ? null : Number(x));
for (const n of snaps) {
  const rows = await s`select horizon, position, filled, status, avg_ytm, avg_risk, avg_duration, expected_loss, avg_bond_bes, ladder_step from app.efficient_portfolio_positions where snapshot_id = ${n.id} order by horizon, position`;
  console.log(`\n## ${n.filter_key} snapshot ${n.id}, published ${new Date(n.published_at).toISOString()}`);
  console.log("| Horizon | valid | infeasible | adjusted | beaten by a lower position |\n|---|---:|---|---:|---|");
  for (const h of ["SHORT", "MEDIUM", "LONG"]) {
    const p = rows.filter((r) => r.horizon === h);
    const ok = p.filter((r) => r.filled);
    const beaten = ok.filter((r, i) => ok.slice(0, i).some((q) => num(q.avg_ytm)! >= num(r.avg_ytm)! - 1e-9 && num(q.expected_loss)! <= num(r.expected_loss)! + 1e-9 && (num(q.avg_ytm)! > num(r.avg_ytm)! + 1e-9 || num(q.expected_loss)! < num(r.expected_loss)! - 1e-9))).map((r) => r.position);
    console.log(`| ${h} | ${ok.length}/30 | ${p.filter((r) => !r.filled).map((r) => r.position).join(", ") || "none"} | ${ok.filter((r) => (r.ladder_step ?? 0) >= 1).length} | ${beaten.length}${beaten.length ? ` (${beaten.join(", ")})` : ""} |`);
  }
  console.log("\n| Horizon | Pos | Return % | Expected loss | Avg risk | Avg duration | Avg bond BES | Step |\n|---|---:|---:|---:|---:|---:|---:|---:|");
  for (const h of ["SHORT", "MEDIUM", "LONG"]) for (const k of [1, 10, 20, 30]) {
    const r = rows.find((x) => x.horizon === h && x.position === k);
    console.log(r?.filled ? `| ${h} | ${k} | ${num(r.avg_ytm)} | ${num(r.expected_loss)} | ${num(r.avg_risk)} | ${num(r.avg_duration)} | ${num(r.avg_bond_bes) ?? "–"} | ${r.ladder_step ?? 0} |` : `| ${h} | ${k} | empty | | | | | |`);
  }
}
process.exit(0);
