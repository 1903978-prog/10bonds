// Issuers whose bonds still have no country (read-only list for the owner). Usage: npx vite-node -c vitest.config.ts scripts/unclassified-issuers.ts
import { classificationAudit } from "@/lib/classifyAudit";

const a = await classificationAudit();
if (!a) throw new Error("Bond data is not connected");
const noCountry = a.missing.filter((m) => m.needs !== "industry");
console.log(`issuers ${a.issuers} · missing a country ${noCountry.length} · missing an industry ${a.missing.filter((m) => m.needs !== "country").length}`);
console.log(`bonds ${a.coverage.total} · with country ${a.coverage.country} · with industry ${a.coverage.sector}`);
const top = Number(process.env.TOP ?? 80);
console.log(`bonds in the missing-country issuers ${noCountry.reduce((n, m) => n + m.bonds, 0)} · shown below: the first ${top}`);
const from = Number(process.env.FROM ?? 0);
noCountry.slice(from, top).forEach((m, i) => console.log(`#${from + i + 1}\t${m.bonds}\t${m.issuer}\t${m.isin.slice(0, 2)}\t${m.sector ?? ""}`));

if (process.env.CSV) {
  const supra = /\b(european (investment bank|union|stability|financial stability)|eib|efsf|esm|ibrd|world bank|international bank for|asian development|african development|inter-american|interamerican|european bank for reconstruction|ebrd|council of europe|nordic investment|kfw|eurofima|european atomic|euratom|islamic development|asian infrastructure|international finance corp|ifc|cebd|ceb|idb|aiib|nib|nadb|afrcn dvlpmnt|international development association|international finance corporation|finance facility for immunisation)\b/i;
  const q = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const rows = noCountry.filter((m) => !supra.test(m.issuer)).map((m) => [q(m.issuer), m.bonds, m.isin, m.currency].join(","));
  const { writeFileSync } = await import("node:fs");
  writeFileSync("issuers-without-country.csv", ["issuer,bonds,sample_isin,currency", ...rows].join("\n") + "\n");
  console.log(`CSV rows ${rows.length}`);
}
