"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** A header menu item: bold only while its own page is open. */
export default function NavLink({ href, match, children, testId, className = "inline-grid" }: { href: string; match?: (pathname: string) => boolean; children: React.ReactNode; testId?: string; className?: string }) {
  const pathname = usePathname() ?? "/";
  const active = match ? match(pathname) : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link href={href} className={`${className} ${active ? "font-medium text-ink" : "hover:text-ink"}`} aria-current={active ? "page" : undefined} data-testid={testId}>
      {/* A hidden bold copy keeps the width the same whether the item is bold or not, so the menu never shifts. */}
      <span className="col-start-1 row-start-1">{children}</span>
      <span aria-hidden className="invisible col-start-1 row-start-1 font-medium">{children}</span>
    </Link>
  );
}
