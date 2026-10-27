import { accountsConfigured, accountsSql } from "./accounts";
import type { BondSource } from "./bonds";
import type { BondFilter } from "./bondFilter";
import type { PublicBond, RankedBond } from "./types";
import { activePolicy, checkList, END_POLICY, factsOf } from "./coherence";
import { listLifeLoss, lossAdjustedYield } from "./expectedLoss";
import { UNRATED_NOTCH } from "./ranking";
import { bondNotch, bondRisk } from "./ratings";
import { lgdOf } from "./seniority";
import { isSovereignBond } from "./sovereign";
import { frontierKey } from "./frontierCache";
import { LIMITS } from "./limits";
import type { SliderPosition } from "./sliderPortfolios";

// The "30 risk bands" slider (owner 27/10/2026), shown next to the standard slider and off by default.
// The lists come from the revised 30-band method (lib/bandFrontier.ts): the efficient lists of the regular rules plus the two approved ends,
// up to 30 positions evenly spaced in return. They are worked out on a fast runner (scripts/precompute-bands30.ts) and saved in the database;
// the live site only reads them. Each list is re-checked here against today's bond rows (10 bonds, every rule), and its figures are recomputed.

export type SavedBands = { duration: number; lists: { isins: string[]; kind: "regular" | "low-end" | "high-end" }[]; complete: boolean; asOf: string };

export const bandsKey = (src: BondSource, f: BondFilter, duration: number) => `${frontierKey(src, f, duration, "spread")}|bands30-v2`;

let ready: Promise<void> | null = null;
async function sql() {
  const s = await accountsSql();
  ready ??= (async () => {
    await s`create table if not exists app.bands30_cache (key text primary key, data jsonb not null, created_at timestamptz not null default now())`;
  })().catch((e) => { ready = null; throw e; });
  await ready;
  return s;
}
const esc = (x: string) => x.replace(/[\\%_]/g, "\\$&");

/** Saved lists for exactly this data, else the newest saved for the same filter and horizon (prices move a little between runs). */
export async function loadBands(key: string): Promise<{ data: SavedBands; stale: boolean } | null> {
  if (!accountsConfigured()) return null;
  try {
    const s = await sql();
    const exact = await s`select data from app.bands30_cache where key = ${key}`;
    if (exact[0]) return { data: exact[0].data as SavedBands, stale: false };
    const rest = key.slice(key.indexOf("|"));
    const near = await s`select data from app.bands30_cache where key like ${"%" + esc(rest)} order by created_at desc limit 1`;
    return near[0] ? { data: near[0].data as SavedBands, stale: true } : null;
  } catch (e) {
    console.error("[bands30] load failed:", (e as Error).message);
    return null;
  }
}

export async function saveBands(key: string, data: SavedBands): Promise<void> {
  if (!accountsConfigured()) return;
  const s = await sql();
  const rest = key.slice(key.indexOf("|"));
  await s`delete from app.bands30_cache where key like ${"%" + esc(rest)} and key <> ${key}`;
  await s`insert into app.bands30_cache (key, data) values (${key}, ${s.json(data as never)}) on conflict (key) do update set data = excluded.data, created_at = now()`;
}

const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
const r2 = (n: number) => Math.round(n * 100) / 100;
const r3 = (n: number) => Math.round(n * 1000) / 1000;

type Checked = { rows: RankedBond[]; kind: SavedBands["lists"][number]["kind"]; ytm: number; el: number };

/** Each saved list against today's rows: all ten bonds present and every rule passing, else it is left out. Sorted by return. */
function checked(saved: SavedBands, bonds: PublicBond[], duration: number): Checked[] {
  const by = new Map(bonds.map((b) => [b.isin, b]));
  const policy = { ...activePolicy(), maxDispersion: 9, minCore: 0, minWorst: 0 };
  const out: Checked[] = [];
  for (const l of saved.lists) {
    const bs = l.isins.map((i) => by.get(i));
    if (bs.length !== 10 || bs.some((b) => !b || b.grossYtm == null || b.modifiedDuration == null)) continue;
    const rows = bs as PublicBond[];
    const facts = rows.map((b) => factsOf(b));
    if (checkList(facts, l.kind === "regular" ? policy : END_POLICY, LIMITS.risk.max).some((c) => !c.ok && c.rule !== "worst" && c.rule !== "core")) continue;
    if (Math.abs(avg(rows.map((b) => b.modifiedDuration!)) - duration) > duration * 0.05 + 1e-9) continue;
    const ranked: RankedBond[] = rows
      .map((b) => ({ ...b, ratingNotch: bondNotch(b), score: lossAdjustedYield(b.grossYtm!, bondNotch(b) ?? UNRATED_NOTCH, b.modifiedDuration!, lgdOf(b), isSovereignBond(b)), rank: 0 }))
      .sort((a, b) => b.score - a.score || b.grossYtm! - a.grossYtm! || a.isin.localeCompare(b.isin))
      .map((x, i) => ({ ...x, rank: i + 1 }));
    out.push({ rows: ranked, kind: l.kind, ytm: avg(rows.map((b) => b.grossYtm!)), el: listLifeLoss(facts.map((f) => f.pd)) });
  }
  return out.sort((a, b) => a.ytm - b.ytm);
}

/** The slider positions of the 30-band mode (numbered 1..k, return going up), or null when no lists are saved for this filter and horizon. */
export async function bandsPositions(src: BondSource, f: BondFilter, duration: number): Promise<SliderPosition[] | null> {
  const hit = await loadBands(bandsKey(src, f, duration));
  if (!hit) return null;
  const list = checked(hit.data, src.bonds, duration);
  if (!list.length) return null;
  return list.map((c, i) => {
    const risks = c.rows.map((b) => bondRisk(b) ?? LIMITS.risk.max);
    return {
      position: i + 1,
      target: r2(c.ytm),
      query: { ytm: r2(c.ytm), risk: LIMITS.risk.max, guard: true as const },
      ytm: r2(c.ytm),
      expectedLoss: r3(c.el),
      avgRisk: Math.round(avg(risks) * 10) / 10,
      worstRisk: Math.max(...risks),
      isins: c.rows.map((b) => b.isin).sort(),
      sameAs: null,
      unavailable: false,
    };
  });
}

/** The ten bonds of one position (1-based), with the same checks as the positions; null if there is none. */
export async function bandsRows(src: BondSource, f: BondFilter, duration: number, position: number): Promise<RankedBond[] | null> {
  const hit = await loadBands(bandsKey(src, f, duration));
  if (!hit) return null;
  return checked(hit.data, src.bonds, duration)[position - 1]?.rows ?? null;
}
