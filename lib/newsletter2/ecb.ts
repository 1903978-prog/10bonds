// ECB statistics for the weekly e-mail (GREEN fields ecb_spot_rates, ecb_policy_rates, derived_changes).
// Read from the ECB Data Portal in CSV form. Every figure is checked for freshness before it can be used.

export type Obs = { date: string; value: number };
export type Series = { key: string; obs: Obs[] };

const BASE = "https://data-api.ecb.europa.eu/service/data";
export const ECB_URLS = {
  curve: `${BASE}/YC/B.U2.EUR.4F.G_N_A.SV_C_YM.SR_2Y+SR_5Y+SR_10Y+SR_30Y?format=csvdata&lastNObservations=12`,
  deposit: `${BASE}/FM/B.U2.EUR.4F.KR.DFR.LEV?format=csvdata&lastNObservations=3`,
};
export const ECB_POLICY_PAGE = "https://www.ecb.europa.eu/stats/policy_and_exchange_rates/key_ecb_interest_rates/html/index.en.html";
export const ECB_REUSE_PAGE = "https://www.ecb.europa.eu/stats/ecb_statistics/governance_and_quality_framework/html/usage_policy.en.html";

/** Splits one CSV line, honouring double quotes. */
function cells(line: string): string[] {
  const out: string[] = [];
  let cur = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

/** ECB csvdata -> series by KEY (needs the KEY, TIME_PERIOD and OBS_VALUE columns). Rows without a number are dropped. */
export function parseEcbCsv(csv: string): Series[] {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const head = cells(lines[0]);
  const k = head.indexOf("KEY"), t = head.indexOf("TIME_PERIOD"), v = head.indexOf("OBS_VALUE");
  if (k < 0 || t < 0 || v < 0) throw new Error("ECB data: unexpected columns");
  const by = new Map<string, Obs[]>();
  for (const l of lines.slice(1)) {
    const c = cells(l);
    const value = Number(c[v]);
    if (!c[v] || !Number.isFinite(value)) continue;
    (by.get(c[k]) ?? by.set(c[k], []).get(c[k])!).push({ date: c[t], value });
  }
  return [...by].map(([key, obs]) => ({ key, obs: obs.sort((a, b) => a.date.localeCompare(b.date)) }));
}

export async function fetchEcbCsv(url: string, timeoutMs = 15000): Promise<string> {
  const r = await fetch(url, { headers: { Accept: "text/csv" }, signal: AbortSignal.timeout(timeoutMs) });
  if (!r.ok) throw new Error(`ECB data: HTTP ${r.status}`);
  return r.text();
}

const DAY = 86400_000;
const dayDiff = (a: string, b: string) => Math.round((Date.parse(a) - Date.parse(b)) / DAY);
const shift = (d: string, days: number) => new Date(Date.parse(d) + days * DAY).toISOString().slice(0, 10);

/** Daily data must be at most this many days old (a long weekend plus a bank holiday). */
export const MAX_AGE_DAYS = 5;

export type CurveRow = { tenor: number; now: number; prior: number; changeBp: number };
export type Curve = { asOf: string; priorDate: string; rows: CurveRow[]; slopeNow: number; slopePriorChangeBp: number };

/** Four-tenor curve: latest value, the value a week earlier, change in basis points. Null (with the reason) when any check fails. */
export function curveFrom(series: Series[], today: string): { ok: true; curve: Curve } | { ok: false; reason: string } {
  const tenors = [2, 5, 10, 30];
  const rows: CurveRow[] = [];
  let asOf = "", priorDate = "";
  for (const y of tenors) {
    const s = series.find((x) => x.key.endsWith(`SR_${y}Y`));
    if (!s || !s.obs.length) return { ok: false, reason: `missing ${y}-year series` };
    const last = s.obs[s.obs.length - 1];
    if (dayDiff(today, last.date) > MAX_AGE_DAYS || dayDiff(today, last.date) < 0) return { ok: false, reason: `${y}-year value dated ${last.date} is not fresh` };
    if (asOf && asOf !== last.date) return { ok: false, reason: "tenors are dated differently" };
    asOf = last.date;
    const target = shift(last.date, -7);
    const prior = [...s.obs].reverse().find((o) => o.date <= target && dayDiff(target, o.date) <= 3);
    if (!prior) return { ok: false, reason: `no value near ${target} for ${y}-year` };
    priorDate = prior.date;
    rows.push({ tenor: y, now: last.value, prior: prior.value, changeBp: (last.value - prior.value) * 100 });
  }
  const r2 = rows.find((r) => r.tenor === 2)!, r10 = rows.find((r) => r.tenor === 10)!;
  return { ok: true, curve: { asOf, priorDate, rows, slopeNow: (r10.now - r2.now) * 100, slopePriorChangeBp: (r10.now - r2.now - (r10.prior - r2.prior)) * 100 } };
}

export type Policy = { rate: number; since: string };

/** The deposit facility rate in force: the last change on or before today (no age limit: it only changes at meetings). */
export function policyFrom(series: Series[], today: string): { ok: true; policy: Policy } | { ok: false; reason: string } {
  const s = series.find((x) => x.key.includes("KR.DFR"));
  const last = s?.obs.filter((o) => o.date <= today).pop();
  if (!last) return { ok: false, reason: "no deposit facility rate" };
  return { ok: true, policy: { rate: last.value, since: last.date } };
}
