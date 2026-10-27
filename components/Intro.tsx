"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { FinderLang } from "@/lib/finderText";
import { INTRO_HORIZONS, type IntroData } from "@/lib/intro";
import { INTRO_TEXT, NUM_LOCALE } from "@/lib/introText";

const RED = "#ff3b30";
const BLUE = "#0a84ff";
const GREY = "#aeaeb2";

// The show (the owner, 21/10/2026): a 15-second script started when the bonds arrive. Bullet 1 from 0 to 5 s, bullet 2
// from 5 to 10 s, bullet 3 from 10 to 15 s, then the example results; the chart always shows the bullet on screen.
// Beat k shows text lines up to LINE_AT[k] and chart view k: 1 the bonds appearing one after the other (all within
// 2.5 s) · 2 the 4-6 year bonds in blue · 3 their best bond per risk as red dots · 4/5 the line through those dots
// (the efficient frontier) · 6/7/8 the 1-3, 4-6 and 7-10 year frontiers one after the other · 9 example results.
const AT = [0, 0, 2500, 3800, 5000, 5300, 10000, 11700, 13300, 16000];
const LINE_AT = [0, 3, 3, 3, 5, 5, 7, 7, 7, 8];
const START = 1;
const LAST = AT.length - 1;
// The dots come in one after the other over this long, safest first.
const DOTS_IN = 2.5;
// The red dots and lines stop at risk 9 on the illustration (the owner, 21/10/2026): the riskiest end is mostly outliers.
const FRONT_MAX = 9;
// Where a click on a step jumps to (animated, reduced motion).
const JUMP = { s1: [2, 3], s2: [4, 5], s3: [6, 8], result: [9, 9] } as const;

/** Blue dots at beat k: horizon h (1..3, 0 = none). */
function isBlue(k: number, h: number) {
  // Every risk level at once (the owner, 21/10/2026): the horizon picks the blue dots, not the risk.
  if (k >= 2 && k <= 5) return h === 2;
  if (k >= 6 && k <= 8) return h === k - 5;
  return false;
}
/** The horizon named in the chart's corner at beat k (index into INTRO_HORIZONS), or -1. */
const horizonAt = (k: number) => (k >= 2 && k <= 5 ? 1 : k >= 6 && k <= 8 ? k - 6 : -1);

