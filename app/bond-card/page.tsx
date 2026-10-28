import type { Metadata } from "next";
import BondCard from "@/components/BondCard";
import { currentUser } from "@/lib/currentUser";
import { notFound } from "next/navigation";
import { pickedLang } from "@/lib/pageLang";
import type { BondLang } from "@/lib/seo/bondPages";

export const metadata: Metadata = { title: "Bond Card · 10BONDS", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Bond Card: paste an ISIN, see every figure for the bond and bonds with the same risk and a higher return. Admin only for now. */
export default async function Page({ searchParams }: { searchParams: Promise<{ lang?: string; isin?: string }> }) {
  // Admin only until the page is stable (the owner, 28/10/2026): everyone else gets the normal 404.
  if (!(await currentUser())?.isAdmin) notFound();
  const sp = await searchParams;
  const picked = await pickedLang(sp.lang);
  const lang: BondLang = picked === "it" || picked === "fr" || picked === "de" ? picked : "en";
  return <BondCard lang={lang} allowed initialIsin={(sp.isin ?? "").slice(0, 20)} />;
}
