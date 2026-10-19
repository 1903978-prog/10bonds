import type { PublicBond } from "../types";
import { bondNotch } from "../ratings";
import { SITE_URL } from "./crawl";

// The free "bond yields" widget other websites can embed (/embed/yields). A small table, rebuilt from the bond copy
// on every read: the median gross yield of EUR bonds per rating and time to maturity. Every embed carries a plain link
// back to 10bonds.com next to the frame, which is what counts as a backlink.

export const WIDGET_LANGS = ["en", "it", "fr", "de"] as const;
export type WidgetLang = (typeof WIDGET_LANGS)[number];
export const widgetLang = (v: unknown): WidgetLang => (WIDGET_LANGS.includes(v as WidgetLang) ? (v as WidgetLang) : "en");

export const RATING_ROWS = ["AAA", "AA", "A", "BBB", "BB", "B"] as const;
export const YEAR_COLS = [
  { lo: 0, hi: 3, label: "0–3" },
  { lo: 3, hi: 7, label: "3–7" },
  { lo: 7, hi: 15, label: "7–15" },
  { lo: 15, hi: 100, label: "15+" },
] as const;
/** Fewer bonds than this in a cell and the cell shows a dash: one bond is not a market level. */
export const MIN_BONDS = 3;

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return Math.round((s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) * 100) / 100;
};

/** AAA..B band of a bond (AA+, AA and AA- are all "AA"); null for unrated bonds and anything below B. */
function band(b: PublicBond): (typeof RATING_ROWS)[number] | null {
  const n = bondNotch(b);
  if (n === null) return null;
  if (n === 0) return "AAA";
  if (n <= 3) return "AA";
  if (n <= 6) return "A";
  if (n <= 9) return "BBB";
  if (n <= 12) return "BB";
  if (n <= 15) return "B";
  return null;
}

export type YieldGrid = { rows: { rating: string; cells: (number | null)[] }[]; bonds: number };

/** Median yield per rating band (rows) and years to maturity (columns). Rows with no value at all are left out. */
export function yieldGrid(bonds: PublicBond[], now = new Date()): YieldGrid {
  const cells = new Map<string, number[]>();
  let n = 0;
  for (const b of bonds) {
    if (b.currency !== "EUR" || b.grossYtm === null || !b.maturity) continue;
    const r = band(b);
    if (!r) continue;
    const years = (Date.parse(b.maturity) - now.getTime()) / (365.25 * 86_400_000);
    const col = YEAR_COLS.findIndex((c) => years >= c.lo && years < c.hi);
    if (col < 0) continue;
    const k = `${r}|${col}`;
    cells.set(k, [...(cells.get(k) ?? []), b.grossYtm]);
    n++;
  }
  const rows = RATING_ROWS.map((rating) => ({
    rating,
    cells: YEAR_COLS.map((_, i) => {
      const ys = cells.get(`${rating}|${i}`) ?? [];
      return ys.length >= MIN_BONDS ? median(ys) : null;
    }),
  })).filter((r) => r.cells.some((c) => c !== null));
  return { rows, bonds: n };
}

type WidgetText = { title: string; years: string; rating: string; asOf: string; by: string; note: string; home: string; empty: string; numLocale: string };
export const WIDGET_TEXT: Record<WidgetLang, WidgetText> = {
  en: { title: "EUR bond yields today", years: "Years to maturity", rating: "Rating", asOf: "Data as of", by: "Bond yields by 10BONDS", note: "Median gross yield to maturity. Information only, not advice.", home: "/", empty: "No data right now.", numLocale: "en-GB" },
  it: { title: "Rendimenti delle obbligazioni in euro oggi", years: "Anni alla scadenza", rating: "Rating", asOf: "Dati al", by: "Rendimenti obbligazionari di 10BONDS", note: "Rendimento lordo a scadenza mediano. Solo informazione, non consulenza.", home: "/it", empty: "Nessun dato al momento.", numLocale: "it-IT" },
  fr: { title: "Rendements des obligations en euros aujourd'hui", years: "Années jusqu'à l'échéance", rating: "Notation", asOf: "Données au", by: "Rendements obligataires par 10BONDS", note: "Rendement brut médian à l'échéance. Information uniquement, pas un conseil.", home: "/fr", empty: "Aucune donnée pour le moment.", numLocale: "fr-FR" },
  de: { title: "Renditen von Euro-Anleihen heute", years: "Jahre bis Fälligkeit", rating: "Rating", asOf: "Datenstand", by: "Anleiherenditen von 10BONDS", note: "Median der Bruttorendite bis Fälligkeit. Nur Information, keine Beratung.", home: "/de", empty: "Derzeit keine Daten.", numLocale: "de-DE" },
};

