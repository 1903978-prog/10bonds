"use client";
import { useRef, useState } from "react";

export type TabDef = { id: string; label: string; panel: React.ReactNode };

/** Five tabs. All panels stay in the page (hidden), so printing shows every section. Arrow keys move between tabs. */
export default function ReportTabs({ tabs }: { tabs: TabDef[] }) {
  const [active, setActive] = useState(tabs[0].id);
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  function onKey(e: React.KeyboardEvent, i: number) {
    const to = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : null;
    if (to === null) return;
    e.preventDefault();
    const t = tabs[(to + tabs.length) % tabs.length];
    setActive(t.id);
    refs.current[t.id]?.focus();
  }
  return (
    <div className="mt-4">
      <div role="tablist" aria-label="Report sections" className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 print:hidden [scrollbar-width:none]">
        {tabs.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => { refs.current[t.id] = el; }}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={active === t.id}
            aria-controls={`panel-${t.id}`}
            tabIndex={active === t.id ? 0 : -1}
            onClick={() => setActive(t.id)}
            onKeyDown={(e) => onKey(e, i)}
            data-testid={`tab-${t.id}`}
            className={`min-h-[40px] shrink-0 whitespace-nowrap rounded-full px-4 text-[13px] font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${active === t.id ? "bg-ink text-white" : "text-mute hover:bg-white"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <section
          key={t.id}
          role="tabpanel"
          id={`panel-${t.id}`}
          aria-labelledby={`tab-${t.id}`}
          hidden={active !== t.id}
          className="report-panel mt-3"
        >
          <h2 className="hidden text-lg font-semibold print:mb-2 print:mt-4 print:block">{t.label}</h2>
          {t.panel}
        </section>
      ))}
    </div>
  );
}
