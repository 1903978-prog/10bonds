"use client";

import { usePathname } from "next/navigation";
import NavLink from "@/components/NavLink";
import { LOCALES, pathOf } from "@/lib/seo/locales";

const LABEL = { en: "YTM calculator", it: "Calcolatore YTM", fr: "Calculateur YTM", de: "YTM-Rechner" } as const;

/** "YTM calculator" in the header: the bond yield calculator under Knowledge, in the language of the page being read. */
export default function CalculatorNavLink({ admin = false }: { admin?: boolean }) {
  const pathname = usePathname() ?? "/";
  const l = LOCALES.find((x) => pathname === `/${x}` || pathname.startsWith(`/${x}/`)) ?? null;
  const href = l ? pathOf(l, "tools") : "/knowledge/bond-yield-calculator";
  return (
    <NavLink href={href} testId="nav-calculator" className={`${admin ? "hidden xl:inline-grid" : "hidden sm:inline-grid"} whitespace-nowrap`}>
      {LABEL[l ?? "en"]}
    </NavLink>
  );
}
