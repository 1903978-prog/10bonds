// Halloween 2026 promo: a percentage off the first month of a paid plan, between two moments.
// Pure (no server imports) so pages, client components and tests can share it.
import { MONTHLY_CENTS, type PaidPlan } from "./plans";

export type PromoConfig = { enabled: boolean; percent: number; startsAt: string; endsAt: string };

/** Default: 50% off, 26 Oct to 5 Nov 2026 end of day in Rome (CET, UTC+1). The admin can change it at /admin/features. */
export const DEFAULT_PROMO: PromoConfig = { enabled: true, percent: 50, startsAt: "2026-10-26T00:00:00Z", endsAt: "2026-11-05T22:59:59Z" };

export const promoActive = (c: PromoConfig, now = Date.now()) =>
  c.enabled && c.percent > 0 && c.percent < 100 && now >= Date.parse(c.startsAt) && now <= Date.parse(c.endsAt);

export const promoCents = (plan: PaidPlan, percent: number) => Math.round(MONTHLY_CENTS[plan] * (1 - percent / 100));

export function parsePromo(raw: string | null): PromoConfig {
  try {
    const j = JSON.parse(raw ?? "");
    const ok = typeof j?.percent === "number" && Number.isFinite(Date.parse(j?.startsAt)) && Number.isFinite(Date.parse(j?.endsAt));
    if (ok) return { enabled: j.enabled !== false, percent: Math.round(j.percent), startsAt: j.startsAt, endsAt: j.endsAt };
  } catch {}
  return DEFAULT_PROMO;
}

type L = "en" | "it" | "fr" | "de";
const MONTHS: Record<L, string[]> = {
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  it: ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"],
  fr: ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"],
  de: ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"],
};
/** "5 November" in the visitor's language, read in Rome time. */
export function promoEndLabel(endsAt: string, lang: L): string {
  const p = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Rome", day: "numeric", month: "numeric" }).formatToParts(new Date(endsAt));
  const day = Number(p.find((x) => x.type === "day")?.value);
  const month = MONTHS[lang][Number(p.find((x) => x.type === "month")?.value) - 1];
  return lang === "en" ? `${day} ${month}` : lang === "de" ? `${day}. ${month}` : lang === "fr" && day === 1 ? `1er ${month}` : `${day} ${month}`;
}

/** The one small line shown with the promo. Says plainly: first month only. */
export const promoLine = (lang: L, percent: number, end: string) =>
  ({
    en: `Halloween 2026 promo: ${percent}% off your first month, valid until ${end}.`,
    it: `Promo Halloween 2026: ${percent}% di sconto sul primo mese, valida fino al ${end}.`,
    fr: `Promo Halloween 2026 : ${percent} % de réduction sur le premier mois, valable jusqu'au ${end}.`,
    de: `Halloween-2026-Aktion: ${percent} % Rabatt auf den ersten Monat, gültig bis ${end}.`,
  })[lang];
