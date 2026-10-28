"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import NavLink from "@/components/NavLink";

/** "Bond Card" in the header: text on wide screens, the search icon on phones (the menu space is tight). */
export default function BondCardNavLink({ admin = false }: { admin?: boolean }) {
  const pathname = usePathname() ?? "/";
  const here = pathname.startsWith("/bond-card") || pathname.startsWith("/isin-search");
  return (
    <>
      <NavLink href="/bond-card" match={() => here} testId="nav-bond-card" className={`${admin ? "hidden xl:inline-grid" : "hidden sm:inline-grid"} whitespace-nowrap`}>Bond Card</NavLink>
      <Link href="/bond-card" aria-label="Bond Card" title="Bond Card" data-testid="nav-isin" className={`${admin ? "flex xl:hidden" : "flex sm:hidden"} h-5 w-5 items-center justify-center ${here ? "text-ink" : "hover:text-ink"}`}>
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" /><path d="M13 13l4 4" /></svg>
      </Link>
    </>
  );
}
