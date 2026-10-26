// Admin only (the owner, 26/10/2026): what the IR/BR button sends and reads back for the "$bonds" skill.
// The skill text itself is never changed; the JSON request below is appended after it.

import { createHash } from "node:crypto";

export const JSON_CONTRACT = `
---
MACHINE-READABLE RESULT (required by the 10BONDS application):
After your complete analysis, end the answer with ONE JSON block and nothing after it, in a fenced code block marked json, exactly with these keys.
Use numbers (no units) for numeric fields and null where a value is unverified or not calculable; never invent a value.

\`\`\`json
{
  "isin": "<the ISIN analysed>",
  "ir_min": <IR minimum 0-100>,
  "ir_max": <IR maximum 0-100, same as ir_min for a point value>,
  "br_min": <BR minimum 0-100>,
  "br_max": <BR maximum 0-100>,
  "agency_rating": "<agency rating text, e.g. S&P BBB+ / Moody's Baa1 (S&P equivalent: BBB+)>",
  "recommendation_score": <0.0-10.0>,
  "recommendation_label": "<short label>",
  "bund_spread_bp": <number>,
  "expected_loss_bp": <annual expected loss in bp per year>,
  "net_spread_bp": <number>,
  "risk_pay": <ratio, e.g. 6.0>,
  "ytm": <gross YTM in percent>,
  "mod_duration": <years>,
  "risk_badges": {
    "news_management_legal": "red|amber|green|grey",
    "politics_geopolitics_sovereign_regulation": "red|amber|green|grey",
    "market_competition_technology": "red|amber|green|grey",
    "rates_refinancing_liquidity_leverage": "red|amber|green|grey",
    "macro_fx_energy_supply_chain": "red|amber|green|grey",
    "health_climate_cyber": "red|amber|green|grey"
  },
  "at1": "YES|NO|UNKNOWN",
  "tier2": "YES|NO|UNKNOWN",
  "snp": "YES|NO|UNKNOWN",
  "cln": "YES|NO|UNKNOWN",
  "assessment_date": "YYYY-MM-DD"
}
\`\`\``;

/** The system text: the skill, then the JSON request. */
export const systemFor = (skill: string) => `${skill.trim()}\n${JSON_CONTRACT}`;
/** The user message that triggers the skill. */
export const bondsPrompt = (isin: string) => `$bonds ${isin}`;

/** Short fingerprint of the skill text used, stored with every run ("json1" = version of the JSON request). */
export const skillVersion = (skill: string) => `${createHash("sha1").update(skill.trim()).digest("hex").slice(0, 8)}+json1`;

export type BondsJson = Record<string, unknown> & {
  ir_min?: number | null; ir_max?: number | null; br_min?: number | null; br_max?: number | null;
  risk_pay?: number | string | null;
};

/** The last JSON object in the answer that carries the skill's keys; null when there is none or it is broken. */
export function parseBondsJson(text: string): BondsJson | null {
  const blocks = [...text.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)].map((m) => m[1]);
  const tail = text.lastIndexOf("{");
  if (tail >= 0) blocks.push(text.slice(tail));
  for (const b of blocks.reverse()) {
    const start = b.indexOf("{");
    const end = b.lastIndexOf("}");
    if (start < 0 || end <= start) continue;
    try {
      const j = JSON.parse(b.slice(start, end + 1));
      if (j && typeof j === "object" && !Array.isArray(j) && ("ir_min" in j || "br_min" in j || "ir_max" in j || "br_max" in j || "risk_pay" in j)) return j as BondsJson;
    } catch { /* try the next block */ }
  }
  return null;
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : null);
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
function range(lo: unknown, hi: unknown): string | null {
  const a = num(lo);
  const b = num(hi);
  if (a == null && b == null) return null;
  const x = a ?? (b as number);
  const y = b ?? x;
  const [min, max] = x <= y ? [x, y] : [y, x];
  if (min < 0 || max > 100) return null;
  return min === max ? fmt(min) : `${fmt(min)}–${fmt(max)}`;
}

/** The three table cells (0-100 scores as a point or a range, Risk Pay as a ratio). */
export function toCells(j: BondsJson | null): { ir: string | null; br: string | null; riskPay: string | null } {
  if (!j) return { ir: null, br: null, riskPay: null };
  const rp = j.risk_pay;
  const n = num(rp);
  const riskPay = n != null ? (n >= 0 && n < 10000 ? `${n.toFixed(1)}×` : null) : typeof rp === "string" && /\d/.test(rp) ? rp.trim().slice(0, 40) : null;
  return { ir: range(j.ir_min, j.ir_max), br: range(j.br_min, j.br_max), riskPay };
}
