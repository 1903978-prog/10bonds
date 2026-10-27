"use client";

import { usePathname } from "next/navigation";
import NavLink from "@/components/NavLink";
import { LOCALES, T } from "@/lib/seo/locales";

/** "Home" in the header: opens the landing page (10bonds.com), in the language of the page being read. */
export default function HomeNavLink() {
  const pathname = usePathname() ?? "/";
  const l = LOCALES.find((x) => pathname === `/${x}` || pathname.startsWith(`/${x}/`)) ?? null;
  return (
    <NavLink href={`${l ? `/${l}` : "/"}?intro=1`} match={() => false} testId="nav-home">
      {l ? T[l].home : "Home"}
    </NavLink>
  );
}
