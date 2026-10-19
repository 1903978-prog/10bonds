"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LOCALES, pathOf, T } from "@/lib/seo/locales";

/** "Knowledge" in the header, in the language of the page being read (the one picked with EN/IT/FR/DE). */
export default function KnowledgeNavLink() {
  const pathname = usePathname();
  const l = LOCALES.find((x) => pathname === `/${x}` || pathname.startsWith(`/${x}/`)) ?? null;
  return (
    <Link href={l ? pathOf(l, "knowledge") : "/knowledge"} className="hover:text-ink" data-testid="nav-knowledge">
      {l ? T[l].knowledge : "Knowledge"}
    </Link>
  );
}
