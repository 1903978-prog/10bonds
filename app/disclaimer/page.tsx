import Link from "next/link";
import type { Metadata } from "next";
import { pickedLang } from "@/lib/pageLang";
import { DISCLAIMER, disclaimerLang } from "@/lib/disclaimer";

export const metadata: Metadata = {
  title: "Disclaimer · 10BONDS",
  description: "Important information about the data, risk scores and bond lists shown on 10BONDS: information only, not investment advice, returns not guaranteed.",
  alternates: { canonical: "/disclaimer" },
  openGraph: { title: "Disclaimer · 10BONDS", description: "Important information about the data, risk scores and bond lists shown on 10BONDS: information only, not investment advice, returns not guaranteed.", url: "/disclaimer" },
};

export default async function Disclaimer({ searchParams }: { searchParams: Promise<{ lang?: string | string[] }> }) {
  const lang = disclaimerLang(await pickedLang((await searchParams).lang));
  const d = DISCLAIMER[lang];
  return (
    <article lang={lang} className="mx-auto max-w-6xl rounded-[28px] bg-white p-7 text-[15px] leading-relaxed shadow-[0_2px_20px_rgba(0,0,0,0.04)] sm:p-10">
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
      <p className="mt-8 text-sm">{d.full} <Link href="/terms" className="text-accent">{d.terms}</Link>.</p>
    </article>
  );
}
