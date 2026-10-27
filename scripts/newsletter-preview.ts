// Writes the three newsletter previews (A, B, C) as HTML files. Read-only: sends nothing, touches no database.
// Version C uses the saved ECB figures in lib/newsletter2/fixtures; A and B use clearly marked sample bonds and are layout previews only.
// Usage: PREVIEW_OUT=dir npx vite-node -c vitest.config.ts scripts/newsletter-preview.ts
import fs from "node:fs";
import path from "node:path";
import { A_FIELDS, B_FIELDS, isValidIsin, type BondInput } from "../lib/newsletter2/gate";
import { buildIssue } from "../lib/newsletter2/issue";

const out = process.env.PREVIEW_OUT ?? "newsletter-previews";
fs.mkdirSync(out, { recursive: true });
const fx = (n: string) => fs.readFileSync(path.join("lib/newsletter2/fixtures", n), "utf8");
const base = { now: new Date("2026-10-27T06:30:00Z"), curveCsv: fx("ecb-yc.csv"), depositCsv: fx("ecb-dfr.csv"), unsubscribe: "https://10bonds.com/api/newsletter/unsubscribe?t=preview", base: "https://10bonds.com", retrievedAt: "2026-10-27T06:30:00Z" };

const isin = (b: string) => { for (let d = 0; d < 10; d++) if (isValidIsin(b + d)) return b + d; throw new Error(b); };
const bonds: BondInput[] = Array.from({ length: 6 }, (_, i) => ({
  isin: isin(`XS00000000${i}`), issuer: `SAMPLE ISSUER ${String.fromCharCode(65 + i)}`, currency: "EUR", coupon: 3 + i / 4, maturity: `203${1 + (i % 3)}-05-15`, issueDate: "2026-10-22",
  primary: { url: "https://example.org/sample-prospectus", label: "Sample issuer prospectus", retrievedAt: "2026-10-27T05:00:00Z" }, provenance: "sample", returnPerYear: 3.5 + i / 3,
}));
const banner = (t: string) => `<div style="background:#fff4e5;border-bottom:2px solid #ff9500;padding:10px 16px;font:600 13px/1.4 -apple-system,Segoe UI,Arial,sans-serif;color:#7a4a00;text-align:center">${t}</div>`;
const SAMPLE = "LAYOUT PREVIEW ONLY: sample bonds and unverified rights. This version cannot be built for subscribers today. Not sendable.";

const c = buildIssue(base);
const b = buildIssue({ ...base, bonds, conflictsText: "Conflicts of interest: [text to be approved by the owner and counsel]." }, { assumeGreen: B_FIELDS, assumeFacts: true });
const a = buildIssue({ ...base, bonds, conflictsText: "Conflicts of interest: [text to be approved by the owner and counsel]." }, { assumeGreen: A_FIELDS, assumeFacts: true });
for (const [name, i, note] of [["version-A", a, SAMPLE], ["version-B", b, SAMPLE], ["version-C", c, "PRODUCTION DEFAULT TODAY: real ECB figures from the saved fetch of 27 Oct 2026. Preview only; weekly sending stays OFF."]] as const) {
  if (!i.html) throw new Error(`${name}: nothing built`);
  fs.writeFileSync(path.join(out, `${name}.html`), i.html.replace("<body style=\"", `<body style="`).replace(/<body([^>]*)>/, `<body$1>${banner(note)}`));
  fs.writeFileSync(path.join(out, `${name}.txt`), `Subject: ${i.subject}\n\n${i.text}\n`);
  console.log(name, i.version, "violations:", i.violations.length, "sendable:", i.sendable, "|", i.subject);
}
