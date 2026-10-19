import type { Metadata } from "next";
import Finder from "@/components/Finder";
import { JsonLd } from "@/components/seo/Seo";
import { ORGANIZATION } from "@/lib/seo/org";
import { getSeoSetting } from "@/lib/seo/store";
import { accountsConfigured } from "@/lib/accounts";

// The international home page: links its Italian, French and German versions, and carries the Google Search
// Console verification code the admin saves in Admin -> SEO.
export async function generateMetadata(): Promise<Metadata> {
  const google = accountsConfigured() ? await getSeoSetting("google_verification").catch(() => null) : null;
  return {
    alternates: { canonical: "/", languages: { "it-IT": "/it", "fr-FR": "/fr", "de-DE": "/de", "x-default": "/" } },
    ...(google ? { verification: { google } } : {}),
  };
}

export default function Home() {
  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", ...ORGANIZATION }} />
      <Finder />
    </>
  );
}
