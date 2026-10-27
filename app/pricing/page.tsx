import type { Metadata } from "next";
import Link from "next/link";
import RedeemForm from "@/components/RedeemForm";
import { PlanButton } from "@/components/PlanButton";
import { currentUser } from "@/lib/currentUser";
import { stripeConfigured } from "@/lib/stripe";
import { euro, priceCents, YEARLY_DISCOUNT, type Interval, type PaidPlan } from "@/lib/plans";
import { proStatus } from "@/lib/pro";
import { cookies } from "next/headers";
import { LANG_COOKIE } from "@/lib/seo/locales";
import { PRICING_TEXT, pricingLang } from "@/lib/pricingText";
import { loadMatrix } from "@/lib/planFeatures";
import { MAX_PLAN_LINES, planLines } from "@/lib/features";
import { activePromo } from "@/lib/promoServer";
import { promoCents, promoEndLabel, promoLine } from "@/lib/promo";
import { loadFreeLimits } from "@/lib/searchLimits";
import TrackView from "@/components/TrackView";

export const metadata: Metadata = {
  title: "Plans · 10BONDS",
  description: "10BONDS plans compared: Free, Plus, Premium and Pro. What each plan includes, monthly and yearly prices, and how to redeem a promo code.",
  alternates: { canonical: "/pricing" },
  openGraph: { title: "Plans · 10BONDS", description: "10BONDS plans compared: Free, Plus, Premium and Pro. What each plan includes, monthly and yearly prices, and how to redeem a promo code.", url: "/pricing" },
};
export const dynamic = "force-dynamic";

const PLAN_KEYS = ["free", "plus", "premium", "pro"] as const;

