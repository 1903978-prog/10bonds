import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CompanyFocus from "@/components/CompanyFocus";
import { findCompany } from "@/lib/companiesInFocus";
import { currentUser } from "@/lib/currentUser";

type Props = { params: Promise<{ isin: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = findCompany((await params).isin);
  if (!c) return {};
  const title = `${c.name} ${c.isin} risk assessment · 10BONDS`;
  return { title, description: `${c.issuer} bond ${c.isin}: credit score ${c.score}/100, terms, financial strength and main risks.`, alternates: { canonical: `/risk-assessment/${c.isin}` } };
}
export const dynamic = "force-dynamic";

export default async function CompanyPage({ params }: Props) {
  const c = findCompany((await params).isin);
  if (!c) notFound();
  const user = await currentUser();
  return <CompanyFocus c={c} paid={!!user && user.plan !== "free"} />;
}
