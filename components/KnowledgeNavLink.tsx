"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LOCALES, pathOf, T } from "@/lib/seo/locales";

/** "Knowledge" in the header: the Knowledge Center of the language being read, the international page otherwise. */
export default function KnowledgeNavLink() {
  const pathname = usePathname();
  const l = LOCALES.find((x) => pathname === `/${x}` || pathname.startsWith(`/${x}/`));
  return (
    <Link href={l ? pathOf(l, "knowledge") : "/knowledge"} className="hover:text-ink" data-testid="nav-knowledge">
      {l ? T[l].knowledge : "Knowledge"}
    </Link>
  );
}
