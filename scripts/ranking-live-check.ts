// Runs the /api/health/ranking logic on freshly computed caps (no stored table) and compares with the stored caps.
// Counts only. Usage: npx vite-node -c vitest.config.ts scripts/ranking-live-check.ts
import { loadBonds } from "@/lib/bonds";
import { computeBestTable, durationSteps } from "@/lib/bestTable";
import { rankBonds } from "@/lib/ranking";
import { LIMITS } from "@/lib/limits";
import postgres from "postgres";
import { accountsUrl } from "@/lib/pgUrl";

const data = await loadBonds();
const table = computeBestTable(data);
let fails = 0, checked = 0;
const sample: unknown[] = [];
for (let risk = LIMITS.risk.min; risk <= LIMITS.risk.max; risk++) for (const d of durationSteps()) {
  const cap = table.caps[String(risk)]?.[String(d)];
  if (cap == null) continue;
  const { results } = rankBonds(data.bonds, d, cap, undefined, risk);
  if (!results.length) continue;
  const avg = results.reduce((s, r) => s + r.grossYtm!, 0) / results.length;
  checked++;
  if (Math.abs(avg - cap) > 0.011) { fails++; if (sample.length < 5) sample.push({ d, risk, cap, avg: +avg.toFixed(2) }); }
}
console.log("source", data.source, "bonds", data.bonds.length, "signature", table.signature.slice(0, 40));
console.log("fresh caps: checked", checked, "failures at max", fails, JSON.stringify(sample));
if (process.env.ACCOUNTS_DATABASE_URL) {
  const sql = postgres(accountsUrl(process.env.ACCOUNTS_DATABASE_URL, process.env.DATABASE_URL), { ssl: "require", max: 1, prepare: false });
  const rows = await sql`select key, value, updated_at from app.settings where key in ('best_bonds_signature','best_bonds_caps')`;
  const sig = rows.find((r) => r.key === "best_bonds_signature");
  const caps = rows.find((r) => r.key === "best_bonds_caps");
  console.log("stored signature", String(sig?.value).slice(0, 40), "updated", sig?.updated_at, "matches fresh:", sig?.value === table.signature);
  if (caps) {
    const stored = JSON.parse(caps.value);
    let diff = 0; const ex: unknown[] = [];
    for (const r of Object.keys(table.caps)) for (const d of Object.keys(table.caps[r])) if (stored[r]?.[d] !== table.caps[r][d]) { diff++; if (ex.length < 5) ex.push({ r, d, stored: stored[r]?.[d], fresh: table.caps[r][d] }); }
    console.log("stored vs fresh caps differ in", diff, "cells", JSON.stringify(ex));
  }
  await sql.end();
}
process.exit(0);
