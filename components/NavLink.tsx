"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** A header menu item: bold only while its own page is open. */
export default function NavLink({ href, match, children, testId }: { href: string; match?: (pathname: string) => boolean; children: React.ReactNode; testId?: string }) {
  const pathname = usePathname() ?? "/";
  const active = match ? match(pathname) : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link href={href} className={active ? "font-medium text-ink" : "hover:text-ink"} aria-current={active ? "page" : undefined} data-testid={testId}>
      {children}
    </Link>
  );
}
