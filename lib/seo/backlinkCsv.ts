// Backlink import from a CSV file: the Search Console "Latest links" or "Top linking sites" export, an Ahrefs or
// Semrush export, or a simple file with source_url,target_url columns. Columns are found by their header.

export type CsvLink = { sourceUrl: string; targetUrl: string; verifiedAt: string | null; rel: "follow" | "nofollow" | "ugc" | "sponsored" };

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const sep = (text.split(/\r?\n/)[0].match(/;/g)?.length ?? 0) > (text.split(/\r?\n/)[0].match(/,/g)?.length ?? 0) ? ";" : text.includes("\t") && !text.includes(",") ? "\t" : ",";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim())) rows.push(row);
  return rows.map((r) => r.map((c) => c.replace(/^﻿/, "").trim()));
}

const pick = (header: string[], names: string[]) => header.findIndex((h) => names.includes(h.toLowerCase().replace(/[^a-z]/g, "")));

function toDay(v: string | undefined): string | null {
  if (!v) return null;
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})/) ?? null;
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function asUrl(v: string): string | null {
  const s = v.trim();
  if (!s) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}/`);
    return u.protocol.startsWith("http") && u.hostname.includes(".") ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Links found in the file (at most 2000), plus how many rows could not be read. */
export function linksFromCsv(text: string, defaultTarget: string): { links: CsvLink[]; skipped: number; error: string | null } {
  const rows = parseCsv(text);
  if (rows.length < 2) return { links: [], skipped: 0, error: "The file has no data rows." };
  const h = rows[0];
  const src = pick(h, ["linkingpage", "sourceurl", "referringpageurl", "url", "source", "fromurl", "referringurl"]);
  const site = pick(h, ["site", "domain", "referringdomain", "linkingsite", "sourcedomain"]);
  const tgt = pick(h, ["targetpage", "targeturl", "target", "tourl", "destination"]);
  const date = pick(h, ["lastcrawled", "lastseen", "verifiedat", "firstseen", "date"]);
  const nof = pick(h, ["nofollow", "rel", "linktype"]);
  if (src === -1 && site === -1) return { links: [], skipped: rows.length - 1, error: "No column with the linking page or site was found (expected e.g. 'Linking page', 'Site' or 'source_url')." };
  const links: CsvLink[] = [];
  let skipped = 0;
  for (const r of rows.slice(1, 2001)) {
    const sourceUrl = asUrl(src !== -1 ? r[src] ?? "" : r[site] ?? "");
    const targetUrl = (tgt !== -1 ? asUrl(r[tgt] ?? "") : null) ?? defaultTarget;
    if (!sourceUrl) {
      skipped++;
      continue;
    }
    const relRaw = nof !== -1 ? (r[nof] ?? "").toLowerCase() : "";
    const rel = /sponsored/.test(relRaw) ? "sponsored" : /ugc/.test(relRaw) ? "ugc" : /nofollow|^true$/.test(relRaw) ? "nofollow" : "follow";
    links.push({ sourceUrl, targetUrl, verifiedAt: date !== -1 ? toDay(r[date]) : null, rel });
  }
  return { links, skipped, error: null };
}
