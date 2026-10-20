"use client";

import { usePathname } from "next/navigation";
import NavLink from "@/components/NavLink";
import { LOCALES } from "@/lib/seo/locales";

/** "10BONDS" in the header: back to the bond search, in the language of the page being read. */
export default function SearchNavLink() {
  const pathname = usePathname() ?? "/";
  const l = LOCALES.find((x) => pathname === `/${x}` || pathname.startsWith(`/${x}/`)) ?? null;
  const href = l ? `/${l}` : "/";
  return (
    // On phones the logo already leads home, so the word is left out to keep the menu on one line.
    <NavLink href={href} match={(p) => p === href} testId="nav-search" className="hidden sm:inline-grid">
      10BONDS
    </NavLink>
  );
}
