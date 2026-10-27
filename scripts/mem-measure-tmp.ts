import { loadBondsFor } from "@/lib/bonds";
import { capsFor } from "@/lib/bestTable";
import { sliderFor } from "@/lib/sliderCache";
import { TERMS } from "@/lib/limits";
const mb = (n: number) => `${Math.round(n / 1048576)} MB`;
const m = (label: string) => { global.gc?.(); const u = process.memoryUsage(); console.log(`${label}: rss ${mb(u.rss)}, heap ${mb(u.heapUsed)}, external ${mb(u.external)}`); };
m("start");
const f = { currency: "EUR", size: "100k" } as const;
const src = await loadBondsFor(f);
m(`after loading ${src.bonds.length} bonds`);
await capsFor(f); m("after slider maximums (capsFor)");
for (const t of TERMS) { const t0 = Date.now(); const r = await sliderFor(f, t.duration, "spread", true); m(`after slider positions ${t.key} (${r.positions?.length ?? 0} pos, ${Math.round((Date.now() - t0) / 1000)} s)`); }
process.exit(0);
