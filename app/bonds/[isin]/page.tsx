import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import BondIsinPage, { bondByIsin } from "@/components/seo/BondIsinPage";
import { bondAlternates, bondDescription, bondTitle, isIsin } from "@/lib/seo/bondPages";
import { OG_IMAGES } from "@/lib/ogImage";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ isin: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const isin = (await params).isin.toUpperCase();
  const hit = isIsin(isin) ? await bondByIsin(isin).catch(() => null) : null;
  if (!hit) return { robots: { index: false } };
  const title = bondTitle("en", hit.bond);
  const description = bondDescription("en", hit.bond);
  return {
    title: { absolute: title },
    description,
    alternates: bondAlternates("en", isin),
    robots: hit.live ? undefined : { index: false, follow: true },
    openGraph: { images: OG_IMAGES, type: "website", locale: "en_GB", title, description },
  };
}

/** /bonds/{ISIN}: one bond, in English. A lower-case ISIN moves to the upper-case address. */
export default async function Page({ params }: Props) {
  const raw = (await params).isin;
  const isin = raw.toUpperCase();
  if (!isIsin(isin)) notFound();
  if (raw !== isin) permanentRedirect(`/bonds/${isin}`);
  return <BondIsinPage l="en" isin={isin} />;
}
