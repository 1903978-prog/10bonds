"use client";

import { useState } from "react";
import type { PsiResult } from "@/lib/seo/google";
import { api, Badge, btnLight, card, ErrorNote, num, when } from "./ui";
import { Kpi, useTech } from "./Technical";

const FLAG: Record<string, string> = { it: "🇮🇹 /it", fr: "🇫🇷 /fr", de: "🇩🇪 /de" };
const scoreTone = (v: number | null) => (v === null ? "" : v >= 90 ? "text-green-700" : v >= 50 ? "text-amber-600" : "text-red-700");
const FIELD: Record<string, "green" | "amber" | "red"> = { FAST: "green", AVERAGE: "amber", SLOW: "red" };

/** Speed: phone speed of each language home page (Lighthouse every Monday and after each deploy, or PageSpeed on demand). */
export default function Speed({ version }: { version: number }) {
  const { data, error, setData } = useTech(version);
  const [busy, setBusy] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  if (error) return <ErrorNote error={error} />;
  if (!data) return <p className="text-sm text-mute">Loading…</p>;

  async function measure(market: string) {
    setBusy(market);
    setRunError(null);
    try {
      const r = await api<{ psi: PsiResult | null; error: string | null }>("/api/admin/seo/performance", { op: "psi", market });
      if (r.error) setRunError(`/${market}: ${r.error}`);
      setData((d) => (d ? { ...d, psi: d.psi.map((p) => (p.market === market ? { market, psi: r.psi ?? p.psi, error: r.error } : p)) } : d));
    } catch (e) {
      setRunError((e as Error).message);
    }
    setBusy(null);
  }

  return (
    <div className="space-y-5" data-testid="seo-speed">
      <p className="text-xs text-mute">Simulated phone, as Google measures it. Measured every Monday and after each deploy; &ldquo;Measure now&rdquo; asks PageSpeed Insights (up to a minute; Google limits how often).</p>
      <ErrorNote error={runError} />
      <section className="grid gap-3 lg:grid-cols-3">
        {data.psi.map(({ market, psi, error: err }) => (
          <div key={market} className={card}>
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold">{FLAG[market]}</h2>
              <button onClick={() => measure(market)} disabled={busy !== null} className={btnLight}>{busy === market ? "Measuring…" : "Measure now"}</button>
            </div>
            <p className="mt-1 text-xs text-mute">{psi ? `Measured ${when(psi.at)}` : "Not measured yet."}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-canvas p-2">
              <Kpi label="Performance" value={psi?.lab.performance == null ? "–" : `${psi.lab.performance}/100`} tone={scoreTone(psi?.lab.performance ?? null)} />
              <Kpi label="Accessibility" value={psi?.lab.accessibility == null ? "–" : `${psi.lab.accessibility}/100`} tone={scoreTone(psi?.lab.accessibility ?? null)} />
              <Kpi label="Largest paint (LCP)" value={psi?.lab.lcpMs == null ? "–" : `${num(psi.lab.lcpMs / 1000, 1)} s`} />
              <Kpi label="Layout shift (CLS)" value={psi?.lab.cls == null ? "–" : num(psi.lab.cls, 3)} />
              <Kpi label="Blocking time" value={psi?.lab.tbtMs == null ? "–" : `${num(psi.lab.tbtMs)} ms`} />
              <Kpi label="Real users (28 days)" value={psi?.field?.overall ?? "–"} />
            </div>
            {psi?.field && (
              <p className="mt-2 flex flex-wrap gap-1 text-xs">
                {(["lcp", "inp", "cls"] as const).map((k) => psi.field?.[k] && <Badge key={k} tone={FIELD[psi.field[k]!] ?? "gray"}>{k.toUpperCase()} {psi.field[k]!.toLowerCase()}</Badge>)}
              </p>
            )}
            {err && <p className="mt-2 break-words text-xs text-red-700">Last error: {err}</p>}
          </div>
        ))}
      </section>
      <p className="text-xs text-mute">Targets: performance 90+, LCP under 2.5 s, CLS under 0.1, blocking time under 200 ms.</p>
    </div>
  );
}
