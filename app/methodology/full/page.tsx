import type { Metadata } from "next";
import MethodDoc from "@/components/MethodDoc";
import { methodLang } from "@/lib/methodology";
import { parseMethodDoc } from "@/lib/methodDoc";
import { CORPORATE_MD, CORPORATE_SUBTITLE, CORPORATE_TITLE, SOVEREIGN_MD, SOVEREIGN_SUBTITLE, SOVEREIGN_TITLE } from "@/lib/methodologyText";
import { MethodNav, kindOf } from "@/components/MethodNav";

export const metadata: Metadata = { title: "Full rating methodology · 10BONDS", alternates: { canonical: "/methodology/full" } };

const DOCS = {
  sovereign: { title: SOVEREIGN_TITLE, subtitle: SOVEREIGN_SUBTITLE, sections: parseMethodDoc(SOVEREIGN_MD) },
  corporate: { title: CORPORATE_TITLE, subtitle: CORPORATE_SUBTITLE, sections: parseMethodDoc(CORPORATE_MD) },
};

/** The complete text of either methodology, as written, one section at a time. */
export default async function FullMethodology({ searchParams }: { searchParams: Promise<{ lang?: string | string[]; type?: string | string[] }> }) {
  const sp = await searchParams;
  const lang = methodLang(sp.lang);
  const kind = kindOf(sp.type);
  const d = DOCS[kind];
  return (
    <article lang="en" className="mx-auto max-w-6xl">
      <MethodNav lang={lang} kind={kind} full />
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">{d.title}</h1>
      <p className="mt-0.5 text-[12px] text-mute">{d.subtitle}</p>
      <MethodDoc key={kind} sections={d.sections} />
    </article>
  );
}
