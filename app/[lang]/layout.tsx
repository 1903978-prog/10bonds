import { notFound } from "next/navigation";
import { isLocale, LOCALE } from "@/lib/seo/locales";

// The Italian, French and German sites. The language comes only from the URL, never from the visitor's IP.
export default async function LangLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return <div lang={LOCALE[lang].hreflang}>{children}</div>;
}
