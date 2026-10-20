import type { Metadata } from "next";
import { CORP, CORP_WEIGHTS, COUNTRIES, FACTORS, METHOD, SOLVENCY_COUNT, coreScore, historyDeduction, methodLang, type Country, type MethodLang } from "@/lib/methodology";
import { PillarRow, StressRow } from "@/components/MethodRows";
import { MethodNav, kindOf } from "@/components/MethodNav";

export const metadata: Metadata = { title: "Rating methodology · 10BONDS", alternates: { canonical: "/methodology" } };

const DOT: Record<Country, string> = { DE: "#1d1d1f", IT: "#0066cc", RO: "#af52de" };

/** Long rounded bar, riskier on the left, safer on the right, with a dot per marker at its 0..100 position. */
function Pill({ marks }: { marks: { pos: number; color: string; title: string }[] }) {
  return (
    <div className="relative h-3 rounded-full bg-gradient-to-r from-[#fde4e4] via-[#fff1dc] to-[#dcf3e3]">
      <div className="absolute inset-y-0 left-[6px] right-[6px]">
        {marks.map((m, i) => (
          <span
            key={i}
            title={m.title}
            className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white"
            style={{ left: `${m.pos}%`, background: m.color }}
          />
        ))}
      </div>
    </div>
  );
}

function Row({ name, line, weight, children }: { name: string; line: string; weight?: string; children: React.ReactNode }) {
  return (
    <li className="grid grid-cols-[1fr_34%] items-center gap-4 px-4 py-2">
      <div className="min-w-0">
        <p className="truncate text-[13px] font-medium leading-tight">
          {name}
          {weight && <span className="ml-1.5 font-normal tabular-nums text-mute">{weight}</span>}
        </p>
        <p className="truncate text-[11px] leading-snug text-mute" title={line}>{line}</p>
      </div>
      {children}
    </li>
  );
}

const card = "overflow-hidden rounded-2xl bg-white shadow-[0_2px_20px_rgba(0,0,0,0.04)]";
const head = "px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-mute";

function Corporate({ lang }: { lang: MethodLang }) {
  const c = CORP[lang];
  return (
    <article lang={lang} className="mx-auto max-w-6xl">
      <MethodNav lang={lang} kind="corporate" />
      <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{c.title}</h1>
      <p className="mt-1 max-w-3xl text-[13px] leading-snug text-mute">{c.intro}</p>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.25fr_1fr]">
        <section className={`${card} px-4 pb-4`}>
          <h2 className={`${head} px-0`}>{c.base}</h2>
          {c.pillars.map(([name, parts], i) => (
            <PillarRow key={name} name={`${"ABCDE"[i]}. ${name}`} weight={CORP_WEIGHTS[i]} parts={parts} />
          ))}
        </section>
        <section className={`${card} px-4 pb-4`}>
          <h2 className={`${head} px-0`}>{c.how}</h2>
          <ol className="mt-1 space-y-1.5">
            {c.flow.map(([title, line], i) => (
              <li key={title} className="flex items-center gap-3 rounded-xl bg-canvas px-3 py-1.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-semibold">{"ABCD"[i]}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium leading-tight">{title}</p>
                  <p className="truncate text-[11px] text-mute" title={line}>{line}</p>
                </div>
                {(i === 0 || i === 3) && <span className="shrink-0 rounded-full bg-ink px-2 py-0.5 text-[10px] font-semibold text-white">{i === 0 ? "LR Base" : "LR Final"} 0–100</span>}
              </li>
            ))}
          </ol>
          <h2 className={`${head} mt-2 px-0`}>{c.stress}</h2>
          <StressRow name={c.stressRows[0]} base={78} stressed={43} />
          <StressRow name={c.stressRows[1]} base={74} stressed={66} />
          <p className="mt-1.5 text-[11px] text-mute">{c.stressNote}</p>
          <p className="mt-2 rounded-xl bg-[#fff4e5] px-3 py-2 text-[11px] leading-snug text-ink/80">{c.overrides}</p>
        </section>
      </div>
      <p className="mt-3 text-center text-[11px] text-mute">{c.note}</p>
    </article>
  );
}

export default async function Methodology({ searchParams }: { searchParams: Promise<{ lang?: string | string[]; type?: string | string[] }> }) {
  const sp = await searchParams;
  const lang = methodLang(sp.lang);
  if (kindOf(sp.type) === "corporate") return <Corporate lang={lang} />;
  const t = METHOD[lang];
  const fmt = (n: number) => Math.round(n).toString();
  const factorMarks = (i: number) =>
    COUNTRIES.map((c) => {
      const s = FACTORS[i].score(FACTORS[i].examples[c]);
      return { pos: s, color: DOT[c], title: `${t.countries[c]}: ${fmt(s)}/100` };
    });
  const rows = FACTORS.map((f, i) => (
    <Row key={i} name={`${i + 1}. ${t.factors[i][0]}`} line={t.factors[i][1]} weight={`${f.weight}%`}>
      <Pill marks={factorMarks(i)} />
    </Row>
  ));
  // History bar: what one default deducts, by years since it was cured (now, 10, 20, 30+ years), evenly spaced.
  const decimal = (n: number) => (lang === "en" ? String(n) : String(n).replace(".", ","));
  const history = [0, 10, 20, 30].map((a, i) => ({ h: historyDeduction([a]), label: t.historyMarks[i], pos: 12.5 + 25 * i }));
  return (
    <article lang={lang} className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          <MethodNav lang={lang} kind="sovereign" />
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{t.title}</h1>
          <p className="mt-1 max-w-2xl text-[13px] leading-snug text-mute">{t.intro}</p>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-mute" aria-label={t.legend}>
          <span>{t.legend}:</span>
          {COUNTRIES.map((c) => (
            <span key={c} className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: DOT[c] }} />
              {t.countries[c]}
            </span>
          ))}
          <span className="hidden sm:inline">· ← {t.riskier} | {t.safer} →</span>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className={card}>
          <h2 className={head}>{t.solvency}</h2>
          <ul className="divide-y divide-line/60">{rows.slice(0, SOLVENCY_COUNT)}</ul>
        </section>
        <section className={card}>
          <h2 className={head}>{t.repayment}</h2>
          <ul className="divide-y divide-line/60">
            {rows.slice(SOLVENCY_COUNT)}
            <Row name={t.history[0]} line={t.history[1]}>
              <div>
                <Pill marks={history.map((x) => ({ pos: x.pos, color: `rgba(29,29,31,${0.3 + x.h / 3})`, title: `${x.label} −${decimal(x.h)}` }))} />
                <div className="mt-0.5 grid grid-cols-4 whitespace-nowrap text-center text-[9px] leading-none tabular-nums text-mute">
                  {history.map((x) => <span key={x.label}>{x.label} −{decimal(x.h)}</span>)}
                </div>
              </div>
            </Row>
            <Row name={t.total} line="0–100">
              <Pill marks={COUNTRIES.map((c) => ({ pos: coreScore(c), color: DOT[c], title: `${t.countries[c]}: ${fmt(coreScore(c))}/100` }))} />
            </Row>
          </ul>
        </section>
      </div>

    </article>
  );
}
