import type { Metadata } from "next";
import Finder from "@/components/Finder";
import { JsonLd } from "@/components/seo/Seo";
import { ORGANIZATION } from "@/lib/seo/org";
import { getSeoSetting } from "@/lib/seo/store";
import { accountsConfigured } from "@/lib/accounts";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/currentUser";
import { landsInPro } from "@/lib/proView";
import { cookies } from "next/headers";
import IntroGate from "@/components/IntroGate";
import { INTRO_COOKIE } from "@/lib/intro";

// The international home page: links its Italian, French and German versions, and carries the Google Search
// Console verification code the admin saves in Admin -> SEO.
export async function generateMetadata(): Promise<Metadata> {
  const google = accountsConfigured() ? await getSeoSetting("google_verification").catch(() => null) : null;
  return {
    alternates: { canonical: "/", languages: { "it-IT": "/it", "fr-FR": "/fr", "de-DE": "/de", "x-default": "/" } },
    ...(google ? { verification: { google } } : {}),
  };
}

export default async function Home({ searchParams }: { searchParams: Promise<{ intro?: string }> }) {
  if (accountsConfigured() && (await landsInPro(await currentUser().catch(() => null)))) redirect("/pro");
  // First visit (no cookie yet) or ?intro=1: the landing page comes before the finder.
  const intro = (await searchParams).intro === "1" || !(await cookies()).get(INTRO_COOKIE);
  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", ...ORGANIZATION }} />
      <IntroGate show={intro}>
        <Finder />
      </IntroGate>
    </>
  );
}