/** The public address of the widget for one language and theme. */
export const embedUrl = (lang: WidgetLang, dark = false) => `${SITE_URL}/embed/yields?lang=${lang}${dark ? "&theme=dark" : ""}`;

/** What a site owner pastes: the frame, and under it the plain link that credits 10BONDS. */
export function embedSnippet(lang: WidgetLang, dark = false): string {
  const t = WIDGET_TEXT[lang];
  return [
    `<iframe src="${embedUrl(lang, dark)}" title="${t.title}" width="100%" height="330" style="border:0;max-width:520px" loading="lazy"></iframe>`,
    `<p style="font-size:12px;margin:4px 0 0"><a href="${SITE_URL}${t.home}">${t.by}</a></p>`,
  ].join("\n");
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** The widget page itself: plain HTML and CSS, no script, so it is light and safe on any site. */
export function widgetHtml(grid: YieldGrid, asOf: string | null, lang: WidgetLang, dark: boolean): string {
  const t = WIDGET_TEXT[lang];
  const fmt = (v: number | null) => (v === null ? "–" : `${v.toLocaleString(t.numLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`);
  const c = dark ? { bg: "#1c1c1e", ink: "#f5f5f7", mute: "#a1a1a6", line: "#38383a", accent: "#2997ff" } : { bg: "#ffffff", ink: "#1d1d1f", mute: "#6e6e73", line: "#e5e5ea", accent: "#0071e3" };
  const date = asOf ? new Date(asOf).toLocaleDateString(t.numLocale, { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Rome" }) : null;
  const body = grid.rows.length
    ? `<table><thead><tr><th>${esc(t.rating)}</th>${YEAR_COLS.map((y) => `<th>${y.label}</th>`).join("")}</tr></thead><tbody>${grid.rows
        .map((r) => `<tr><th>${r.rating}</th>${r.cells.map((v) => `<td>${fmt(v)}</td>`).join("")}</tr>`)
        .join("")}</tbody></table><p class="sub">${esc(t.years)}</p>`
    : `<p class="sub">${esc(t.empty)}</p>`;
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(t.title)}</title>
<style>
*{box-sizing:border-box}html,body{margin:0;background:${c.bg};color:${c.ink};font:14px/1.4 -apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",Roboto,Helvetica,Arial,sans-serif}
.w{padding:14px 16px}h1{font-size:15px;font-weight:600;margin:0 0 8px}table{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}
th,td{padding:6px 4px;text-align:right;border-bottom:1px solid ${c.line};font-weight:400}thead th{color:${c.mute};font-size:12px}tbody th{text-align:left;font-weight:600}thead th:first-child{text-align:left}
.sub{color:${c.mute};font-size:11px;margin:6px 0 0;text-align:right}.f{display:flex;justify-content:space-between;gap:8px;margin-top:10px;color:${c.mute};font-size:11px}
a{color:${c.accent};text-decoration:none}a:hover{text-decoration:underline}
</style></head><body><div class="w"><h1>${esc(t.title)}</h1>${body}
<div class="f"><span>${esc(t.note)}${date ? ` ${esc(t.asOf)} ${esc(date)}.` : ""}</span><a href="${SITE_URL}${t.home}" target="_blank" rel="noopener">10BONDS</a></div></div></body></html>`;
}
