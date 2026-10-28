import { FED_URL, parseFedCsv, parseTreasuryXml, treasuryUrl, type FedParse, type TreasuryParse } from "./core";

// Downloads from the Federal Reserve and the Treasury. Only call this from a runner or an admin action, never on a customer request. Retries transient failures; never invents a value.
export async function fetchText(url: string, tries = 3, timeoutMs = 60000, f: typeof fetch = fetch): Promise<string> {
  let err = "";
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await f(url, { headers: { "User-Agent": "10bonds-benchmark/1.0 (+https://10bonds.com)" }, signal: AbortSignal.timeout(timeoutMs), redirect: "follow" });
      if (res.ok) return await res.text();
      err = `HTTP ${res.status}`;
      if (res.status < 500 && res.status !== 429) break;
    } catch (e) { err = e instanceof Error ? e.message : String(e); }
    if (i < tries) await new Promise((r) => setTimeout(r, 2000 * 2 ** (i - 1)));
  }
  throw new Error(`Download failed (${url.slice(0, 80)}): ${err}`);
}

export const fetchFed = async (f: typeof fetch = fetch): Promise<FedParse> => parseFedCsv(await fetchText(FED_URL, 3, 90000, f));

const ym = (d: Date) => `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
/** Current and previous month, so a Monday on the 1st still finds the last days of the month before. */
export async function fetchTreasury(now = new Date(), f: typeof fetch = fetch): Promise<TreasuryParse> {
  const prev = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const all: TreasuryParse = { days: [], errors: [], entries: 0, incompleteDays: 0 };
  for (const m of [ym(prev), ym(now)]) {
    const r = parseTreasuryXml(await fetchText(treasuryUrl(m), 3, 45000, f));
    all.days.push(...r.days); all.errors.push(...r.errors); all.entries += r.entries; all.incompleteDays += r.incompleteDays;
  }
  all.days.sort((a, b) => a.date.localeCompare(b.date));
  return all;
}
