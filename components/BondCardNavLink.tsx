"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ICON = (
  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" /><path d="M13 13l4 4" /></svg>
);

/**
 * Admin only until the Bond Card is stable (the owner, 28/10/2026): the admin gets a yellow "Bond Card" pill on wide screens
 * and an icon to it on narrow ones; everyone else keeps the original ISIN search icon.
 */
export default function BondCardNavLink({ admin = false }: { admin?: boolean }) {
  const pathname = usePathname() ?? "/";
  if (!admin) {
    return (
      <Link href="/isin-search" aria-label="Search by ISIN" title="ISIN" data-testid="nav-isin" className="flex h-5 w-5 items-center justify-center hover:text-ink">{ICON}</Link>
    );
  }
  const here = pathname.startsWith("/bond-card");
  return (
    <>
      <Link href="/bond-card" data-testid="nav-bond-card" className={`hidden whitespace-nowrap rounded-full bg-yellow-200 px-2 py-0.5 xl:inline-block ${here ? "font-medium text-ink" : ""}`}>Bond Card</Link>
      <Link href="/bond-card" aria-label="Bond Card" title="Bond Card" data-testid="nav-isin" className="flex h-5 w-5 items-center justify-center rounded-full bg-yellow-200 text-ink xl:hidden">{ICON}</Link>
    </>
  );
}
