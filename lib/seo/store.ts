import type { SeoMarket } from "./input";
import { accountsSql } from "../accounts";
import type { CriterionResult, Points, Status } from "./rubric";
import { SEED_GUIDES } from "./guidesSeed";
import { DEFAULT_RATE_TEXT_FIXES } from "./defaultRatesTextFixes";
import { LEGAL_TEXT_FIXES } from "./legalTextFixes";
import { SEED_GUIDES_OWNER_FR } from "./guidesOwnerFr";
import { SEED_GUIDES_DE2 } from "./guidesSeedDe2";
import { SEED_GUIDES_FR2 } from "./guidesSeedFr2";
import { SEED_GUIDES_WAVE2 } from "./guidesSeedWave2";
import { landingFor } from "./landingOwner";
import { EXTRA_IT } from "./guidesExtraIt";
import { DEPTH_EXTRAS, META_FIXES, withDepth } from "./guidesDepth";
import { SEED_KEYWORDS } from "./keywordsSeed";
import type { Potential } from "./knowledge";
import type { Locale } from "./locales";

// SEO tables live in schema "app" next to the accounts, created additively like the other app tables.
// Assessments and manual scores are only ever inserted, never updated, so the history is permanent.

let ready: Promise<void> | null = null;
export async function seoSql() {
  const s = await accountsSql();
  ready ??= setup(s).catch((e) => {
    ready = null;
    throw e;
  });
  await ready;
  return s;
}

