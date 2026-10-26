import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { findCompany } from "@/lib/companiesInFocus";

type Props = { params: Promise<{ isin: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = findCompany((await params).isin);
  if (!c) return {};
  return { alternates: { canonical: `/report/${c.isin}` } };
}

/** The per-company risk assessment is now the scrolling bond report. */
export default async function CompanyPage({ params }: Props) {
  const c = findCompany((await params).isin);
  if (!c) notFound();
  permanentRedirect(`/report/${c.isin}`);
}
