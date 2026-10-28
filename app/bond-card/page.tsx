import type { Metadata } from "next";
import BondCard from "@/components/BondCard";
import { currentUser } from "@/lib/currentUser";
import { featuresFor } from "@/lib/planFeatures";
import { pickedLang } from "@/lib/pageLang";
import type { BondLang } from "@/lib/seo/bondPages";

export const metadata: Metadata = { title: "Bond Card · 10BONDS", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Bond Card: paste an ISIN, see every figure for the bond and bonds with the same risk and a higher return. Same plans as the ISIN search. */
export default async function Page({ searchParams }: { searchParams: Promise<{ lang?: string; isin?: string }> }) {
  const sp = await searchParams;
  const picked = await pickedLang(sp.lang);
  const lang: BondLang = picked === "it" || picked === "fr" || picked === "de" ? picked : "en";
  const allowed = (await featuresFor(await currentUser())).includes("isin_search");
  return <BondCard lang={lang} allowed={allowed} initialIsin={(sp.isin ?? "").slice(0, 20)} />;
}