async function setup(s: Awaited<ReturnType<typeof accountsSql>>) {
  await s`
    create table if not exists app.seo_people (
      id bigserial primary key,
      name text not null,
      role text not null,
      bio text,
      credentials text,
      credentials_verified boolean not null default false,
      is_public boolean not null default true,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )`;
  await s`
    create table if not exists app.seo_guides (
      id bigserial primary key,
      locale text not null default 'it' check (locale in ('it','fr','de')),
      slug text not null,
      translation_group text,
      machine_translated boolean not null default false,
      title text not null,
      seo_title text not null,
      meta_description text not null,
      primary_keyword text not null,
      related_keywords text[] not null default '{}',
      body_html text not null,
      author_id bigint references app.seo_people(id) on delete set null,
      reviewer_id bigint references app.seo_people(id) on delete set null,
      related_slugs text[] not null default '{}',
      status text not null default 'draft' check (status in ('draft','review','published')),
      noindex boolean not null default false,
      canonical_url text,
      published_at timestamptz,
      reviewed_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique (locale, slug)
    )`;
  await s`
    create table if not exists app.seo_guide_log (
      id bigserial primary key,
      guide_id bigint not null references app.seo_guides(id) on delete cascade,
      at timestamptz not null default now(),
      by_email text not null,
      status text not null,
      note text
    )`;
  // What was sent where when a guide went live: search engines (IndexNow, Google) and social pages (LinkedIn, X).
  await s`
    create table if not exists app.seo_shares (
      id bigserial primary key,
      guide_id bigint references app.seo_guides(id) on delete set null,
      url text not null,
      channel text not null,
      ok boolean not null,
      detail text,
      at timestamptz not null default now()
    )`;
  await s`
    create table if not exists app.seo_backlinks (
      id bigserial primary key,
      source_url text not null,
      source_domain text not null,
      target_url text not null,
      link_type text not null default 'editorial' check (link_type in ('editorial','directory','social','forum','partner','sponsored')),
      rel text not null default 'follow' check (rel in ('follow','nofollow','ugc','sponsored')),
      status text not null default 'unverified' check (status in ('active','lost','unverified')),
      relevance integer check (relevance between 1 and 5),
      quality integer check (quality between 1 and 5),
      discovered_at date not null default current_date,
      verified_at date,
      source text not null default 'manual',
      notes text,
      created_at timestamptz not null default now(),
      unique (source_url, target_url)
    )`;
  await s`
    create table if not exists app.seo_opportunities (
      id bigserial primary key,
      kind text not null check (kind in ('publisher','blog','education','youtube','mention','other')),
      name text not null,
      url text,
      status text not null default 'idea' check (status in ('idea','contacted','in_progress','won','declined')),
      notes text,
      updated_at timestamptz not null default now(),
      created_at timestamptz not null default now()
    )`;
  await s`
    create table if not exists app.seo_assessments (
      id bigserial primary key,
      market text not null default 'it' check (market in ('it','fr','de')),
      at timestamptz not null default now(),
      by_email text not null,
      trigger text not null,
      overall numeric not null,
      assessed integer not null,
      criteria integer not null,
      dimensions jsonb not null
    )`;
  await s`create index if not exists seo_assessments_at_idx on app.seo_assessments (market, at)`;
  // The US and UK got their own score (20 Oct 2026); widening the check keeps every row.
  await s`alter table app.seo_assessments drop constraint if exists seo_assessments_market_check`;
  await s`alter table app.seo_assessments add constraint seo_assessments_market_check check (market in ('it','fr','de','us','uk'))`;
  await s`
    create table if not exists app.seo_criterion_results (
      assessment_id bigint not null references app.seo_assessments(id) on delete cascade,
      dimension text not null,
      criterion text not null,
      points smallint check (points between 0 and 2),
      status text not null,
      method text not null,
      evidence text not null,
      justification text,
      evaluator text not null,
      evaluated_at timestamptz not null,
      primary key (assessment_id, dimension, criterion)
    )`;
  await s`
    create table if not exists app.seo_manual (
      id bigserial primary key,
      market text not null default 'it' check (market in ('it','fr','de')),
      dimension text not null,
      criterion text not null,
      points smallint check (points between 0 and 2),
      override boolean not null default false,
      evidence text not null,
      justification text,
      by_email text not null,
      at timestamptz not null default now()
    )`;
  await s`alter table app.seo_manual drop constraint if exists seo_manual_market_check`;
  await s`alter table app.seo_manual add constraint seo_manual_market_check check (market in ('it','fr','de','us','uk'))`;
  await s`
    create table if not exists app.seo_actions (
      key text primary key,
      status text not null default 'not_started' check (status in ('not_started','in_progress','completed')),
      updated_at timestamptz not null default now(),
      completed_at timestamptz
    )`;
  // Target keywords per market. Search volume and difficulty stay empty until real data is imported.
  await s`
    create table if not exists app.seo_keywords (
      id bigserial primary key,
      market text not null check (market in ('it','fr','de')),
      keyword text not null,
      intent text not null default 'informational' check (intent in ('informational','commercial','transactional','navigational')),
      landing_path text,
      volume integer,
      volume_source text,
      difficulty integer check (difficulty between 0 and 100),
      position numeric,
      clicks integer,
      impressions integer,
      metrics_at date,
      status text not null default 'target' check (status in ('target','in_progress','optimised','ranking','dropped')),
      next_action text,
      updated_at timestamptz not null default now(),
      unique (market, keyword)
    )`;
  // The US and UK were added as keyword-tracking markets (19 Oct 2026); widening the check keeps every row.
  await s`alter table app.seo_keywords drop constraint if exists seo_keywords_market_check`;
  await s`alter table app.seo_keywords add constraint seo_keywords_market_check check (market in ('it','fr','de','us','uk'))`;
  // Knowledge Center fields (added after the first version of the table).
  await s`alter table app.seo_keywords add column if not exists kc_section text`;
  await s`alter table app.seo_keywords add column if not exists potential text check (potential in ('high','medium','low'))`;
  await s`alter table app.seo_keywords add column if not exists verified_at date`;
  // One row per keyword per Search Console sync, so the rankings page can show the trend.
  await s`
    create table if not exists app.seo_keyword_history (
      keyword_id bigint not null references app.seo_keywords(id) on delete cascade,
      at date not null,
      position numeric,
      clicks integer not null,
      impressions integer not null,
      primary key (keyword_id, at)
    )`;
  // One row per day per source ("google", "bing", "keywords"): the headline search numbers, so progress can be charted.
  // A missing figure stays null (shown as a dash), never a made-up value.
  await s`
    create table if not exists app.seo_daily_stats (
      day date not null,
      source text not null check (source in ('google','bing','keywords')),
      clicks integer,
      impressions integer,
      ctr numeric,
      position numeric,
      indexed integer,
      tracked integer,
      top10 integer,
      created_at timestamptz not null default now(),
      primary key (day, source)
    )`;
  // The owner's three French articles (19 Oct 2026) take over the earlier French guides on the same topics, once: the old
  // row gets the new slug and his text (so its history and language links stay), links to the old slug are updated,
  // and next.config.mjs redirects the old URLs. Runs before the seed insert so the new slug is not added twice.
  await s`create table if not exists app.settings (key text primary key, value text not null, updated_at timestamptz not null default now())`;
  const [frOwner] = await s`insert into app.settings (key, value) values ('seo_fr_livio_applied', ${new Date().toISOString()}) on conflict (key) do nothing returning key`;
  if (frOwner) {
    for (const g of SEED_GUIDES_OWNER_FR) {
      const [taken] = await s`select id from app.seo_guides where locale = 'fr' and slug = ${g.slug}`;
      const from = taken ? g.slug : g.oldSlug;
      const [row] = await s`update app.seo_guides set slug = ${g.slug}, title = ${g.title}, seo_title = ${g.seoTitle}, meta_description = ${g.metaDescription}, body_html = ${g.bodyHtml},
          primary_keyword = ${g.primaryKeyword}, related_keywords = ${g.relatedKeywords}, related_slugs = ${g.relatedSlugs}, translation_group = ${g.group ?? g.topic},
          status = 'published', published_at = coalesce(published_at, now()), reviewed_at = now(), updated_at = now()
        where locale = 'fr' and slug = ${from} returning id`;
      if (row) await s`insert into app.seo_guide_log (guide_id, by_email, status, note) values (${row.id}, ${"system"}, ${"published"}, ${"Replaced with the owner's French article (19 Oct 2026)."})`;
      if (taken) await s`delete from app.seo_guides where locale = 'fr' and slug = ${g.oldSlug}`;
      await s`update app.seo_guides set body_html = replace(body_html, ${`/fr/guides/${g.oldSlug}"`}, ${`/fr/guides/${g.slug}"`}), related_slugs = array_replace(related_slugs, ${g.oldSlug}, ${g.slug})
        where locale = 'fr'`;
      await s`update app.seo_keywords set landing_path = ${`/fr/guides/${g.slug}`} where landing_path = ${`/fr/guides/${g.oldSlug}`}`;
    }
  }
  // The seed guides go in once, in "review" (outlines in "draft"), for the admin to read and approve. They are never re-added.
  for (const g of SEED_GUIDES) {
    await s`
      insert into app.seo_guides (locale, slug, translation_group, title, seo_title, meta_description, primary_keyword, related_keywords, body_html, related_slugs, status, published_at)
      values (${g.locale}, ${g.slug}, ${g.group ?? g.topic}, ${g.title}, ${g.seoTitle}, ${g.metaDescription}, ${g.primaryKeyword}, ${g.relatedKeywords}, ${g.bodyHtml}, ${g.relatedSlugs}, ${g.status ?? "review"},
              ${g.status === "published" ? new Date() : null})
      on conflict (locale, slug) do nothing`;
  }
  // The owner asked on 2026-10-19 for the guides written from his material to go public. Runs once (marker in
  // app.settings), so a guide he later moves back to review stays there. Outlines and translated drafts are untouched.
  await s`create table if not exists app.settings (key text primary key, value text not null, updated_at timestamptz not null default now())`;
  const [marker] = await s`insert into app.settings (key, value) values ('seo_seed_guides_published', ${new Date().toISOString()}) on conflict (key) do nothing returning key`;
  if (marker) {
    const seedReview = SEED_GUIDES.filter((g) => (g.status ?? "review") === "review");
    for (const g of seedReview) {
      const [row] = await s`update app.seo_guides set status = 'published', published_at = coalesce(published_at, now()), updated_at = now()
        where locale = ${g.locale} and slug = ${g.slug} and status = 'review' and not machine_translated returning id`;
      if (row) await s`insert into app.seo_guide_log (guide_id, by_email, status, note) values (${row.id}, ${"system"}, ${"published"}, ${"Published at the owner's request (19 Oct 2026)."})`;
    }
  }
  // The owner's 16 Italian landing pages (19 Oct 2026): his text replaces the earlier text of the same guides, once.
  const [landings] = await s`insert into app.settings (key, value) values ('seo_livio_landings_applied', ${new Date().toISOString()}) on conflict (key) do nothing returning key`;
  if (landings) {
    for (const g of SEED_GUIDES.filter((x) => x.locale === "it" && landingFor(`/it/guide/${x.slug}`))) {
      const [row] = await s`update app.seo_guides set title = ${g.title}, seo_title = ${g.seoTitle}, meta_description = ${g.metaDescription}, body_html = ${g.bodyHtml},
          related_slugs = ${g.relatedSlugs}, status = 'published', published_at = coalesce(published_at, now()), updated_at = now()
        where locale = 'it' and slug = ${g.slug} returning id`;
      if (row) await s`insert into app.seo_guide_log (guide_id, by_email, status, note) values (${row.id}, ${"system"}, ${"published"}, ${"Replaced with the owner's landing text (19 Oct 2026)."})`;
    }
  }
  // Sections added under the owner's Italian guides and two search fixes (he agreed 19 Oct 2026), once. Only a guide whose
  // text is still exactly his is extended, so any later edit in Admin is kept.
  const [extra] = await s`insert into app.settings (key, value) values ('seo_it_extensions_applied', ${new Date().toISOString()}) on conflict (key) do nothing returning key`;
  if (extra) {
    for (const g of SEED_GUIDES.filter((x) => x.locale === "it" && EXTRA_IT[x.slug])) {
      const original = g.bodyHtml.slice(0, g.bodyHtml.length - EXTRA_IT[g.slug].length);
      const [row] = await s`update app.seo_guides set body_html = ${g.bodyHtml}, seo_title = ${g.seoTitle}, related_keywords = ${g.relatedKeywords}, updated_at = now()
        where locale = 'it' and slug = ${g.slug} and body_html = ${original} returning id`;
      if (row) await s`insert into app.seo_guide_log (guide_id, by_email, status, note) values (${row.id}, ${"system"}, ${"published"}, ${"Sections added under the owner's text (19 Oct 2026)."})`;
    }
  }
  // French and German versions of six topics (19 Oct 2026, the owner asked for every topic in every language): they replace
  // the earlier outline drafts of the same slug, once. A guide already published by hand is left alone.
  const [l10n] = await s`insert into app.settings (key, value) values ('seo_l10n_guides_applied', ${new Date().toISOString()}) on conflict (key) do nothing returning key`;
  if (l10n) {
    for (const g of [...SEED_GUIDES_FR2, ...SEED_GUIDES_DE2]) {
      const [row] = await s`update app.seo_guides set title = ${g.title}, seo_title = ${g.seoTitle}, meta_description = ${g.metaDescription}, body_html = ${g.bodyHtml},
          primary_keyword = ${g.primaryKeyword}, related_keywords = ${g.relatedKeywords}, related_slugs = ${g.relatedSlugs}, translation_group = ${g.group ?? g.topic},
          status = 'published', published_at = coalesce(published_at, now()), updated_at = now()
        where locale = ${g.locale} and slug = ${g.slug} and status <> 'published' returning id`;
      if (row) await s`insert into app.seo_guide_log (guide_id, by_email, status, note) values (${row.id}, ${"system"}, ${"published"}, ${"Full localized version published (19 Oct 2026)."})`;
    }
  }
  // The last missing or outline guides of the translation matrix (19 Oct 2026, the owner asked to fill and publish them),
  // once: full text replaces the outline of the same slug. The other seed guides still in draft or review are published
  // too, except outlines that still carry the "to complete" note. A guide the owner later moves back stays where he puts it.
  const [wave2] = await s`insert into app.settings (key, value) values ('seo_wave2_applied', ${new Date().toISOString()}) on conflict (key) do nothing returning key`;
  if (wave2) {
    for (const g of SEED_GUIDES_WAVE2) {
      const [row] = await s`update app.seo_guides set title = ${g.title}, seo_title = ${g.seoTitle}, meta_description = ${g.metaDescription}, body_html = ${g.bodyHtml},
          primary_keyword = ${g.primaryKeyword}, related_keywords = ${g.relatedKeywords}, related_slugs = ${g.relatedSlugs}, translation_group = ${g.group ?? g.topic},
          status = 'published', published_at = coalesce(published_at, now()), updated_at = now()
        where locale = ${g.locale} and slug = ${g.slug} and status <> 'published' returning id`;
      if (row) await s`insert into app.seo_guide_log (guide_id, by_email, status, note) values (${row.id}, ${"system"}, ${"published"}, ${"Full guide published (19 Oct 2026)."})`;
    }
    for (const g of SEED_GUIDES.filter((x) => !SEED_GUIDES_WAVE2.includes(x))) {
      const [row] = await s`update app.seo_guides set status = 'published', published_at = coalesce(published_at, now()), updated_at = now()
        where locale = ${g.locale} and slug = ${g.slug} and status in ('draft', 'review') and body_html not like ${"%<blockquote><strong>%"} returning id`;
      if (row) await s`insert into app.seo_guide_log (guide_id, by_email, status, note) values (${row.id}, ${"system"}, ${"published"}, ${"Published at the owner's request (19 Oct 2026)."})`;
    }
  }
  // The default-rate table and its "Source: S&P" wording become the combined 10BONDS table (the owner, 20 Oct 2026), once,
  // as text replacements, so any other edit made in Admin is kept.
  const [rates] = await s`insert into app.settings (key, value) values ('seo_default_rates_combined', ${new Date().toISOString()}) on conflict (key) do nothing returning key`;
  if (rates) {
    for (const [from, to] of DEFAULT_RATE_TEXT_FIXES) {
      await s`update app.seo_guides set body_html = replace(body_html, ${from}, ${to}), meta_description = replace(meta_description, ${from}, ${to}), updated_at = now()
        where strpos(body_html, ${from}) > 0 or strpos(meta_description, ${from}) > 0`;
    }
  }
  // The guides stop naming the agency the risk score is read from (legal review, the owner, 20 Oct 2026), once, the same way.
  const [legal] = await s`insert into app.settings (key, value) values ('seo_legal_text_fixes', ${new Date().toISOString()}) on conflict (key) do nothing returning key`;
  if (legal) {
    for (const [from, to] of LEGAL_TEXT_FIXES) {
      await s`update app.seo_guides set body_html = replace(body_html, ${from}, ${to}), updated_at = now() where strpos(body_html, ${from}) > 0`;
    }
  }
  // Every published guide gets the rewritten, more human text from the seed files (the owner, 24 Oct 2026), once. The
  // text it replaces is kept in app.seo_guide_backups, so any guide can be put back from there.
  const [humanized] = await s`insert into app.settings (key, value) values ('seo_humanized_2026_10_24', ${new Date().toISOString()}) on conflict (key) do nothing returning key`;
  if (humanized) {
    await s`
      create table if not exists app.seo_guide_backups (
        id bigserial primary key,
        guide_id bigint not null references app.seo_guides(id) on delete cascade,
        at timestamptz not null default now(),
        note text not null,
        body_html text not null
      )`;
    for (const g of SEED_GUIDES) {
      const [old] = await s`select id, body_html from app.seo_guides where locale = ${g.locale} and slug = ${g.slug} and status = 'published'`;
      if (!old || old.body_html === g.bodyHtml) continue;
      const note = "Rewritten in a more human voice at the owner's request (24 Oct 2026).";
      await s`insert into app.seo_guide_backups (guide_id, note, body_html) values (${old.id}, ${note}, ${old.body_html})`;
      await s`update app.seo_guides set body_html = ${g.bodyHtml}, updated_at = now() where id = ${old.id}`;
      await s`insert into app.seo_guide_log (guide_id, by_email, status, note) values (${old.id}, ${"system"}, ${"published"}, ${note})`;
    }
  }
  // Short German and French guides get extra sections and a few titles/descriptions are fixed (27 Oct 2026), once. The
  // text it replaces is kept in app.seo_guide_backups.
  const [depth] = await s`insert into app.settings (key, value) values ('seo_depth_2026_10_27', ${new Date().toISOString()}) on conflict (key) do nothing returning key`;
  if (depth) {
    await s`
      create table if not exists app.seo_guide_backups (
        id bigserial primary key,
        guide_id bigint not null references app.seo_guides(id) on delete cascade,
        at timestamptz not null default now(),
        note text not null,
        body_html text not null
      )`;
    for (const e of DEPTH_EXTRAS) {
      const [old] = await s`select id, body_html from app.seo_guides where locale = ${e.locale} and slug = ${e.slug} and status = 'published'`;
      if (!old || old.body_html.includes(e.html.slice(0, 60))) continue;
      const note = "Sections added so the guide has real depth (27 Oct 2026).";
      await s`insert into app.seo_guide_backups (guide_id, note, body_html) values (${old.id}, ${note}, ${old.body_html})`;
      await s`update app.seo_guides set body_html = ${withDepth(old.body_html, e.html)}, updated_at = now() where id = ${old.id}`;
      await s`insert into app.seo_guide_log (guide_id, by_email, status, note) values (${old.id}, ${"system"}, ${"published"}, ${note})`;
    }
    for (const m of META_FIXES) {
      const [row] = await s`update app.seo_guides set seo_title = coalesce(${m.seoTitle ?? null}, seo_title), meta_description = coalesce(${m.metaDescription ?? null}, meta_description), updated_at = now()
        where locale = ${m.locale} and slug = ${m.slug} and status = 'published' returning id`;
      if (row) await s`insert into app.seo_guide_log (guide_id, by_email, status, note) values (${row.id}, ${"system"}, ${"published"}, ${"Title or description shortened or fixed (27 Oct 2026)."})`;
    }
  }
  // "10bonds Analyst": the editorial team's byline (a team, not a person: no credentials, never marked verified). Published
  // guides without a reviewer get it, dated by the guide's own last update, once (27 Oct 2026).
  const [analyst] = await s`insert into app.settings (key, value) values ('seo_analyst_2026_10_27', ${new Date().toISOString()}) on conflict (key) do nothing returning key`;
  if (analyst) {
    const [existing] = await s`select id from app.seo_people where name = ${ANALYST_NAME} limit 1`;
    const id = existing?.id ?? (await s`insert into app.seo_people (name, role, bio, credentials, credentials_verified, is_public)
      values (${ANALYST_NAME}, ${"Editorial team"}, ${"The 10BONDS editorial team checks each guide against the published bond data and the selection methodology. It is a team byline, not an individual's profile."}, ${null}, false, true) returning id`)[0].id;
    const rows = await s`update app.seo_guides set reviewer_id = ${id}, reviewed_at = updated_at
      where status = 'published' and reviewer_id is null returning id`;
    for (const r of rows) await s`insert into app.seo_guide_log (guide_id, by_email, status, note) values (${r.id}, ${"system"}, ${"published"}, ${"Reviewed by 10bonds Analyst (date = last update of the guide)."})`;
  }
  for (const k of SEED_KEYWORDS) {
    // New keywords go in whole; for existing ones only empty fields are filled, so admin edits are never overwritten.
    await s`insert into app.seo_keywords (market, keyword, intent, landing_path, kc_section, potential, volume, volume_source, verified_at)
      values (${k.market}, ${k.keyword}, ${k.intent}, ${k.landingPath}, ${k.section ?? null}, ${k.potential ?? null}, ${k.volume ?? null}, ${k.volumeSource ?? null},
              ${k.volume ? "2026-10-18" : null})
      on conflict (market, keyword) do update set
        landing_path = coalesce(app.seo_keywords.landing_path, excluded.landing_path),
        kc_section = coalesce(app.seo_keywords.kc_section, excluded.kc_section),
        potential = coalesce(app.seo_keywords.potential, excluded.potential),
        volume_source = case when app.seo_keywords.volume is null then excluded.volume_source else app.seo_keywords.volume_source end,
        verified_at = case when app.seo_keywords.volume is null then excluded.verified_at else app.seo_keywords.verified_at end,
        volume = coalesce(app.seo_keywords.volume, excluded.volume)`;
  }
}

