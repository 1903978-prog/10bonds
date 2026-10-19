// Read-only: what changed between the last two SEO assessments of each market (see seo-diff.yml).
import postgres from "postgres";
import { accountsUrl } from "../lib/pgUrl.ts";

const url = accountsUrl(process.env.ACCOUNTS_DATABASE_URL, process.env.DATABASE_URL);
const sql = postgres(url, { max: 1, ssl: url.includes("localhost") || url.includes("127.0.0.1") ? false : "require", prepare: false });
for (const m of ["it", "fr", "de"]) {
  const as = await sql`select id, at, overall from app.seo_assessments where market = ${m} order by at desc limit 2`;
  if (as.length < 2) continue;
  console.log(`\n== ${m}: ${as[1].overall} (${as[1].at.toISOString()}) -> ${as[0].overall} (${as[0].at.toISOString()})`);
  const rows = await sql`select a.dimension, a.criterion, a.points as now, b.points as before, a.evidence
    from app.seo_criterion_results a join app.seo_criterion_results b on b.assessment_id = ${as[1].id} and b.dimension = a.dimension and b.criterion = a.criterion
    where a.assessment_id = ${as[0].id} and a.points is distinct from b.points`;
  for (const r of rows) console.log(`${r.dimension}/${r.criterion}: ${r.before} -> ${r.now} | ${r.evidence.slice(0, 300)}`);
  const g = await sql`select criterion, points, evidence from app.seo_criterion_results where assessment_id = ${as[0].id} and dimension = 'guides'`;
  for (const r of g) console.log(`  guides/${r.criterion} = ${r.points}: ${r.evidence.slice(0, 400)}`);
}
await sql.end();