/** First-visit intro: every bond as a dot, three steps told one line at a time, then real example results. */
export default function Intro({ lang, heading = true, onClose }: { lang: FinderLang; heading?: boolean; onClose: (done: boolean) => void }) {
  const t = INTRO_TEXT[lang];
  const Title = heading ? "h1" : "h2";
  const [data, setData] = useState<IntroData | null>(null);
  const [reduced, setReduced] = useState(false);
  const [k, setK] = useState(START);
  const [seen, setSeen] = useState(START);
  const [playing, setPlaying] = useState(true);
  // The clock starts when the bonds are there (or after 3 s without them), so text and chart stay in step.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetch("/api/bonds/intro?currency=EUR")
      .then((r) => (r.ok ? r.json() : null))
      .then((b: IntroData | null) => b && setData(b))
      .catch(() => {})
      .finally(() => setReady(true));
    const late = setTimeout(() => setReady(true), 3000);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Everything at once and nothing moves: the steps can still be clicked to show each picture.
      setReduced(true);
      setPlaying(false);
      setK(5);
      setSeen(LAST);
    }
    return () => clearTimeout(late);
  }, []);

  // One beat after the other.
  useEffect(() => {
    if (!playing || !ready || k >= LAST) return;
    const id = setTimeout(() => setK(k + 1), AT[k + 1] - AT[k]);
    return () => clearTimeout(id);
  }, [k, playing, ready]);
  useEffect(() => setSeen((s) => Math.max(s, k)), [k]);

  // Escape skips to the finder.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const jump = (to: keyof typeof JUMP) => {
    setK(JUMP[to][reduced ? 1 : 0]);
    setPlaying(!reduced);
  };
  const shown = (line: number) => line <= LINE_AT[seen];
  const step = k >= 9 ? "result" : k >= 6 ? "s3" : k >= 4 ? "s2" : k >= 2 ? "s1" : null;
  // No scrolling on desktop (the owner): the size above is a first guess; whatever still overflows (a notice above it,
  // a taller footer, browser zoom) comes off the intro's height before it is painted, and again on every resize.
  const box = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => {
      el.style.height = "";
      if (window.innerWidth < 1024) return;
      const root = document.documentElement;
      const footer = document.querySelector("footer");
      const box = el.getBoundingClientRect();
      // Only the space down to the bottom of the footer counts: language home pages carry more content below, on purpose.
      const below = footer ? footer.getBoundingClientRect().bottom - box.bottom : 0;
      if (below > window.innerHeight / 2) return;
      const over = box.bottom + below - root.clientHeight;
      if (over <= 0) return;
      const z = parseFloat(getComputedStyle(root).getPropertyValue("--z")) || 1;
      // Never smaller than the text column needs.
      const col = el.lastElementChild;
      const text = col?.firstElementChild && col.lastElementChild ? (col.lastElementChild.getBoundingClientRect().bottom - col.firstElementChild.getBoundingClientRect().top) / z + 16 : 0;
      el.style.height = `${Math.max(400, text, parseFloat(getComputedStyle(el).height) - over / z - 2)}px`;
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  const n = data?.dots.length ? data.dots.length.toLocaleString(NUM_LOCALE[lang]) : "–";

  return (
    <section ref={box} className="grid gap-4 lg:h-[calc(100vh_/_var(--z)_-_212px)] lg:max-h-[820px] lg:min-h-[400px] lg:grid-cols-[1.4fr_1fr] lg:gap-8" data-testid="intro">
      {/* Phones: the finder button sits below the story, so a way out is also on top. */}
      <button type="button" onClick={() => onClose(true)} className="-mb-2 justify-self-end text-[13px] text-accent lg:hidden">{t.skip} →</button>
      {/* Left: the chart and, at the end, the examples, laid over each other in one fixed box. */}
      <div className="relative h-[360px] overflow-hidden rounded-lg border border-line bg-white p-4 sm:h-[400px] sm:p-5 lg:h-auto">
        <div className={`absolute inset-4 transition-opacity duration-1000 motion-reduce:transition-none sm:inset-5 ${k === LAST ? "pointer-events-none opacity-0" : "opacity-100"}`}>
          <IntroChart data={data} k={k} t={t} reduced={reduced} />
        </div>
        <div className={`absolute inset-4 flex flex-col justify-center transition-opacity duration-1000 motion-reduce:transition-none sm:inset-5 ${k === LAST ? "opacity-100" : "pointer-events-none opacity-0"}`} inert={k !== LAST}>
          <Examples data={data} t={t} />
        </div>
      </div>

      {/* Right: every line has its place from the start and only fades in, so nothing moves. */}
      <div className="flex flex-col justify-center">
        <Line on={shown(0)}>
          <Title className="text-[26px] font-semibold leading-tight tracking-tight sm:text-[32px]">{t.headline}</Title>
        </Line>
        <Line on={shown(1)} className="mt-3">
          <p className="text-[15px] text-mute">{t.dots(n)}</p>
        </Line>
        <ol className="mt-5 space-y-4">
          <Step no={1} title={t.s1} sub={t.s1Sub} titleOn={shown(2)} subOn={shown(3)} active={step === "s1"} onClick={() => jump("s1")} />
          <Step no={2} title={t.s2} sub={t.s2Sub} titleOn={shown(4)} subOn={shown(5)} active={step === "s2"} onClick={() => jump("s2")} />
          <Step no={3} title={t.s3} sub={t.s3Sub} titleOn={shown(6)} subOn={shown(7)} active={step === "s3"} onClick={() => jump("s3")} />
        </ol>
        <Line on={shown(8)} className="mt-5">
          <button type="button" onClick={() => jump("result")} className={`text-left text-[15px] font-medium ${step === "result" ? "text-ink" : "text-mute hover:text-ink"}`}>{t.result}</button>
        </Line>
        {/* The way out is there from the first second. */}
        <div className="mt-6 flex items-center gap-4">
          <button type="button" onClick={() => onClose(true)} className="rounded-full bg-accent px-6 py-3 text-[15px] font-medium text-white shadow-sm transition hover:bg-[#0058b0]" data-testid="intro-skip">
            {t.cta} →
          </button>
          <button
            type="button"
            onClick={() => { setK(START); setPlaying(!reduced); }}
            className={`text-[13px] text-accent hover:underline ${seen >= LAST && !reduced ? "visible" : "invisible"}`}
            data-testid="intro-replay"
          >
            ↻ {t.replay}
          </button>
        </div>
      </div>
    </section>
  );
}