// ---------- People (authors and reviewers) ----------
export const ANALYST_NAME = "10bonds Analyst";
export type Person = { id: number; name: string; role: string; bio: string | null; credentials: string | null; credentialsVerified: boolean; isPublic: boolean };
const toPerson = (r: Record<string, unknown>): Person => ({
  id: Number(r.id), name: r.name as string, role: r.role as string, bio: (r.bio as string) ?? null, credentials: (r.credentials as string) ?? null,
  credentialsVerified: r.credentials_verified === true, isPublic: r.is_public === true,
});

export async function listPeople(onlyPublic = false): Promise<Person[]> {
  const s = await seoSql();
  const rows = onlyPublic ? await s`select * from app.seo_people where is_public order by id` : await s`select * from app.seo_people order by id`;
  return rows.map(toPerson);
}

export async function savePerson(p: Omit<Person, "id"> & { id?: number | null }): Promise<Person> {
  const s = await seoSql();
  const [r] = p.id
    ? await s`update app.seo_people set name = ${p.name}, role = ${p.role}, bio = ${p.bio}, credentials = ${p.credentials}, credentials_verified = ${p.credentialsVerified}, is_public = ${p.isPublic}, updated_at = now() where id = ${p.id} returning *`
    : await s`insert into app.seo_people (name, role, bio, credentials, credentials_verified, is_public) values (${p.name}, ${p.role}, ${p.bio}, ${p.credentials}, ${p.credentialsVerified}, ${p.isPublic}) returning *`;
  if (!r) throw new Error("Profile not found.");
  return toPerson(r);
}

