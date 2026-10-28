// Temporary: exercises the bulk insert on the real database with a scratch benchmark, then removes it.
import { ingestCurves } from "@/lib/bundCurve/store";
import { accountsSql } from "@/lib/accounts";
const def = { benchmark: "ZZ_TEST", country: "Test", currency: "USD", source: "selftest", required: "PAR" };
const curve = (d: string, b: number) => ({ curveType: "PAR", date: d, values: new Map(Array.from({ length: 30 }, (_, i) => [i + 1, { value: b + i / 100, seriesId: `T${i + 1}` }])) });
(async () => {
  const s = await accountsSql();
  const a = await ingestCurves(def, [curve("2026-01-05", 3), curve("2026-01-06", 3.1)], "selftest");
  const b = await ingestCurves(def, [curve("2026-01-05", 3), curve("2026-01-06", 3.15)], "selftest");
  console.log(a.message, "|", b.message);
  if (a.inserted !== 60 || b.unchanged !== 30 || b.updated !== 30) throw new Error("unexpected counts");
  await s`delete from app.benchmark_curve where benchmark = 'ZZ_TEST'`; await s`delete from app.benchmark_imports where benchmark = 'ZZ_TEST'`;
  console.log("selftest OK, scratch rows removed");
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
