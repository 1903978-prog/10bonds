import { describe, expect, it } from "vitest";
import { accrued, dirtyPrice, modifiedDuration, yieldFromClean, type Bullet } from "./yieldCalc";

// Formula audit 27/10/2026, check 1: yield and duration against an independent calculation on 20 seeded EUR and USD bonds
// (clean and dirty price, day count, coupon frequency, zero coupons, bonds near maturity). Flag anything more than 5 bp off.
// The reference below shares no code with lib/yieldCalc.ts: it builds the coupon dates forward from a start date, uses the
// 30/360 day count for USD (street convention) and ACT/ACT for EUR, and solves the yield by Newton's method.

const DAY = 86400000;
const d = (s: string) => Date.parse(s + "T00:00:00Z");
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
function mulberry(seed: number) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const addM = (s: string, m: number) => { const [y, mo, da] = s.split("-").map(Number); const t = new Date(Date.UTC(y, mo - 1 + m, 1)); const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate(); t.setUTCDate(Math.min(da, last)); return iso(t.getTime()); };
const d360 = (a: string, b: string) => { const [y1, m1, d1] = a.split("-").map(Number); const [y2, m2, d2] = b.split("-").map(Number); const e1 = Math.min(d1, 30); const e2 = d1 >= 30 ? Math.min(d2, 30) : d2; return (y2 - y1) * 360 + (m2 - m1) * 30 + (e2 - e1); };

type Ref = { y: number; dirty: number; accr: number; macaulay: number; mod: number };
/** Reference: coupon dates forward from the issue date; fraction of a period by `basis`. */
function reference(b: Bullet & { issue: string }, settle: string, clean: number, basis: "act" | "30360"): Ref {
  const f = b.freq, step = 12 / f;
  const dates: string[] = [];
  for (let k = 0; ; k++) { const x = addM(b.issue, step * k); if (d(x) > d(b.maturity)) break; if (x === b.maturity || d(x) > d(settle) || true) dates.push(x); if (x === b.maturity) break; }
  if (dates[dates.length - 1] !== b.maturity) dates.push(b.maturity);
  const next = dates.filter((x) => d(x) > d(settle));
  const prev = [...dates].reverse().find((x) => d(x) <= d(settle)) ?? addM(next[0], -step);
  const len = basis === "act" ? (d(next[0]) - d(prev)) / DAY : d360(prev, next[0]);
  const run = basis === "act" ? (d(settle) - d(prev)) / DAY : d360(prev, settle);
  const c = b.coupon / f;
  const accr = c * (run / len);
  const dirty = clean + accr;
  const w = 1 - run / len; // fraction of the first period still to run
  const flows = next.map((_, i) => ({ t: (w + i) / f, cf: c + (i === next.length - 1 ? 100 : 0), n: w + i }));
  const pv = (y: number) => flows.reduce((s, x) => s + x.cf / Math.pow(1 + y / f, x.n), 0);
  let y = 0.04;
  for (let i = 0; i < 100; i++) {
    const g = pv(y) - dirty;
    const dg = flows.reduce((s, x) => s - (x.n / f) * x.cf / Math.pow(1 + y / f, x.n + 1), 0);
    const ny = y - g / dg;
    if (Math.abs(ny - y) < 1e-13) { y = ny; break; }
    y = ny;
  }
  const macaulay = flows.reduce((s, x) => s + x.t * x.cf / Math.pow(1 + y / f, x.n), 0) / pv(y);
  return { y, dirty, accr, macaulay, mod: macaulay / (1 + y / f) };
}

type Case = { id: string; ccy: "EUR" | "USD"; b: Bullet & { issue: string }; settle: string; clean: number };
const rnd = mulberry(20261027);
const pick = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length)];
const SETTLE = ["2026-10-27", "2026-10-28", "2026-03-02", "2026-12-30"];
const cases: Case[] = [];
for (let i = 0; i < 20; i++) {
  const ccy = i % 2 === 0 ? "EUR" : "USD";
  const settle = pick(SETTLE);
  const freq: 1 | 2 | 4 = ccy === "EUR" ? (rnd() < 0.85 ? 1 : 2) : rnd() < 0.9 ? 2 : 4;
  const zero = i === 4 || i === 5;
  const near = i === 6 || i === 7;
  const yearsLeft = near ? 0.05 + rnd() * 0.4 : 0.5 + rnd() * 14;
  const maturity = iso(d(settle) + Math.round(yearsLeft * 365.25) * DAY);
  const issue = addM(maturity, -12 * Math.ceil(yearsLeft + 1 + rnd() * 6));
  const coupon = zero ? 0 : Math.round((1 + rnd() * 6) * 8) / 8;
  const clean = near ? 99 + rnd() * 1.5 : zero ? 60 + rnd() * 35 : 85 + rnd() * 28;
  cases.push({ id: `${ccy}${i}`, ccy, b: { coupon, freq: zero ? 1 : freq, maturity, issue }, settle, clean: Math.round(clean * 1000) / 1000 });
}

describe("yield and duration vs an independent calculation (20 bonds)", () => {
  it("has the mix the audit asked for", () => {
    expect(cases.filter((c) => c.ccy === "EUR")).toHaveLength(10);
    expect(cases.filter((c) => c.ccy === "USD")).toHaveLength(10);
    expect(cases.filter((c) => c.b.coupon === 0).length).toBeGreaterThanOrEqual(2);
    expect(new Set(cases.map((c) => c.b.freq)).size).toBeGreaterThanOrEqual(2);
  });
  for (const c of cases) {
    it(`${c.id}: coupon ${c.b.coupon} x${c.b.freq}, ${c.b.maturity}, clean ${c.clean}`, () => {
      const basis = c.ccy === "EUR" ? "act" : "30360";
      const ref = reference(c.b, c.settle, c.clean, basis);
      const y = yieldFromClean(c.b, c.settle, c.clean);
      expect(y).not.toBeNull();
      // yield within 5 bp (and, for the ACT/ACT basis, essentially identical)
      expect(Math.abs(y! - ref.y) * 1e4, `yield ${y} vs ${ref.y}`).toBeLessThan(5);
      if (basis === "act") expect(Math.abs(y! - ref.y) * 1e4).toBeLessThan(0.01);
      // dirty price = clean + accrued interest, and the cash flows at the yield give back the dirty price
      expect(Math.abs(accrued(c.b, c.settle) - ref.accr)).toBeLessThan(basis === "act" ? 1e-9 : 0.02);
      expect(dirtyPrice(c.b, c.settle, y!)).toBeCloseTo(c.clean + accrued(c.b, c.settle), 6);
      // modified duration: bump method vs analytic Macaulay/(1+y/f), within 0.01 years
      expect(Math.abs(modifiedDuration(c.b, c.settle, y!) - ref.mod)).toBeLessThan(0.01);
    });
  }
  it("a zero coupon bond yields (100/price)^(1/years) - 1 on an annual basis", () => {
    const z = { coupon: 0, freq: 1 as const, maturity: "2031-10-27" };
    expect(yieldFromClean(z, "2026-10-27", 80)!).toBeCloseTo(Math.pow(100 / 80, 1 / 5) - 1, 6);
  });
  it("a bond a few days from maturity yields about its simple return annualised, never explodes", () => {
    const b = { coupon: 3, freq: 1 as const, maturity: "2026-11-10" };
    const settle = "2026-10-27";
    const dirty = 99.9 + accrued(b, settle);
    const simple = ((103 - dirty) / dirty) * (365 / 14);
    const y = yieldFromClean(b, settle, 99.9)!;
    expect(Math.abs(y - simple)).toBeLessThan(0.005);
  });
});