export async function deletePerson(id: number) {
  const s = await seoSql();
  await s`delete from app.seo_people where id = ${id}`;
}

// ---------- Guides ----------
export type GuideStatus = "draft" | "review" | "published";
export type Guide = {
  id: number; locale: Locale; translationGroup: string | null; machineTranslated: boolean; slug: string; title: string; seoTitle: string; metaDescription: string; primaryKeyword: string; relatedKeywords: string[];
  bodyHtml: string; authorId: number | null; reviewerId: number | null; relatedSlugs: string[]; status: GuideStatus; noindex: boolean;
  canonicalUrl: string | null; publishedAt: string | null; reviewedAt: string | null; createdAt: string; updatedAt: string;
};
const iso = (v: unknown) => (v ? new Date(v as string).toISOString() : null);
const toGuide = (r: Record<string, unknown>): Guide => ({
  id: Number(r.id), locale: r.locale as Locale, translationGroup: (r.translation_group as string) ?? null, machineTranslated: r.machine_translated === true, slug: r.slug as string, title: r.title as string, seoTitle: r.seo_title as string, metaDescription: r.meta_description as string,
  primaryKeyword: r.primary_keyword as string, relatedKeywords: (r.related_keywords as string[]) ?? [], bodyHtml: r.body_html as string,
  authorId: r.author_id === null ? null : Number(r.author_id), reviewerId: r.reviewer_id === null ? null : Number(r.reviewer_id),
  relatedSlugs: (r.related_slugs as string[]) ?? [], status: r.status as GuideStatus, noindex: r.noindex === true, canonicalUrl: (r.canonical_url as string) ?? null,
  publishedAt: iso(r.published_at), reviewedAt: iso(r.reviewed_at), createdAt: iso(r.created_at)!, updatedAt: iso(r.updated_at)!,
});

