import { accountsSql } from "./accounts";
import { siteBondsByIsin } from "./bonds";
import { loadGptRatings, mergeImportedRatings } from "./gptRatingsDb";
import { importedRank, importedSeniorityText, KNOWN_FIELDS, type ImportRow, type Parsed } from "./bondImportParse";
import { rankOf } from "./seniority";

// Admin only (the owner, 25/10/2026): bonds spreadsheets imported into our own tables (schema app), one batch per file.
// Every column is kept (raw json); a re-import of the same file is refused; a new file adds a new batch and the newest
// batch holding an ISIN is its "current" row. Nothing here changes the bond copy (public_bonds) or customer pages.

let ready: Promise<void> | null = null;
async function sql() {
  const s = await accountsSql();
  ready ??= (async () => {
    await s`
      create table if not exists app.bond_import_batches (
        id bigserial primary key,
        file_name text not null,
        file_sha256 text not null,
        imported_at timestamptz not null default now(),
        sheet text not null,
        rows_read integer not null,
        rows_imported integer not null,
        summary jsonb not null
      )`;
    await s`
      create table if not exists app.bond_import_rows (
        batch_id bigint not null,
        isin text not null,
        issuer text,
        description text,
        coupon real,
        maturity date,
        agency_rating text,
        risk_grade text,
        ir text,
        br text,
        risk_pay text,
        ytm real,
        duration real,
        price real,
        seniority text,
        verdict text,
        recommendation text,
        raw jsonb not null,
        primary key (batch_id, isin)
      )`;
    await s`
      create table if not exists app.bond_import_settings (
        key text primary key,
        value text not null
      )`;
  })().catch((e) => {
    ready = null;
    throw e;
  });
  await ready;
  return s;
}

export async function bondImportTablesReady(): Promise<void> {
  await sql();
}

const SENIORITY_KEY = "use_imported_seniority";
export async function seniorityFillOn(): Promise<boolean> {
  const s = await sql();
  const r = await s<{ value: string }[]>`select value from app.bond_import_settings where key = ${SENIORITY_KEY}`;
  return r[0]?.value === "on";
}
export async function setSeniorityFill(on: boolean) {
  const s = await sql();
  await s`insert into app.bond_import_settings (key, value) values (${SENIORITY_KEY}, ${on ? "on" : "off"}) on conflict (key) do update set value = excluded.value`;
}

/** isin -> seniority text taken from the newest import, used only where the bond copy has none (and only when switched on). */
export async function importedSeniorityMap(): Promise<Map<string, string>> {
  try {
    if (!(await seniorityFillOn())) return new Map();
    const s = await sql();
    const rows = await s<{ isin: string; raw: ImportRow["raw"]; seniority: string | null }[]>`
      select distinct on (isin) isin, raw, seniority from app.bond_import_rows order by isin, batch_id desc`;
    const out = new Map<string, string>();
    for (const r of rows) {
      const t = importedSeniorityText({ seniority: r.seniority, raw: r.raw } as ImportRow);
      if (t) out.set(r.isin, t);
    }
    return out;
  } catch {
    return new Map();
  }
}

export type Preview = {
  fileName: string;
  alreadyImported: boolean;
  rowsRead: number;
  rowsValid: number;
  skipped: Parsed["skipped"];
  duplicates: string[];
  columns: { known: string[]; added: string[] };
  siteConnected: boolean;
  matched: number;
  notMatched: string[];
  conflicts: Record<string, { count: number; examples: string[] }>;
  seniority: { fileStates: number; siteHasNone: number; extraExcluded: number; extraNotched: number; extraExcludedIsins: string[]; fillSites: number; filledNowOn: boolean };
  ratings: { fills: number; unchanged: number; overwrites: number; kept: number; keptIsins: string[] };
  suspicious: string[];
};

const KNOWN_HEADERS = new Set(["issuer", "isin", "bond description", "coupon", "maturity", "agency rating", "ytm", "duration", "market price", "seniority"]);

