import { PORTFOLIO_SPEC } from "../portfolioSpec";
import { NS_SIZE, type NsCand, type NsRules } from "./solve";

// Independent check of a stored list against every hard rule of its position (not the solver's own bookkeeping). The one validator of the spec:
// the nightly job runs it on every solved list, and the Efficient Database snapshot runs it again on the stored list before a row counts as VALID.
export type NsCheck = { rule: "count" | "distinct" | "classes" | "spread" | "duration" | "issuer" | "sector" | "share" | "band"; ok: boolean; detail: string };
/** The fields of a bond the rules look at (a full candidate also fits). */
export type NsItem = Pick<NsCand, "isin" | "group" | "sector" | "cls" | "dur"> & { exempt?: boolean; lossBp?: number };

export function checkNsList(sel: NsItem[], allowed: readonly number[], rules: NsRules, opts: { maxSpread?: number; /** The sum of the ten classes must lie in this range (the position's average-risk band, in tenths). */ sum?: { lo: number; hi: number } } = {}): NsCheck[] {
  const maxSpread = opts.maxSpread ?? PORTFOLIO_SPEC.maxRiskSpread;
  const out: NsCheck[] = [];
  out.push({ rule: "count", ok: sel.length === NS_SIZE, detail: `${sel.length} bonds (need ${NS_SIZE})` });
  out.push({ rule: "distinct", ok: new Set(sel.map((c) => c.isin)).size === sel.length, detail: "no duplicate bond" });
  const cls = sel.map((c) => c.cls);
  out.push({ rule: "classes", ok: cls.every((c) => allowed.includes(c)), detail: `risk classes ${[...new Set(cls)].sort((a, b) => a - b).join(",")} of allowed ${allowed.join(",")}` });
  out.push({ rule: "spread", ok: !cls.length || Math.max(...cls) - Math.min(...cls) <= maxSpread, detail: `class spread ${cls.length ? Math.max(...cls) - Math.min(...cls) : 0} (max ${maxSpread})` });
  const dur = sel.reduce((s, c) => s + c.dur, 0) / (sel.length || 1);
  const tol = rules.avgTol;
  out.push({ rule: "duration", ok: sel.length > 0 && dur >= rules.duration * (1 - tol) - 1e-9 && dur <= rules.duration * (1 + tol) + 1e-9, detail: `average duration ${dur.toFixed(2)} y (horizon ${rules.duration} y, +-${Math.round(tol * 100)}%)` });
  const count = (key: (c: NsItem) => string) => { const m = new Map<string, number>(); for (const c of sel) m.set(key(c), (m.get(key(c)) ?? 0) + 1); return Math.max(0, ...m.values()); };
  const iss = count((c) => c.group);
  const sec = rules.sectorExempt ? Math.max(0, ...(() => { const m = new Map<string, number>(); for (const c of sel) if (!c.exempt) m.set(c.sector, (m.get(c.sector) ?? 0) + 1); return [...m.values()]; })()) : count((c) => c.sector);
  out.push({ rule: "issuer", ok: iss <= rules.perIssuer, detail: `most bonds from one issuer ${iss} (max ${rules.perIssuer})` });
  out.push({ rule: "sector", ok: sec <= rules.perSector, detail: `most bonds in one sector ${sec} (max ${rules.perSector})` });
  if (sel.length && sel.every((c) => c.lossBp !== undefined)) {
    const total = sel.reduce((t, c) => t + c.lossBp!, 0), top = Math.max(...sel.map((c) => c.lossBp!));
    out.push({ rule: "share", ok: total <= 1e-9 || top <= rules.lossShare * total + 1e-6, detail: `largest share of the list's expected loss ${total > 0 ? ((100 * top) / total).toFixed(1) : "0.0"}% (max ${Math.round(rules.lossShare * 100)}%)` });
  }
  if (opts.sum) {
    const sum = cls.reduce((t, c) => t + c, 0);
    out.push({ rule: "band", ok: sum >= opts.sum.lo && sum <= opts.sum.hi, detail: `average risk ${(sum / 10).toFixed(1)} (band ${(opts.sum.lo / 10).toFixed(1)} - ${(opts.sum.hi / 10).toFixed(1)})` });
  }
  return out;
}
export const nsListOk = (sel: NsItem[], allowed: readonly number[], rules: NsRules) => checkNsList(sel, allowed, rules).every((c) => c.ok);
