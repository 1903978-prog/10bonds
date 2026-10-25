import { notOwnerVisitor } from "@/lib/ownerExclusion";
import type { Locale } from "./locales";
import { seoSql } from "./store";

// Business performance from the site's own records (no Google needed). Visitors are only counted when they allowed
// Statistics cookies, so these are lower bounds. "Organic" = a page view came from a search engine. With a market,
// only organic landings on that language's pages (/it, /fr, /de) count.

const SEARCH_ENGINE = "(^|\\.)(google|bing|duckduckgo|yahoo|ecosia|qwant|yandex|baidu|startpage)\\.";

export type Funnel = {
  days: number;
  consentedVisitors: number;
  organicVisitors: number;
  organicSearchers: number; // organic visitors who ran a bond search
  organicSignups: number; // organic visitors who created an account
  organicPaid: number; // ...whose account is on a paid plan now
  allSignups: number; // every new account in the period (all sources, from app.users)
  paidAccounts: number; // accounts on Plus or Premium now
  conversion: number | null; // organicPaid / organicVisitors
};

export async function firstPartyFunnel(days = 28, market: Locale | null = null): Promise<Funnel> {
  const prefix = market ? `/${market}` : null;
  const s = await seoSql();
  const [r] = await s`
    with v as (
      select visitor_id,
             bool_or(kind = 'page_view' and coalesce(detail->>'referrer', '') ~* ${SEARCH_ENGINE}
                     and (${prefix}::text is null or path = ${prefix} or path like ${(prefix ?? "") + "/%"})) organic,
             bool_or(kind = 'search') searched,
             bool_or(kind = 'signup') signed,
             max(user_id) user_id
      from app.events where at > now() - make_interval(days => ${days}) and ${notOwnerVisitor(s)} group by visitor_id
    )
    select count(*) visitors,
           count(*) filter (where organic) organic,
           count(*) filter (where organic and searched) searchers,
           count(*) filter (where organic and signed) signups,
           count(*) filter (where organic and exists (select 1 from app.users u where u.id = v.user_id and u.plan in ('plus','premium'))) paid
    from v`;
  const [u] = await s`
    select count(*) filter (where created_at > now() - make_interval(days => ${days})) signups,
           count(*) filter (where plan in ('plus','premium')) paid
    from app.users`;
  const organic = Number(r.organic);
  const paid = Number(r.paid);
  return {
    days,
    consentedVisitors: Number(r.visitors),
    organicVisitors: organic,
    organicSearchers: Number(r.searchers),
    organicSignups: Number(r.signups),
    organicPaid: paid,
    allSignups: Number(u.signups),
    paidAccounts: Number(u.paid),
    conversion: organic ? paid / organic : null,
  };
}
