import * as XLSX from "xlsx";
import { createHash } from "node:crypto";
import { rankOfText, type Rank } from "./seniority";

// Admin only (the owner, 25/10/2026): reads a bonds spreadsheet (xls, xlsx or csv) into rows keyed by ISIN.
// Every column is kept in `raw`; the known ones are also copied into typed fields.

export const ISIN_RE = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;

export type ImportRow = {
  isin: string;
  issuer: string | null;
  description: string | null;
  coupon: number | null; // percent
  maturity: string | null; // YYYY-MM-DD
  agencyRating: string | null;
  riskGrade: string | null;
  ir: string | null;
  br: string | null;
  riskPay: string | null;
  ytm: number | null; // percent
  duration: number | null;
  price: number | null;
  seniority: string | null;
  verdict: string | null;
  recommendation: string | null;
  raw: Record<string, string | number | null>;
};

export type Parsed = {
  fileName: string;
  sha256: string;
  sheet: string;
  columns: string[];
  rowsRead: number;
  rows: ImportRow[];
  skipped: { row: number; why: string }[];
  duplicates: string[];
};

const norm = (h: string) => h.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
/** Header (normalised) -> typed field. Columns not listed here are kept in raw only. */
const FIELD: Record<string, keyof Omit<ImportRow, "isin" | "raw">> = {
  issuer: "issuer", "bond description": "description", coupon: "coupon", maturity: "maturity", "agency rating": "agencyRating",
  "10bonds risk": "riskGrade", ir: "ir", br: "br", "risk pay": "riskPay", ytm: "ytm", duration: "duration", "market price": "price",
  seniority: "seniority", verdict: "verdict", recommendation: "recommendation",
};
/** Columns the site already has a value for (so a difference is a conflict, not new information). */
export const KNOWN_FIELDS = ["isin", "issuer", "coupon", "maturity", "agencyRating", "ytm", "duration", "price", "seniority"];

const text = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s ? s : null;
};
const numeric = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** Excel day serial (or an ISO text) to YYYY-MM-DD. */
function day(v: unknown): string | null {
  if (typeof v === "number" && v > 20000 && v < 80000) return new Date(Math.round((v - 25569) * 86400_000)).toISOString().slice(0, 10);
  const s = text(v);
  return s && /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null;
}

/** The sheet's fractions (0.05) become percent (5); a column already in percent stays. */
function pct(v: unknown, asFraction: boolean): number | null {
  const n = numeric(v);
  return n === null ? null : asFraction ? Math.round(n * 1e6) / 1e4 : n;
}

export function parseBondFile(buf: Buffer, fileName: string): Parsed {
  const wb = XLSX.read(buf, { type: "buffer", cellDates: false });
  const sheet = wb.SheetNames[0];
  if (!sheet) throw new Error("The file has no sheet.");
  const table = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheet], { header: 1, defval: "", raw: true });
  const header = (table[0] ?? []).map((h) => String(h ?? "").trim());
  const cols = header.map((h) => norm(h));
  const isinCol = cols.indexOf("isin");
  if (isinCol < 0) throw new Error('No "ISIN" column found in the first sheet.');
  const body = table.slice(1).filter((r) => r.some((c) => text(c) !== null));
  // A percentage column stored as fractions (every value <= 1) is converted once for the whole column.
  const frac = (name: string) => {
    const i = cols.indexOf(name);
    const vals = body.map((r) => numeric(r[i])).filter((n): n is number => n !== null);
    return vals.length > 0 && vals.every((n) => Math.abs(n) <= 1);
  };
  const couponFrac = frac("coupon");
  const ytmFrac = frac("ytm");
  const rows: ImportRow[] = [];
  const skipped: Parsed["skipped"] = [];
  const seen = new Set<string>();
  const duplicates: string[] = [];
  body.forEach((r, i) => {
    const isin = (text(r[isinCol]) ?? "").toUpperCase();
    if (!ISIN_RE.test(isin)) return void skipped.push({ row: i + 2, why: isin ? `not a valid ISIN: ${isin}` : "no ISIN" });
    if (seen.has(isin)) { duplicates.push(isin); return; }
    seen.add(isin);
    const raw: ImportRow["raw"] = {};
    const out: ImportRow = { isin, issuer: null, description: null, coupon: null, maturity: null, agencyRating: null, riskGrade: null, ir: null, br: null, riskPay: null, ytm: null, duration: null, price: null, seniority: null, verdict: null, recommendation: null, raw };
    header.forEach((h, c) => {
      const v = r[c];
      if (h && text(v) !== null) raw[h] = typeof v === "number" ? v : String(v).trim();
      const f = FIELD[cols[c]];
      if (!f || text(v) === null) return;
      if (f === "coupon") out.coupon = pct(v, couponFrac);
      else if (f === "ytm") out.ytm = pct(v, ytmFrac);
      else if (f === "duration" || f === "price") out[f] = numeric(v);
      else if (f === "maturity") out.maturity = day(v);
      else (out as Record<string, unknown>)[f] = text(v);
    });
    rows.push(out);
  });
  return { fileName, sha256: createHash("sha256").update(buf).digest("hex"), sheet, columns: header.filter(Boolean), rowsRead: body.length, rows, skipped, duplicates };
}

const NO_VALUE = /^(verify|unknown|n\/a|na|\?|tbc|excluded)$/i;
const yes = (v: unknown) => typeof v === "string" && v.trim().toUpperCase() === "YES";

/** The debt rank the row states: AT1 / Tier 2 / SNP flags first, then the seniority text; null when the file has none. */
export function importedRank(r: ImportRow): Rank | null {
  if (yes(r.raw["AT1"]) || yes(r.raw["Tier 2"])) return "sub";
  if (yes(r.raw["SNP"])) return "snp";
  const s = r.seniority && !NO_VALUE.test(r.seniority.trim()) ? r.seniority : null;
  return rankOfText(s);
}

/** Seniority text the site can take over (only when the site has none): the file's own words for sub / SNP, else its text. */
export function importedSeniorityText(r: ImportRow): string | null {
  const k = importedRank(r);
  if (k === "sub") return r.seniority && rankOfText(r.seniority) === "sub" ? r.seniority : "Subordinated";
  if (k === "snp") return r.seniority && rankOfText(r.seniority) === "snp" ? r.seniority : "Senior non-preferred";
  return k === "senior" && r.seniority && !NO_VALUE.test(r.seniority.trim()) ? r.seniority : null;
}
