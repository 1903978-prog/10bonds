import type { Metadata } from "next";
import Link from "next/link";
import ProLanding from "@/components/ProLanding";
import ProRequestForm from "@/components/ProRequestForm";
import ReplacementEngine from "@/components/ReplacementEngine";
import { currentUser } from "@/lib/currentUser";
import { PlanButton } from "@/components/PlanButton";
import { euro, priceCents } from "@/lib/plans";
import { activePromo } from "@/lib/promoServer";
import { promoCents, promoEndLabel, promoLine } from "@/lib/promo";
import { PRO_TRIAL_DAYS, proInfo } from "@/lib/pro";

export const metadata: Metadata = {
  title: "For wealth managers · 10BONDS",
  description: "Bond Replacement Engine for regulated wealth managers: screen a client bond portfolio for similar-duration alternatives. Free 14-day trial for verified professionals.",
  alternates: { canonical: "/pro" },
};
export const dynamic = "force-dynamic";

const card = "mx-auto max-w-xl rounded-lg border border-line bg-white p-7 sm:p-9";

export default async function Pro() {
  const user = await currentUser();
  if (!user)
    return (
      <ProLanding
        cta={
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/signup?next=%2Fpro" className="rounded-full bg-accent px-6 py-3 text-[15px] font-medium text-white hover:bg-[#0077ed]" data-testid="pro-signup">Create a free account to apply</Link>
            <Link href="/login?next=%2Fpro" className="text-[15px] text-accent">I have an account</Link>
          </div>
        }
      />
    );
  let info;
  try {
    info = await proInfo(user);
  } catch {
    return <p className="text-center text-mute">Professional access is not available right now. Please try again later.</p>;
  }
  if (info.access === "active")
    return (
      <div className="space-y-4">
        {info.trialDaysLeft !== null && (
          <div className="mx-auto max-w-4xl rounded-lg bg-accent/10 px-5 py-3 text-sm text-accent" data-testid="pro-trial-banner">
            Free trial: {info.trialDaysLeft} {info.trialDaysLeft === 1 ? "day" : "days"} left. Nothing is charged and nothing renews on its own.{" "}
            <Link href="/pricing" className="underline">See Pro plan</Link>
          </div>
        )}
        <ReplacementEngine />
      </div>
    );
  const promo = info.access === "needs-plan" ? await activePromo() : null;
  if (info.access === "needs-plan")
    return (
      <div className={card} data-testid="pro-needs-plan">
        <p className="text-sm font-medium text-accent">{info.trialEndsAt ? "Your free trial has ended" : "Your professional access is approved"}</p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight">Subscribe to Pro</h1>
        <p className="mt-2 text-[15px] text-mute">
          Pro gives you client portfolio analysis and similar bonds with a higher yield, on top of everything in Premium.
          {` ${euro(priceCents("pro", "month"))} a month, VAT shown at checkout.`} Cancel any time. <Link href="/pro/terms" className="text-accent">Business terms</Link>.
          {promo && <span className="mt-1 block text-xs">{`${euro(promoCents("pro", promo.percent))} for the first month. ${promoLine("en", promo.percent, promoEndLabel(promo.endsAt, "en"))}`}</span>}
        </p>
        <PlanButton plan="pro" interval="month" highlight label="Get Pro monthly" />
      </div>
    );
  return (
    <div className="space-y-6">
      <ProLanding cta={<a href="#verify" className="inline-block rounded-full bg-accent px-6 py-3 text-[15px] font-medium text-white hover:bg-[#0077ed]">Verify your firm: {PRO_TRIAL_DAYS} days free</a>} />
      <ProRequestForm status={info.access === "approved" ? "none" : info.access} trialDays={PRO_TRIAL_DAYS} />
    </div>
  );
}
