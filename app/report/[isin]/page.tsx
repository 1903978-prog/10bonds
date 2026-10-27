import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ReportView from "@/components/report/ReportView";
import { buildReport, hideSources } from "@/lib/bondReport";
import { enforceEvidence } from "@/lib/legalRisk/evidence";
import { findCompany } from "@/lib/companiesInFocus";
import { currentUser } from "@/lib/currentUser";
import { loadAllShown } from "@/lib/bonds";
import { isIsin } from "@/lib/seo/bondPages";
import type { PublicBond } from "@/lib/types";
import { featuresFor } from "@/lib/planFeatures";
import { recordAssessment, verdictsOn } from "@/lib/assessments";

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
  const built = buildReport(isin, bond, c);
  if (!built) {
    if (failed) {
      return (
        <section className="mx-auto mt-8 max-w-md rounded-lg border border-line bg-white p-6 text-center" data-testid="report-error">
          <p className="text-[15px] font-medium">Bond data is temporarily unavailable</p>
          <p className="mt-1 text-[13px] text-mute">Please try again in a few minutes.</p>
        </section>
      );
    }
    notFound();
  }
  const user = await currentUser();
  const admin = !!user?.isAdmin;
  // Customers never see a dated-market or model figure without its evidence: it is shown as "Not verified" instead (lib/legalRisk/evidence.ts).
  const r = admin ? built : hideSources(enforceEvidence(built));
  const verdicts = await verdictsOn();
  if (c) void recordAssessment(c);
  const open = r.free || (await featuresFor(user)).includes("risk_reports");
  return (
    <ReportView r={r} open={open} admin={user?.isAdmin === true} signedIn={!!user} verdicts={verdicts} />
  );
}
