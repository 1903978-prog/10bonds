import type { Metadata } from "next";
import Link from "next/link";
import ProRequestForm from "@/components/ProRequestForm";
import ReplacementEngine from "@/components/ReplacementEngine";
import { currentUser } from "@/lib/currentUser";
import { PlanButton } from "@/components/PlanButton";
import { euro, priceCents } from "@/lib/plans";
import { proAccess } from "@/lib/pro";

export const metadata: Metadata = { title: "For wealth managers · 10BONDS", description: "Bond Replacement Engine for professional wealth managers.", alternates: { canonical: "/pro" } };
export const dynamic = "force-dynamic";

export default async function Pro() {
  const user = await currentUser();
  if (!user)
    return (
      <div className="mx-auto max-w-md rounded-[28px] bg-white p-7 shadow-[0_2px_20px_rgba(0,0,0,0.04)] sm:p-9">
        <p className="text-sm font-medium text-accent">For professional wealth managers</p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight">Bond Replacement Engine</h1>
        <p className="mt-2 text-[15px] text-mute">
          Upload a client portfolio and see similar bonds with a higher yield or lower risk, and how each one differs. For regulated professionals only.
        </p>
        <p className="mt-6 text-[15px]">
          Please <Link href="/signup" className="text-accent">create a free account</Link> or <Link href="/login" className="text-accent">sign in</Link> first, then request professional access here.
        </p>
      </div>
    );
  let status;
  try {
    status = await proAccess(user);
  } catch {
    return <p className="text-center text-mute">Professional access is not available right now. Please try again later.</p>;
  }
  if (status === "active") return <ReplacementEngine />;
  if (status === "needs-plan")
    return (
      <div className="mx-auto max-w-md rounded-[28px] bg-white p-7 shadow-[0_2px_20px_rgba(0,0,0,0.04)] sm:p-9" data-testid="pro-needs-plan">
        <p className="text-sm font-medium text-accent">Your professional access is approved</p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight">Subscribe to Pro</h1>
        <p className="mt-2 text-[15px] text-mute">
          Pro gives you client portfolio analysis and similar bonds with a higher yield, on top of everything in Premium.
          {` ${euro(priceCents("pro", "month"))} a month.`}
        </p>
        <PlanButton plan="pro" interval="month" highlight label="Get Pro monthly" />
      </div>
    );
  return <ProRequestForm status={status === "approved" ? "none" : status} />;
}
