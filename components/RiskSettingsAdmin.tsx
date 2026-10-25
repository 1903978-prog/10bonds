"use client";

import { useState } from "react";
import { DEFAULT_PARAMS, PARAM_FIELDS, type RiskParams } from "@/lib/riskPremium/params";
import { OUTLIER_SD as OUTLIER_RANGE } from "@/lib/outliers";

const MAX_WEIGHT_UI = 3; // same as MAX_WEIGHT in lib/riskPremium/store.ts (server only)

// Admin -> Risk Premium Model -> Settings: every number of the ranking and the outlier rule that is not part of the
// curve or the spread rules. Each row saves on its own and is recorded in History.

type Post = (body: Record<string, unknown>, ok: string) => Promise<boolean>;
const row = "grid grid-cols-[1fr_auto] items-center gap-3 border-t border-line/60 py-2 first:border-t-0";

export default function RiskSettingsAdmin({ params, weight, outlierSd, busy, post, card, btn, btnMain, input }: {
  params: RiskParams; weight: number; outlierSd: number; busy: boolean; post: Post; card: string; btn: string; btnMain: string; input: string;
}) {
  const [w, setW] = useState(String(Math.round(weight * 100)));
  const [k, setK] = useState(String(outlierSd));
  const [p, setP] = useState<Record<string, string>>(Object.fromEntries(PARAM_FIELDS.map((f) => [f.key, String(params[f.key])])));
  const [shifts, setShifts] = useState(params.sensitivityShifts.join(", "));
  const isDefault = JSON.stringify(params) === JSON.stringify(DEFAULT_PARAMS);
  const wn = Number(w), kn = Number(k);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className={card}>
        <h2 className="font-semibold">What users get</h2>
        <p className="mb-2 text-xs text-mute">Same as the yellow sliders on the search page, now typed in.</p>
        <div className={row}>
          <div><div className="text-sm">Risk premium weight (%)</div><div className="text-xs text-mute">0 = today&apos;s ranking. 100 = the curve as saved. Up to {MAX_WEIGHT_UI * 100}.</div></div>
          <span className="flex gap-2"><input className={`${input} w-20 text-right`} inputMode="decimal" value={w} onChange={(e) => setW(e.target.value)} />
            <button className={btnMain} disabled={busy || !(wn >= 0 && wn <= MAX_WEIGHT_UI * 100)} onClick={() => post({ action: "weight", weight: wn / 100 }, "Weight saved.")}>Save</button></span>
        </div>
        <div className={row}>
          <div><div className="text-sm">Outlier strictness (standard deviations)</div><div className="text-xs text-mute">A bond is left out if its return is this far above similar bonds. Lower = stricter. {OUTLIER_RANGE.min} to {OUTLIER_RANGE.max}.</div></div>
          <span className="flex gap-2"><input className={`${input} w-20 text-right`} inputMode="decimal" value={k} onChange={(e) => setK(e.target.value)} />
            <button className={btnMain} disabled={busy || !(kn >= OUTLIER_RANGE.min && kn <= OUTLIER_RANGE.max)} onClick={() => post({ action: "outlier_sd", sd: kn }, "Outlier strictness saved.")}>Save</button></span>
        </div>
      </section>
      <section className={card}>
        <h2 className="font-semibold">Ranking and outlier details</h2>
        <p className="mb-2 text-xs text-mute">{isDefault ? "Defaults in use." : "Your saved values are in use."}</p>
        {PARAM_FIELDS.map((f) => (
          <div key={f.key} className={row}>
            <div><div className="text-sm">{f.label}</div><div className="text-xs text-mute">{f.help} ({f.min} to {f.max} {f.unit})</div></div>
            <input className={`${input} w-20 text-right`} inputMode="decimal" value={p[f.key]} onChange={(e) => setP({ ...p, [f.key]: e.target.value })} />
          </div>
        ))}
        <div className={row}>
          <div><div className="text-sm">Sensitivity shifts (bp)</div><div className="text-xs text-mute">Curve moves tried on the Sensitivity tab, separated by commas.</div></div>
          <input className={`${input} w-40`} value={shifts} onChange={(e) => setShifts(e.target.value)} />
        </div>
        <div className="mt-3 flex gap-2">
          <button className={btnMain} disabled={busy} onClick={() => post({ action: "params", params: { ...p, sensitivityShifts: shifts.split(",").map((x) => Number(x.trim())) } }, "Settings saved.")}>Save</button>
          {!isDefault && <button className={btn} disabled={busy} onClick={() => post({ action: "params", reset: true }, "Defaults restored.")}>Restore defaults</button>}
        </div>
      </section>
    </div>
  );
}
