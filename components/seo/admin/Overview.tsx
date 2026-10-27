"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SeoMarket } from "@/lib/seo/input";
import { DIMENSIONS, type CriterionResult, type DimensionScore, type Recommendation } from "@/lib/seo/rubric";
import { api, Badge, btn, btnLight, card, day, ErrorNote, Field, input, num, STATUS_LABEL, Table, when } from "./ui";

type Row = { id: number; market: SeoMarket; at: string; by: string; trigger: string; overall: number; assessed: number; criteria: number; dimensions: Record<string, number> };
type Score = { total: number; dimensions: DimensionScore[]; assessed: number; criteria: number; complete: boolean };
type Data = {
  market: SeoMarket;
  markets: { market: SeoMarket; overall: number | null; at: string | null }[];
  global: number | null;
  current: (Row & { score: Score; results: CriterionResult[] }) | null;
  previous: (Row & { score: Score }) | null;
  history: Row[];
  roadmap: (Recommendation & { status: string })[];
  completedActions: number;
  issues: number | null;
  needsRun: boolean;
  staleSince: string | null;
};

const RANGES = [["30", "30 days"], ["90", "90 days"], ["365", "1 year"], ["all", "All"]] as const;
const COLORS: Record<string, string> = { guides: "#0071e3", comparisons: "#34c759", credibility: "#af52de", backlinks: "#ff9500", technical: "#5ac8fa", internal: "#ff2d55", mobile: "#8e8e93" };
const FLAG: Record<SeoMarket, string> = { it: "🇮🇹 Italy", fr: "🇫🇷 France", de: "🇩🇪 Germany", us: "🇺🇸 United States", uk: "🇬🇧 United Kingdom" };