export async function listGuides(onlyPublished = false, locale: Locale | null = null): Promise<Guide[]> {
  const s = await seoSql();
  const rows = await s`select * from app.seo_guides
    where (${!onlyPublished} or status = 'published') and (${locale}::text is null or locale = ${locale})
    order by ${onlyPublished ? s`published_at desc nulls last, id` : s`updated_at desc`}`;
  return rows.map(toGuide);
}

export async function guideBySlug(locale: Locale, slug: string): Promise<Guide | null> {
  const s = await seoSql();
  const [r] = await s`select * from app.seo_guides where locale = ${locale} and slug = ${slug}`;
  return r ? toGuide(r) : null;
}

export async function guideById(id: number): Promise<Guide | null> {
  const s = await seoSql();
  const [r] = await s`select * from app.seo_guides where id = ${id}`;
  return r ? toGuide(r) : null;
}

export type GuideInput = Omit<Guide, "id" | "publishedAt" | "reviewedAt" | "createdAt" | "updatedAt"> & { id?: number | null; markReviewed?: boolean; note?: string | null };

/** Create or update a guide. Publishing sets the publication date once; "mark reviewed" sets the review date to now. */
export async function saveGuide(g: GuideInput, by: string): Promise<Guide> {
  const s = await seoSql();
  return s.begin(async (tx) => {
    const fields = {
      locale: g.locale, translation_group: g.translationGroup, machine_translated: g.machineTranslated,
      slug: g.slug, title: g.title, seo_title: g.seoTitle, meta_description: g.metaDescription, primary_keyword: g.primaryKeyword,
      related_keywords: g.relatedKeywords, body_html: g.bodyHtml, author_id: g.authorId, reviewer_id: g.reviewerId, related_slugs: g.relatedSlugs,
      status: g.status, noindex: g.noindex, canonical_url: g.canonicalUrl,
    };
    let row;
    if (g.id) {
      [row] = await tx`
        update app.seo_guides set ${tx(fields)}, updated_at = now(),
          published_at = case when ${g.status} = 'published' then coalesce(published_at, now()) else published_at end,
          reviewed_at = case when ${g.markReviewed === true} then now() else reviewed_at end
        where id = ${g.id} returning *`;
    } else {
      [row] = await tx`
        insert into app.seo_guides ${tx({ ...fields, published_at: g.status === "published" ? new Date() : null, reviewed_at: g.markReviewed ? new Date() : null })}
        returning *`;
    }
    if (!row) throw new Error("Guide not found.");
    const note = [g.markReviewed ? "Reviewed" : null, g.note?.trim() || null].filter(Boolean).join(" · ") || null;
    await tx`insert into app.seo_guide_log (guide_id, by_email, status, note) values (${row.id}, ${by}, ${g.status}, ${note})`;
    return toGuide(row);
  });
}

