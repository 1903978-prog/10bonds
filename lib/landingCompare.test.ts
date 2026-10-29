import { describe, expect, it } from "vitest";
import LANDING_BONDS from "./landingBonds.json";
import { LANDING_SNAPSHOT } from "./landingSnapshot";
import { LANDING_TEXT } from "./landingText";
import { compareCopy, isMatched, listFigures, spreads } from "./landingCompare";
import { scanClaims } from "./legalRisk/checks";
import type { FinderLang } from "./finderText";

const LANGS: FinderLang[] = ["en", "it", "fr", "de"];
const etf = { ytm: LANDING_SNAPSHOT.ret, risk: LANDING_SNAPSHOT.risk, duration: LANDING_SNAPSHOT.duration };
const stored = listFigures(LANDING_BONDS.bonds)!;
const list = { ytm: stored.ytm, risk: stored.risk, duration: LANDING_SNAPSHOT.portfolio.duration ?? 4 };
const matchedList = { ytm: 5, risk: etf.risk, duration: etf.duration + 0.2 };

// Every key of the English landing text exists, non-empty, in all four languages (the card text vanished once because it was dropped).
const shape = (v: unknown, path = ""): string[] =>
  typeof v === "function" ? [path] : typeof v === "string" ? [path] : Array.isArray(v) ? v.flatMap((x, i) => shape(x, `${path}[${i}]`)) : v && typeof v === "object" ? Object.entries(v).flatMap(([k, x]) => shape(x, `${path}.${k}`)) : [path];

describe("landing comparison card text", () => {
  it("has the same keys in all four languages", () => {
    for (const l of LANGS) expect(shape(LANDING_TEXT[l]), l).toEqual(shape(LANDING_TEXT.en));
  });
  it("renders title, subtitle, gross line, net line and small print in all four languages, matched or not", () => {
    for (const l of LANGS) {
      expect(LANDING_TEXT[l].carousel.act.compare[0].length, `${l} title`).toBeGreaterThan(3);
      for (const side of [list, matchedList]) {
        const c = compareCopy(l, side, etf);
        for (const k of ["sub", "gross", "net", "fine"] as const) {
          expect(c[k].length, `${l} ${k}`).toBeGreaterThan(10);
          expect(c[k], `${l} ${k}`).not.toMatch(/undefined|NaN|\$\{/);
        }
        expect(c.net).toMatch(/[+−]\d/);
      }
    }
  });
  it("claims the same risk level only when the stored data match", () => {
    expect(isMatched(matchedList, etf)).toBe(true);
    expect(compareCopy("en", matchedList, etf).sub).toMatch(/^Same risk level, similar duration\./);
    expect(isMatched({ ...matchedList, risk: etf.risk - 2 }, etf)).toBe(false);
    expect(compareCopy("en", { ...matchedList, risk: etf.risk - 2 }, etf).sub).not.toMatch(/Same risk level/);
    expect(isMatched({ ...matchedList, duration: etf.duration + 3 }, etf)).toBe(false);
  });
  it("net spread is the gross spread adjusted by expected credit losses of both sides", () => {
    const s = spreads(matchedList, etf);
    expect(s.gross).toBeCloseTo(matchedList.ytm - etf.ytm, 6);
    expect(Number.isFinite(s.net)).toBe(true);
  });
  it("passes the legal-wording scan in every language", () => {
    const out: string[] = [];
    for (const l of LANGS) for (const side of [list, matchedList]) { const c = compareCopy(l, side, etf); out.push(c.sub, c.gross, c.net, c.fine); }
    expect(scanClaims(out)).toEqual([]);
  });
  it("the stored landing list matches the ETF risk level and duration, so the card may say so", () => {
    const j = LANDING_BONDS as { avgRisk?: number; duration?: number; ytm?: number };
    expect(j.avgRisk, "run the Landing snapshot workflow").toBeDefined();
    expect(isMatched({ ytm: j.ytm!, risk: j.avgRisk!, duration: j.duration! }, etf)).toBe(true);
  });
});

describe("landing comparison levels", () => {
  it("stored levels rise in risk and return, and one of them matches the ETF", async () => {
    const { default: L } = await import("./landingLevels.json");
    for (let i = 1; i < L.levels.length; i++) {
      expect(L.levels[i].avgRisk).toBeGreaterThan(L.levels[i - 1].avgRisk);
      expect(L.levels[i].ytm).toBeGreaterThan(L.levels[i - 1].ytm);
    }
    const best = L.levels.reduce((b, l) => (Math.abs(l.avgRisk - etf.risk) < Math.abs(b.avgRisk - etf.risk) ? l : b));
    expect(isMatched({ ytm: best.ytm, risk: best.avgRisk, duration: best.duration }, etf)).toBe(true);
  });
  it("never claims the same risk level for a higher-risk list", () => {
    expect(compareCopy("en", { ytm: 5.73, risk: 6, duration: 4 }, etf, undefined, 0.5).sub).not.toMatch(/Same risk level/);
  });
});