export default function Overview({ market, onMarket, onRan }: { market: SeoMarket; onMarket: (m: SeoMarket) => void; onRan?: () => void }) {
  const [range, setRange] = useState("90");
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const autoRan = useRef(false);

  const load = useCallback(async () => {
    try {
      setData(await api<Data>(`/api/admin/seo?market=${market}&range=${range}`));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [market, range]);

  const run = useCallback(async (opts: { psi?: boolean; auto?: boolean } = {}) => {
    setRunning(true);
    setError(null);
    try {
      await api("/api/admin/seo", { psi: opts.psi === true, trigger: opts.auto ? "auto" : "manual" });
      await load();
      onRan?.();
    } catch (e) {
      setError((e as Error).message);
    }
    setRunning(false);
  }, [load, onRan]);

  useEffect(() => {
    load();
  }, [load]);
  // The score is re-evaluated by itself when data changed or the last run is older than a day.
  useEffect(() => {
    if (data?.needsRun && !autoRan.current && !running) {
      autoRan.current = true;
      run({ auto: true });
    }
  }, [data, running, run]);

  if (error && !data) return <ErrorNote error={error} />;
  if (!data) return <p className="text-sm text-mute">Loading…</p>;
  const cur = data.current;
  const prev = data.previous;
  const change = cur && prev ? Math.round((cur.overall - prev.overall) * 100) / 100 : null;

  return (
    <div className="space-y-5" data-testid="seo-overview">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {data.markets.map((m) => (
          <button
            key={m.market}
            type="button"
            onClick={() => onMarket(m.market)}
            aria-pressed={m.market === market}
            className={`${card} text-left transition hover:ring-2 hover:ring-line ${m.market === market ? "ring-2 ring-accent hover:ring-accent" : ""}`}
            data-testid={`seo-card-${m.market}`}
          >
            <p className="truncate text-xs text-mute">{FLAG[m.market]}</p>
            <p className="mt-1 text-2xl font-semibold">{m.overall === null ? "—" : `${num(m.overall, 1)}`}<span className="text-sm font-normal text-mute"> /100</span></p>
          </button>
        ))}
        <div className={card}>
          <p className="text-xs text-mute">Average of {data.markets.length} markets</p>
          <p className="mt-1 text-2xl font-semibold">{data.global === null ? "—" : num(data.global, 1)}<span className="text-sm font-normal text-mute"> /100</span></p>
          <p className="mt-1 text-[11px] text-mute">Internal metric, equal weights.{data.markets.find((x) => x.at) && <> Last evaluation {when(data.markets.find((x) => x.at)!.at!)}.</>}</p>
        </div>
      </section>

      <section className={card}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">SEO Development Score · {FLAG[market]}</h2>
            <p className="mt-1 max-w-2xl text-xs text-mute">10BONDS&apos; own measure of how well the site is built for organic search, from 35 checks. It is not Google&apos;s algorithm and not traffic: real search numbers are under “Search performance”.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => run()} disabled={running} className={btn} data-testid="seo-run">{running ? "Checking the site…" : "Re-evaluate now"}</button>
            <button onClick={() => run({ psi: true })} disabled={running} className={btnLight} title="Also runs Google PageSpeed on the IT, FR, DE and English home pages (1-3 minutes)">+ PageSpeed</button>
          </div>
        </div>
        <ErrorNote error={error} />
        {!cur ? (
          <p className="mt-4 text-sm text-mute">No assessment yet. {running ? "The first one is running…" : ""}</p>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
              <Stat label="Current score" value={`${num(cur.overall, 1)}/100`} big />
              <Stat label="Previous" value={prev ? `${num(prev.overall, 1)}` : "—"} />
              <Stat label="Change" value={change === null ? "—" : `${change > 0 ? "+" : ""}${num(change, 2)}`} tone={change === null ? undefined : change > 0 ? "text-green-700" : change < 0 ? "text-red-700" : undefined} />
              <Stat label="Open issues" value={String(data.issues ?? "—")} />
              <Stat label="Completed actions" value={String(data.completedActions)} />
            </div>
            <p className="mt-3 text-xs text-mute">
              Last evaluation {when(cur.at)} ({cur.trigger === "auto" ? "automatic" : `by ${cur.by}`}) · {cur.assessed} of {cur.criteria} criteria assessed
              {cur.assessed < cur.criteria && " — unassessed criteria count as 0 but are marked “Not assessed” or “Needs review”, never as a verified zero"}
              {data.staleSince && ` · data changed ${when(data.staleSince)}, re-evaluating`}
            </p>
            <Contribution dims={cur.score.dimensions} />
          </>
        )}
      </section>

      {cur && (
        <section className={card}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">History</h2>
            <div className="flex gap-1">
              {RANGES.map(([id, label]) => (
                <button key={id} onClick={() => setRange(id)} className={`rounded-full px-3 py-1 text-xs ${range === id ? "bg-ink text-white" : "bg-canvas"}`}>{label}</button>
              ))}
            </div>
          </div>
          <Chart history={data.history} market={market} />
        </section>
      )}

      {cur && (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cur.score.dimensions.map((d) => (
            <button key={d.id} onClick={() => setOpen(open === d.id ? null : d.id)} className={`${card} text-left ${open === d.id ? "ring-2 ring-accent" : ""}`} data-testid={`seo-dim-${d.id}`}>
              <div className="flex items-center justify-between">
                <span className="font-semibold">{d.title}</span>
                <span className="text-xs text-mute">weight {d.weight}%</span>
              </div>
              <p className="mt-2 text-2xl font-semibold">{d.rating}<span className="text-sm font-normal text-mute">/10</span> <span className="text-sm font-normal text-mute">→ {num(d.weighted, 1)} of {d.weight} points</span></p>
              <div className="mt-2 h-1.5 rounded-full bg-canvas"><div className="h-1.5 rounded-full" style={{ width: `${d.rating * 10}%`, background: COLORS[d.id] }} /></div>
              <p className="mt-2 text-xs text-mute">{d.assessed}/5 assessed{d.complete ? "" : " · some not assessed"}</p>
            </button>
          ))}
        </section>
      )}

      {cur && open && <Dimension key={`${market}-${open}`} market={market} dim={open} results={cur.results} onSaved={() => run()} />}

      {cur && <Roadmap market={market} items={data.roadmap} onChange={load} />}
    </div>
  );
}

