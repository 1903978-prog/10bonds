"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { FrontierScreen, OneBondScreen, ListScreen, MultiYearScreen, HeatMapScreen } from "@/components/LandingScreens";
import type { LandingText } from "@/lib/landingText";

const ACMA = "DE000ACMA031";

const NAVY = "#112D3B";
const EVERY = 3000; // ms per slide (the owner, 24/10/2026)

/** A slide's action title: the long one on desktop, the short one on phones. */
export const actionTitle = ([long, short]: readonly [string, string] | string[]) => (
  <><span className="sm:hidden">{short}</span><span className="hidden sm:inline">{long}</span></>
);

/** One card of the landing carousel: same white card as the comparison, filling the carousel's fixed height. */
export function SlideCard({ title, children, href }: { title: ReactNode; children: ReactNode; href?: string }) {
  const box = "flex h-full flex-col rounded-[18px] border border-[#e3ebe7] bg-white p-4 shadow-[0_8px_30px_rgba(17,45,59,0.07)] lg:p-5";
  // With `href` the whole card opens that page (the Risk assessment pages, PR #188).
  if (href) return <Link href={href} className={`${box} transition hover:border-[#cfe6da]`} data-testid="slide-link">{inner(title, children)}</Link>;
  return <div className={box}>{inner(title, children)}</div>;
}

function inner(title: ReactNode, children: ReactNode) {
  return (
    <>
      {/* The action title, headline size (the owner, 25/10/2026), one line. */}
      <h2 className="truncate text-[19px] font-bold leading-tight tracking-[-0.02em] min-[400px]:text-[21px] sm:text-[24px] lg:text-[26px]" style={{ color: NAVY }}>{title}</h2>
      <div className="mt-3 flex min-h-0 flex-1 flex-col">{children}</div>
    </>
  );
}

/**
 * The landing's right-hand cards as a carousel (the owner, 24/10/2026): every slide is stacked in the same grid cell,
 * so the box always has the height of the tallest one and nothing moves when the slide changes. Turns on its own
 * until the visitor taps a dot or swipes; stops on hover; never turns when the visitor asks for reduced motion.
 */
export default function LandingCarousel({ t, slides }: { t: LandingText; slides: { key: string; node: ReactNode }[] }) {
  const [at, setAt] = useState(0);
  const [held, setHeld] = useState(false);
  const touch = useRef<number | null>(null);
  const n = slides.length;

  useEffect(() => {
    if (held || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setTimeout(() => setAt((i) => (i + 1) % n), EVERY);
    return () => clearTimeout(id);
  }, [at, held, n]);

  // A tap on an arrow or dot moves at once and restarts the 3 s count.
  const go = (i: number) => setAt(((i % n) + n) % n);

  return (
    <div
      className="relative flex min-w-0 flex-col h-[max(318px,calc(100svh_-_416px))] lg:h-[min(620px,calc(100vh_/_var(--z)_-_250px))]"
      role="region"
      aria-roledescription="carousel"
      aria-label={t.carousel.label}
      data-testid="landing-carousel"
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touch.current === null) return;
        const dx = e.changedTouches[0].clientX - touch.current;
        touch.current = null;
        if (Math.abs(dx) > 40) go(at + (dx < 0 ? 1 : -1));
      }}
    >
      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)]">
      {slides.map((s, i) => (
        <div key={s.key} data-testid={`slide-${s.key}`} aria-hidden={i !== at} inert={i !== at}
          className={`h-full min-h-0 min-w-0 [grid-area:1/1] transition-opacity duration-500 ${i === at ? "opacity-100" : "pointer-events-none opacity-0"}`}>
          {s.node}
        </div>
      ))}
      </div>
      {/* Arrows on the card's sides, over its padding, so they take no room of their own. */}
      {([-1, 1] as const).map((d) => (
        <button key={d} type="button" onClick={() => go(at + d)} aria-label={d < 0 ? t.carousel.prev : t.carousel.next} data-testid={d < 0 ? "carousel-prev" : "carousel-next"}
          className={`absolute top-[calc(50%-12px)] grid h-7 w-7 lg:h-8 lg:w-8 -translate-y-1/2 place-items-center rounded-full border border-[#e3ebe7] bg-white text-[18px] leading-none shadow-[0_4px_14px_rgba(17,45,59,0.14)] transition hover:bg-[#F7F9F8] ${d < 0 ? "-left-3.5 lg:-left-4" : "-right-3.5 lg:-right-4"}`}
          style={{ color: NAVY }}>
          <span aria-hidden className="-mt-0.5">{d < 0 ? "‹" : "›"}</span>
        </button>
      ))}
      <div className="flex h-6 shrink-0 items-center justify-center pt-1">
        {slides.map((s, i) => (
          <button key={s.key} type="button" onClick={() => go(i)} aria-label={`${t.carousel.slide} ${i + 1} / ${n}`} aria-current={i === at}
            data-testid={`dot-${s.key}`} className="grid h-5 w-4 place-items-center">
            <span className={`block h-1.5 rounded-full transition-all ${i === at ? "w-3.5" : "w-1.5 bg-[#c9d6d0]"}`} style={i === at ? { background: NAVY } : undefined} />
          </button>
        ))}
      </div>
    </div>
  );
}

// The slides' pictures are fixed drawings of the finder's screens (no live data), so they load at once and never shift.

/** Countries: a picture of the Brazil page in Risk assessment (the owner, 24/10/2026), a fixed image so it never shifts. */
export function CountrySlide({ t }: { t: LandingText }) {
  const c = t.carousel;
  return (
    <SlideCard title={actionTitle(c.act.country)} href="/risk-assessment/countries/brazil">
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-[12px] border border-[#e3ebe7] bg-[#F5F5F7]">
        {/* Desktop shows the whole page top; phones the narrow layout. Aligned to the top left, cropped at the bottom. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/carousel-brazil-phone.png" alt={c.countryAlt} className="absolute inset-0 h-full w-full object-cover object-top sm:hidden" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/carousel-brazil.png" alt={c.countryAlt} className="absolute inset-0 hidden h-full w-full object-cover object-left-top sm:block" />
      </div>
    </SlideCard>
  );
}

/** One company: the ACMA 2031 key data (rating, score, return, credit factors), a fixed image so it never shifts. */
export function CompanySlide({ t }: { t: LandingText }) {
  const c = t.carousel;
  return (
    <SlideCard title={actionTitle(c.act.company)} href={`/risk-assessment/${ACMA}`}>
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-[12px] border border-[#e3ebe7] bg-[#F5F5F7]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/carousel-company-phone.png" alt={c.companyAlt} className="absolute inset-0 h-full w-full object-cover object-top sm:hidden" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/carousel-company.png" alt={c.companyAlt} className="absolute inset-0 hidden h-full w-full object-cover object-left-top sm:block" />
      </div>
    </SlideCard>
  );
}

/** A slide made of a "real screen" (components/LandingScreens.tsx) under its action title, in the same white card. */
export function ScreenSlide({ title, children }: { title: ReactNode; children: ReactNode }) {
  return <SlideCard title={title}>{children}</SlideCard>;
}

export { FrontierScreen, OneBondScreen, ListScreen, MultiYearScreen, HeatMapScreen };
