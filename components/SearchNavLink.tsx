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
    <NavLink href={href} match={(p) => p === href} testId="nav-search">
      10BONDS
    </NavLink>
  );
}
