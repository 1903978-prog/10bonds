import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ReportView from "@/components/report/ReportView";
import { buildReport } from "@/lib/bondReport";
import { findCompany } from "@/lib/companiesInFocus";
import { currentUser } from "@/lib/currentUser";
import { loadAllShown } from "@/lib/bonds";
import { isIsin } from "@/lib/seo/bondPages";
import type { PublicBond } from "@/lib/types";
import { featuresFor } from "@/lib/planFeatures";

type Props = { params: Promise<{ isin: string }> };
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const isin = (await params).isin.toUpperCase();
  return { title: `Bond report ${isin} · 10BONDS`, robots: { index: false, follow: true }, alternates: { canonical: `/report/${isin}` } };
}

/** /report/{ISIN}: the Bond Intelligence Report. Data from the bond copy and the curated research; gaps say "Not verified". */
export default async function ReportPage({ params }: Props) {
  const isin = (await params).isin.toUpperCase();
  if (!isIsin(isin)) notFound();
  let bond: PublicBond | null = null;
  let failed = false;
  try {
    bond = (await loadAllShown()).bonds.find((b) => b.isin === isin) ?? null;
  } catch {
    failed = true;
  }
  const c = findCompany(isin) ?? null;
  const r = buildReport(isin, bond, c);
  if (!r) {
    if (failed) {
      return (
        <section className="mx-auto mt-8 max-w-md rounded-2xl border border-line bg-white p-6 text-center" data-testid="report-error">
          <p className="text-[15px] font-medium">Bond data is temporarily unavailable</p>
          <p className="mt-1 text-[13px] text-mute">Please try again in a few minutes.</p>
        </section>
      );
    }
    notFound();
  }
  const user = await currentUser();
  const open = r.free || (await featuresFor(user)).includes("risk_reports");
  return (
    <ReportView r={r} open={open} admin={user.isAdmin === true} />
  );
}
