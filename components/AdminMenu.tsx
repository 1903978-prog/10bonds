"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import AdminToggle from "@/components/AdminToggle";
import BrandToggle from "@/components/BrandToggle";
import ViewSwitch from "@/components/ViewSwitch";

/** One compact yellow menu for the owner's controls (Admin yes/no, Retail/Pro, Brand, Admin page), so the header stays clean for customers.
 *  The controls stay mounted while it is closed: Brand has to apply its saved setting on every page load. */
export default function AdminMenu({ isAdmin, asUser, adminLink }: { isAdmin: boolean; asUser: boolean; adminLink: boolean }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [open]);
  return (
    <div ref={box} className="relative" data-testid="admin-menu">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="true" data-testid="admin-menu-button"
        className="inline-flex min-h-[28px] items-center gap-1 whitespace-nowrap rounded-full bg-yellow-200 px-2.5 py-0.5 text-xs font-medium text-ink">
        Admin <span aria-hidden="true">▾</span>
      </button>
      <div hidden={!open} className="absolute right-0 top-full z-30 mt-2 flex w-[200px] flex-col items-stretch gap-3 rounded-2xl border border-line bg-white p-3 text-xs shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
        {(isAdmin || asUser) && <div className="flex items-center justify-between gap-2"><span className="text-mute">Admin view</span><AdminToggle on={isAdmin} /></div>}
        {isAdmin && <div className="flex items-center justify-between gap-2"><span className="text-mute">Site</span><ViewSwitch /></div>}
        {isAdmin && <div className="flex items-center justify-between gap-2"><span className="text-mute">Brand stamp</span><BrandToggle className="inline-flex" /></div>}
        {adminLink && <Link href="/admin" data-testid="nav-admin" onClick={() => setOpen(false)} className="rounded-full bg-yellow-200 px-3 py-1.5 text-center font-medium text-ink">Open admin</Link>}
      </div>
    </div>
  );
}
