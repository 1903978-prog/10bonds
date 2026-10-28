// Read-only: the BES figures stored in the published Efficient Database snapshots (row 45 = Medium position 15, per filter) and how many holdings carry a bes_score.
import { accountsSql } from "@/lib/accounts";

const s = await accountsSql();
const snaps = await s`select id, filter_key, published_at from app.efficient_portfolio_snapshots where status = 'published' order by id desc`;
console.log("## Published snapshots");
for (const n of snaps) {
  const [c] = await s`select count(*)::int n, count(bes_score)::int scored from app.efficient_portfolio_holdings where snapshot_id = ${n.id}`;
  console.log(`- snapshot ${n.id} (${n.filter_key}), published ${new Date(n.published_at).toISOString()}: ${c.scored}/${c.n} holdings with bes_score`);
}
for (const n of snaps) {
  const [p] = await s`select * from app.efficient_portfolio_positions where snapshot_id = ${n.id} and row_no = 45`;
  if (!p) { console.log(`\n## ${n.filter_key}: no row 45`); continue; }
  console.log(`\n## ${n.filter_key} row 45 (${p.horizon} position ${p.position}): average bond BES ${p.avg_bond_bes ?? "–"}, bonds scored ${p.bes_scored ?? "–"}/10, portfolio BES ${p.portfolio_bes ?? "unavailable"} (${p.portfolio_bes_status ?? "–"}): ${p.portfolio_bes_reason ?? ""}`);
  const h = await s`select ord, isin, issuer, bes_score, bes_status from app.efficient_portfolio_holdings where snapshot_id = ${n.id} and portfolio_id = ${p.portfolio_id} and horizon = ${p.horizon} order by ord`;
  console.log("| # | ISIN | Issuer | BES | Status |\n|---:|---|---|---:|---|");
  for (const r of h) console.log(`| ${r.ord} | ${r.isin} | ${r.issuer} | ${r.bes_score ?? "–"} | ${r.bes_status ?? "–"} |`);
}
process.exit(0);
