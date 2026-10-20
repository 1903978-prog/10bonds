"use client";

import { usePathname } from "next/navigation";
import NavLink from "@/components/NavLink";
import { LOCALES } from "@/lib/seo/locales";
import { DROPS_PATH, DROPS_TEXT } from "@/lib/dropsText";

/** "Price drops" in the header, in the language of the page being read (the one picked with EN/IT/FR/DE). */
export default function DropsNavLink() {
  const pathname = usePathname() ?? "/";
  const l = LOCALES.find((x) => pathname === `/${x}` || pathname.startsWith(`/${x}/`)) ?? "en";
  return (
    <NavLink href={DROPS_PATH[l]} testId="nav-drops">
      <span className="sm:hidden">{DROPS_TEXT[l].menuShort}</span>
      <span className="hidden sm:inline">{DROPS_TEXT[l].menu}</span>
    </NavLink>
  );
}
