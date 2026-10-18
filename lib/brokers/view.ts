import { purchaseCost, type CostBreakdown } from "./fees";
import { scoreCountry, type Scored } from "./score";
import { currentOf, type PublicData } from "./store";
import { CATEGORIES, SCENARIOS, type BrokerProfile, type Category, type Country, type Tariff } from "./types";

// What one country page shows, worked out from the stored data. Pure, so it can be tested.

export const MAX_LISTED = 10;

export type BrokerLink = { href: string; kind: "official" | "affiliate"; rel: string };

/** Affiliate links are used only for an agreement marked active; otherwise the plain official site. */
export function brokerLink(p: BrokerProfile, country: Country): BrokerLink {
  const a = p.affiliate;
  if (a.status === "active" && a.url && /^https:\/\//.test(a.url)) {
    const href = a.trackingParams ? `${a.url}${a.url.includes("?") ? "&" : "?"}${a.trackingParams.replace(/^[?&]/, "")}` : a.url;
    return { href, kind: "affiliate", rel: "sponsored nofollow noopener" };
  }
  return { href: p.websites?.[country] ?? p.website, kind: "official", rel: "nofollow noopener" };
}

export type Row = {
  profile: BrokerProfile;
  tariff: Tariff;
  score: Scored;
  costs: Record<Category, Record<number, CostBreakdown>>;
  overdue: boolean;
  link: BrokerLink;
};

export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
}

export function countryView(data: PublicData, country: Country, today: string) {
  const settings = data.countries[country];
  const excluded = new Set(settings.excluded.map((e) => e.id));
  const byBroker = new Map<string, Tariff[]>();
  for (const t of data.tariffs) if (t.country === country) byBroker.set(t.brokerId, [...(byBroker.get(t.brokerId) ?? []), t]);
  const current: Tariff[] = [];
  for (const versions of byBroker.values()) {
    const c = currentOf(versions, today);
    if (c && !excluded.has(c.brokerId) && data.profiles.some((p) => p.id === c.brokerId)) current.push(c);
  }
  const scores = scoreCountry(
    current.map((t) => ({ brokerId: t.brokerId, data: t.data })),
    data.methodology,
  );
  const rows: Row[] = scores.slice(0, MAX_LISTED).map((score) => {
    const tariff = current.find((t) => t.brokerId === score.brokerId)!;
    const profile = data.profiles.find((p) => p.id === score.brokerId)!;
    const costs = Object.fromEntries(
      CATEGORIES.map((c) => [c, Object.fromEntries(SCENARIOS.map((a) => [a, purchaseCost(tariff.data, c, a)]))]),
    ) as Row["costs"];
    return { profile, tariff, score, costs, overdue: daysBetween(tariff.verifiedAt, today) > data.methodology.verifyEveryDays, link: brokerLink(profile, country) };
  });
  const sponsored = data.profiles.filter((p) => p.affiliate.status === "active" && p.affiliate.sponsored.includes(country) && p.affiliate.url);
  const lastVerified = rows.map((r) => r.tariff.verifiedAt).sort().at(-1) ?? null;
  return { rows, sponsored, settings, lastVerified, methodology: data.methodology };
}

/** One broker in one country, for its profile page (whether or not it made the top ten). */
export function brokerView(data: PublicData, country: Country, id: string, today: string) {
  const v = countryView(data, country, today);
  const row = v.rows.find((r) => r.profile.id === id);
  if (!row) return null;
  const rank = v.rows.indexOf(row) + 1;
  return { ...v, row, rank };
}
