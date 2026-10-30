"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { COMPANY } from "@/lib/legal";
import { FOOTER_LINKS, FOOTER_NOTE, footerLang } from "@/lib/footerNote";

const HOW = { en: "How we calculate", it: "Come calcoliamo", fr: "Comment nous calculons", de: "So rechnen wir" } as const;

export default function FooterNote() {
  const pathname = usePathname();
  return <p className="mx-auto max-w-7xl px-4" data-testid="footer-note">{FOOTER_NOTE[footerLang(pathname)]}</p>;
}

/** Light grey legal menu: everything legal lives here, not in the top menu. Cookie settings live on the Cookies page. */
export function FooterLegal() {
  const lang = footerLang(usePathname());
  const l = FOOTER_LINKS[lang];
  const a = "hover:text-ink";
  return (
    <>
    <nav aria-label="Legal" className="mx-auto mt-1 flex max-w-4xl flex-wrap justify-center gap-x-2.5 gap-y-0 px-4 text-[10px] leading-[1.35] text-mute" data-testid="footer-legal">
      <Link href={lang === "en" ? "/disclaimer" : `/disclaimer?lang=${lang}`} className={a}>{l.disclaimer}</Link>
      <Link href={lang === "en" ? "/selection-methodology" : `/selection-methodology?lang=${lang}`} className={a}>{l.selection}</Link>
      <Link href="/about" className={a}>About</Link>
      <a href="mailto:privacy@10bonds.com" className={a}>Contact</a>
      <Link href="/terms" className={a}>{l.terms}</Link>
      <Link href="/privacy" className={a}>{l.privacy}</Link>
      <Link href="/cookies" className={a}>{l.cookies}</Link>
      <Link href="/pro" className={a}>{l.pro}</Link>
      <Link href="/widget" className={a}>{l.widget}</Link>
      <Link href="/how-we-calculate" className={a}>{HOW[lang]}</Link>
    </nav>
    <p className="mx-auto mt-0.5 max-w-4xl px-4 text-[9px] leading-[1.3]" data-testid="footer-company">© {new Date().getFullYear()} {COMPANY.legalName} · {COMPANY.registration} · {COMPANY.address} · <a href={`mailto:${COMPANY.privacyEmail}`} className="underline hover:text-ink">{COMPANY.privacyEmail}</a></p>
    </>
  );
}
