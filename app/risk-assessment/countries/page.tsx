import type { Metadata } from "next";
import CountryFocus from "@/components/CountryFocus";
import { COUNTRIES_IN_FOCUS } from "@/lib/countriesInFocus";
import { currentUser } from "@/lib/currentUser";
import { featuresFor } from "@/lib/planFeatures";

export const metadata: Metadata = {
  title: "Risk assessment: countries in focus · 10BONDS",
  description: "Sovereign risk snapshots: the 10bonds.com rating, key indicators, the path to 2047, early warnings, buffers and risks.",
  alternates: { canonical: "/risk-assessment/countries" },
};
export const dynamic = "force-dynamic";

/** Opens on the free example, so every visitor sees one full country scoring. */
export default async function Countries() {
  const user = await currentUser();
  const c = COUNTRIES_IN_FOCUS.find((x) => x.free) ?? COUNTRIES_IN_FOCUS[0];
  return <CountryFocus c={c} paid={(await featuresFor(user)).includes("risk_reports")} />;
}
