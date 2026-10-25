"use client";

import Link from "next/link";
import NavLink from "@/components/NavLink";
import AdminMenu from "@/components/AdminMenu";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { goAuth, isReportPath } from "@/lib/reportReturn";
import { OPEN_EVENT } from "@/components/report/ReportAuth";
import { loadMe, trialDaysLeft, type Me } from "@/lib/me";

export default function AccountNav({ hasSession = false }: { hasSession?: boolean }) {
  const [me, setMe] = useState<Me | undefined>(undefined);
  const onReport = isReportPath(usePathname());
  useEffect(() => {
    loadMe().then(setMe);
  }, []);
  // Until the account loads, draw what the sign-in cookie says (profile icon, or Sign in / Sign up), so nothing shifts.
  if (me === undefined && hasSession) return <ProfileIcon />;
  // Bond report: a plain "Log in" (back to the same report afterwards) and one outcome-based action.
  if (!me && onReport)
    return (
      <>
        <button type="button" onClick={() => goAuth("login")} data-testid="nav-login" className="whitespace-nowrap hover:text-ink">Log in</button>
        <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))} data-testid="nav-save" className="hidden whitespace-nowrap rounded-full bg-accent px-3.5 py-1.5 font-medium text-white hover:bg-[#0077ed] sm:inline-block">Save &amp; track this bond</button>
      </>
    );
  if (!me)
    return (
      <>
        <span className="whitespace-nowrap"><NavLink href="/login">Sign in</NavLink></span>
        <Link href="/signup" className="whitespace-nowrap rounded-full bg-accent px-3 py-1.5 font-medium sm:px-3.5 text-white hover:bg-[#0077ed]"><span className="sm:hidden">Sign up</span><span className="hidden sm:inline">Sign up free</span></Link>
      </>
    );
  // The admin has full access for good: no trial badge.
  const days = me.isAdmin || me.adminState ? null : trialDaysLeft(me);
  return (
    <>
      {(me.isAdmin || me.asUser || me.adminState) && <AdminMenu isAdmin={me.isAdmin} asUser={!!me.asUser} adminLink={me.isAdmin || !!me.adminState} />}
      {days !== null && (
        <Link href="/pricing" className="whitespace-nowrap rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent" data-testid="trial-badge" title={`Premium trial: ${days} ${days === 1 ? "day" : "days"} left`}>
          <span className="sm:hidden">Premium {days}d</span>
          <span className="hidden sm:inline">Premium · {days} {days === 1 ? "day" : "days"} left</span>
        </Link>
      )}
      <ProfileIcon email={me.email} />
    </>
  );
}

function ProfileIcon({ email }: { email?: string }) {
  return (
    <Link href="/account" aria-label="Your profile" title={email} data-testid="nav-profile" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink/5 text-ink hover:bg-ink/10">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
      </svg>
    </Link>
  );
}
