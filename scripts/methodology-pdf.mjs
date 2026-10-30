// Builds the downloadable full-text methodology PDFs in public/methodology/ from lib/methodologyText.ts.
// Usage: CHROME_PATH=/path/to/chrome node --experimental-strip-types scripts/methodology-pdf.mjs
// Run again whenever the text in lib/methodologyText.ts changes, and commit the PDFs.
import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";
import { parseMethodDoc } from "../lib/methodDoc.ts";
import * as T from "../lib/methodologyText.ts";

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function blocks(bs) {
  let step = 0;
  return bs
    .map((b) => {
      switch (b.t) {
        case "p": return `<p>${esc(b.text)}</p>`;
        case "formula": return `<pre>${esc(b.text)}</pre>`;
        case "ol": case "ul": return `<${b.t}>${b.items.map((x) => `<li>${esc(x)}</li>`).join("")}</${b.t}>`;
        case "table":
          return `<table><thead><tr>${b.head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${b.rows
            .map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`)
            .join("")}</tbody></table>`;
        case "flow": return `<div class="card"><b>${esc(b.title)}</b>${b.score ? ` <span class="pill">${esc(b.score)}</span>` : ""}<br>${esc(b.text)}</div>`;
        case "pillar":
          return `<div class="card"><div class="row"><b>${esc(b.name)}</b><span class="bar"><i style="width:${(b.weight / 35) * 100}%"></i></span><b>${b.weight}%</b></div><small>${esc(b.parts)}</small></div>`;
        case "step": step++; return `<p><b>Stage ${step} — ${esc(b.title)}.</b> ${esc(b.text)}</p>`;
        case "stress": return `<p>${esc(b.name)}: score ${b.base} → ${b.stressed} under combined stress.</p>`;
      }
    })
    .join("\n");
}

function html(title, subtitle, md) {
  const sections = parseMethodDoc(md);
  const toc = sections.map((s) => `<li>${esc(s.title)}</li>`).join("");
  const body = sections
    .map((s) => `<section><h2>${esc(s.title)}</h2>${blocks(s.intro)}${s.subs.map((x) => `<h3>${esc(x.title)}</h3>${blocks(x.blocks)}`).join("")}</section>`)
    .join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>
    body{font:10.5pt/1.5 -apple-system,"Helvetica Neue",Arial,sans-serif;color:#1d1d1f;margin:0}
    .cover{height:250mm;display:flex;flex-direction:column;justify-content:center}
    .brand{font-weight:700;letter-spacing:.02em;color:#0066cc;font-size:12pt}
    h1{font-size:26pt;line-height:1.15;margin:8mm 0 3mm;letter-spacing:-.01em}
    .sub{color:#6e6e73;font-size:11pt}
    .note{margin-top:14mm;color:#6e6e73;font-size:9pt;border-top:1px solid #d2d2d7;padding-top:4mm}
    .toc{page-break-before:always}.toc ol{list-style:none;padding:0;line-height:2}
    section{page-break-before:always}
    h2{font-size:17pt;margin:0 0 4mm;letter-spacing:-.01em}
    h3{font-size:11.5pt;margin:6mm 0 2mm}
    p{margin:0 0 2.5mm}
    pre{background:#f5f5f7;border-radius:3mm;padding:2mm 3mm;font:9pt/1.4 Menlo,Consolas,monospace;white-space:pre-wrap;margin:0 0 2.5mm}
    table{width:100%;border-collapse:collapse;font-size:8.8pt;margin:2mm 0 4mm;page-break-inside:auto}
    tr{page-break-inside:avoid}
    th{background:#f5f5f7;text-align:left;font-size:7.8pt;text-transform:uppercase;letter-spacing:.03em;color:#6e6e73}
    th,td{padding:1.4mm 2mm;border-bottom:1px solid #e5e5ea;vertical-align:top}
    td:first-child{font-weight:600}
    .card{background:#f5f5f7;border-radius:3mm;padding:2.5mm 3.5mm;margin:0 0 2mm}
    .row{display:flex;align-items:center;gap:4mm}.row b:first-child{width:70mm}
    .bar{flex:1;height:3mm;background:#fff;border-radius:2mm;overflow:hidden}.bar i{display:block;height:100%;background:#3b82f6;border-radius:2mm}
    .pill{background:#1d1d1f;color:#fff;border-radius:3mm;padding:0 2mm;font-size:8pt}
    small{color:#6e6e73}
  </style></head><body>
    <div class="cover"><div class="brand">10BONDS</div><h1>${esc(title)}</h1><div class="sub">${esc(subtitle)}</div>
    <div class="note">Information only. Not a credit rating, a probability of default or investment advice. 10BONDS is not a credit rating agency. © ${new Date().getFullYear()} 10BONDS</div></div>
    <div class="toc"><h2>Contents</h2><ol>${toc}</ol></div>${body}</body></html>`;
}

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, channel: process.env.CHROME_PATH ? undefined : "chrome" });
mkdirSync("public/methodology", { recursive: true });
for (const [file, title, subtitle, md] of [
  ["10bonds-country-rating-methodology.pdf", T.SOVEREIGN_TITLE, T.SOVEREIGN_SUBTITLE, T.SOVEREIGN_MD],
  ["10bonds-company-rating-methodology.pdf", T.CORPORATE_TITLE, T.CORPORATE_SUBTITLE, T.CORPORATE_MD],
]) {
  const page = await browser.newPage();
  await page.setContent(html(title, subtitle, md));
  await page.pdf({
    path: `public/methodology/${file}`,
    format: "A4",
    margin: { top: "18mm", bottom: "18mm", left: "18mm", right: "18mm" },
    displayHeaderFooter: true,
    headerTemplate: "<span></span>",
    footerTemplate: `<div style="width:100%;font-size:7pt;color:#86868b;padding:0 18mm;display:flex;justify-content:space-between"><span>10BONDS · ${esc(title)}</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
  });
  console.log("wrote", file);
}
await browser.close();
