import type { Holding } from "./replacement";

export const MAX_HOLDINGS = 300;
const ISIN_RE = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;

/**
 * Read a portfolio pasted or uploaded as CSV / spreadsheet text: one bond per line with its ISIN
 * and the amount held (EUR). Columns can be in any order, separated by comma, semicolon or tab;
 * a header line is optional. Repeated ISINs are added up.
 */
export function parsePortfolio(text: string): { holdings: Holding[]; skipped: { line: number; text: string; why: string }[] } {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/);
  const sep = guessSeparator(lines);
  const totals = new Map<string, number>();
  const skipped: { line: number; text: string; why: string }[] = [];

  lines.forEach((raw, idx) => {
    const line = raw.trim();
    if (!line) return;
    const cells = line.split(sep).map((c) => c.trim().replace(/^"(.*)"$/, "$1").trim());
    const isin = cells.map((c) => c.toUpperCase().replace(/\s/g, "")).find((c) => ISIN_RE.test(c));
    if (!isin) {
      // A header line ("ISIN;Amount") is fine to skip silently.
      if (idx > 0 || !/isin/i.test(line)) skipped.push({ line: idx + 1, text: line.slice(0, 80), why: "no ISIN found" });
      return;
    }
    const amount = cells.filter((c) => c.toUpperCase().replace(/\s/g, "") !== isin).map(parseAmount).find((n) => n !== null && n > 0);
    if (amount === undefined || amount === null) {
      skipped.push({ line: idx + 1, text: line.slice(0, 80), why: "no amount found" });
      return;
    }
    totals.set(isin, (totals.get(isin) ?? 0) + amount);
  });

  const holdings = [...totals.entries()].map(([isin, amount]) => ({ isin, amount }));
  if (holdings.length > MAX_HOLDINGS) {
    for (const h of holdings.slice(MAX_HOLDINGS)) skipped.push({ line: 0, text: h.isin, why: `more than ${MAX_HOLDINGS} bonds` });
    holdings.length = MAX_HOLDINGS;
  }
  return { holdings, skipped };
}

function guessSeparator(lines: string[]): string | RegExp {
  const sample = lines.slice(0, 10).join("\n");
  if (sample.includes("\t")) return "\t";
  if (sample.includes(";")) return ";";
  // Comma-separated, but keep "1,000,000.00"-style amounts in quotes together.
  return /,(?=(?:[^"]*"[^"]*")*[^"]*$)/;
}

/** "1.000.000,50", "1,000,000.50", "250000", "€ 250 000", "1e6" → number. */
export function parseAmount(raw: string): number | null {
  let s = raw.replace(/[€\s']|EUR/gi, "");
  if (!/^[0-9.,eE+-]+$/.test(s) || !/[0-9]/.test(s)) return null;
  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");
  if (lastDot >= 0 && lastComma >= 0) {
    // The later one is the decimal mark.
    s = lastComma > lastDot ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (lastComma >= 0) {
    // "1,000,000" (thousands) vs "1000,5" (decimal)
    s = /^\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, "") : s.replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, "");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
