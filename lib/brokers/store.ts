import { notOwnerVisitor } from "@/lib/ownerExclusion";
import { accountsConfigured, accountsSql } from "../accounts";
import { PROFILES, SEED_TARIFFS } from "./data";
import { DEFAULT_METHODOLOGY, type BrokerProfile, type Country, type Methodology, type Tariff, type TariffData } from "./types";

// Broker data lives in schema "app" of the 10BONDS database. The researched tariffs in data.ts seed the
// tables once; after that the admin edits them. Every edit is saved as a draft and only reaches the public
// pages after the admin approves it. Older versions are kept (history, effective dates).
// Without a database (local runs, build time) the public pages show the seed data.

type Sql = Awaited<ReturnType<typeof accountsSql>>;

export type CountrySettings = {
  published: boolean;
  /** Brokers removed from this country's list by the admin, with the reason. */
  excluded: { id: string; reason: string }[];
  /** Optional replacement for the intro paragraphs (admin-edited copy). */
  intro: string[] | null;
};

// Markets are public unless the admin unpublishes one (the owner asked to publish all three on 2026-10-19).
const DEFAULT_COUNTRY: CountrySettings = { published: true, excluded: [], intro: null };

let ready: Promise<void> | null = null;
async function db(): Promise<Sql> {
  const s = await accountsSql();
  ready ??= setup(s).catch((e) => {
    ready = null;
    throw e;
  });
  await ready;
  return s;
}

async function setup(s: Sql) {
  await s`
    create table if not exists app.broker_profiles (
      id text primary key,
      data jsonb not null,
      updated_at timestamptz not null default now()
    )`;
  await s`
    create table if not exists app.broker_tariffs (
      id bigserial primary key,
      broker_id text not null,
      country text not null check (country in ('it','fr','de')),
      data jsonb not null,
      effective_from date not null,
      verified_at date not null,
      status text not null default 'draft' check (status in ('draft','published','archived')),
      note text,
      created_at timestamptz not null default now(),
      created_by text,
      approved_at timestamptz,
      approved_by text
    )`;
  await s`create index if not exists broker_tariffs_lookup on app.broker_tariffs (country, broker_id, status, effective_from desc)`;
  await s`create table if not exists app.broker_settings (key text primary key, value jsonb not null, updated_at timestamptz not null default now())`;
  // Seed: researched profiles and tariffs, only where nothing exists yet. Never overwrites admin data.
  for (const p of PROFILES) await s`insert into app.broker_profiles (id, data) values (${p.id}, ${s.json(p as never)}) on conflict (id) do nothing`;
  for (const t of SEED_TARIFFS) {
    await s`
      insert into app.broker_tariffs (broker_id, country, data, effective_from, verified_at, status, note, created_by, approved_at, approved_by)
      select ${t.brokerId}, ${t.country}, ${s.json(t.data as never)}, ${t.effectiveFrom}, ${t.verifiedAt}, 'published', 'Initial research from official tariff documents', 'seed', now(), 'seed'
      where not exists (select 1 from app.broker_tariffs where broker_id = ${t.brokerId} and country = ${t.country})`;
  }
}

type TariffRow = { id: string; broker_id: string; country: Country; data: TariffData; effective_from: Date | string; verified_at: Date | string; status: Tariff["status"]; note: string | null; created_at: Date; created_by: string | null; approved_at: Date | null; approved_by: string | null };

const day = (d: Date | string) => (typeof d === "string" ? d.slice(0, 10) : d.toISOString().slice(0, 10));

export type TariffVersion = Tariff & { version: number; createdAt: string; createdBy: string | null; approvedAt: string | null; approvedBy: string | null };

function toTariff(r: TariffRow): TariffVersion {
  return {
    brokerId: r.broker_id,
    country: r.country,
    data: r.data,
    effectiveFrom: day(r.effective_from),
    verifiedAt: day(r.verified_at),
    status: r.status,
    note: r.note,
    version: Number(r.id),
    createdAt: new Date(r.created_at).toISOString(),
    createdBy: r.created_by,
    approvedAt: r.approved_at ? new Date(r.approved_at).toISOString() : null,
    approvedBy: r.approved_by,
  };
}

