"use client";
import { useEffect, useState } from "react";

export type NavItem = { id: string; n: string; label: string };

/** Sticky section menu. Plain #anchor links (smooth scroll comes from CSS, off for reduced motion), so back/forward work. */
export default function ReportNav({ items }: { items: NavItem[] }) {
  const [active, setActive] = useState(items[0]?.id);
  useEffect(() => {
    const els = items.map((i) => document.getElementById(i.id)).filter((e): e is HTMLElement => !!e);
    if (!els.length || typeof IntersectionObserver === "undefined") return;
    const seen = new Map<string, number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) seen.set(e.target.id, e.isIntersecting ? e.boundingClientRect.top : Infinity);
        const cur = [...seen.entries()].filter(([, t]) => t !== Infinity).sort((a, b) => a[1] - b[1])[0];
        if (cur) setActive(cur[0]);
      },
      { rootMargin: "-120px 0px -55% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [items]);
  return (
    <nav aria-label="Report sections" className="report-nav sticky z-10 rounded-t-[28px] border-b border-line/80 bg-white/90 backdrop-blur-xl print:hidden" data-testid="report-nav">
      <ul className="flex gap-1 overflow-x-auto px-3 py-2 sm:px-8 [scrollbar-width:none]">
        {items.map((i) => (
          <li key={i.id} className="shrink-0">
            <a
              href={`#${i.id}`}
              aria-current={active === i.id ? "true" : undefined}
              data-testid={`nav-${i.id}`}
              className={`flex min-h-[44px] items-center whitespace-nowrap rounded-full px-4 text-[14px] font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${active === i.id ? "bg-ink text-white" : "text-mute hover:bg-canvas hover:text-ink"}`}
            >
              <span className="mr-1.5 tabular-nums opacity-60">{i.n}</span>{i.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
