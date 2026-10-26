import type { Metadata } from "next";
import Finder from "@/components/Finder";
import { JsonLd } from "@/components/seo/Seo";
import { ORGANIZATION } from "@/lib/seo/org";
import { SITE_URL } from "@/lib/seo/crawl";
import { getSeoSetting } from "@/lib/seo/store";
import { accountsConfigured } from "@/lib/accounts";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/currentUser";
import { landsInPro } from "@/lib/proView";
import { headers } from "next/headers";
import IntroGate from "@/components/IntroGate";
import { landingFirst } from "@/lib/intro";

// The international home page: links its Italian, French and German versions, and carries the Google Search
// Console verification code the admin saves in Admin -> SEO.
export async function generateMetadata(): Promise<Metadata> {
  const google = accountsConfigured() ? await getSeoSetting("google_verification").catch(() => null) : null;
  return {
    alternates: { canonical: "/", languages: { en: "/", "it-IT": "/it", "fr-FR": "/fr", "de-DE": "/de", "x-default": "/" } },
    ...(google ? { verification: { google } } : {}),
  };
}

export default async function Home({ searchParams }: { searchParams: Promise<{ intro?: string }> }) {
  if (accountsConfigured() && (await landsInPro(await currentUser().catch(() => null)))) redirect("/pro");
  // Arriving from outside the site (typed address, bookmark, social link): the landing page comes before the finder.
  const hd = await headers();
  const intro = landingFirst((await searchParams).intro, hd.get("referer"), hd.get("x-forwarded-host") ?? hd.get("host"));
  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", ...ORGANIZATION }} />
      <JsonLd data={{ "@context": "https://schema.org", "@type": "WebSite", name: "10BONDS", url: SITE_URL, inLanguage: "en", publisher: ORGANIZATION }} />
      <IntroGate show={intro}>
        <Finder />
      </IntroGate>
    </>
  );
}