/** The tariff in force on `today`: the latest published version whose effective date has started. */
export function currentOf(versions: Tariff[], today: string): Tariff | null {
  return (
    versions
      .filter((v) => v.status === "published" && v.effectiveFrom <= today)
      .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom) || (b.version ?? 0) - (a.version ?? 0))[0] ?? null
  );
}

export type PublicData = { profiles: BrokerProfile[]; tariffs: Tariff[]; methodology: Methodology; countries: Record<Country, CountrySettings>; source: "database" | "seed" };

const SEED: PublicData = {
  profiles: PROFILES,
  tariffs: SEED_TARIFFS,
  methodology: DEFAULT_METHODOLOGY,
  countries: { it: DEFAULT_COUNTRY, fr: DEFAULT_COUNTRY, de: DEFAULT_COUNTRY },
  source: "seed",
};

function cleanMethodology(v: unknown): Methodology {
  const m = (v ?? {}) as Partial<Methodology>;
  const w = { ...DEFAULT_METHODOLOGY.weights, ...(m.weights ?? {}) };
  for (const k of Object.keys(w) as (keyof typeof w)[]) w[k] = Math.max(0, Math.min(100, Number(w[k]) || 0));
  const days = Math.round(Number(m.verifyEveryDays));
  return { weights: w, verifyEveryDays: days >= 1 && days <= 365 ? days : DEFAULT_METHODOLOGY.verifyEveryDays };
}

function cleanCountry(v: unknown): CountrySettings {
  const c = (v ?? {}) as Partial<CountrySettings>;
  return {
    published: c.published !== false,
    excluded: Array.isArray(c.excluded) ? c.excluded.filter((e) => e && typeof e.id === "string").map((e) => ({ id: e.id, reason: String(e.reason ?? "").slice(0, 300) })) : [],
    intro: Array.isArray(c.intro) ? c.intro.map((p) => String(p).slice(0, 2000)).filter(Boolean).slice(0, 6) : null,
  };
}

// Public pages read this often (header link, every broker page); keep it for a minute. Admin saves clear it.
let cache: { at: number; data: PublicData } | null = null;
const CACHE_MS = 60_000;
export function clearPublicCache() {
  cache = null;
}

/** Everything the public pages need. Falls back to the seed data when the database is missing or fails. */
export async function loadPublicData(): Promise<PublicData> {
  if (!accountsConfigured()) return SEED;
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.data;
  const data = await readPublicData();
  if (data.source === "database") cache = { at: Date.now(), data };
  return data;
}

async function readPublicData(): Promise<PublicData> {
  try {
    const s = await db();
    const [profiles, rows, settings] = await Promise.all([
      s<{ data: BrokerProfile }[]>`select data from app.broker_profiles order by id`,
      s<TariffRow[]>`select * from app.broker_tariffs where status = 'published'`,
      s<{ key: string; value: unknown }[]>`select key, value from app.broker_settings`,
    ]);
    const get = (k: string) => settings.find((x) => x.key === k)?.value;
    return {
      profiles: profiles.map((p) => p.data),
      tariffs: rows.map(toTariff),
      methodology: cleanMethodology(get("methodology")),
      countries: { it: cleanCountry(get("country:it")), fr: cleanCountry(get("country:fr")), de: cleanCountry(get("country:de")) },
      source: "database",
    };
  } catch (e) {
    console.error("brokers: falling back to seed data", (e as Error).message);
    return SEED;
  }
}

// ---- Admin -----------------------------------------------------------------------------------------------