export async function guideLog(guideId: number) {
  const s = await seoSql();
  const rows = await s`select at, by_email, status, note from app.seo_guide_log where guide_id = ${guideId} order by at desc limit 50`;
  return rows.map((r) => ({ at: iso(r.at)!, by: r.by_email as string, status: r.status as string, note: (r.note as string) ?? null }));
}

export async function guideLogCounts(): Promise<Record<number, number>> {
  const s = await seoSql();
  const rows = await s`select guide_id, count(*) n from app.seo_guide_log group by guide_id`;
  return Object.fromEntries(rows.map((r) => [Number(r.guide_id), Number(r.n)]));
}

// ---------- Backlinks and opportunities ----------
export type Backlink = {
  id: number; sourceUrl: string; sourceDomain: string; targetUrl: string; linkType: string; rel: string; status: string;
  relevance: number | null; quality: number | null; discoveredAt: string; verifiedAt: string | null; source: string; notes: string | null;
};
const day = (v: unknown) => (v ? new Date(v as string).toISOString().slice(0, 10) : null);
const toLink = (r: Record<string, unknown>): Backlink => ({
  id: Number(r.id), sourceUrl: r.source_url as string, sourceDomain: r.source_domain as string, targetUrl: r.target_url as string,
  linkType: r.link_type as string, rel: r.rel as string, status: r.status as string, relevance: (r.relevance as number) ?? null, quality: (r.quality as number) ?? null,
  discoveredAt: day(r.discovered_at)!, verifiedAt: day(r.verified_at), source: r.source as string, notes: (r.notes as string) ?? null,
});

export async function listBacklinks(): Promise<Backlink[]> {
  const s = await seoSql();
  return (await s`select * from app.seo_backlinks order by discovered_at desc, id desc`).map(toLink);
}

export type BacklinkInput = Omit<Backlink, "id" | "sourceDomain" | "discoveredAt"> & { id?: number | null; discoveredAt?: string | null };

export async function saveBacklinks(items: BacklinkInput[]): Promise<number> {
  if (!items.length) return 0;
  const s = await seoSql();
  let n = 0;
  for (const b of items) {
    const domain = new URL(b.sourceUrl).hostname.replace(/^www\./, "");
    const f = {
      source_url: b.sourceUrl, source_domain: domain, target_url: b.targetUrl, link_type: b.linkType, rel: b.rel, status: b.status,
      relevance: b.relevance, quality: b.quality, verified_at: b.verifiedAt, source: b.source, notes: b.notes,
    };
    if (b.id) await s`update app.seo_backlinks set ${s(f)} where id = ${b.id}`;
    else
      await s`insert into app.seo_backlinks ${s({ ...f, discovered_at: b.discoveredAt ?? new Date().toISOString().slice(0, 10) })}
        on conflict (source_url, target_url) do update set verified_at = coalesce(excluded.verified_at, app.seo_backlinks.verified_at),
          status = case when excluded.status = 'unverified' then app.seo_backlinks.status else excluded.status end`;
    n++;
  }
  await markStale();
  return n;
}

export async function deleteBacklink(id: number) {
  const s = await seoSql();
  await s`delete from app.seo_backlinks where id = ${id}`;
  await markStale();
}

export type Opportunity = { id: number; kind: string; name: string; url: string | null; status: string; notes: string | null; updatedAt: string };
const toOpp = (r: Record<string, unknown>): Opportunity => ({
  id: Number(r.id), kind: r.kind as string, name: r.name as string, url: (r.url as string) ?? null, status: r.status as string, notes: (r.notes as string) ?? null, updatedAt: iso(r.updated_at)!,
});

export async function listOpportunities(): Promise<Opportunity[]> {
  const s = await seoSql();
  return (await s`select * from app.seo_opportunities order by updated_at desc`).map(toOpp);
}

export async function saveOpportunity(o: Omit<Opportunity, "id" | "updatedAt"> & { id?: number | null }) {
  const s = await seoSql();
  const f = { kind: o.kind, name: o.name, url: o.url, status: o.status, notes: o.notes };
  if (o.id) await s`update app.seo_opportunities set ${s(f)}, updated_at = now() where id = ${o.id}`;
  else await s`insert into app.seo_opportunities ${s(f)}`;
  await markStale();
}

export async function deleteOpportunity(id: number) {
  const s = await seoSql();
  await s`delete from app.seo_opportunities where id = ${id}`;
  await markStale();
}

// ---------- Assessments, manual scores, actions ----------
const STALE_KEY = "seo_stale_since";
/** Something the score depends on changed: the dashboard reassesses on its next load. */
export async function markStale() {
  const s = await seoSql();
  await s`insert into app.settings (key, value) values (${STALE_KEY}, ${new Date().toISOString()}) on conflict (key) do nothing`;
}
export async function staleSince(): Promise<string | null> {
  const s = await seoSql();
  const [r] = await s`select value from app.settings where key = ${STALE_KEY}`;
  return (r?.value as string) ?? null;
}