function Line({ on, className = "", children }: { on: boolean; className?: string; children: ReactNode }) {
  return (
    <div className={`transition duration-1000 ease-out motion-reduce:transition-none ${on ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"} ${className}`} inert={!on}>
      {children}
    </div>
  );
}

function Step({ no, title, sub, titleOn, subOn, active, onClick }: { no: number; title: string; sub: string; titleOn: boolean; subOn: boolean; active: boolean; onClick: () => void }) {
  return (
    <li className="flex gap-3">
      <span
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold transition-all duration-1000 motion-reduce:transition-none ${titleOn ? "opacity-100" : "opacity-0"} ${active ? "bg-accent text-white" : "bg-line text-mute"}`}
        aria-hidden
      >
        {no}
      </span>
      <div className="min-w-0">
        <Line on={titleOn}>
          <button type="button" onClick={onClick} className={`text-left text-[17px] font-semibold leading-snug ${active ? "text-ink" : "text-ink/70 hover:text-ink"}`}>{title}</button>
        </Line>
        <Line on={subOn} className="mt-1">
          <p className="text-[14px] leading-snug text-mute">{sub}</p>
        </Line>
      </div>
    </li>
  );
}

function IntroChart({ data, k, t, reduced }: { data: IntroData | null; k: number; t: (typeof INTRO_TEXT)["en"]; reduced: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 640, h: 360 });
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: Math.max(260, Math.round(e.contentRect.width)), h: Math.max(200, Math.round(e.contentRect.height)) }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { w: W, h: H } = size;
  const L = 40, R = 10, T = 30, B = 38;
  const dots = useMemo(() => data?.dots ?? [], [data]);
  // Same picture as the landing chart: each bond anywhere across the width of its risk score, fixed per dot.
  const spread = (i: number) => ((((Math.sin(i * 12.9898 + 78.233) * 43758.5453) % 1) + 1) % 1) - 0.5;
  // An illustration, not a plot (the owner, 21/10/2026): the bonds keep their order by risk but are spread evenly from
  // risk 1 to 10, so the cloud has no sudden gaps or crowds. The red frontier dots sit on their bonds' own places.
  const place = useMemo(() => {
    const order = dots.map((_, i) => i).sort((a, b) => dots[a][0] + spread(a) - (dots[b][0] + spread(b)));
    const out = new Array<number>(dots.length);
    order.forEach((i, j) => (out[i] = 0.5 + (10 * (j + 0.5)) / order.length));
    return out;
  }, [dots]);
  const rx = (i: number) => place[i];
  const fronts = (data?.fronts ?? []).map((f) => f.filter((i) => dots[i] && place[i] <= FRONT_MAX));
  // Bullet 1 suggests one bond: the 4-6 year frontier bond nearest risk 5.
  const single = fronts[1]?.length ? fronts[1].reduce((a, b) => (Math.abs(place[b] - 5) < Math.abs(place[a] - 5) ? b : a)) : -1;
  // The axis follows the bulk of the bonds and always the frontier bonds.
  const sorted = dots.map((d) => d[1]).sort((a, b) => a - b);
  const q = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
  const keep = fronts.flat().map((i) => dots[i][1]);
  const lo = Math.max(0, Math.floor(Math.min(sorted.length ? q(0.005) : 0, ...keep) * 2) / 2 - 0.5);
  const hi = Math.ceil(Math.max(sorted.length ? q(0.99) : 6, ...keep) + 0.5);
  const x = (r: number) => L + ((10.5 - r) / 10) * (W - L - R);
  const y = (v: number) => T + (1 - (Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo || 1)) * (H - T - B);
  const stepY = hi - lo > 10 ? 2 : hi - lo > 4 ? 1 : 0.5;
  const ticks: number[] = [];
  for (let v = Math.ceil(lo / stepY) * stepY; v <= hi + 1e-9; v += stepY) ticks.push(Math.round(v * 10) / 10);

  // Dots grouped by horizon, so a whole group changes colour with one smooth transition.
  const groups = [0, 1, 2, 3].map((h) => ({ key: String(h), h, idx: [] as number[] }));
  dots.forEach(([, , h], i) => groups[h].idx.push(i));

  // Bullet 1 lights up one red dot; bullet 2 adds the other best bonds and draws the line through them (the owner, 21/10/2026).
  const lineState = (h: number) => (h === 1 && k === 3 ? "one" : h === 1 && k === 4 ? "dots" : (k === 5 && h === 1) || (k >= 6 && h === Math.min(k, 8) - 6) ? "on" : k >= 6 && h < Math.min(k, 8) - 6 ? "faint" : "off");
  const hz = horizonAt(k);
  const years = hz >= 0 ? (data?.years?.[hz] ?? null) : null;
  const ease = "transition-all duration-[1400ms] ease-out motion-reduce:transition-none";

  return (
    <div className="relative flex h-full flex-col">
      <div className="flex h-6 items-center justify-between text-[11px] text-mute">
        {/* What the blue dots are: their real maturity years, in a fixed slot. */}
        <span className="flex items-center gap-3">
          <span><span className="mr-1 inline-block h-2 w-2 rounded-full align-middle" style={{ background: GREY }} />{t.allBonds}</span>
          <span className={`transition-opacity duration-1000 motion-reduce:transition-none ${hz >= 0 && years ? "opacity-100" : "opacity-0"}`}>
            <span className="mr-1 inline-block h-2 w-2 rounded-full align-middle" style={{ background: BLUE }} />
            {years ? t.maturing(years[0], years[1]) : "\u00a0"}
          </span>
        </span>
        <span className={`rounded-full bg-[#e8f2ff] px-2.5 py-0.5 text-[12px] font-medium text-accent transition-opacity duration-1000 motion-reduce:transition-none ${hz >= 0 ? "opacity-100" : "opacity-0"}`} aria-live="polite">
          {hz >= 0 ? t.horizon(INTRO_HORIZONS[hz].from, INTRO_HORIZONS[hz].to) : " "}
        </span>
      </div>
      <div ref={box} className="min-h-0 w-full flex-1 overflow-hidden">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label={t.chartLabel} className="block">
          {ticks.map((v) => (
            <g key={v}>
              <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="#e5e5ea" />
              <text x={L - 8} y={y(v) + 4} textAnchor="end" fontSize="12" fill="#86868b">{v.toFixed(stepY < 1 ? 1 : 0)}%</text>
            </g>
          ))}
          {Array.from({ length: 10 }, (_, i) => i + 1).map((l) => (
            <text key={l} x={x(l)} y={H - B + 17} textAnchor="middle" fontSize="12" fill="#86868b">{l}</text>
          ))}
          <text x={4} y={T - 18} fontSize="12" fill="#86868b">{t.yAxis}</text>
          <text x={(L + W - R) / 2} y={H - 4} textAnchor="middle" fontSize="12" fill="#86868b">{t.riskAxis}</text>
          <g>
            {groups.map((g) => {
              const blue = isBlue(k, g.h);
              return (
                <g key={g.key} fill={blue ? BLUE : GREY} fillOpacity={blue ? 0.75 : 0.4} className={ease}>
                  {g.idx.map((i) => (
                    <circle key={i} cx={x(rx(i))} cy={y(dots[i][1])} r={blue ? 2.2 : 1.8} style={reduced ? undefined : { animation: `intro-dot 0.4s ease-out ${(((place[i] - 0.5) / 10) * DOTS_IN).toFixed(2)}s both` }} />
                  ))}
                </g>
              );
            })}
          </g>
          {fronts.map((f, h) => {
            const s = lineState(h);
            const d = f.map((i, j) => `${j ? "L" : "M"}${x(rx(i)).toFixed(1)},${y(dots[i][1]).toFixed(1)}`).join(" ");
            return (
              <g key={h} className={`transition-opacity duration-1000 motion-reduce:transition-none ${s === "on" || s === "dots" || s === "one" ? "opacity-100" : s === "faint" ? "opacity-25" : "opacity-0"}`}>
                <path
                  d={d}
                  pathLength={1}
                  fill="none"
                  stroke={RED}
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                  strokeDasharray="1"
                  strokeDashoffset={s === "on" || s === "faint" ? 0 : 1}
                  style={{ transition: "stroke-dashoffset 2s ease-in-out" }}
                  className="motion-reduce:!transition-none"
                />
                {f.map((i) => (
                  <circle key={i} cx={x(rx(i))} cy={y(dots[i][1])} r="4" fill={RED} stroke="#fff" strokeWidth="1.5" className={`transition-opacity duration-700 motion-reduce:transition-none ${s === "one" && i !== single ? "opacity-0" : "opacity-100"}`} />
                ))}
                {/* Each line says which maturities it is for, just above its riskiest end. */}
                {f.length > 0 && data?.years?.[h] && (
                  <text x={x(rx(f[f.length - 1])) + 8} y={y(dots[f[f.length - 1]][1]) - 10} textAnchor="start" fontSize="12" fontWeight="600" fill={RED} className={`transition-opacity duration-1000 motion-reduce:transition-none ${s === "dots" || s === "one" ? "opacity-0" : "opacity-100"}`}>
                    {t.maturity(data.years[h]![0], data.years[h]![1])}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function Examples({ data, t }: { data: IntroData | null; t: (typeof INTRO_TEXT)["en"] }) {
  const ex = data?.examples ?? [];
  if (!ex.length) return <p className="text-center text-[14px] text-mute">{t.noData}</p>;
  return (
    <div className="flex snap-x gap-3 overflow-x-auto lg:grid lg:grid-cols-3 lg:overflow-visible" data-testid="intro-examples">
      {ex.map((e) => (
        <div key={e.duration} className="w-[230px] shrink-0 snap-start rounded-2xl bg-canvas p-3 lg:w-auto lg:p-4">
          <p className="text-[13px] font-semibold">{t.example(e.duration, e.risk)}</p>
          <ol className="mt-2 space-y-1 lg:mt-3 lg:space-y-2">
            {Array.from({ length: 10 }, (_, i) => {
              const r = e.rows[i];
              // Rows 4 to 10 stay locked, as for any visitor of the finder.
              return (
                <li key={i} className="flex h-[19px] items-center gap-2 text-[13px]">
                  <span className="w-4 shrink-0 text-mute">{i + 1}</span>
                  {r ? (
                    <>
                      <span className="min-w-0 flex-1 truncate">{r.issuer}</span>
                      <span className="shrink-0 font-medium tabular-nums">{r.ytm.toFixed(2)}%</span>
                    </>
                  ) : i < e.rows.length + e.more ? (
                    <span className="h-2.5 flex-1 rounded-full bg-line" aria-hidden />
                  ) : null}
                </li>
              );
            })}
          </ol>
          <p className="mt-2 text-[12px] text-mute lg:mt-3">{e.more ? t.more(e.more) : "\u00a0"}</p>
        </div>
      ))}
    </div>
  );
}
