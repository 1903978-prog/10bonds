import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CountryFocus from "@/components/CountryFocus";
import { findCountry } from "@/lib/countriesInFocus";
import { currentUser } from "@/lib/currentUser";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = findCountry((await params).slug);
  if (!c) return {};
  return { title: `${c.name} sovereign risk assessment · 10BONDS`, description: `${c.name}: 10bonds.com rating ${c.score}/100, key indicators, path to 2047, early warnings and risks.`, alternates: { canonical: `/risk-assessment/countries/${c.slug}` } };
}
export const dynamic = "force-dynamic";

export default async function CountryPage({ params }: Props) {
  const c = findCountry((await params).slug);
  if (!c) notFound();
  const user = await currentUser();
  return <CountryFocus c={c} paid={!!user && user.plan !== "free"} />;
}
