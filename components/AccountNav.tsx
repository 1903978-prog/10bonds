"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function AccountNav() {
  const [me, setMe] = useState<{ email: string; plan: string } | null | undefined>(undefined);
  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then(setMe).catch(() => setMe(null));
  }, []);
  if (me === undefined) return null;
  if (!me)
    return (
      <>
        <Link href="/login" className="hover:text-ink">Sign in</Link>
        <Link href="/signup" className="rounded-full bg-accent px-3.5 py-1.5 font-medium text-white hover:bg-[#0077ed]">Sign up free</Link>
      </>
    );
  return (
    <button
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.href = "/";
      }}
      className="hover:text-ink"
      title={me.email}
    >
      Sign out
    </button>
  );
}
