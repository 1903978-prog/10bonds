"use client";

import { usePathname } from "next/navigation";
import { FOOTER_NOTE, footerLang } from "@/lib/footerNote";

export default function FooterNote() {
  const pathname = usePathname();
  return <p className="mx-auto max-w-2xl px-4" data-testid="footer-note">{FOOTER_NOTE[footerLang(pathname)]}</p>;
}
