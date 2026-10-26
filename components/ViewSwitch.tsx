"use client";

import { usePathname, useRouter } from "next/navigation";

/** Admin only (yellow, like everything only the admin sees): switch between the retail finder and the Pro tool. The choice is remembered on the home page. */
export default function ViewSwitch() {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const pro = pathname === "/pro" || pathname.startsWith("/pro/");
  const go = (view: "retail" | "pro") => {
    document.cookie = `tb_view=${view}; path=/; max-age=31536000; samesite=lax`;
    router.push(view === "pro" ? "/pro" : "/");
    router.refresh();
  };
  const item = (view: "retail" | "pro", label: string, on: boolean) => (
    <button type="button" onClick={() => go(view)} aria-pressed={on} data-testid={`view-${view}`}
      className={`rounded-full px-2 py-0.5 ${on ? "bg-white font-medium text-ink shadow-sm" : "hover:text-ink"}`}>
      {label}
    </button>
  );
  return (
    <span className="flex items-center rounded-full bg-yellow-200 p-0.5 text-xs" data-testid="view-switch">
      {item("retail", "Retail", !pro)}
      {item("pro", "Pro", pro)}
    </span>
  );
}
