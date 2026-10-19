"use client";

import Link from "next/link";
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
        <Link href="/login" className="hover:text-ink">Sign in</Link>
        <Link href="/signup" className="rounded-full bg-accent px-3.5 py-1.5 font-medium text-white hover:bg-[#0077ed]">Sign up free</Link>
      </>
    );
  const days = trialDaysLeft(me);
  return (
    <>
      {me.isAdmin && <Link href="/admin" className="hover:text-ink" data-testid="nav-admin">Admin</Link>}
      {days !== null && (
        <Link href="/pricing" className="whitespace-nowrap rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent" data-testid="trial-badge" title={`Premium trial: ${days} ${days === 1 ? "day" : "days"} left`}>
          <span className="sm:hidden">Premium {days}d</span>
          <span className="hidden sm:inline">Premium · {days} {days === 1 ? "day" : "days"} left</span>
        </Link>
      )}
      <button
        onClick={async () => {
          await fetch("/api/auth/logout", { method: "POST" });
          window.location.href = "/";
        }}
        className="whitespace-nowrap hover:text-ink"
        title={me.email}
      >
        Sign out
      </button>
    </>
  );
}
