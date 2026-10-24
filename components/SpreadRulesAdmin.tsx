"use client";

import { useState } from "react";
import { DEFAULT_SPREAD_MATRIX, hurdleBp, SPREAD_STEPS, SPREAD_YEARS, type SpreadMatrix } from "@/lib/stepGap";

// Admin -> Risk Premium Model -> Spread rules: the minimum extra return per rating step and maturity used by the
// Methodology with spread rules (lib/stepGap.ts; admin only, switch "Method 1 / Spread rules" on the search page).

const EXAMPLE = [3, 5, 10];

export default function SpreadRulesAdmin({ matrix, isDefault, busy, post, card, btn, btnMain, input }: {
  matrix: SpreadMatrix; isDefault: boolean; busy: boolean;
  post: (body: Record<string, unknown>, ok: string) => Promise<boolean>;
  card: string; btn: string; btnMain: string; input: string;
}) {
  const [edit, setEdit] = useState<string[][] | null>(null);
  const shown = edit ? edit.map((r) => r.map(Number)) : matrix;
  const ok = !edit || edit.every((r) => r.every((x) => x.trim() !== "" && Number.isFinite(Number(x)) && Number(x) >= 0 && Number(x) <= 1000));
  // The worked example: AA at 4.00% against A at 4.05% and at 4.20%, same maturity.
  const need = (y: number) => (ok ? hurdleBp(1, 2, y, shown) : NaN);
  const verdict = (extra: number, y: number) => (extra > need(y) + 1e-9 ? "meets the rule: A may replace AA" : "below the rule: AA kept");
  return (
    <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
      <section className={card}>
        <h2 className="font-semibold">Minimum extra return per rating step (bp)</h2>
        <p className="mb-2 text-xs text-mute">
          Methodology with spread rules: a bond only takes the place of a better-rated one not in the list if it pays more than this. Straight line between columns, nearest column outside them. 5-year column = curve 1.0 differences; replaces them, never added on top. B+ and below: no step yet (counted as BB). {isDefault ? "Defaults in use." : "Saved values in use."}
        </p>
        <table className="w-full text-xs tabular-nums">
          <thead><tr className="text-left text-mute"><th>Step</th>{SPREAD_YEARS.map((y) => <th key={y} className="text-right">{y}Y</th>)}</tr></thead>
          <tbody>
            {SPREAD_STEPS.map((s, i) => (
              <tr key={s} className="border-t border-line/60">
                <td className="py-0.5">{s}</td>
                {SPREAD_YEARS.map((y, j) => (
                  <td key={y} className="py-0.5 text-right">
                    {edit ? (
                      <input className={`${input} w-14 text-right`} inputMode="decimal" value={edit[i][j]} onChange={(e) => setEdit(edit.map((r, a) => (a === i ? r.map((x, b) => (b === j ? e.target.value : x)) : r)))} />
                    ) : matrix[i][j]}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="border-t border-line font-medium">
              <td className="py-0.5">AAA → BB total</td>
              {SPREAD_YEARS.map((y) => <td key={y} className="py-0.5 text-right">{ok ? Math.round(hurdleBp(0, 6, y, shown)) : "–"}</td>)}
            </tr>
          </tbody>
        </table>
        <div className="mt-3 flex flex-wrap gap-2">
          {edit ? (
            <>
              <button className={btnMain} disabled={busy || !ok} onClick={async () => { if (await post({ action: "spread_matrix", matrix: edit.map((r) => r.map(Number)) }, "Spread rules saved.")) setEdit(null); }}>Save</button>
              <button className={btn} disabled={busy} onClick={() => setEdit(null)}>Cancel</button>
            </>
          ) : (
            <>
              <button className={btn} disabled={busy} onClick={() => setEdit(matrix.map((r) => r.map(String)))}>Edit</button>
              {!isDefault && <button className={btn} disabled={busy} onClick={() => post({ action: "spread_matrix", reset: true }, "Defaults restored.")}>Restore defaults</button>}
            </>
          )}
        </div>
        {!ok && <p className="mt-1 text-xs text-red-700">Every cell must be a number from 0 to 1000.</p>}
      </section>
      <section className={card}>
        <h2 className="font-semibold">Check: AA at 4.00% against A at 4.05% and A at 4.20%</h2>
        <table className="mt-2 w-full text-xs tabular-nums">
          <thead><tr className="text-left text-mute"><th>Maturity</th><th className="text-right">AA → A rule</th><th>A 4.05% (+5 bp)</th><th>A 4.20% (+20 bp)</th></tr></thead>
          <tbody>
            {EXAMPLE.map((y) => (
              <tr key={y} className="border-t border-line/60">
                <td className="py-0.5">{y} years</td>
                <td className="py-0.5 text-right">{Number.isFinite(need(y)) ? `${Math.round(need(y) * 10) / 10} bp` : "–"}</td>
                <td className="py-0.5 pl-2">{verdict(5, y)}</td>
                <td className="py-0.5 pl-2">{verdict(20, y)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-mute">
          Search page, yellow switch: Method 1 = what customers get (the rule shown only, as &quot;&lt; hurdle&quot; per list); Spread rules = the rule applied. Default matrix: {DEFAULT_SPREAD_MATRIX.map((r) => r[2]).join(" / ")} bp at 5 years.
        </p>
      </section>
    </div>
  );
}
