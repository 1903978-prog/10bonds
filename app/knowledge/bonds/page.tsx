import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd, ToolCta } from "@/components/seo/Seo";
import { enBondsPath, enComparisons, enText, EN_BONDS_BASE } from "@/lib/seo/comparisonsEn";
import { SITE_URL } from "@/lib/seo/crawl";
import { enPath } from "@/lib/seo/knowledgeEn";
import { comparisonPages, shown } from "@/lib/seo/site";

// The hub of the English bond comparison pages: every page with enough bonds behind it today.

export const dynamic = "force-dynamic";

const TITLE = "Bond comparisons: euro government and corporate bonds · 10BONDS";
const DESCRIPTION = "Compare euro bonds by issuer, return, duration and risk: government bonds, investment grade, high yield and more, one bond per issuer, updated daily.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: EN_BONDS_BASE, languages: { en: EN_BONDS_BASE, "x-default": EN_BONDS_BASE } },
  openGraph: { locale: "en_GB", title: TITLE, description: DESCRIPTION },
};

export default async function EnglishComparisonsHub() {
  const { pages, source } = await comparisonPages();
  const live = enComparisons().map((d) => ({ def: d, page: pages.find((p) => p.def.id === d.id) })).filter((x) => x.page && shown(x.page, source));
  return (
    <div>
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-mute"><Link href="/" className="hover:text-ink">Home</Link> › <Link href={enPath()} className="hover:text-ink">Knowledge</Link> › <span className="text-ink">Bond comparisons</span></nav>
      <h1 className="text-[34px] font-semibold leading-tight tracking-tight">Bond comparisons</h1>
      <p className="mt-3 max-w-3xl text-[17px] text-mute">Euro bonds side by side, from the same daily data as the bond finder. Each page lists one bond per issuer with return to maturity, duration and the 10BONDS risk score. These are euro bonds, so readers paid in dollars or pounds also carry currency risk.</p>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {live.map(({ def, page }) => (
          <li key={def.id}>
            <Link href={enBondsPath(enText(def).slug)} className="block h-full rounded-2xl bg-white p-4 hover:text-accent">
              <span className="font-medium">{enText(def).h1}</span>
              <span className="mt-1 block text-xs text-mute">{page!.issuers} issuers · {page!.bonds} bonds</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-sm text-mute"><Link href={enPath()} className="text-accent">Knowledge guides</Link> · <Link href="/methodology" className="text-accent">Methodology</Link></p>
      <ToolCta locale="en" />
      <JsonLd data={{ "@context": "https://schema.org", "@type": "CollectionPage", name: "Bond comparisons", url: SITE_URL + EN_BONDS_BASE, inLanguage: "en", hasPart: live.map(({ def }) => ({ "@type": "WebPage", name: enText(def).h1, url: SITE_URL + enBondsPath(enText(def).slug) })) }} />
    </div>
  );
}
