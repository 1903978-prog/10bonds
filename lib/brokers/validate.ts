import { CATEGORIES, COUNTRIES, type BrokerProfile, type Category, type Country, type TariffData } from "./types";

// Checks for what the admin saves. A tariff that fails here is refused before it can become a draft.

const num = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v >= 0;
const numOrNull = (v: unknown) => v === null || num(v);
const strOrNull = (v: unknown) => v === null || typeof v === "string";
const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

export function isCountry(v: unknown): v is Country {
  return COUNTRIES.includes(v as Country);
}

export function ruleProblem(r: unknown): string | null {
  const x = r as Record<string, unknown>;
  if (!x || typeof x !== "object") return "rule missing";
  switch (x.type) {
    case "fixed":
      return num(x.fee) ? null : "fixed rule needs fee";
    case "percent":
      return num(x.pct) && numOrNull(x.min) && numOrNull(x.max) ? null : "percent rule needs pct, min, max (numbers or null)";
    case "fixed_plus_percent":
      return num(x.fee) && num(x.pct) && numOrNull(x.min) && numOrNull(x.max) ? null : "fixed_plus_percent rule needs fee, pct, min, max";
    case "tiered": {
      const tiers = x.tiers as unknown[];
      if (!Array.isArray(tiers) || tiers.length === 0) return "tiered rule needs tiers";
      for (const t of tiers as Record<string, unknown>[])
        if (!(t && numOrNull(t.upTo) && (num(t.fee) || (num(t.pct) && (t.min === undefined || numOrNull(t.min)))))) return "each tier needs upTo (number or null) and a fee or a pct";
      return null;
    }
    case "marginal": {
      const tiers = x.tiers as Record<string, unknown>[];
      if (!Array.isArray(tiers) || tiers.length === 0) return "marginal rule needs tiers";
      for (const t of tiers) if (!(t && numOrNull(t.upTo) && num(t.pct))) return "each marginal tier needs upTo (number or null) and pct";
      return numOrNull(x.min) && numOrNull(x.max) ? null : "marginal rule needs min and max (numbers or null)";
    }
    default:
      return "unknown rule type";
  }
}

const cats = (v: unknown) => Array.isArray(v) && v.length > 0 && v.every((c) => CATEGORIES.includes(c as Category));

/** Returns a list of problems; empty when the tariff can be saved. */
export function tariffProblems(d: unknown): string[] {
  const p: string[] = [];
  const t = d as Partial<TariffData>;
  if (!t || typeof t !== "object") return ["tariff must be an object"];
  if (typeof t.eligible !== "boolean") p.push("eligible must be true or false");
  if (typeof t.accountType !== "string") p.push("accountType must be text");
  for (const k of ["govBonds", "corpBonds", "foreignCurrencyBonds"] as const) {
    const a = t[k] as unknown as Record<string, unknown> | undefined;
    if (!a || !(a.available === null || typeof a.available === "boolean")) p.push(`${k}.available must be true, false or null`);
  }
  if (!Array.isArray(t.commissions)) p.push("commissions must be a list");
  else
    t.commissions.forEach((c, i) => {
      if (!cats(c.appliesTo)) p.push(`commissions[${i}].appliesTo must list categories (${CATEGORIES.join(", ")})`);
      const rp = ruleProblem(c.rule);
      if (rp) p.push(`commissions[${i}]: ${rp}`);
      if (c.venueFee !== null) {
        const vp = ruleProblem(c.venueFee);
        if (vp) p.push(`commissions[${i}].venueFee: ${vp}`);
      }
      if (typeof c.bondSpecific !== "boolean") p.push(`commissions[${i}].bondSpecific must be true or false`);
      if (!c.sourceUrl || !/^https:\/\//.test(c.sourceUrl)) p.push(`commissions[${i}] needs an official https sourceUrl`);
      if (c.promo && !(typeof c.promo.description === "string" && (c.promo.expires === null || isDate(c.promo.expires)))) p.push(`commissions[${i}].promo needs description and expires (date or null)`);
    });
  if (!Array.isArray(t.thirdPartyFees)) p.push("thirdPartyFees must be a list");
  else
    t.thirdPartyFees.forEach((f, i) => {
      if (!cats(f.appliesTo)) p.push(`thirdPartyFees[${i}].appliesTo must list categories`);
      if (f.rule !== null) {
        const rp = ruleProblem(f.rule);
        if (rp) p.push(`thirdPartyFees[${i}]: ${rp}`);
      }
    });
  for (const k of ["custodyFee", "accountFee"] as const) {
    const f = t[k] as unknown as Record<string, unknown> | undefined;
    if (!f || !strOrNull(f.text) || !numOrNull(f.annualEur)) p.push(`${k} needs text and annualEur (number or null)`);
  }
  if (!t.fxFee || !numOrNull((t.fxFee as { pct: unknown }).pct)) p.push("fxFee.pct must be a number or null");
  if (!t.taxAgent || !(t.taxAgent.value === null || typeof t.taxAgent.value === "boolean")) p.push("taxAgent.value must be true, false or null");
  if (!Array.isArray(t.venues) || !t.venues.every((v) => typeof v === "string")) p.push("venues must be a list of names");
  if (!Array.isArray(t.unverified)) p.push("unverified must be a list");
  if (!strOrNull(t.tariffDocUrl ?? null)) p.push("tariffDocUrl must be text or null");
  return p;
}

export function datesProblem(effectiveFrom: unknown, verifiedAt: unknown): string | null {
  if (!isDate(effectiveFrom)) return "effective date must be YYYY-MM-DD";
  if (!isDate(verifiedAt)) return "verification date must be YYYY-MM-DD";
  return null;
}

export function profileProblems(v: unknown): string[] {
  const p: string[] = [];
  const b = v as Partial<BrokerProfile>;
  if (!b || typeof b !== "object") return ["profile must be an object"];
  if (typeof b.id !== "string" || !/^[a-z0-9-]{2,40}$/.test(b.id)) p.push("id: lowercase letters, digits, dashes");
  if (typeof b.name !== "string" || !b.name.trim()) p.push("name required");
  if (typeof b.website !== "string" || !/^https:\/\//.test(b.website)) p.push("website must start with https://");
  const a = b.affiliate;
  if (!a || typeof a !== "object") p.push("affiliate block required");
  else {
    if (!["available", "unavailable", "unverified"].includes(a.program)) p.push("affiliate.program: available, unavailable or unverified");
    if (!["none", "negotiating", "active", "ended"].includes(a.status)) p.push("affiliate.status: none, negotiating, active or ended");
    if (a.status === "active" && !(typeof a.url === "string" && /^https:\/\//.test(a.url))) p.push("an active agreement needs an https affiliate url");
    if (!Array.isArray(a.sponsored) || !a.sponsored.every(isCountry)) p.push("affiliate.sponsored must list countries");
  }
  return p;
}