export default async function Pricing({ searchParams }: { searchParams: Promise<{ paid?: string; cancelled?: string; billing?: string }> }) {
  const user = await currentUser();
  const sp = await searchParams;
  const payOn = stripeConfigured();
  const lang = pricingLang((await cookies()).get(LANG_COOKIE)?.value);
  const t = PRICING_TEXT[lang];
  // Each card lists what the admin's feature table (/admin/features) ticks for that plan.
  const matrix = await loadMatrix();
  const freeLimits = await loadFreeLimits();
  const PLANS = PLAN_KEYS.map((key) => ({ key, ...t.plans[key], lines: [...planLines(matrix, key, lang, t, freeLimits), ...t.plans[key].extra].slice(0, MAX_PLAN_LINES), highlight: key === "plus" }));
  // Yearly is not sold for now (the owner, 26/10/2026): the page is always monthly, even with ?billing=year.
  const interval = "month" as Interval;
  const promo = await activePromo();
  const proApproved = user ? user.isAdmin || (await proStatus(user).catch(() => "none")) === "approved" : false;
  const sub = user?.subscription && ["active", "trialing", "past_due"].includes(user.subscription.status) ? user.subscription : null;
  return (
    <div>
      <TrackView kind="pricing_viewed" detail={{ signed_in: Boolean(user) }} />
      {sp.paid && <TrackView kind="paid" flush />}
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-[26px] font-semibold tracking-tight sm:text-[30px]">{t.title}</h1>
        <p className="mt-1 text-sm text-mute">
          {t.lead}
        </p>
        {!user && <p className="mt-0.5 text-xs text-mute">{t.visitor}</p>}
        {promo && <p className="mt-0.5 text-xs text-mute" data-testid="promo-line">{promoLine(lang, promo.percent, promoEndLabel(promo.endsAt, lang))}</p>}
        {sp.paid && (
          <p className="mt-4 rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-800" data-testid="paid-msg">
            {t.paid}
          </p>
        )}
        {sp.cancelled && <p className="mt-4 rounded-2xl bg-canvas px-4 py-3 text-sm text-mute">{t.cancelled}</p>}
        {sub?.status === "past_due" && (
          <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">{t.pastDue[0]}<Link href="/account" className="underline">{t.pastDue[1]}</Link>{t.pastDue[2]}</p>
        )}
        {sub?.cancelAtEnd && sub.renewsAt && (
          <p className="mt-4 text-sm text-mute">{t.endsOn(new Date(sub.renewsAt).toLocaleDateString(lang === "en" ? "en-GB" : lang, { day: "numeric", month: "long", year: "numeric" }))}</p>
        )}
      </div>
      <div className="mt-3 flex justify-center">
        <div className="inline-flex rounded-full bg-canvas p-1 text-sm" data-testid="billing-toggle">
          <Link href="/pricing" scroll={false} className={`rounded-full px-4 py-1 font-medium ${interval === "month" ? "bg-white shadow-sm" : "text-mute"}`} data-testid="billing-month">{t.monthly}</Link>
          <span className="cursor-default select-none rounded-full px-4 py-1 font-medium text-mute opacity-60" aria-disabled="true" data-testid="billing-year">
            {t.yearly} <span className="text-accent">−{Math.round(YEARLY_DISCOUNT * 100)}%</span>
          </span>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((p) => (
          <div
            key={p.name}
            className={`flex flex-col rounded-[20px] bg-white p-5 shadow-[0_2px_20px_rgba(0,0,0,0.04)] ${p.highlight ? "ring-2 ring-accent" : ""}`}
          >
            <h2 className="flex flex-wrap items-center gap-2 text-lg font-semibold">
              {p.name}
              {p.key === "pro" && <span className="rounded-full bg-ink px-2 py-0.5 text-[11px] font-medium text-white">{t.forPros}</span>}
            </h2>
            <p className="text-xs text-mute">{p.tagline}</p>
            <p className="mt-3" data-testid={`price-${p.key}`}>
              {promo && p.key === "free" && <span className="invisible block text-sm" aria-hidden>€0</span>}
              {promo && p.key !== "free" && <span className="block text-sm text-mute line-through" data-testid={`old-price-${p.key}`}>{euro(priceCents(p.key as PaidPlan, interval), lang)}</span>}
              <span className="text-[28px] font-semibold tracking-tight">{p.key === "free" ? "€0" : euro(promo ? promoCents(p.key as PaidPlan, promo.percent) : priceCents(p.key as PaidPlan, interval), lang)}</span>
              {p.key !== "free" && <span className="text-sm text-mute">{interval === "year" ? t.perYear : t.perMonth}</span>}
            </p>
            {/* Always one line here, so Monthly/Yearly never moves the features or buttons. */}
            <p className="h-4 text-[11px] text-mute">
              {p.key === "free" ? "" : interval === "year" ? t.yearlyNote(euro(Math.round(priceCents(p.key as PaidPlan, "year") / 12), lang)) : t.billedMonthly}
            </p>
            <ul className="mt-3 flex-1 space-y-1 text-[13px] leading-snug">
              {p.lines.map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="text-accent">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            {p.key === "free" ? (
              !user ? (
                <Link href="/signup" className="mt-4 rounded-full bg-ink px-4 py-2 text-center text-sm font-medium text-white hover:opacity-90">
                  {p.cta}
                </Link>
              ) : (
                <button disabled className="mt-4 rounded-full bg-canvas px-4 py-2 text-sm font-medium text-ink disabled:cursor-default disabled:opacity-80">
                  {user.plan === "free" ? t.yourPlan : t.included}
                </button>
              )
            ) : !payOn ? (
              <button disabled className={`mt-4 rounded-full px-4 py-2 text-sm font-medium ${p.highlight ? "bg-accent text-white" : "bg-canvas text-ink"} disabled:cursor-default disabled:opacity-80`}>
                {user?.storedPlan === p.key ? t.yourPlan : t.soon}
              </button>
            ) : p.key === "pro" && !proApproved ? (
              <Link href="/pro" className="mt-4 rounded-full bg-ink px-4 py-2 text-center text-sm font-medium text-white hover:opacity-90" data-testid="pro-request">
                {user ? t.proRequest : t.subscribe}
              </Link>
            ) : !user ? (
              <Link href="/signup" className={`mt-4 rounded-full px-4 py-2 text-center text-sm font-medium ${p.highlight ? "bg-accent text-white" : "bg-ink text-white"} hover:opacity-90`}>
                {t.subscribe}
              </Link>
            ) : sub ? (
              <>
                {user.storedPlan === p.key && <p className="mt-4 text-center text-sm font-medium text-accent">{t.yourPlan}</p>}
                <Link href="/account" className="mt-4 rounded-full bg-canvas px-4 py-2 text-center text-sm font-medium text-ink">{t.changeOnProfile}</Link>
              </>
            ) : (
              <PlanButton plan={p.key as PaidPlan} interval={interval} highlight={p.highlight} label={p.cta} />
            )}
          </div>
        ))}
      </div>
      {user && !sub && <RedeemForm />}
      <p className="mt-3 text-center text-xs text-mute" data-testid="plan-terms">
        {t.terms}
        {!user && t.promo}
      </p>
    </div>
  );
}
