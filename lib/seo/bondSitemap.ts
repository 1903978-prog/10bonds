import { gzipSync } from "node:zlib";
import { loadAllShown } from "../bonds";
import { SITE_URL } from "./crawl";
import { BOND_LANGS, bondPagePath, bondSitemapLanguages, isIsin } from "./bondPages";

// The bond sitemap is an index (/bonds/sitemap.xml) of files of at most 3,000 bonds (12,000 addresses) each
// (/bonds/sitemaps/1.xml ...), built once per copy of the table and kept compressed in memory. It used to be one file of
// about 60,000 addresses that Next built again on every request, which kept the server busy for 25 seconds each time.

const PER_FILE = 3000;
type Built = { key: string; files: Buffer[] };
let built: Built | null = null;
let building: Promise<Built | null> | null = null;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function fileXml(isins: string[], lastmod: string | null): string {
  const out: string[] = ['<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">'];
  for (const isin of isins) {
    const alt = Object.entries(bondSitemapLanguages(SITE_URL, isin) as Record<string, string>).map(([h, u]) => `<xhtml:link rel="alternate" hreflang="${h}" href="${esc(u)}"/>`).join("");
    for (const l of BOND_LANGS)
      out.push(`<url><loc>${esc(SITE_URL + bondPagePath(l, isin))}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}<changefreq>daily</changefreq><priority>0.6</priority>${alt}</url>`);
  }
  out.push("</urlset>");
  return out.join("");
}

async function build(): Promise<Built | null> {
  const { bonds, source, asOf } = await loadAllShown().catch(() => ({ bonds: [], source: "sample" as const, asOf: null }));
  if (source !== "live") return null;
  const key = `${asOf}:${bonds.length}`;
  if (built?.key === key) return built;
  const isins = [...new Set(bonds.map((b) => b.isin))].filter(isIsin);
  const files: Buffer[] = [];
  for (let i = 0; i < isins.length; i += PER_FILE) {
    files.push(gzipSync(fileXml(isins.slice(i, i + PER_FILE), asOf)));
    await new Promise((done) => setImmediate(done)); // other requests are served between files
  }
  built = { key, files };
  return built;
}

/** The compressed files for the current copy; the first call builds them, the others wait for that build. */
export async function bondSitemapFiles(): Promise<Buffer[]> {
  building ??= build().finally(() => { building = null; });
  const r = await building;
  return r?.files ?? built?.files ?? [];
}

export const bondSitemapIndexXml = (count: number) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${Array.from({ length: count }, (_, i) => `<sitemap><loc>${SITE_URL}/bonds/sitemaps/${i + 1}.xml</loc></sitemap>`).join("")}</sitemapindex>`;
