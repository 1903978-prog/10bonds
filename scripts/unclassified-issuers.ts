// Issuers whose bonds still have no country (read-only list for the owner). Usage: npx vite-node -c vitest.config.ts scripts/unclassified-issuers.ts
import { classificationAudit } from "@/lib/classifyAudit";

const a = await classificationAudit();
if (!a) throw new Error("Bond data is not connected");
const noCountry = a.missing.filter((m) => m.needs !== "industry");
console.log(`issuers ${a.issuers} · missing a country ${noCountry.length} · missing an industry ${a.missing.filter((m) => m.needs !== "country").length}`);
console.log(`bonds ${a.coverage.total} · with country ${a.coverage.country} · with industry ${a.coverage.sector}`);
noCountry.forEach((m, i) => console.log(`#${i + 1}\t${m.bonds}\t${m.issuer}\t${m.isin}\t${m.currency}\t${m.needs}\t${m.sector ?? ""}`));