function Stat({ label, value, big, tone }: { label: string; value: string; big?: boolean; tone?: string }) {
  return (
    <div className="rounded-lg bg-canvas p-3">
      <p className="text-xs text-mute">{label}</p>
      <p className={`mt-1 font-semibold ${big ? "text-2xl" : "text-lg"} ${tone ?? ""}`}>{value}</p>
    </div>
  );
}

/** How many of the 100 points each dimension contributes now. */
function Contribution({ dims }: { dims: DimensionScore[] }) {
  return (
    <div className="mt-4">
      <div className="flex h-4 overflow-hidden rounded-full bg-canvas" aria-label="Contribution of each dimension">
        {dims.map((d) => <div key={d.id} title={`${d.title}: ${d.weighted} of ${d.weight}`} style={{ width: `${d.weighted}%`, background: COLORS[d.id] }} />)}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {dims.map((d) => (
          <li key={d.id} className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full" style={{ background: COLORS[d.id] }} />{d.title}: {num(d.weighted, 1)}/{d.weight}</li>
        ))}
      </ul>
    </div>
  );
}

/** Overall score over time, with each dimension's contribution as stacked areas. Plain SVG, no chart library. */
function Chart({ history, market }: { history: Row[]; market: SeoMarket }) {
  const rows = history.filter((h) => h.market === market);
  if (rows.length === 0) return <p className="mt-3 text-sm text-mute">No assessments in this period.</p>;
  const W = 640;
  const H = 220;
  const P = 28;
  const t0 = Date.parse(rows[0].at);
  const t1 = Date.parse(rows[rows.length - 1].at);
  const x = (at: string) => (rows.length === 1 || t1 === t0 ? W / 2 : P + ((Date.parse(at) - t0) / (t1 - t0)) * (W - 2 * P));
  const y = (v: number) => H - P - (v / 100) * (H - 2 * P);
  const factor = Object.fromEntries(DIMENSIONS.map((d) => [d.id, d.weight / 10]));
  // Stacked layers bottom-up.
  let base = rows.map(() => 0);
  const layers = DIMENSIONS.map((d) => {
    const top = rows.map((r, i) => base[i] + (r.dimensions?.[d.id] ?? 0) * factor[d.id]);
    const pts = [...rows.map((r, i) => `${x(r.at)},${y(top[i])}`), ...rows.map((r, i) => `${x(r.at)},${y(base[i])}`).reverse()].join(" ");
    base = top;
    return { id: d.id, pts };
  });
  return (
    <div className="mt-3 overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[30rem]" role="img" aria-label="Score history">
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line x1={P} x2={W - P} y1={y(v)} y2={y(v)} stroke="#e5e5ea" />
            <text x={4} y={y(v) + 4} fontSize="10" fill="#6e6e73">{v}</text>
          </g>
        ))}
        {rows.length > 1 && layers.map((l) => <polygon key={l.id} points={l.pts} fill={COLORS[l.id]} opacity={0.25} />)}
        <polyline points={rows.map((r) => `${x(r.at)},${y(r.overall)}`).join(" ")} fill="none" stroke="#1d1d1f" strokeWidth={2} />
        {rows.map((r) => <circle key={r.id} cx={x(r.at)} cy={y(r.overall)} r={3} fill="#1d1d1f"><title>{`${day(r.at)}: ${r.overall}`}</title></circle>)}
        <text x={P} y={H - 6} fontSize="10" fill="#6e6e73">{day(rows[0].at)}</text>
        <text x={W - P} y={H - 6} fontSize="10" fill="#6e6e73" textAnchor="end">{day(rows[rows.length - 1].at)}</text>
      </svg>
      <p className="text-xs text-mute">Black line: overall score. Coloured bands: each dimension&apos;s contribution. {rows.length} assessment(s).</p>
    </div>
  );
}

type Manual = { criterion: string; points: number | null; override: boolean; evidence: string; justification: string | null; by: string; at: string };
type Change = { assessmentId: number; at: string; criterion: string; points: number | null; previous: number | null; status: string; evidence: string };

