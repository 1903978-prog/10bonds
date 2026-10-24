import { getSetting, setSetting } from "./accounts";

// The ETF comparison shown beside the top 10 (the owner, 24/10/2026): one average, entered by the admin with its source and date.
export type EtfBenchmark = {
  ret: number; // Average return (per year), %
  risk: number; // Average 10BONDS risk of the ETFs' bonds
  riskRange: string; // Risk band the ETFs cover, e.g. "5–7"
  asOf: string; // YYYY-MM-DD
  source: string; // Admin only, never shown to customers
  methodology: string; // Admin only
  verified: boolean; // False = provisional: customers always see it as an illustrative benchmark
  on: boolean;
};

// Provisional figure given by the owner on 24/10/2026. No provider, fund or ISIN is ever shown to customers.
export const DEFAULT_ETF: EtfBenchmark = {
  ret: 4.46, risk: 6, riskRange: "5–7", asOf: "2026-09-29",
  source: "Provisional figure given by the owner (24 Oct 2026)", methodology: "Gross yield to maturity of one EUR corporate bond ETF; not an average across ETFs",
  verified: false, on: true,
};

const KEY = "etf_benchmark";

export function parseEtf(v: unknown): EtfBenchmark | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const ret = Number(o.ret), risk = Number(o.risk);
  const asOf = String(o.asOf ?? "");
  if (!Number.isFinite(ret) || ret < 0 || ret > 30) return null;
  if (!Number.isFinite(risk) || risk < 1 || risk > 10) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf)) return null;
  return {
    ret: Math.round(ret * 100) / 100,
    risk: Math.round(risk * 10) / 10,
    riskRange: String(o.riskRange ?? "").slice(0, 12),
    asOf,
    source: String(o.source ?? "").slice(0, 300),
    methodology: String(o.methodology ?? "").slice(0, 500),
    verified: o.verified === true,
    on: o.on !== false,
  };
}

export async function getEtf(): Promise<EtfBenchmark> {
  const raw = await getSetting(KEY).catch(() => null);
  if (!raw) return DEFAULT_ETF;
  try {
    return parseEtf(JSON.parse(raw)) ?? DEFAULT_ETF;
  } catch {
    return DEFAULT_ETF;
  }
}

export async function setEtf(b: EtfBenchmark) {
  await setSetting(KEY, JSON.stringify(b));
}
