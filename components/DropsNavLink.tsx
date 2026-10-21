"use client";

import { usePathname } from "next/navigation";
import NavLink from "@/components/NavLink";
import { LOCALES } from "@/lib/seo/locales";
import { DROPS_PATH, DROPS_TEXT } from "@/lib/dropsText";

/** "Price drops" in the header (admin only, yellow like every admin item), in the language of the page being read. */
export default function DropsNavLink() {
  const pathname = usePathname() ?? "/";
  const l = LOCALES.find((x) => pathname === `/${x}` || pathname.startsWith(`/${x}/`)) ?? "en";
  return (
    <NavLink href={DROPS_PATH[l]} testId="nav-drops" className="inline-grid rounded-full bg-yellow-200 px-2 py-0.5">
      <span className="sm:hidden">{DROPS_TEXT[l].menuShort}</span>
      <span className="hidden sm:inline">{DROPS_TEXT[l].menu}</span>
    </NavLink>
  );
}
