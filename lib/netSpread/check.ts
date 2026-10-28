import { NS_SIZE, type NsCand, type NsRules } from "./solve";

// Independent check of a stored list against every hard rule of its position (not the solver's own bookkeeping).
export type NsCheck = { rule: "count" | "distinct" | "classes" | "spread" | "duration" | "issuer" | "sector"; ok: boolean; detail: string };

export function checkNsList(sel: NsCand[], allowed: readonly number[], rules: NsRules, maxSpread = 2): NsCheck[] {
  const out: NsCheck[] = [];
  out.push({ rule: "count", ok: sel.length === NS_SIZE, detail: `${sel.length} bonds (need ${NS_SIZE})` });
  out.push({ rule: "distinct", ok: new Set(sel.map((c) => c.isin)).size === sel.length, detail: "no duplicate bond" });
  const cls = sel.map((c) => c.cls);
  out.push({ rule: "classes", ok: cls.every((c) => allowed.includes(c)), detail: `risk classes ${[...new Set(cls)].sort((a, b) => a - b).join(",")} of allowed ${allowed.join(",")}` });
  out.push({ rule: "spread", ok: !cls.length || Math.max(...cls) - Math.min(...cls) <= maxSpread, detail: `class spread ${cls.length ? Math.max(...cls) - Math.min(...cls) : 0} (max ${maxSpread})` });
  const dur = sel.reduce((s, c) => s + c.dur, 0) / (sel.length || 1);
  out.push({ rule: "duration", ok: sel.length > 0 && dur >= rules.duration * 0.95 - 1e-9 && dur <= rules.duration * 1.05 + 1e-9, detail: `average duration ${dur.toFixed(2)} y (horizon ${rules.duration} y, +-5%)` });
  const count = (key: (c: NsCand) => string) => { const m = new Map<string, number>(); for (const c of sel) m.set(key(c), (m.get(key(c)) ?? 0) + 1); return Math.max(0, ...m.values()); };
  const iss = count((c) => c.group), sec = count((c) => c.sector);
  out.push({ rule: "issuer", ok: iss <= rules.perIssuer, detail: `most bonds from one issuer ${iss} (max ${rules.perIssuer})` });
  out.push({ rule: "sector", ok: sec <= rules.perSector, detail: `most bonds in one sector ${sec} (max ${rules.perSector})` });
  return out;
}
export const nsListOk = (sel: NsCand[], allowed: readonly number[], rules: NsRules) => checkNsList(sel, allowed, rules).every((c) => c.ok);