export async function previewImport(p: Parsed): Promise<Preview> {
  const s = await sql();
  const dup = await s`select 1 from app.bond_import_batches where file_sha256 = ${p.sha256} limit 1`;
  const site: Awaited<ReturnType<typeof siteBondsByIsin>> = await siteBondsByIsin(p.rows.map((r) => r.isin)).catch(() => ({}));
  const siteConnected = Object.keys(site).length > 0;
  const saved = await loadGptRatings();
  const conflicts: Preview["conflicts"] = {};
  const clash = (k: string, msg: string) => ((conflicts[k] ??= { count: 0, examples: [] }).count++, conflicts[k].examples.length < 5 && conflicts[k].examples.push(msg));
  const susp: string[] = [];
  const notMatched: string[] = [];
  let matched = 0;
  const sen = { fileStates: 0, siteHasNone: 0, extraExcluded: 0, extraNotched: 0, extraExcludedIsins: [] as string[], fillSites: 0 };
  const rt = { fills: 0, unchanged: 0, overwrites: 0, kept: 0, keptIsins: [] as string[] };
  const today = new Date().toISOString().slice(0, 10);
  for (const r of p.rows) {
    const b = site[r.isin];
    if (r.maturity && r.maturity < today) susp.push(`${r.isin}: maturity ${r.maturity} is in the past`);
    if (r.price !== null && (r.price < 20 || r.price > 200)) susp.push(`${r.isin}: price ${r.price} looks wrong`);
    if (r.coupon !== null && (r.coupon < 0 || r.coupon > 15)) susp.push(`${r.isin}: coupon ${r.coupon}% looks wrong`);
    if (r.ytm !== null && (r.ytm < -1 || r.ytm > 25)) susp.push(`${r.isin}: return ${r.ytm}% looks wrong`);
    const rank = importedRank(r);
    if (rank) sen.fileStates++;
    if (b) {
      matched++;
      if (r.price !== null && b.price !== null && Math.abs(r.price - b.price) > 1) clash("price", `${r.isin}: file ${r.price}, site ${b.price}`);
      if (r.coupon !== null && b.coupon !== null && Math.abs(r.coupon - b.coupon) > 0.01) clash("coupon", `${r.isin}: file ${r.coupon}, site ${b.coupon}`);
      if (r.maturity && b.maturity && r.maturity !== b.maturity) clash("maturity", `${r.isin}: file ${r.maturity}, site ${b.maturity}`);
      if (r.ytm !== null && b.ytm !== null && Math.abs(r.ytm - b.ytm) > 0.5) clash("return", `${r.isin}: file ${r.ytm}%, site ${b.ytm}%`);
      if (r.duration !== null && b.duration !== null && Math.abs(r.duration - b.duration) > 0.5) clash("duration", `${r.isin}: file ${r.duration}, site ${b.duration}`);
      const siteRank = rankOf(b);
      if (rank && b.seniority && rank !== siteRank) clash("seniority", `${r.isin}: file ${rank}, site ${b.seniority}`);
      if (rank && !b.seniority) {
        sen.siteHasNone++;
        if (importedSeniorityText(r)) sen.fillSites++;
        if (rank === "sub") { sen.extraExcluded++; sen.extraExcludedIsins.push(r.isin); }
        if (rank === "snp") sen.extraNotched++;
      }
      if (!b.ratingSp && !b.ratingMoodys && !b.ratingFitch) clash("no agency rating on site", `${r.isin}: ${r.agencyRating ?? "–"} in file`);
    } else if (siteConnected) notMatched.push(r.isin);
    const have = saved[r.isin];
    if (r.ir || r.br || r.riskPay) {
      const pairs: [string | null, string | null | undefined][] = [[r.ir, have?.issuerRating], [r.br, have?.rating], [r.riskPay, have?.riskPay]];
      let kept = false;
      for (const [v, old] of pairs) {
        if (!v) continue;
        if (!old) rt.fills++;
        else if (old === v) rt.unchanged++;
        else { rt.kept++; kept = true; }
      }
      if (kept) rt.keptIsins.push(r.isin);
    }
  }
  return {
    fileName: p.fileName,
    alreadyImported: dup.length > 0,
    rowsRead: p.rowsRead,
    rowsValid: p.rows.length,
    skipped: p.skipped,
    duplicates: p.duplicates,
    columns: { known: p.columns.filter((c) => KNOWN_HEADERS.has(c.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim())), added: p.columns.filter((c) => !KNOWN_HEADERS.has(c.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim())) },
    siteConnected,
    matched,
    notMatched,
    conflicts,
    seniority: { ...sen, filledNowOn: await seniorityFillOn() },
    ratings: rt,
    suspicious: susp.slice(0, 30),
  };
}

