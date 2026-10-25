import type { Metadata } from "next";
import CompanyFocus from "@/components/CompanyFocus";
import { COMPANIES_IN_FOCUS } from "@/lib/companiesInFocus";
import { currentUser } from "@/lib/currentUser";
import { featuresFor } from "@/lib/planFeatures";

export const metadata: Metadata = {
  title: "Risk assessment: companies in focus · 10BONDS",
  description: "Credit risk assessments of selected corporate bonds: terms, financial strength, credit scorecard, main risks and our view.",
  alternates: { canonical: "/risk-assessment" },
};
export const dynamic = "force-dynamic";

/** Opens on the free example, so every visitor sees one full scoring. */
export default async function RiskAssessment() {
  const user = await currentUser();
  const c = COMPANIES_IN_FOCUS.find((x) => x.free) ?? COMPANIES_IN_FOCUS[0];
  return <CompanyFocus c={c} paid={(await featuresFor(user)).includes("risk_reports")} />;
}
