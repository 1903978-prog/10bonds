import { LINKS } from "./dbLinks";
import { REPAIR_COLUMNS } from "./dbFingerprint";

/**
 * The link repair as one SQL file for an ISOLATED COPY of production (a Neon branch): fingerprints every table, adds any missing
 * rule NOT VALID, runs each repair and validation, fingerprints again, prints what changed, then ROLLS BACK. Same steps as
 * repairAndValidateLinks (lib/dbLinks.ts). Never run it on production itself: it needs write access and takes table locks.
 * docs/db-link-repair-dryrun.sql is generated from this (a test keeps them equal).
 */
export function repairDryRunSql(): string {
  const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
  const repairCols = Object.entries(REPAIR_COLUMNS).map(([t, cs]) => `(${q(t)}, array[${cs.map(q).join(", ")}]::text[])`).join(", ");
  const lines: string[] = [
    "-- GENERATED from lib/dbLinkRepairSql.ts. Isolated copy of production ONLY (a Neon branch). Ends with ROLLBACK: nothing is kept.",
    "-- psql \"$BRANCH_URL\" -v ON_ERROR_STOP=1 -f docs/db-link-repair-dryrun.sql",
    "begin;",
    "set local lock_timeout = '10s';",
    "create temp table fp (t text, phase text, n bigint, h text, h2 text) on commit drop;",
    "create temp table repair_cols (t text primary key, cols text[]) on commit drop;",
    `insert into repair_cols values ${repairCols};`,
    "create temp table broken (link text, n bigint) on commit drop;",
    "create or replace function pg_temp.snap(p text) returns void language plpgsql as $f$",
    "declare r record; c text[]; begin",
    "  for r in select relname from pg_class where relnamespace = 'app'::regnamespace and relkind = 'r' loop",
    "    select cols into c from repair_cols where t = r.relname;",
    "    execute format('insert into fp select %L, %L, count(*), coalesce(md5(string_agg(a, '''' order by a)), ''''), coalesce(md5(string_agg(b, '''' order by b)), '''')"
      + " from (select md5(to_jsonb(x)::text) a, md5((to_jsonb(x) - %L::text[])::text) b from app.%I x) s', r.relname, p, coalesce(c, '{}'), r.relname);",
    "  end loop; end $f$;",
  ];
  for (const l of LINKS) {
    lines.push(`insert into broken select ${q(l.name)}, count(*) from app.${l.table} c where c.${l.column} is not null and not exists (select 1 from app.${l.parent} p where p.${l.parentColumn} = c.${l.column});`);
  }
  lines.push("select link, n as rows_breaking_before from broken order by link;", "select pg_temp.snap('before');");
  for (const l of LINKS) {
    lines.push(
      `-- ${l.name}`,
      `do $d$ begin if not exists (select 1 from pg_constraint where conname = ${q(l.name)} and connamespace = 'app'::regnamespace) then`
        + ` alter table app.${l.table} add constraint ${l.name} foreign key (${l.column}) references app.${l.parent} (${l.parentColumn}) on delete ${l.onDelete} not valid; end if; end $d$;`,
    );
    if (l.cleanup) lines.push(`${l.cleanup};`);
    lines.push(`alter table app.${l.table} validate constraint ${l.name};`);
  }
  lines.push(
    "select pg_temp.snap('after');",
    "select b.t as table_name, b.n as rows_before, a.n as rows_after,",
    "       case when b.n = a.n and b.h2 = a.h2 then 'only the link column' else 'rows added or removed' end as change",
    "from fp b join fp a on a.t = b.t and a.phase = 'after' where b.phase = 'before' and b.h <> a.h order by 1;",
    "select conrelid::regclass as not_validated from pg_constraint where connamespace = 'app'::regnamespace and contype = 'f' and not convalidated;",
    "rollback;",
  );
  return lines.join("\n") + "\n";
}
