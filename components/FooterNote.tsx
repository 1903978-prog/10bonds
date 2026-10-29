"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { FOOTER_LINKS, FOOTER_NOTE, footerLang } from "@/lib/footerNote";

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
    <nav aria-label="Legal" className="mx-auto mt-2 flex max-w-4xl flex-wrap justify-center gap-x-3 gap-y-1 px-4 text-[11px] text-mute" data-testid="footer-legal">
      <Link href={lang === "en" ? "/disclaimer" : `/disclaimer?lang=${lang}`} className={a}>{l.disclaimer}</Link>
      <Link href={lang === "en" ? "/selection-methodology" : `/selection-methodology?lang=${lang}`} className={a}>{l.selection}</Link>
      <Link href="/about" className={a}>About</Link>
      <a href="mailto:privacy@10bonds.com" className={a}>Contact</a>
      <Link href="/terms" className={a}>{l.terms}</Link>
      <Link href="/privacy" className={a}>{l.privacy}</Link>
      <Link href="/cookies" className={a}>{l.cookies}</Link>
      <Link href="/pro" className={a}>{l.pro}</Link>
      <Link href="/widget" className={a}>{l.widget}</Link>
      <span>· © {new Date().getFullYear()} 10BONDS</span>
    </nav>
  );
}
