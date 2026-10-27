import { loadBondsFor } from "@/lib/bonds";
import { coherentFrontier } from "@/lib/coherentFrontier";
import { TERMS } from "@/lib/limits";
const mb = (n: number) => `${Math.round(n / 1048576)} MB`;
let peak = 0;
const iv = setInterval(() => { peak = Math.max(peak, process.memoryUsage().rss); }, 200);
const m = (label: string) => { const u = process.memoryUsage(); console.log(`${label}: rss ${mb(u.rss)}, heap ${mb(u.heapUsed)}, external ${mb(u.external)}, peak rss so far ${mb(peak)}`); };
m("start (vite-node tooling included)");
const src = await loadBondsFor({ currency: "EUR", size: "100k" });
m(`bonds loaded (${src.bonds.length})`);
for (const t of TERMS) { const t0 = Date.now(); await coherentFrontier(src.bonds, t.duration); m(`one full HiGHS solve of the ${t.key} list (${Math.round((Date.now() - t0) / 1000)} s)`); }
clearInterval(iv);
process.exit(0);
