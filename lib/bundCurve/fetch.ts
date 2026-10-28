import { type CurveType, CURVE_TYPES, parseBundesbankCsv, type ParseResult } from "./core";

// Downloads the daily values from the official Bundesbank API (SDMX CSV). All 30 maturities of one family come in a single wildcard request.
// Only call this from a runner or an admin action, never on a customer request. Retries transient failures; never invents a value.
export const API = "https://api.statistiken.bundesbank.de/rest/data/BBSIS";
const LAST_N = 10; // about two weeks of daily values: enough to find the latest complete day across weekends and holidays

export const urlFor = (type: CurveType) => `${API}/D.I.${type}.ZI.EUR.S1311.B.A604..R.A.A._Z._Z.A?lastNObservations=${LAST_N}`;

export async function fetchText(url: string, tries = 3, timeoutMs = 30000, f: typeof fetch = fetch): Promise<string> {
  let err = "";
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await f(url, { headers: { Accept: "application/vnd.sdmx.data+csv;version=1.0.0" }, signal: AbortSignal.timeout(timeoutMs) });
      if (res.ok) return await res.text();
      err = `HTTP ${res.status}`;
      if (res.status < 500 && res.status !== 429) break; // a client error will not fix itself
    } catch (e) { err = e instanceof Error ? e.message : String(e); }
    if (i < tries) await new Promise((r) => setTimeout(r, 2000 * 2 ** (i - 1)));
  }
  throw new Error(`Bundesbank download failed: ${err}`);
}

export async function fetchOfficial(f: typeof fetch = fetch): Promise<ParseResult> {
  const all: ParseResult = { obs: [], errors: [], missing: 0 };
  for (const t of CURVE_TYPES) {
    const r = parseBundesbankCsv(await fetchText(urlFor(t), 3, 30000, f));
    all.obs.push(...r.obs); all.errors.push(...r.errors); all.missing += r.missing;
  }
  return all;
}
