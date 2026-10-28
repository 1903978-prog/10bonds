import { PORTFOLIO_SPEC } from "../portfolioSpec";
import { NS_SIZE, type NsCand, type NsRules } from "./solve";

// Independent check of a stored list against every hard rule of its position (not the solver's own bookkeeping). The one validator of the spec:
// the nightly job runs it on every solved list, and the Efficient Database snapshot runs it again on the stored list before a row counts as VALID.
export type NsCheck = { rule: "count" | "distinct" | "classes" | "spread" | "duration" | "issuer" | "sector" | "ceiling"; ok: boolean; detail: string };
/** The fields of a bond the rules look at (a full candidate also fits). */
export type NsItem = Pick<NsCand, "isin" | "group" | "sector" | "cls" | "dur">;

export function checkNsList(sel: NsItem[], allowed: readonly number[], rules: NsRules, opts: { maxSpread?: number; ceilingBp?: number | null; lossBp?: number[] } = {}): NsCheck[] {
  const maxSpread = opts.maxSpread ?? PORTFOLIO_SPEC.maxRiskSpread;
  const out: NsCheck[] = [];
  out.push({ rule: "count", ok: sel.length === NS_SIZE, detail: `${sel.length} bonds (need ${NS_SIZE})` });
  out.push({ rule: "distinct", ok: new Set(sel.map((c) => c.isin)).size === sel.length, detail: "no duplicate bond" });
  const cls = sel.map((c) => c.cls);
  out.push({ rule: "classes", ok: cls.every((c) => allowed.includes(c)), detail: `risk classes ${[...new Set(cls)].sort((a, b) => a - b).join(",")} of allowed ${allowed.join(",")}` });
  out.push({ rule: "spread", ok: !cls.length || Math.max(...cls) - Math.min(...cls) <= maxSpread, detail: `class spread ${cls.length ? Math.max(...cls) - Math.min(...cls) : 0} (max ${maxSpread})` });
  const dur = sel.reduce((s, c) => s + c.dur, 0) / (sel.length || 1);
  const tol = PORTFOLIO_SPEC.avgDurationTolerance;
  out.push({ rule: "duration", ok: sel.length > 0 && dur >= rules.duration * (1 - tol) - 1e-9 && dur <= rules.duration * (1 + tol) + 1e-9, detail: `average duration ${dur.toFixed(2)} y (horizon ${rules.duration} y, +-${Math.round(tol * 100)}%)` });
  const count = (key: (c: NsItem) => string) => { const m = new Map<string, number>(); for (const c of sel) m.set(key(c), (m.get(key(c)) ?? 0) + 1); return Math.max(0, ...m.values()); };
  const iss = count((c) => c.group), sec = count((c) => c.sector);
  out.push({ rule: "issuer", ok: iss <= rules.perIssuer, detail: `most bonds from one issuer ${iss} (max ${rules.perIssuer})` });
  out.push({ rule: "sector", ok: sec <= rules.perSector, detail: `most bonds in one sector ${sec} (max ${rules.perSector})` });
  if (opts.ceilingBp != null && opts.lossBp) {
    const loss = opts.lossBp.reduce((s, x) => s + x, 0) / (opts.lossBp.length || 1);
    out.push({ rule: "ceiling", ok: loss <= opts.ceilingBp + 1e-4, detail: `expected loss ${loss.toFixed(2)} bp (ceiling ${opts.ceilingBp.toFixed(2)} bp)` });
  }
  return out;
}
export const nsListOk = (sel: NsItem[], allowed: readonly number[], rules: NsRules) => checkNsList(sel, allowed, rules).every((c) => c.ok);
