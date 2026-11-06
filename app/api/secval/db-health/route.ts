import { NextResponse } from "next/server";
import { accountsConfigured, accountsSql, getSetting } from "@/lib/accounts";
import { bondDataHealth, loadBonds, rawBondsForQuality } from "@/lib/bonds";
import { signatureOf } from "@/lib/bestTable";
import { cachedReport, tokenOk, type DbHealthDeps } from "@/lib/secvalDbHealth";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/** Read-only database report for secval (counts only). 404 when SECVAL_DBCHECK_TOKEN is not set, 401 on a wrong token. */
export async function GET(req: Request) {
  const token = process.env.SECVAL_DBCHECK_TOKEN;
  if (!token || !accountsConfigured()) return NextResponse.json({ error: "not found" }, { status: 404, headers: NO_STORE });
  if (!tokenOk(req.headers.get("authorization"), token)) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });

  const deps: DbHealthDeps = {
    query: async (q) => {
      const sql = await accountsSql();
      if (q === "tables") {
        return sql`
          select count(*)::int as tables,
                 count(*) filter (where not exists (select 1 from pg_constraint c where c.conrelid = t.oid and c.contype = 'p'))::int as tables_without_pk
          from pg_class t join pg_namespace n on n.oid = t.relnamespace
          where t.relkind in ('r', 'p') and n.nspname = 'app'`;
      }
      if (q === "constraints") {
        return sql`
          select c.contype, count(*)::int as n from pg_constraint c join pg_namespace n on n.oid = c.connamespace
          where n.nspname = 'app' and c.contype in ('f', 'u', 'c') group by c.contype`;
      }
      return sql`
        select count(*)::int as n from pg_constraint c join pg_namespace n on n.oid = c.connamespace
        where c.contype = 'f' and n.nspname = 'app'
          and not exists (select 1 from pg_index i where i.indrelid = c.conrelid
                          and (i.indkey::int2[])[0:array_length(c.conkey, 1) - 1] @> c.conkey)`;
    },
    schemaReady: async () => {
      await accountsSql();
      return true;
    },
    setting: getSetting,
    orphanRankings: async () => {
      // The ranking is rebuilt on the first visit after a new copy; until then its old bonds are not broken links.
      const sql = await accountsSql();
      const [stored] = await sql`select value from app.settings where key = 'best_bonds_signature'`;
      if (stored?.value !== signatureOf(await loadBonds())) return null;
      const raw = await rawBondsForQuality();
      if (!raw) return null;
      const copy = new Set(raw.map((r) => String(r.isin ?? "").trim().toUpperCase()));
      const ranked = await sql`select distinct isin from app.best_bonds`;
      return ranked.filter((r) => !copy.has(String(r.isin).trim().toUpperCase())).length;
    },
    bondCopyOk: async () => (await bondDataHealth()).ok,
  };

  try {
    return NextResponse.json(await cachedReport(deps), { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: "database report unavailable" }, { status: 503, headers: NO_STORE });
  }
}