function Dimension({ market, dim, results, onSaved }: { market: SeoMarket; dim: string; results: CriterionResult[]; onSaved: () => void }) {
  const def = DIMENSIONS.find((d) => d.id === dim)!;
  const [hist, setHist] = useState<{ history: Manual[]; changes: Change[] } | null>(null);
  const [form, setForm] = useState<{ criterion: string; points: string; evidence: string; justification: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ history: Manual[]; changes: Change[] }>(`/api/admin/seo/manual?market=${market}&dimension=${dim}`).then(setHist).catch(() => setHist({ history: [], changes: [] }));
  }, [market, dim]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    setError(null);
    try {
      await api("/api/admin/seo/manual", { market, dimension: dim, criterion: form.criterion, points: form.points === "" ? null : Number(form.points), evidence: form.evidence, justification: form.justification });
      setForm(null);
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    }
    setBusy(false);
  }

  return (
    <section className={card} data-testid="seo-dimension">
      <h2 className="text-lg font-semibold">{def.title} <span className="text-sm font-normal text-mute">· weight {def.weight}% · each criterion 0, 1 or 2 points</span></h2>
      <div className="mt-3 space-y-3">
        {def.criteria.map((c) => {
          const r = results.find((x) => x.dimension === dim && x.criterion === c.id);
          const [label, tone] = STATUS_LABEL[r?.status ?? "not_assessed"];
          return (
            <div key={c.id} className="rounded-lg border border-line p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{c.title}</p>
                <div className="flex items-center gap-2">
                  <Badge tone={tone}>{label}</Badge>
                  <Badge>{c.method === "auto" ? "Automatic" : "Manual"}</Badge>
                  <span className="text-lg font-semibold">{r?.points ?? "—"}<span className="text-xs font-normal text-mute">/2</span></span>
                </div>
              </div>
              <p className="mt-1 text-sm text-mute">{c.description}</p>
              <p className="mt-1 text-xs"><span className="text-mute">Rule:</span> {c.rule}</p>
              <p className="mt-2 whitespace-pre-line text-sm"><span className="text-mute">Evidence:</span> {r?.evidence ?? "—"}</p>
              {r?.justification && <p className="mt-1 text-sm"><span className="text-mute">Justification:</span> {r.justification}</p>}
              <p className="mt-1 text-xs text-mute">Evaluated {when(r?.evaluatedAt)} by {r?.evaluator ?? "—"} · To improve: {c.action} (effort {c.effort})</p>
              <button onClick={() => setForm({ criterion: c.id, points: r?.points === null || r?.points === undefined ? "" : String(r.points), evidence: "", justification: "" })} className="mt-2 text-sm text-accent">
                {c.method === "auto" ? "Override with a manual score" : "Record a manual assessment"}
              </button>
              {form?.criterion === c.id && (
                <form onSubmit={save} className="mt-3 grid gap-3 rounded-xl bg-canvas p-3 sm:grid-cols-2">
                  <Field label="Points">
                    <select value={form.points} onChange={(e) => setForm({ ...form, points: e.target.value })} className={input}>
                      <option value="">Withdraw my manual score</option><option value="0">0</option><option value="1">1</option><option value="2">2</option>
                    </select>
                  </Field>
                  <div />
                  <Field label="Evidence (what you looked at)" wide>
                    <textarea required={form.points !== ""} value={form.evidence} onChange={(e) => setForm({ ...form, evidence: e.target.value })} className={input} rows={2} maxLength={2000} />
                  </Field>
                  {c.method === "auto" && (
                    <Field label="Justification for overriding the automatic check" wide hint="Shown next to the score as “Manual override”.">
                      <textarea required={form.points !== ""} value={form.justification} onChange={(e) => setForm({ ...form, justification: e.target.value })} className={input} rows={2} maxLength={1000} />
                    </Field>
                  )}
                  <div className="flex gap-2 sm:col-span-2">
                    <button disabled={busy} className={btn}>{busy ? "Saving…" : "Save and re-evaluate"}</button>
                    <button type="button" onClick={() => setForm(null)} className={btnLight}>Cancel</button>
                  </div>
                  <div className="sm:col-span-2"><ErrorNote error={error} /></div>
                </form>
              )}
            </div>
          );
        })}
      </div>
      {hist && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-accent">History of this dimension ({hist.changes.length} score changes, {hist.history.length} manual entries)</summary>
          <Table head={["When", "Criterion", "Points", "Status", "Evidence"]}>
            {hist.changes.map((c) => (
              <tr key={`${c.assessmentId}-${c.criterion}`} className="border-t border-line align-top">
                <td className="py-2 pr-3 whitespace-nowrap">{day(c.at)}</td>
                <td className="pr-3">{def.criteria.find((x) => x.id === c.criterion)?.title ?? c.criterion}</td>
                <td className="pr-3 whitespace-nowrap">{c.previous ?? "—"} → {c.points ?? "—"}</td>
                <td className="pr-3">{STATUS_LABEL[c.status]?.[0] ?? c.status}</td>
                <td className="text-xs text-mute">{c.evidence.slice(0, 200)}</td>
              </tr>
            ))}
          </Table>
          {hist.history.length > 0 && (
            <Table head={["When", "Who", "Criterion", "Points", "Type", "Evidence / justification"]}>
              {hist.history.map((m, i) => (
                <tr key={i} className="border-t border-line align-top">
                  <td className="py-2 pr-3 whitespace-nowrap">{when(m.at)}</td>
                  <td className="pr-3">{m.by}</td>
                  <td className="pr-3">{def.criteria.find((x) => x.id === m.criterion)?.title ?? m.criterion}</td>
                  <td className="pr-3">{m.points ?? "withdrawn"}</td>
                  <td className="pr-3">{m.override ? "Override" : "Manual"}</td>
                  <td className="text-xs text-mute">{m.evidence}{m.justification ? ` — ${m.justification}` : ""}</td>
                </tr>
              ))}
            </Table>
          )}
        </details>
      )}
    </section>
  );
}

