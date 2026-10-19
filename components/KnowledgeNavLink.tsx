"use client";

import { usePathname } from "next/navigation";
import NavLink from "@/components/NavLink";
import { LOCALES, pathOf, T } from "@/lib/seo/locales";

/** "Knowledge" in the header, in the language of the page being read (the one picked with EN/IT/FR/DE). */
export default function KnowledgeNavLink() {
  const pathname = usePathname() ?? "/";
  const l = LOCALES.find((x) => pathname === `/${x}` || pathname.startsWith(`/${x}/`)) ?? null;
  // Every page inside a language site (guides, bonds, tools, brokers...) belongs to Knowledge.
  const isKnowledge = (p: string) => p === "/knowledge" || p.startsWith("/knowledge/") || (l !== null && p.startsWith(`/${l}/`));
  return (
    <NavLink href={l ? pathOf(l, "knowledge") : "/knowledge"} match={isKnowledge} testId="nav-knowledge">
      {l ? T[l].knowledge : "Knowledge"}
    </NavLink>
  );
}