const toResult = (r: Record<string, unknown>): CriterionResult => ({
  dimension: r.dimension as CriterionResult["dimension"], criterion: r.criterion as string, points: r.points === null ? null : (Number(r.points) as Points),
  status: r.status as Status, method: r.method as CriterionResult["method"], evidence: r.evidence as string, justification: (r.justification as string) ?? null,
  evaluator: (r.evaluator ?? r.by_email) as string, evaluatedAt: iso(r.evaluated_at ?? r.at)!,
});

/** Latest manual entry per criterion. An entry with points = null withdraws the earlier manual score. */
export async function latestManual(market: SeoMarket): Promise<CriterionResult[]> {
  const s = await seoSql();
  const rows = await s`
    select distinct on (dimension, criterion) dimension, criterion, points, override, evidence, justification, by_email, at
    from app.seo_manual where market = ${market} order by dimension, criterion, at desc, id desc`;
  return rows
    .filter((r) => r.points !== null)
    .map((r) => ({ ...toResult(r), status: (r.override ? "override" : "manual") as Status, method: (r.override ? "auto" : "manual") as CriterionResult["method"] }));
}

export async function addManual(m: { market: SeoMarket; dimension: string; criterion: string; points: Points | null; override: boolean; evidence: string; justification: string | null }, by: string) {
  const s = await seoSql();
  await s`insert into app.seo_manual (market, dimension, criterion, points, override, evidence, justification, by_email)
    values (${m.market}, ${m.dimension}, ${m.criterion}, ${m.points}, ${m.override}, ${m.evidence}, ${m.justification}, ${by})`;
}

export async function manualHistory(market: SeoMarket, dimension: string) {
  const s = await seoSql();
  const rows = await s`select criterion, points, override, evidence, justification, by_email, at from app.seo_manual where market = ${market} and dimension = ${dimension} order by at desc limit 50`;
  return rows.map((r) => ({ criterion: r.criterion as string, points: r.points === null ? null : Number(r.points), override: r.override === true, evidence: r.evidence as string, justification: (r.justification as string) ?? null, by: r.by_email as string, at: iso(r.at)! }));
}

/** Points of each criterion of a dimension over time, only where they changed from the assessment before. */
export async function criterionChanges(market: SeoMarket, dimension: string) {
  const s = await seoSql();
  const rows = await s`
    select * from (
      select a.id, a.at, r.criterion, r.points, r.status, r.evidence,
             lag(r.points) over (partition by r.criterion order by a.at, a.id) prev, row_number() over (partition by r.criterion order by a.at, a.id) n
      from app.seo_criterion_results r join app.seo_assessments a on a.id = r.assessment_id
      where a.market = ${market} and r.dimension = ${dimension}
    ) x where n = 1 or points is distinct from prev order by at desc limit 100`;
  return rows.map((r) => ({ assessmentId: Number(r.id), at: iso(r.at)!, criterion: r.criterion as string, points: r.points === null ? null : Number(r.points), previous: r.prev === null ? null : Number(r.prev), status: r.status as string, evidence: r.evidence as string }));
}

export type AssessmentRow = { id: number; market: SeoMarket; at: string; by: string; trigger: string; overall: number; assessed: number; criteria: number; dimensions: Record<string, number> };
const toAssessment = (r: Record<string, unknown>): AssessmentRow => ({
  id: Number(r.id), market: r.market as SeoMarket, at: iso(r.at)!, by: r.by_email as string, trigger: r.trigger as string, overall: Number(r.overall), assessed: Number(r.assessed), criteria: Number(r.criteria),
  dimensions: r.dimensions as Record<string, number>,
});

export async function saveAssessment(a: { market: SeoMarket; by: string; trigger: string; overall: number; assessed: number; criteria: number; dimensions: Record<string, number>; results: CriterionResult[] }): Promise<number> {
  const s = await seoSql();
  return s.begin(async (tx) => {
    const [row] = await tx`insert into app.seo_assessments (market, by_email, trigger, overall, assessed, criteria, dimensions)
      values (${a.market}, ${a.by}, ${a.trigger}, ${a.overall}, ${a.assessed}, ${a.criteria}, ${tx.json(a.dimensions)}) returning id`;
    await tx`insert into app.seo_criterion_results ${tx(a.results.map((r) => ({
      assessment_id: row.id, dimension: r.dimension, criterion: r.criterion, points: r.points, status: r.status, method: r.method,
      evidence: r.evidence.slice(0, 4000), justification: r.justification ?? null, evaluator: r.evaluator, evaluated_at: r.evaluatedAt,
    })))}`;
    return Number(row.id);
  });
}

export async function clearStale() {
  const s = await seoSql();
  await s`delete from app.settings where key = ${STALE_KEY}`;
}

export async function assessmentHistory(sinceDays: number | null, market: SeoMarket | null = null): Promise<AssessmentRow[]> {
  const s = await seoSql();
  const rows = await s`select * from app.seo_assessments
    where (${sinceDays}::int is null or at > now() - make_interval(days => ${sinceDays ?? 0}))
      and (${market}::text is null or market = ${market})
    order by at`;
  return rows.map(toAssessment);
}

export async function latestAssessments(market: SeoMarket, n = 2): Promise<{ row: AssessmentRow; results: CriterionResult[] }[]> {
  const s = await seoSql();
  const rows = await s`select * from app.seo_assessments where market = ${market} order by at desc, id desc limit ${n}`;
  const out = [];
  for (const r of rows) {
    const res = await s`select * from app.seo_criterion_results where assessment_id = ${r.id}`;
    out.push({ row: toAssessment(r), results: res.map(toResult) });
  }
  return out;
}