function Roadmap({ market, items, onChange }: { market: SeoMarket; items: (Recommendation & { status: string })[]; onChange: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const set = async (key: string, status: string) => {
    try {
      await api("/api/admin/seo/actions", { key, status });
      onChange();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const tone = (p: string) => (p === "High" ? "red" : p === "Medium" ? "amber" : "gray") as "red" | "amber" | "gray";
  return (
    <section className={card} data-testid="seo-roadmap">
      <h2 className="text-lg font-semibold">SEO Improvement Roadmap · {market.toUpperCase()}</h2>
      <p className="mt-1 text-xs text-mute">Every criterion below 2/2. Gain = points the overall score would rise if the criterion reached 2/2 (from the rubric weights). Priority = gain ÷ effort (Low 1, Medium 2, High 3): High ≥ 2.5, Medium ≥ 1.</p>
      <ErrorNote error={error} />
      <Table head={["Priority", "Dimension", "Deficiency", "Action", "Gain", "Effort", "Status"]} min="52rem">
        {items.length === 0 && <tr><td colSpan={7} className="py-3 text-mute">Nothing to improve: every criterion is at 2/2.</td></tr>}
        {items.map((r) => (
          <tr key={r.key} className="border-t border-line align-top">
            <td className="py-2 pr-3"><Badge tone={tone(r.priority)}>{r.priority}</Badge></td>
            <td className="pr-3">{r.dimensionTitle}<span className="block text-xs text-mute">{r.title}</span></td>
            <td className="max-w-[16rem] pr-3 text-xs text-mute">{r.deficiency.slice(0, 220)}</td>
            <td className="max-w-[16rem] pr-3 text-xs">{r.action}</td>
            <td className="pr-3 whitespace-nowrap">+{num(r.gain, 1)}</td>
            <td className="pr-3">{r.effort}</td>
            <td>
              <select value={r.status} onChange={(e) => set(r.key, e.target.value)} className="rounded-lg border border-line px-2 py-1 text-xs">
                <option value="not_started">Not started</option><option value="in_progress">In progress</option><option value="completed">Completed</option>
              </select>
            </td>
          </tr>
        ))}
      </Table>
    </section>
  );
}