/** Saves the file as a new batch and fills the IR / BR / Risk Pay admin store (empty fields only; differing values stay and are reported). */
export async function commitImport(p: Parsed): Promise<{ batchId: number; imported: number; ratingsFilled: number; ratingsKept: number } | "already"> {
  const s = await sql();
  if ((await s`select 1 from app.bond_import_batches where file_sha256 = ${p.sha256} limit 1`).length) return "already";
  const summary = { columns: p.columns, skipped: p.skipped, duplicates: p.duplicates };
  const batchId = await s.begin(async (t) => {
    const [b] = await t<{ id: string }[]>`
      insert into app.bond_import_batches (file_name, file_sha256, sheet, rows_read, rows_imported, summary)
      values (${p.fileName.slice(0, 200)}, ${p.sha256}, ${p.sheet}, ${p.rowsRead}, ${p.rows.length}, ${t.json(summary)})
      returning id`;
    const id = Number(b.id);
    for (let i = 0; i < p.rows.length; i += 200) {
      const chunk = p.rows.slice(i, i + 200).map((r) => ({
        batch_id: id, isin: r.isin, issuer: r.issuer, description: r.description, coupon: r.coupon, maturity: r.maturity, agency_rating: r.agencyRating,
        risk_grade: r.riskGrade, ir: r.ir, br: r.br, risk_pay: r.riskPay, ytm: r.ytm, duration: r.duration, price: r.price, seniority: r.seniority,
        verdict: r.verdict, recommendation: r.recommendation, raw: t.json(r.raw),
      }));
      await t`insert into app.bond_import_rows ${t(chunk)}`;
    }
    return id;
  });
  const basis = `Imported from ${p.fileName.slice(0, 80)} · ${new Date().toISOString().slice(0, 10)}`;
  const m = await mergeImportedRatings(p.rows.filter((r) => r.ir || r.br || r.riskPay).map((r) => ({ isin: r.isin, issuerRating: r.ir, rating: r.br, riskPay: r.riskPay })), basis);
  return { batchId, imported: p.rows.length, ratingsFilled: m.filled, ratingsKept: m.kept };
}

export type ImportedRow = { batch_id: string; file_name: string; imported_at: string; isin: string; issuer: string | null; coupon: number | null; maturity: string | null; agency_rating: string | null; risk_grade: string | null; ytm: number | null; price: number | null; seniority: string | null; recommendation: string | null; verdict: string | null };

/** Batches so far, and the current row per ISIN (newest batch wins). */
export async function importOverview(): Promise<{ batches: { id: string; file_name: string; imported_at: string; rows_read: number; rows_imported: number }[]; current: ImportedRow[] }> {
  const s = await sql();
  const batches = await s<{ id: string; file_name: string; imported_at: string; rows_read: number; rows_imported: number }[]>`select id::text, file_name, imported_at::text, rows_read, rows_imported from app.bond_import_batches order by id desc limit 20`;
  const current = await s<ImportedRow[]>`
    select distinct on (r.isin) r.batch_id::text, b.file_name, b.imported_at::text, r.isin, r.issuer, r.coupon, r.maturity::text, r.agency_rating, r.risk_grade, r.ytm, r.price, r.seniority, r.recommendation, r.verdict
    from app.bond_import_rows r join app.bond_import_batches b on b.id = r.batch_id order by r.isin, r.batch_id desc limit 1000`;
  return { batches, current };
}

export { KNOWN_FIELDS };
