"use client";

import { usePathname } from "next/navigation";
import NavLink from "@/components/NavLink";
import { LOCALES, T } from "@/lib/seo/locales";

/** "Plans" in the header, in the language of the page being read (the one picked with EN/IT/FR/DE). */
export default function PlansNavLink() {
  const pathname = usePathname() ?? "/";
  const l = LOCALES.find((x) => pathname === `/${x}` || pathname.startsWith(`/${x}/`)) ?? null;
  return (
    <NavLink href="/pricing" testId="nav-plans">
      {l ? T[l].plans : "Plans"}
    </NavLink>
  );
}
