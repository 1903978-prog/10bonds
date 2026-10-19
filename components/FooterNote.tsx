"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { UsageStatsSetting } from "@/components/UsageStats";
import { FOOTER_LINKS, FOOTER_NOTE, footerLang } from "@/lib/footerNote";

export default function FooterNote() {
  const pathname = usePathname();
  return <p className="mx-auto max-w-2xl px-4" data-testid="footer-note">{FOOTER_NOTE[footerLang(pathname)]}</p>;
}

/** Light grey legal menu: everything legal lives here, not in the top menu. */
export function FooterLegal() {
  const l = FOOTER_LINKS[footerLang(usePathname())];
  const a = "hover:text-ink";
  return (
    <nav aria-label="Legal" className="mx-auto mt-4 flex max-w-3xl flex-wrap justify-center gap-x-4 gap-y-1.5 px-4 text-[12px] text-[#a1a1a6]" data-testid="footer-legal">
      <Link href="/disclaimer" className={a}>{l.disclaimer}</Link>
      <Link href="/terms" className={a}>{l.terms}</Link>
      <Link href="/privacy" className={a}>{l.privacy}</Link>
      <Link href="/cookies" className={a}>{l.cookies}</Link>
      <UsageStatsSetting label={l.settings} className={a} />
      <Link href="/pro" className={a}>{l.pro}</Link>
    </nav>
  );
}
