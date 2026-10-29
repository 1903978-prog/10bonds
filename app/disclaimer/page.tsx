import Link from "next/link";
import type { Metadata } from "next";
import { pickedLang } from "@/lib/pageLang";
import { ASSESSMENTS_ABOUT as A, DISCLAIMER, disclaimerLang } from "@/lib/disclaimer";
import { OG_IMAGES } from "@/lib/ogImage";

export const metadata: Metadata = {
  title: "Disclaimer · 10BONDS",
  description: "Important information about the data, risk scores and bond lists shown on 10BONDS: information only, not investment advice, returns not guaranteed.",
  alternates: { canonical: "/disclaimer" },
  openGraph: { images: OG_IMAGES, title: "Disclaimer · 10BONDS", description: "Important information about the data, risk scores and bond lists shown on 10BONDS: information only, not investment advice, returns not guaranteed.", url: "/disclaimer" },
};

export default async function Disclaimer({ searchParams }: { searchParams: Promise<{ lang?: string | string[] }> }) {
  const lang = disclaimerLang(await pickedLang((await searchParams).lang));
  const d = DISCLAIMER[lang];
  return (
    <article lang={lang} className="mx-auto max-w-6xl rounded-lg border border-line bg-white p-7 text-[15px] leading-relaxed sm:p-10">
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">{d.title}</h1>
      <p className="mt-5">{d.intro}</p>
      {d.sections.map((s) => (
        <section key={s.title}>
          <h2 className="mt-6 font-semibold" id={s.id}>{s.title}</h2>
          {s.paragraphs.map((p, i) => (
            <p key={i} className="mt-2">{p}</p>
          ))}
        </section>
      ))}
      <section lang="en" id="assessments" data-testid="assessments-about">
        <h2 className="mt-6 font-semibold">{A.title}</h2>
        {A.paragraphs.map((p, i) => <p key={i} className="mt-2">{p}</p>)}
        <h3 className="mt-4 font-semibold">{A.limitsTitle}</h3>
        <ul className="mt-2 list-disc space-y-1.5 pl-5">{A.limits.map((p, i) => <li key={i}>{p}</li>)}</ul>
        <h3 className="mt-4 font-semibold">{A.correctionTitle}</h3>
        <p className="mt-2">{A.correction}</p>
      </section>
      <p className="mt-8 text-sm">{d.full} <Link href="/terms" className="text-accent">{d.terms}</Link>.</p>
    </article>
  );
}
