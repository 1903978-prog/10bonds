"use client";

import Link from "next/link";
import NavLink from "@/components/NavLink";
import { useEffect, useState } from "react";
import { loadMe, trialDaysLeft, type Me } from "@/lib/me";

export default function AccountNav() {
  const [me, setMe] = useState<Me | undefined>(undefined);
  useEffect(() => {
    loadMe().then(setMe);
  }, []);
  if (me === undefined) return null;
  if (!me)
    return (
      <>
        <NavLink href="/login">Sign in</NavLink>
        <Link href="/signup" className="rounded-full bg-accent px-3.5 py-1.5 font-medium text-white hover:bg-[#0077ed]"><span className="sm:hidden">Sign up</span><span className="hidden sm:inline">Sign up free</span></Link>
      </>
    );
  // The admin has full access for good: no trial badge.
  const days = me.isAdmin || me.adminState ? null : trialDaysLeft(me);
  return (
    <>
      {(me.isAdmin || me.adminState) && <NavLink href="/admin" testId="nav-admin">Admin</NavLink>}
      {days !== null && (
        <Link href="/pricing" className="whitespace-nowrap rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent" data-testid="trial-badge" title={`Premium trial: ${days} ${days === 1 ? "day" : "days"} left`}>
          <span className="sm:hidden">Premium {days}d</span>
          <span className="hidden sm:inline">Premium · {days} {days === 1 ? "day" : "days"} left</span>
        </Link>
      )}
      <Link href="/account" aria-label="Your profile" title={me.email} data-testid="nav-profile" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink/5 text-ink hover:bg-ink/10">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
        </svg>
      </Link>
    </>
  );
}
