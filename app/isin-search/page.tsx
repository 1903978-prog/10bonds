import type { Metadata } from "next";
import IsinSearch from "@/components/IsinSearch";
import { currentUser } from "@/lib/currentUser";
import { featuresFor } from "@/lib/planFeatures";
import { pickedLang } from "@/lib/pageLang";
import type { BondLang } from "@/lib/seo/bondPages";

export const metadata: Metadata = { title: "Search a bond by ISIN · 10BONDS", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Search any bond by ISIN: Plus and up (the "isin_search" tick in /admin/features); Free and visitors see it locked. */
export default async function Page({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const picked = await pickedLang((await searchParams).lang);
  const lang: BondLang = picked === "it" || picked === "fr" || picked === "de" ? picked : "en";
  const allowed = (await featuresFor(await currentUser())).includes("isin_search");
  return <IsinSearch lang={lang} allowed={allowed} />;
}
