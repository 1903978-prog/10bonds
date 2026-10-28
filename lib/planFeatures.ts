import { accountsSql, type User } from "./accounts";
import { ALL_FEATURES, defaultMatrix, FEATURES, featuresOf, isFeatureKey, type FeatureKey, type FeaturePlan, type Matrix } from "./features";
import { proStatus } from "./pro";

// The admin's feature table (lib/features.ts), saved in app.plan_features. Features the table does not hold yet keep
// their default ticks. Read at most once a minute per server; a save clears it at once on this server.

let ready: Promise<void> | null = null;
async function sql() {
  const s = await accountsSql();
  ready ??= (async () => {
    await s`
      create table if not exists app.plan_features (
        feature text primary key,
        free boolean not null,
        plus boolean not null,
        premium boolean not null,
        pro boolean not null,
        updated_at timestamptz not null default now()
      )`;
  })().catch((e) => {
    ready = null;
    throw e;
  });
  await ready;
  return s;
}

const CACHE_MS = 60_000;
let cache: { at: number; m: Matrix } | null = null;

/** The ticks in force. Falls back to the defaults if the accounts database cannot be reached. */
export async function loadMatrix(): Promise<Matrix> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.m;
  const m = defaultMatrix();
  try {
    const s = await sql();
    const rows = await s<{ feature: string; free: boolean; plus: boolean; premium: boolean; pro: boolean }[]>`select feature, free, plus, premium, pro from app.plan_features`;
    for (const r of rows) if (isFeatureKey(r.feature)) m[r.feature] = { free: r.free, plus: r.plus, premium: r.premium, pro: r.pro };
  } catch (e) {
    console.error("[planFeatures]", (e as Error).message);
    return m;
  }
  cache = { at: Date.now(), m };
  return m;
}

/** Saves the whole table (unknown features are ignored). */
export async function saveMatrix(raw: unknown): Promise<Matrix> {
  const m = cleanMatrix(raw);
  const s = await sql();
  await s.begin(async (tx) => {
    for (const f of FEATURES) {
      const v = m[f.key];
      await tx`
        insert into app.plan_features (feature, free, plus, premium, pro) values (${f.key}, ${v.free}, ${v.plus}, ${v.premium}, ${v.pro})
        on conflict (feature) do update set free = excluded.free, plus = excluded.plus, premium = excluded.premium, pro = excluded.pro, updated_at = now()`;
    }
  });
  cache = { at: Date.now(), m };
  return m;
}

/** A table sent by the admin page: every known feature, missing cells keep the defaults. */
export function cleanMatrix(raw: unknown): Matrix {
  const m = defaultMatrix();
  const r = (raw ?? {}) as Record<string, Record<string, unknown>>;
  for (const f of FEATURES) {
    const row = r[f.key];
    if (!row || typeof row !== "object") continue;
    for (const p of ["free", "plus", "premium", "pro"] as const) if (typeof row[p] === "boolean") m[f.key][p] = row[p] as boolean;
  }
  return m;
}

/** Which column of the table an account uses. Pro needs both the Pro plan and the admin's approval. */
export async function planColumn(user: User): Promise<FeaturePlan> {
  if (user.storedPlan === "pro" && (await proStatus(user).catch(() => "none")) === "approved") return "pro";
  return user.plan;
}

/** The features this account may use now. Signed out (or unconfirmed past the grace period): none. The admin: all. */
export async function featuresFor(user: User | null): Promise<FeatureKey[]> {
  if (!user || user.confirmBlocked) return [];
  if (user.isAdmin) return ALL_FEATURES;
  return featuresOf(await loadMatrix(), await planColumn(user));
}

/** May this account search an exact year (1 to 15) instead of a term? Plans with "exact_year" and the admin. */
export async function canExactYear(user: User | null): Promise<boolean> {
  return (await featuresFor(user)).includes("exact_year");
}