export async function adminLoad() {
  const s = await db();
  const [profiles, rows, settings] = await Promise.all([
    s<{ data: BrokerProfile; updated_at: Date }[]>`select data, updated_at from app.broker_profiles order by id`,
    s<TariffRow[]>`select * from app.broker_tariffs order by country, broker_id, effective_from desc, id desc`,
    s<{ key: string; value: unknown }[]>`select key, value from app.broker_settings`,
  ]);
  const get = (k: string) => settings.find((x) => x.key === k)?.value;
  return {
    profiles: profiles.map((p) => p.data),
    tariffs: rows.map(toTariff),
    methodology: cleanMethodology(get("methodology")),
    countries: { it: cleanCountry(get("country:it")), fr: cleanCountry(get("country:fr")), de: cleanCountry(get("country:de")) },
  };
}

export async function saveDraft(t: { brokerId: string; country: Country; data: TariffData; effectiveFrom: string; verifiedAt: string; note: string | null }, by: string) {
  clearPublicCache();
  const s = await db();
  const rows = await s<{ id: string }[]>`
    insert into app.broker_tariffs (broker_id, country, data, effective_from, verified_at, status, note, created_by)
    values (${t.brokerId}, ${t.country}, ${s.json(t.data as never)}, ${t.effectiveFrom}, ${t.verifiedAt}, 'draft', ${t.note}, ${by})
    returning id`;
  return Number(rows[0].id);
}

/** Publish a draft. It takes over from its effective date; earlier versions stay as history. */
export async function approveDraft(id: number, by: string): Promise<boolean> {
  clearPublicCache();
  const s = await db();
  const rows = await s`update app.broker_tariffs set status = 'published', approved_at = now(), approved_by = ${by} where id = ${id} and status = 'draft' returning id`;
  return rows.length > 0;
}

export async function rejectDraft(id: number): Promise<boolean> {
  clearPublicCache();
  const s = await db();
  const rows = await s`update app.broker_tariffs set status = 'archived' where id = ${id} and status = 'draft' returning id`;
  return rows.length > 0;
}

/** Record that the published tariff was checked against the official source today and is unchanged. */
export async function markVerified(id: number, verifiedAt: string, by: string): Promise<boolean> {
  clearPublicCache();
  const s = await db();
  const rows = await s`
    update app.broker_tariffs set verified_at = ${verifiedAt},
      note = coalesce(note || E'\n', '') || ${`Re-checked ${verifiedAt} by ${by}, unchanged`}
    where id = ${id} and status = 'published' returning id`;
  return rows.length > 0;
}

export async function saveProfile(p: BrokerProfile) {
  clearPublicCache();
  const s = await db();
  await s`
    insert into app.broker_profiles (id, data) values (${p.id}, ${s.json(p as never)})
    on conflict (id) do update set data = excluded.data, updated_at = now()`;
}

export async function saveSetting(key: "methodology" | `country:${Country}`, value: unknown) {
  clearPublicCache();
  const s = await db();
  const clean = key === "methodology" ? cleanMethodology(value) : cleanCountry(value);
  await s`
    insert into app.broker_settings (key, value) values (${key}, ${s.json(clean as never)})
    on conflict (key) do update set value = excluded.value, updated_at = now()`;
  return clean;
}

/** Visits to the broker pages and clicks on broker links in the last 30 days (only visitors who allowed usage stats). */
export async function brokerTraffic() {
  const s = await db();
  const [pages, clicks] = await Promise.all([
    s<{ path: string; n: string }[]>`
      select path, count(*) n from app.events
      where kind = 'page_view' and at > now() - interval '30 days' and ${notOwnerVisitor(s)}
        and (path like '/it/broker-obbligazioni%' or path like '/fr/courtiers-obligations%' or path like '/de/anleihen-broker%')
      group by path order by n desc limit 50`,
    s<{ label: string; n: string }[]>`
      select detail->>'label' as label, count(*) n from app.events
      where kind = 'click' and at > now() - interval '30 days' and ${notOwnerVisitor(s)} and detail->>'label' like 'broker:%'
      group by 1 order by n desc limit 50`,
  ]);
  return { pages: pages.map((p) => ({ path: p.path, n: Number(p.n) })), clicks: clicks.map((c) => ({ label: c.label, n: Number(c.n) })) };
}

/** Creates the broker tables if needed (used by the schema check in lib/schema.db.test.ts). */
export const brokerTablesReady = () => db().then(() => undefined);
