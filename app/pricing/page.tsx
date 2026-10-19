import type { Metadata } from "next";
import Link from "next/link";
import { ManageButton, PlanButton } from "@/components/PlanButton";
import { currentUser } from "@/lib/currentUser";
import { stripeConfigured } from "@/lib/stripe";
import { SEARCH_LIMITS } from "@/lib/limits";

export const metadata: Metadata = { title: "Pricing · 10BONDS", alternates: { canonical: "/pricing" } };
export const dynamic = "force-dynamic";

const PLANS = [
  {
    key: "free",
    name: "Free account",
    price: "€0",
    period: "",
    tagline: "Sign up with your email.",
    features: [`${SEARCH_LIMITS.free.single} single-bond searches a week`, `${SEARCH_LIMITS.free.portfolio} portfolio searches a week`, "Full top 10 bonds", "Issuer, yield, rating, duration", "No ISIN codes"],
    cta: "Create free account",
    highlight: false,
  },
  {
    key: "plus",
    name: "Plus",
    price: "€9",
    period: "/month",
    tagline: "The full shortlist.",
    features: ["Everything in the free account", "ISIN codes visible", "Unlimited single-bond searches", SEARCH_LIMITS.plus.portfolio === null ? "Unlimited portfolio searches" : `${SEARCH_LIMITS.plus.portfolio} portfolio searches a week`, "Bond name, coupon, maturity", "Average shortlist figures"],
    cta: "Get Plus",
    highlight: true,
  },
  {
    key: "premium",
    name: "Premium",
    price: "€19",
    period: "/month",
    tagline: "Stay on top of changes.",
    features: ["Everything in Plus", "Alerts when the top 10 changes", "Saved searches", "Deeper risk figures", "Yield history"],
    cta: "Get Premium",
    highlight: false,
  },
];

export default async function Pricing({ searchParams }: { searchParams: Promise<{ paid?: string; cancelled?: string }> }) {
  const user = await currentUser();
  const sp = await searchParams;
  const payOn = stripeConfigured();
  const sub = user?.subscription && ["active", "trialing", "past_due"].includes(user.subscription.status) ? user.subscription : null;
  return (
    <div>
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-[36px] font-semibold tracking-tight sm:text-[48px]">Simple plans</h1>
        <p className="mt-3 text-mute">
          Start with a free account. Upgrade when you want the ISIN codes and more. Cancel anytime.
        </p>
        {!user && <p className="mt-2 text-sm text-mute">Without an account you can try the search and see the top 3.</p>}
        {sp.paid && (
          <p className="mt-4 rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-800" data-testid="paid-msg">
            Thank you. Your payment went through; your plan is active within a minute (refresh if it still shows the old plan).
          </p>
        )}
        {sp.cancelled && <p className="mt-4 rounded-2xl bg-canvas px-4 py-3 text-sm text-mute">Payment cancelled. Nothing was charged.</p>}
        {sub?.status === "past_due" && (
          <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">Your last payment failed. Please update your card under “Manage subscription”.</p>
        )}
        {sub?.cancelAtEnd && sub.renewsAt && (
          <p className="mt-4 text-sm text-mute">Your subscription ends on {new Date(sub.renewsAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.</p>
        )}
      </div>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {PLANS.map((p) => (
          <div
            key={p.name}
            className={`flex flex-col rounded-[28px] bg-white p-7 shadow-[0_2px_20px_rgba(0,0,0,0.04)] ${p.highlight ? "ring-2 ring-accent" : ""}`}
          >
            <h2 className="text-xl font-semibold">{p.name}</h2>
            <p className="mt-1 text-sm text-mute">{p.tagline}</p>
            <p className="mt-5">
              <span className="text-4xl font-semibold tracking-tight">{p.price}</span>
              <span className="text-mute">{p.period}</span>
            </p>
            <ul className="mt-6 flex-1 space-y-2.5 text-[15px]">
              {p.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="text-accent">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            {p.key === "free" ? (
              !user ? (
                <Link href="/signup" className="mt-7 rounded-full bg-ink px-5 py-3 text-center text-[15px] font-medium text-white hover:opacity-90">
                  {p.cta}
                </Link>
              ) : (
                <button disabled className="mt-7 rounded-full bg-canvas px-5 py-3 text-[15px] font-medium text-ink disabled:cursor-default disabled:opacity-80">
                  {user.plan === "free" ? "Your plan" : "Included"}
                </button>
              )
            ) : !payOn ? (
              <button disabled className={`mt-7 rounded-full px-5 py-3 text-[15px] font-medium ${p.highlight ? "bg-accent text-white" : "bg-canvas text-ink"} disabled:cursor-default disabled:opacity-80`}>
                {user?.plan === p.key ? "Your plan" : "Coming soon"}
              </button>
            ) : !user ? (
              <Link href="/signup" className={`mt-7 rounded-full px-5 py-3 text-center text-[15px] font-medium ${p.highlight ? "bg-accent text-white" : "bg-ink text-white"} hover:opacity-90`}>
                Create a free account first
              </Link>
            ) : sub ? (
              <>
                {user.plan === p.key && <p className="mt-7 text-center text-sm font-medium text-accent">Your plan</p>}
                <ManageButton />
              </>
            ) : (
              <PlanButton plan={p.key as "plus" | "premium"} highlight={p.highlight} label={p.cta} />
            )}
          </div>
        ))}
      </div>
      <p className="mx-auto mt-8 max-w-xl text-center text-xs text-mute">
        Prices include VAT where applicable. Monthly, cancel anytime: the plan then runs to the end of the month already paid. Payments are handled by Stripe. 10BONDS is an information service and does not give investment advice.
      </p>
    </div>
  );
}