export type ActionStatus = "not_started" | "in_progress" | "completed";
export async function actionStatuses(): Promise<Record<string, { status: ActionStatus; completedAt: string | null }>> {
  const s = await seoSql();
  const rows = await s`select key, status, completed_at from app.seo_actions`;
  return Object.fromEntries(rows.map((r) => [r.key as string, { status: r.status as ActionStatus, completedAt: iso(r.completed_at) }]));
}

export async function setActionStatus(key: string, status: ActionStatus) {
  const s = await seoSql();
  await s`insert into app.seo_actions (key, status, completed_at) values (${key}, ${status}, ${status === "completed" ? new Date() : null})
    on conflict (key) do update set status = excluded.status, updated_at = now(),
      completed_at = case when excluded.status = 'completed' then coalesce(app.seo_actions.completed_at, now()) else null end`;
}

export async function getSeoSetting(key: string): Promise<string | null> {
  const s = await seoSql();
  const [r] = await s`select value from app.settings where key = ${"seo_" + key}`;
  return (r?.value as string) ?? null;
}
export async function setSeoSetting(key: string, value: string | null) {
  const s = await seoSql();
  if (value === null) await s`delete from app.settings where key = ${"seo_" + key}`;
  else await s`insert into app.settings (key, value) values (${"seo_" + key}, ${value}) on conflict (key) do update set value = excluded.value, updated_at = now()`;
}

// ---------- Keywords ----------
export type Keyword = {
  id: number; market: SeoMarket; keyword: string; intent: string; landingPath: string | null; volume: number | null; volumeSource: string | null;
  difficulty: number | null; position: number | null; clicks: number | null; impressions: number | null; metricsAt: string | null;
  status: string; nextAction: string | null; updatedAt: string; section: string | null; potential: Potential | null; verifiedAt: string | null;
};
const toKeyword = (r: Record<string, unknown>): Keyword => ({
  id: Number(r.id), market: r.market as Locale, keyword: r.keyword as string, intent: r.intent as string, landingPath: (r.landing_path as string) ?? null,
  volume: r.volume === null ? null : Number(r.volume), volumeSource: (r.volume_source as string) ?? null, difficulty: r.difficulty === null ? null : Number(r.difficulty),
  position: r.position === null ? null : Number(r.position), clicks: r.clicks === null ? null : Number(r.clicks), impressions: r.impressions === null ? null : Number(r.impressions),
  metricsAt: day(r.metrics_at), status: r.status as string, nextAction: (r.next_action as string) ?? null, updatedAt: iso(r.updated_at)!,
  section: (r.kc_section as string) ?? null, potential: (r.potential as Potential) ?? null, verifiedAt: day(r.verified_at),
});

export async function listKeywords(market: SeoMarket | null = null): Promise<Keyword[]> {
  const s = await seoSql();
  return (await s`select * from app.seo_keywords where (${market}::text is null or market = ${market}) order by market, keyword`).map(toKeyword);
}

export type KeywordInput = Pick<Keyword, "market" | "keyword" | "intent" | "landingPath" | "status" | "nextAction" | "section" | "potential" | "verifiedAt"> & {
  id?: number | null; volume?: number | null; volumeSource?: string | null; difficulty?: number | null;
};

export async function saveKeyword(k: KeywordInput) {
  const s = await seoSql();
  const f = {
    market: k.market, keyword: k.keyword, intent: k.intent, landing_path: k.landingPath, status: k.status, next_action: k.nextAction,
    kc_section: k.section, potential: k.potential, verified_at: k.verifiedAt,
  };
  if (k.id) await s`update app.seo_keywords set ${s(f)}, volume = ${k.volume ?? null}, volume_source = ${k.volumeSource ?? null}, difficulty = ${k.difficulty ?? null}, updated_at = now() where id = ${k.id}`;
  else await s`insert into app.seo_keywords ${s({ ...f, volume: k.volume ?? null, volume_source: k.volumeSource ?? null, difficulty: k.difficulty ?? null })}`;
  await markStale();
}

/** Volume and difficulty from a keyword-research export; only the keywords already in the list are updated. */
export async function importKeywordData(market: SeoMarket, rows: { keyword: string; volume: number | null; difficulty: number | null }[], source: string): Promise<number> {
  const s = await seoSql();
  let n = 0;
  for (const r of rows) {
    const res = await s`update app.seo_keywords set volume = ${r.volume}, difficulty = ${r.difficulty}, volume_source = ${source}, verified_at = current_date, updated_at = now()
      where market = ${market} and lower(keyword) = lower(${r.keyword}) returning id`;
    n += res.length;
  }
  return n;
}

/** Search Console figures for one keyword (exact query match), with the date range end they cover. */
export async function setKeywordMetrics(id: number, m: { position: number | null; clicks: number; impressions: number; at: string }) {
  const s = await seoSql();
  await s`update app.seo_keywords set position = ${m.position}, clicks = ${m.clicks}, impressions = ${m.impressions}, metrics_at = ${m.at} where id = ${id}`;
  await s`insert into app.seo_keyword_history (keyword_id, at, position, clicks, impressions) values (${id}, ${m.at}, ${m.position}, ${m.clicks}, ${m.impressions})
    on conflict (keyword_id, at) do update set position = excluded.position, clicks = excluded.clicks, impressions = excluded.impressions`;
}

/** Search Console positions of a market's keywords, newest first, for the trend. */
export async function keywordHistory(market: SeoMarket): Promise<{ keywordId: number; at: string; position: number | null }[]> {
  const s = await seoSql();
  const rows = await s`select h.keyword_id, h.at, h.position from app.seo_keyword_history h join app.seo_keywords k on k.id = h.keyword_id
    where k.market = ${market} and h.at > now() - interval '180 days' order by h.at desc`;
  return rows.map((r) => ({ keywordId: Number(r.keyword_id), at: day(r.at)!, position: r.position === null ? null : Number(r.position) }));
}

export async function deleteKeyword(id: number) {
  const s = await seoSql();
  await s`delete from app.seo_keywords where id = ${id}`;
  await markStale();
}
