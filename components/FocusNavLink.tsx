"use client";

import { usePathname } from "next/navigation";
import NavLink from "@/components/NavLink";
import { LOCALES, T } from "@/lib/seo/locales";

/** "Risk assessment" (companies in focus) in the header; a one-word label on phones so the menu still fits. */
export default function FocusNavLink() {
  const pathname = usePathname() ?? "/";
  const l = LOCALES.find((x) => pathname === `/${x}` || pathname.startsWith(`/${x}/`)) ?? null;
  return (
    <NavLink href="/risk-assessment" testId="nav-focus">
      <span className="sm:hidden">{l ? T[l].focusShort : "Risk"}</span>
      <span className="hidden sm:inline">{l ? T[l].focus : "Risk assessment"}</span>
    </NavLink>
  );
}
